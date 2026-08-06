import type { PaidPlan, Cadence } from "@/lib/stripe";

/** RevenueCat App Store product IDs — must match what's configured in both
 *  App Store Connect and the RevenueCat dashboard (see revenuecat/webhook
 *  route.ts's PRODUCT_ID_TO_PLAN for the server-side counterpart).
 *
 *  Nested by cadence, the same shape as STRIPE_PRICES and for the same
 *  reason. A flat `plusYearly` key here would be harmless on its own — this
 *  object is not what PaidPlan is derived from — but it would have to be
 *  answered by a matching key on the Stripe side, and that one is. Plan and
 *  billing period vary independently, so they are two levels rather than four
 *  names, and PaidPlan stays "plus" | "pro". */
export const IAP_PRODUCT_IDS: Record<PaidPlan, Record<Cadence, string>> = {
  plus: {
    monthly: "com.nihongodiary.app.plus.monthly",
    yearly: "com.nihongodiary.app.plus.yearly",
  },
  pro: {
    monthly: "com.nihongodiary.app.pro.monthly",
    yearly: "com.nihongodiary.app.pro.yearly",
  },
};
