/**
 * Which paid plans are on sale right now.
 *
 * Not in lib/stripe.ts, where isYearlyEnabled() lives, and the difference is
 * deliberate:
 *
 *  - stripe.ts opens with `import Stripe from "stripe"`. Every purchase button
 *    in the app is a Client Component (CheckoutButton, IAPPurchaseButton,
 *    PurchaseButton), and each currently gets away with `import type` from
 *    stripe.ts because types are erased. Importing a VALUE from there into any
 *    of them would pull the Stripe SDK into the browser bundle. This module
 *    imports nothing at all, so that mistake is not available.
 *
 *  - Pro visibility is not a Stripe concern. The same flag hides the landing
 *    page cards (no Stripe anywhere near them) and the RevenueCat purchase
 *    path. Reading the native store's gate out of the Stripe module would be
 *    a misleading wire.
 *
 * lib/plans.ts would also have been a fair home, but that file carries
 * normalizePlan and PLAN_LIMITS and is left untouched on purpose — see below.
 */

/**
 * Is the Pro plan on sale?
 *
 * Off unless the variable says exactly "true". Absent, empty, "1", "yes", a
 * typo — all off, which is the state we are shipping. Same shape and same
 * default-to-safe reasoning as isYearlyEnabled(): a variable missing from an
 * environment nobody thought about must not put a plan in front of people.
 *
 * ⚠️ This gates SELLING Pro, never HAVING it. Nothing here is consulted by
 * normalizePlan, PLAN_LIMITS or limitsFor — those are untouched, so an
 * existing plan='pro' row keeps its 25 corrections and its review drills
 * whatever this variable says. The webhooks that renew a Pro subscription
 * (api/stripe/webhook's planFromPriceId, api/revenuecat/webhook's
 * PRODUCT_ID_TO_PLAN) do not read it either, so renewals keep landing on
 * 'pro'. STRIPE_PRICES.pro and IAP_PRODUCT_IDS.pro stay registered; we stop
 * offering the plan, we do not retire it.
 *
 * Turning this on again is the whole point: no code path is deleted, only
 * made unreachable, and the App Store products are left in place so the
 * variable can come back without a review cycle.
 *
 * One thing it cannot do: an IAP purchase is made client-side against a
 * product that is still live in App Store Connect, so hiding the button is
 * the entire enforcement on native. The Stripe side is genuinely closed —
 * api/stripe/checkout rejects plan="pro" when this is off, the same way
 * parseCadence refuses ?cadence=yearly — but the store product remains
 * buyable in principle. Accepted deliberately: keeping the products
 * registered is what makes this reversible.
 *
 * Changing it needs a redeploy: NEXT_PUBLIC_ values are baked in at build time.
 */
export function isProEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRO_ENABLED === "true";
}
