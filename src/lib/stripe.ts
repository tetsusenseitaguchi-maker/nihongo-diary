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

/** Stripe price IDs for each paid plan (monthly billing). Swap for annual later. */
export const STRIPE_PRICES = {
  plus: process.env.STRIPE_PRICE_PLUS!,
  pro: process.env.STRIPE_PRICE_PRO!,
} as const;

export type PaidPlan = keyof typeof STRIPE_PRICES;

export { SITE_URL };
