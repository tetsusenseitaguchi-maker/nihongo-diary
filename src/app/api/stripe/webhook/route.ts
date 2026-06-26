import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Must be disabled for raw body access (Stripe signature verification requires the raw bytes)
export const config = { api: { bodyParser: false } };

/** Map Stripe price ID → plan name. Falls back to "free" if unknown. */
function planFromPriceId(priceId: string): "plus" | "pro" | "free" {
  if (priceId === STRIPE_PRICES.pro) return "pro";
  if (priceId === STRIPE_PRICES.plus) return "plus";
  return "free";
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

        await supabase
          .from("profiles")
          .update({
            plan,
            ...(customerId && { stripe_customer_id: customerId }),
            ...(subscriptionId && { stripe_subscription_id: subscriptionId }),
          })
          .eq("id", userId);
        break;
      }

      // ─── Subscription changed (upgrade / downgrade / renewal / pause) ──────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const planName = planFromPriceId(priceId);
        const newPlan = planForStatus(sub.status, planName);

        await supabase
          .from("profiles")
          .update({ plan: newPlan, stripe_subscription_id: sub.id })
          .eq("stripe_customer_id", customerId);
        break;
      }

      // ─── Subscription cancelled / expired ──────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_customer_id", customerId);
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
          await supabase
            .from("profiles")
            .update({ plan: "free" })
            .eq("stripe_customer_id", customerId);
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
  }

  return NextResponse.json({ received: true });
}
