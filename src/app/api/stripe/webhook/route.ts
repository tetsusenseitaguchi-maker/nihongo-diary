import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordBillingEvent, epochToIso, type BillingOutcome } from "@/lib/billing-events";

// Must be disabled for raw body access (Stripe signature verification requires the raw bytes)
export const config = { api: { bodyParser: false } };

/**
 * Map Stripe price ID → plan name. Null means "this price is not one of ours".
 *
 * Null rather than "free", and the difference is the whole point. A price we
 * do not recognise is a fact about this deployment's configuration — a price
 * added in the dashboard, an environment variable not set — and never a
 * statement about whether the customer is entitled to anything. Returning
 * "free" made those two indistinguishable at the update below, so a paying
 * subscriber on an unmapped price was silently downgraded.
 *
 * Every cadence of a plan maps to the same name: plan is what the learner
 * gets, monthly-vs-yearly is only how they pay for it, and profiles.plan has
 * no column for the difference.
 */
function planFromPriceId(priceId: string): "plus" | "pro" | null {
  for (const plan of ["plus", "pro"] as const) {
    const prices = STRIPE_PRICES[plan];
    if (priceId === prices.monthly || priceId === prices.yearly) return plan;
  }
  return null;
}

/** Return "free" for any non-active/trialing subscription status. */
function planForStatus(
  status: Stripe.Subscription.Status,
  plan: "plus" | "pro" | "free",
): "plus" | "pro" | "free" {
  return status === "active" || status === "trialing" ? plan : "free";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const supabase = createAdminClient();

  /**
   * 段階0：観測のみ — see lib/billing-events.ts.
   *
   * Every branch below already ran its update; this only reads the result it
   * was throwing away and writes it down. The queries, the writes and the 200
   * at the end are unchanged, deliberately: what gets returned to Stripe is
   * 段階2's decision, and it should be made from the rows this collects rather
   * than from a guess about how often the race fires.
   *
   * `.select("id, plan")` on the updates is the one edit to the queries
   * themselves. It asks PostgREST to return the rows it just wrote instead of
   * nothing, which is how zero-row matches become visible at all. Same write,
   * same filter, one round trip.
   */
  async function record(
    outcome: BillingOutcome,
    eventType: string,
    fields: {
      customerId?: string | null;
      userId?: string | null;
      rowsAffected?: number | null;
      planAfter?: string | null;
      detail?: string | null;
    } = {},
  ) {
    await recordBillingEvent(supabase, {
      provider: "stripe",
      eventId: event.id,
      eventType,
      eventCreatedAt: epochToIso(event.created),
      outcome,
      ...fields,
    });
  }

  /** Result of an update that asked for its rows back. */
  function readResult(
    data: { id: string; plan: string | null }[] | null,
    error: { message: string } | null,
  ): { outcome: BillingOutcome; userId: string | null; rows: number; detail: string | null } {
    if (error) return { outcome: "db_error", userId: null, rows: 0, detail: error.message };
    const rows = data?.length ?? 0;
    return {
      outcome: rows > 0 ? "applied" : "no_match",
      userId: data?.[0]?.id ?? null,
      rows,
      detail: null,
    };
  }

  try {
    switch (event.type) {
      // ─── Payment completed (first charge or upgrade) ───────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const plan = (session.metadata?.plan ?? "free") as "plus" | "pro" | "free";
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        if (!userId) break;

        // Claims the Stripe billing rail for this user. Doesn't check the
        // current billing_source first — checkout/route.ts's guard should
        // prevent an apple_iap subscriber from reaching Stripe checkout at
        // all, but if this fires anyway, log it loudly rather than silently
        // dropping a charge the user already paid for.
        const { data: before } = await supabase
          .from("profiles")
          .select("billing_source")
          .eq("id", userId)
          .single();
        if (before?.billing_source === "apple_iap") {
          console.warn(
            `[stripe/webhook] checkout.session.completed for ${userId} — was already billing_source=apple_iap`,
          );
        }

        const { data, error } = await supabase
          .from("profiles")
          .update({
            plan,
            billing_source: "stripe",
            ...(customerId && { stripe_customer_id: customerId }),
            ...(subscriptionId && { stripe_subscription_id: subscriptionId }),
          })
          .eq("id", userId)
          .select("id, plan");

        // Matched on the primary key, so no_match here means the account is
        // gone — a different animal from the customer-id branches below.
        const r = readResult(data, error);
        await record(r.outcome, event.type, {
          customerId,
          userId: r.userId ?? userId,
          rowsAffected: r.rows,
          planAfter: plan,
          detail: r.detail ?? (r.rows === 0 ? "no profile for client_reference_id" : null),
        });
        break;
      }

      // ─── Subscription changed (upgrade / downgrade / renewal / pause) ──────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const planName = planFromPriceId(priceId);
        const isActive = sub.status === "active" || sub.status === "trialing";

        /**
         * Paying, on a price this deployment does not know. Do not write plan.
         *
         * The condition needs both halves. "Unknown price" alone would also
         * swallow the downgrades that must happen: past_due, unpaid, paused
         * and canceled all arrive here too, and for those the plan is decided
         * by the status, not by the price — planForStatus below returns "free"
         * whatever the price was. Skipping on price alone would leave someone
         * who stopped paying on a paid plan indefinitely, which is the same
         * bug pointing the other way.
         *
         * stripe_subscription_id is still written. checkout/route.ts refuses a
         * second Checkout Session to anyone carrying one, and dropping it here
         * would open exactly the double-subscription this route cannot repair.
         *
         * The billing_events row is deliberately shaped for its reader: the
         * outcome stays one of the four the table's CHECK allows, and
         * plan_after IS NULL is what marks "nothing was written to plan".
         *   select * from billing_events where plan_after is null;
         */
        if (planName === null && isActive) {
          console.error(
            `[stripe/webhook] unknown price ${priceId} on ${sub.status} subscription ${sub.id} — plan NOT written`,
          );

          // Same query as the normal path minus `plan`, apple_iap guard included.
          const { data, error } = await supabase
            .from("profiles")
            .update({ stripe_subscription_id: sub.id })
            .eq("stripe_customer_id", customerId)
            .neq("billing_source", "apple_iap")
            .select("id, plan");

          const r = readResult(data, error);
          await record(r.outcome, event.type, {
            customerId,
            userId: r.userId,
            rowsAffected: r.rows,
            planAfter: null,
            detail: `unknown price ${priceId} — plan not written`,
          });
          break;
        }

        // Unchanged. planName can only be null here when the subscription is
        // not active, and planForStatus ignores its plan argument in that case.
        const newPlan = planForStatus(sub.status, planName ?? "free");

        // Don't clobber a user who has since moved to Apple IAP — see
        // revenuecat/webhook/route.ts for the symmetric guard.
        const { data, error } = await supabase
          .from("profiles")
          .update({ plan: newPlan, stripe_subscription_id: sub.id })
          .eq("stripe_customer_id", customerId)
          .neq("billing_source", "apple_iap")
          .select("id, plan");

        // THE branch the race lands in. Zero rows here is either "no profile
        // carries this customer id yet" (checkout.session.completed has not
        // arrived) or "the apple_iap guard excluded them". 段階0 does not tell
        // them apart — it counts them, so 段階1 knows whether it is worth
        // the extra SELECT.
        const r = readResult(data, error);
        await record(r.outcome, event.type, {
          customerId,
          userId: r.userId,
          rowsAffected: r.rows,
          planAfter: newPlan,
          detail: r.detail ?? (r.rows === 0 ? "no profile matched customer id (race or apple_iap guard)" : null),
        });
        break;
      }

      // ─── Subscription cancelled / expired ──────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const { data, error } = await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null, billing_source: null })
          .eq("stripe_customer_id", customerId)
          .neq("billing_source", "apple_iap")
          .select("id, plan");

        const r = readResult(data, error);
        await record(r.outcome, event.type, {
          customerId,
          userId: r.userId,
          rowsAffected: r.rows,
          planAfter: "free",
          detail: r.detail ?? (r.rows === 0 ? "no profile matched customer id (race or apple_iap guard)" : null),
        });
        break;
      }

      // ─── Payment failed (grace-period may still apply, but be conservative) ─
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : null;
        if (!customerId) break;

        // Only downgrade if it's not the first attempt (Stripe retries 3 times by default)
        const attemptCount = invoice.attempt_count ?? 0;
        if (attemptCount >= 3) {
          const { data, error } = await supabase
            .from("profiles")
            .update({ plan: "free" })
            .eq("stripe_customer_id", customerId)
            .neq("billing_source", "apple_iap")
            .select("id, plan");

          const r = readResult(data, error);
          await record(r.outcome, event.type, {
            customerId,
            userId: r.userId,
            rowsAffected: r.rows,
            planAfter: "free",
            detail: r.detail ?? `attempt ${attemptCount}${r.rows === 0 ? " — no profile matched customer id" : ""}`,
          });
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
    // Return 200 so Stripe doesn't retry — log the error instead
    //
    // 段階0 adds one thing to that: the exception is written down as well, so
    // "it threw" stops being something only a log search can find. Still 200.
    await record("exception", event.type, {
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ received: true });
}
