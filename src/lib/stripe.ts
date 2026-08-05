import Stripe from "stripe";

/** Lazy singleton — initialized on first call so build-time doesn't fail without the key. */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return _stripe;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nihongodiary.app")
  .replace(/\/$/, "")
  .replace("://www.", "://");

/**
 * Stripe price IDs, by plan and then by billing period.
 *
 * Nested rather than flat (STRIPE_PRICES.plusYearly) on purpose. PaidPlan is
 * `keyof typeof STRIPE_PRICES`, and a flat key would widen it to four members
 * — which breaks `Record<PaidPlan, string>` in lib/revenuecat.ts, a file that
 * has nothing to do with billing periods. Nesting keeps the top-level keys at
 * "plus" | "pro", so PaidPlan is byte-for-byte the type it always was and
 * every component taking a `plan` prop is untouched.
 *
 * The `!` is a compile-time assertion only: an unset variable is `undefined`
 * here at runtime. Nothing reads these at import time (getStripe is lazy), so
 * a missing one cannot fail a build or a boot — it surfaces at the two places
 * that compare against it. See /api/debug/stripe-prices for which are set.
 */
export const STRIPE_PRICES = {
  plus: {
    monthly: process.env.STRIPE_PRICE_PLUS!,
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
} as const;

export type PaidPlan = keyof typeof STRIPE_PRICES;

/**
 * Billing period. Deliberately its own type rather than part of PaidPlan —
 * the two vary independently, and folding them together is what would drag
 * the IAP side into a Stripe change. Nothing selects a cadence yet: checkout
 * asks for `.monthly` explicitly and there is no UI offering the other one.
 */
export type Cadence = keyof (typeof STRIPE_PRICES)["plus"];

export { SITE_URL };
