import type { PaidPlan } from "@/lib/stripe";

/** RevenueCat App Store product IDs — must match what's configured in both
 *  App Store Connect and the RevenueCat dashboard (see revenuecat/webhook
 *  route.ts's PRODUCT_ID_TO_PLAN for the server-side counterpart). */
export const IAP_PRODUCT_IDS: Record<PaidPlan, string> = {
  plus: "com.nihongodiary.app.plus.monthly",
  pro: "com.nihongodiary.app.pro.monthly",
};
