import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
        const { data: before } = await supabase
          .from("profiles")
          .select("billing_source")
          .eq("revenuecat_app_user_id", appUserId)
          .single();
        if (before?.billing_source === "stripe") {
          console.warn(
            `[revenuecat/webhook] ${event.type} for ${appUserId} — was already billing_source=stripe`,
          );
        }

        await supabase
          .from("profiles")
          .update({ plan, billing_source: "apple_iap" })
          .eq("revenuecat_app_user_id", appUserId);
        break;
      }

      // ─── Switched between Plus/Pro within IAP ───────────────────────────
      case "PRODUCT_CHANGE": {
        if (!appUserId) break;
        const plan = planFromProductId(event.product_id);

        await supabase
          .from("profiles")
          .update({ plan, billing_source: "apple_iap" })
          .eq("revenuecat_app_user_id", appUserId)
          .neq("billing_source", "stripe");
        break;
      }

      // ─── Subscription actually ended — remove access ────────────────────
      case "EXPIRATION": {
        if (!appUserId) break;

        await supabase
          .from("profiles")
          .update({ plan: "free", billing_source: null })
          .eq("revenuecat_app_user_id", appUserId)
          .neq("billing_source", "stripe");
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
  }

  return NextResponse.json({ received: true });
}
