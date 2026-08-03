import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordBillingEvent, type BillingOutcome } from "@/lib/billing-events";

/** Map RevenueCat product ID → plan name. Falls back to "free" if unknown. */
const PRODUCT_ID_TO_PLAN: Record<string, "plus" | "pro"> = {
  "com.nihongodiary.app.plus.monthly": "plus",
  "com.nihongodiary.app.pro.monthly": "pro",
};
function planFromProductId(productId: string | undefined): "plus" | "pro" | "free" {
  return PRODUCT_ID_TO_PLAN[productId ?? ""] ?? "free";
}

/** Constant-time comparison against the shared secret set in the RevenueCat
 *  dashboard's "Authorization header" field (Integrations -> Webhooks). */
function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!header || !secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type RevenueCatEvent = {
  type: string;
  app_user_id?: string;
  product_id?: string;
  /** Read only by 段階0's audit record — never by a branch below. */
  id?: string;
  event_timestamp_ms?: number;
};

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const event = body?.event as RevenueCatEvent | undefined;
  if (!event?.type) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const appUserId = event.app_user_id;
  // Narrowed once into its own const: the guard above proves `event` is
  // defined, but that narrowing does not follow it into the closure below.
  const ev: RevenueCatEvent = event;

  /**
   * 段階0：観測のみ — the mirror of the block in stripe/webhook/route.ts, and
   * deliberately the same shape so the two read alike in billing_events.
   *
   * The stakes are lower on this side: every branch matches on profiles.id,
   * which is the primary key, so a zero-row update means the account is gone
   * rather than "the row has not been written yet". The guard cases
   * (.neq on billing_source) are the other way to land on no_match here.
   */
  async function record(
    outcome: BillingOutcome,
    fields: {
      userId?: string | null;
      rowsAffected?: number | null;
      planAfter?: string | null;
      detail?: string | null;
    } = {},
  ) {
    await recordBillingEvent(supabase, {
      provider: "revenuecat",
      eventId: ev.id ?? null,
      eventType: ev.type,
      // app_user_id IS the Supabase user id (RevenueCatInit configures
      // Purchases with it), but it is kept in customer_id as well so a row
      // that matched nobody still carries the handle it was given.
      customerId: appUserId ?? null,
      eventCreatedAt:
        typeof ev.event_timestamp_ms === "number"
          ? new Date(ev.event_timestamp_ms).toISOString()
          : null,
      outcome,
      ...fields,
    });
  }

  function readResult(
    data: { id: string; plan: string | null }[] | null,
    error: { message: string } | null,
  ): { outcome: BillingOutcome; userId: string | null; rows: number; detail: string | null } {
    if (error) return { outcome: "db_error", userId: null, rows: 0, detail: error.message };
    const rows = data?.length ?? 0;
    return { outcome: rows > 0 ? "applied" : "no_match", userId: data?.[0]?.id ?? null, rows, detail: null };
  }

  console.log("[revenuecat/webhook] received:", event.type, appUserId ?? "(no app_user_id)");

  try {
    switch (event.type) {
      // ─── New subscription purchased ─────────────────────────────────────
      case "INITIAL_PURCHASE":
      case "RENEWAL": {
        if (!appUserId) break;
        const plan = planFromProductId(event.product_id);

        // Claims ownership for this user's billing rail. Doesn't check the
        // current billing_source first — if this fires for someone already
        // on 'stripe' (shouldn't happen once checkout/route.ts also blocks
        // apple_iap subscribers, but the guard there can't stop an existing
        // Stripe checkout in flight), log it loudly rather than silently
        // dropping a real purchase the user already paid for.
        //
        // Matches on profiles.id (== appUserId, since RevenueCatInit.tsx
        // always configures Purchases with appUserID = the Supabase user's
        // own id) rather than revenuecat_app_user_id — that column is only
        // ever populated by a one-time migration backfill, so it's null for
        // every user who signed up afterward and can't be relied on to
        // match. Still opportunistically written below so it stays useful
        // for anything else that wants to look a user up by it.
        const { data: before } = await supabase
          .from("profiles")
          .select("billing_source")
          .eq("id", appUserId)
          .single();
        if (before?.billing_source === "stripe") {
          console.warn(
            `[revenuecat/webhook] ${event.type} for ${appUserId} — was already billing_source=stripe`,
          );
        }

        const { data, error } = await supabase
          .from("profiles")
          .update({ plan, billing_source: "apple_iap", revenuecat_app_user_id: appUserId })
          .eq("id", appUserId)
          .select("id, plan");

        const r = readResult(data, error);
        await record(r.outcome, {
          userId: r.userId ?? appUserId,
          rowsAffected: r.rows,
          planAfter: plan,
          detail: r.detail ?? (r.rows === 0 ? "no profile for app_user_id" : null),
        });
        break;
      }

      // ─── Switched between Plus/Pro within IAP ───────────────────────────
      case "PRODUCT_CHANGE": {
        if (!appUserId) break;
        const plan = planFromProductId(event.product_id);

        const { data, error } = await supabase
          .from("profiles")
          .update({ plan, billing_source: "apple_iap", revenuecat_app_user_id: appUserId })
          .eq("id", appUserId)
          .neq("billing_source", "stripe")
          .select("id, plan");

        const r = readResult(data, error);
        await record(r.outcome, {
          userId: r.userId ?? appUserId,
          rowsAffected: r.rows,
          planAfter: plan,
          detail: r.detail ?? (r.rows === 0 ? "no profile for app_user_id, or stripe guard" : null),
        });
        break;
      }

      // ─── Subscription actually ended — remove access ────────────────────
      case "EXPIRATION": {
        if (!appUserId) break;

        const { data, error } = await supabase
          .from("profiles")
          .update({ plan: "free", billing_source: null, revenuecat_app_user_id: appUserId })
          .eq("id", appUserId)
          .neq("billing_source", "stripe")
          .select("id, plan");

        const r = readResult(data, error);
        await record(r.outcome, {
          userId: r.userId ?? appUserId,
          rowsAffected: r.rows,
          planAfter: "free",
          detail: r.detail ?? (r.rows === 0 ? "no profile for app_user_id, or stripe guard" : null),
        });
        break;
      }

      // ─── Scheduled to not renew, but still has access until expiration ──
      // (mirrors Stripe's cancel_at_period_end: intent-to-cancel alone
      // doesn't downgrade — only EXPIRATION does)
      case "CANCELLATION":
        break;

      // ─── Charge attempt failed ───────────────────────────────────────────
      // No retry-count field on this event (unlike Stripe's invoice
      // attempt_count), so deliberately conservative: don't downgrade here,
      // let EXPIRATION be the actual authoritative signal once the store's
      // own grace period/retries are exhausted.
      case "BILLING_ISSUE":
        console.warn(`[revenuecat/webhook] BILLING_ISSUE for ${appUserId}`);
        break;

      default:
        // Ignore unhandled events (UNCANCELLATION, TEST, TRANSFER, etc.)
        break;
    }
  } catch (err) {
    console.error(`[revenuecat/webhook] Error handling ${event.type}:`, err);
    // Return 200 so RevenueCat doesn't retry — log the error instead
    // 段階0 also writes it down. Still 200.
    await record("exception", { detail: err instanceof Error ? err.message : String(err) });
  }

  return NextResponse.json({ received: true });
}
