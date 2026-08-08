import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { type Plan } from "@/lib/plans";
import { CheckoutButton } from "@/components/CheckoutButton";
import { PurchaseButton } from "@/components/PurchaseButton";
import { PlanPrice } from "@/components/PlanPrice";
import { NativeGate } from "@/components/NativeGate";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";
import { PlanComparisonTable, type PlanColumnMeta } from "@/components/PlanComparisonTable";
import type { Cadence } from "@/lib/stripe";
import { COMPARISON_PLANS, type ComparisonPlan } from "@/lib/plan-comparison";
import { isProEnabled } from "@/lib/plan-visibility";

type Tier = {
  id: Plan;
  name: string;
  /** Monthly USD, shown on the web. Native never renders it — see PlanPrice. */
  price: string;
  /** Annual USD. Absent on tiers that are not sold by the year (Teacher). */
  yearlyPrice?: string;
  /** True when this tier can be bought on either cycle. Teacher cannot, so it
   *  keeps saying /month whatever the toggle is set to — a price with the
   *  wrong period on it is the thing Guideline 3.1.2(c) is about. */
  hasYearly?: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
  tagline?: string;
  taglineKey?: string;
  features: string[];
};

// Single source of truth for all plan tiers.
// Both /upgrade page and the landing page read from here.
export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Start your Japanese diary — no commitment needed",
    taglineKey: "pricing.tagline.free",
    features: [
      "pricing.features.free.1",
      "pricing.features.free.2",
      "pricing.features.free.3",
      "pricing.features.free.4",
      "pricing.features.free.5",
      "pricing.features.free.6",
      "pricing.features.free.7",
      "pricing.features.free.8",
      "pricing.features.free.9",
      "pricing.features.free.10",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$9",
    yearlyPrice: "$79.99",
    hasYearly: true,
    highlight: true,
    tagline: "Level up seriously. Every entry builds real skill.",
    taglineKey: "pricing.tagline.plus",
    features: [
      "pricing.features.plus.1",
      "pricing.features.plus.2",
      "pricing.features.plus.3",
      "pricing.features.plus.4",
      "pricing.features.plus.5",
      "pricing.features.plus.6",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    yearlyPrice: "$159.99",
    hasYearly: true,
    tagline: "For those who want to master Japanese.",
    taglineKey: "pricing.tagline.pro",
    features: [
      "pricing.features.pro.1",
      "pricing.features.pro.2",
      "pricing.features.pro.3",
      "pricing.features.pro.4",
      "pricing.features.pro.5",
    ],
  },
  {
    id: "teacher_feedback",
    name: "Teacher",
    price: "$49",
    comingSoon: true,
    features: [
      "pricing.features.teacher.1",
      "pricing.features.teacher.2",
      "pricing.features.teacher.3",
    ],
  },
];

/**
 * Prices for the table layout, read off the very TIERS entries the cards use.
 *
 * Built here rather than inside PlanComparisonTable: that component is
 * imported above, so reaching back into it for TIERS would close an import
 * cycle. Sharing one source also means the two layouts cannot end up quoting
 * different prices for the same plan.
 */
function tableColumns(cadence: Cadence, labels: PricingLabels): Record<ComparisonPlan, PlanColumnMeta> {
  return COMPARISON_PLANS.reduce(
    (acc, id) => {
      const tier = TIERS.find((candidate) => candidate.id === id);
      const yearly = cadence === "yearly" && tier?.hasYearly;
      acc[id] = {
        priceFallback: (yearly ? tier?.yearlyPrice : tier?.price) ?? "",
        // Free has no period to state; the paid columns must have one.
        cadence: id === "free" ? undefined : yearly ? labels.cadenceYear : labels.cadenceMonth,
        highlight: tier?.highlight,
      };
      return acc;
    },
    {} as Record<ComparisonPlan, PlanColumnMeta>,
  );
}

export type PricingLabels = {
  mostPopular: string;
  comingSoon: string;
  currentPlan: string;
  startFree: string;
  upgradeSoon: string;
  betaNotice: string;
  /** Shown under the disabled "Current plan" button when billingSource is
   *  "apple_iap" — points to Apple's subscription management (App Store
   *  Review Guideline 3.1.2 requires an in-app path to cancel). */
  manageInAppInstructions: string;
  /** Free-tier price shown inside the native iOS shell in place of the
   *  hardcoded USD "$0" (App Store Guideline 3.1.1 — no external prices). */
  freeNativePrice?: string;
  /** Footer notice shown inside the native iOS shell in place of the
   *  Stripe payment line (which references an external payment mechanism). */
  nativeBillingNotice?: string;
  /** Renewal wording shown above the legal links (App Store Review
   *  Guideline 3.1.2(c) — the purchase screen must state the subscription
   *  renews until cancelled). */
  legalIntro?: string;
  /** Link labels for the EULA (/terms) and privacy policy (/privacy). Both
   *  links must be on the purchase screen itself (Guideline 3.1.2(c)). */
  termsLink?: string;
  privacyLink?: string;
  /** The billing period, in words, beside the price. Required on a purchase
   *  screen by App Store Review Guideline 3.1.2(c) — and required to be the
   *  RIGHT one, which is the whole reason the toggle exists. */
  cadenceMonth?: string;
  cadenceYear?: string;
  /** The toggle itself. */
  toggleMonthly?: string;
  toggleYearly?: string;
  /** When true, paid plan buttons become live Stripe checkout links */
  checkoutEnabled?: boolean;
};

const DEFAULT_LABELS: PricingLabels = {
  mostPopular: "Most popular",
  comingSoon: "Coming soon",
  currentPlan: "Current plan",
  startFree: "Start for free",
  upgradeSoon: "Upgrade soon",
  betaNotice: "Payments aren't live yet — this is a public beta. Pricing may change before launch.",
  manageInAppInstructions: "Manage or cancel in Settings → Apple ID → Subscriptions",
  freeNativePrice: "Free",
  nativeBillingNotice: "Manage your subscription in your Apple ID settings.",
  legalIntro: "Subscriptions renew automatically until cancelled.",
  termsLink: "Terms of Use (EULA)",
  privacyLink: "Privacy Policy",
  cadenceMonth: "/month",
  cadenceYear: "/year",
  toggleMonthly: "Monthly",
  toggleYearly: "Yearly",
};

/**
 * Shared pricing grid used on both the landing page and /upgrade.
 *
 * mode="landing"  — Free tier shows a real "Start for free" link to /signup.
 *                   No "current plan" detection (user may not be logged in).
 * mode="upgrade"  — All CTAs are disabled buttons. Pass currentPlan to
 *                   highlight the user's active tier.
 *
 * Pass `labels` (from getServerT on the upgrade page) for translated UI chrome.
 * The landing page omits labels and shows English defaults.
 */
export function PricingGrid({
  currentPlan,
  hasActiveSubscription = false,
  billingSource = null,
  mode = "landing",
  layout = "cards",
  labels = DEFAULT_LABELS,
  translateFeature,
  isNative = false,
  cadence = "monthly",
  cadenceBasePath,
}: {
  currentPlan?: Plan;
  /** True when the viewer already has a Stripe subscription — switching
   *  plans must go through the billing portal, not a fresh Checkout Session. */
  hasActiveSubscription?: boolean;
  /** Which billing rail (if any) the viewer's active subscription is on —
   *  passed through to PurchaseButton to pick IAP vs Stripe vs "managed
   *  elsewhere". */
  billingSource?: "stripe" | "apple_iap" | null;
  mode?: "landing" | "upgrade";
  /**
   * How the tiers are presented. Defaults to the cards so every existing
   * caller keeps its exact output; "table" swaps in PlanComparisonTable.
   *
   * Only the tier presentation changes. Everything below it in this component
   * — Restore Purchases, the Stripe/Apple footer swap, and the renewal terms
   * with the EULA and privacy links — is rendered once and shared by both
   * layouts, so no App Store requirement can go missing from one of them.
   */
  layout?: "cards" | "table";
  labels?: PricingLabels;
  /** Widened to carry vars: two table cells interpolate {n}. Every existing
   *  caller already passes a translator of this shape. */
  translateFeature?: (key: string, vars?: Record<string, string | number>) => string;
  /** True when the request came from the native iOS shell (detected
   *  server-side via User-Agent). When set, external USD prices and the Stripe
   *  footer are never rendered at all — not just hidden client-side by
   *  <NativeGate/> (App Store Guideline 3.1.2). NativeGate stays as a
   *  client-side second line of defense for requests where the UA is absent. */
  isNative?: boolean;
  /**
   * Which billing period the prices, the periods beside them, and the
   * purchase buttons all describe. One value feeding all three is the point:
   * a page that shows an annual price under a "/month" label is the
   * Guideline 3.1.2(c) failure this whole prop exists to prevent.
   */
  cadence?: Cadence;
  /**
   * Where the toggle links. Given a path, the toggle renders and switches by
   * navigation — the grid stays a Server Component and no client state is
   * introduced anywhere near the purchase screen. Omitted (the landing page)
   * there is no toggle and everything reads monthly, exactly as before.
   */
  cadenceBasePath?: string;
}) {
  // Same fallback the feature list uses below: with no translator the keys
  // show through rather than the component failing.
  const t = translateFeature ?? ((key: string) => key);

  const yearly = cadence === "yearly";
  const columns = tableColumns(cadence, labels);

  return (
    <div className="space-y-5">
      {/* Monthly / Yearly. Two links rather than a switch: the page is already
          dynamic, so the server re-renders with the other set of prices and
          nothing has to be kept in sync on the client. */}
      {cadenceBasePath && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-line bg-paper p-1">
            <Link
              href={cadenceBasePath}
              aria-current={!yearly}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                !yearly ? "bg-pine text-cream" : "text-muted hover:text-pine"
              }`}
            >
              {labels.toggleMonthly ?? DEFAULT_LABELS.toggleMonthly}
            </Link>
            <Link
              href={`${cadenceBasePath}?cadence=yearly`}
              aria-current={yearly}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                yearly ? "bg-pine text-cream" : "text-muted hover:text-pine"
              }`}
            >
              {labels.toggleYearly ?? DEFAULT_LABELS.toggleYearly}
            </Link>
          </div>
        </div>
      )}

      {layout === "table" && (
        <PlanComparisonTable
          columns={columns}
          cadence={cadence}
          currentPlan={currentPlan}
          hasActiveSubscription={hasActiveSubscription}
          billingSource={billingSource}
          isNative={isNative}
          checkoutEnabled={labels.checkoutEnabled}
          t={t}
        />
      )}

      {/* Wrapper only. The card markup below deliberately keeps its original
          indentation so this stays a two-line change instead of a re-indent
          of ~170 lines that would bury any real edit — the same shape as
          LandingPageNew's `{!isNative && (` guard around its pricing block. */}
      {layout === "cards" && (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier) => {
          const isCurrent = mode === "upgrade" && currentPlan === tier.id;
          const isComingSoon = tier.comingSoon === true;

          // Coming-soon tiers (e.g. Teacher) carry a hardcoded Stripe USD price
          // and aren't registered as IAP products. On native, don't render them
          // at all — server-side (App Store Guideline 3.1.2).
          if (isNative && isComingSoon) return null;

          // Pro is off sale. Kept for whoever is already on it, on the same
          // reasoning as the table's button row: their card is a "Current
          // plan" marker, not an offer. Only the cards layout reaches this —
          // /upgrade and /welcome-plans both render layout="table" — but the
          // two layouts are supposed to state the same thing, and leaving one
          // of them selling Pro is how they drift apart.
          if (tier.id === "pro" && !isProEnabled() && !isCurrent) return null;

          const card = (
            <Card
              key={tier.id}
              className={[
                "relative flex flex-col p-6",
                tier.highlight ? "ring-2 ring-moss" : "",
                isComingSoon ? "opacity-70" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pine px-3 py-1 text-[11px] font-bold text-cream">
                  {labels.mostPopular}
                </span>
              )}
              {isComingSoon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-cream">
                  {labels.comingSoon}
                </span>
              )}

              <h2 className="font-serif text-xl font-bold text-pine">{tier.name}</h2>
              <p className="mt-1">
                {mode === "upgrade" && (tier.id === "plus" || tier.id === "pro") ? (
                  <PlanPrice
                    plan={tier.id}
                    fallback={(yearly && tier.hasYearly ? tier.yearlyPrice : tier.price) ?? tier.price}
                    cadence={yearly && tier.hasYearly ? labels.cadenceYear : labels.cadenceMonth}
                    billingPeriod={tier.hasYearly ? cadence : "monthly"}
                    isNative={isNative}
                  />
                ) : tier.id === "free" ? (
                  // Native shows "Free" — the hardcoded "$0" is an external USD
                  // price (App Store Guideline 3.1.1). Web is unchanged.
                  // Server-side when the native UA is known; NativeGate is the
                  // client-side fallback for requests without the UA.
                  isNative ? (
                    <span className="font-serif text-3xl font-bold text-pine">
                      {labels.freeNativePrice ?? DEFAULT_LABELS.freeNativePrice}
                    </span>
                  ) : (
                    <NativeGate
                      fallback={
                        <span className="font-serif text-3xl font-bold text-pine">
                          {labels.freeNativePrice ?? DEFAULT_LABELS.freeNativePrice}
                        </span>
                      }
                    >
                      <span className="font-serif text-3xl font-bold text-pine">
                        {tier.price}
                      </span>
                    </NativeGate>
                  )
                ) : (
                  <>
                    <span className="font-serif text-3xl font-bold text-pine">
                      {yearly && tier.hasYearly ? tier.yearlyPrice : tier.price}
                    </span>
                    {/* Free was handled by the branch above, so every tier
                        reaching here is a paid one and must state its period.
                        Teacher has no annual price, so it keeps saying
                        /month whatever the toggle says. */}
                    <span className="text-sm text-muted">
                      {yearly && tier.hasYearly ? labels.cadenceYear : labels.cadenceMonth}
                    </span>
                  </>
                )}
              </p>

              {(tier.taglineKey || tier.tagline) && (
                <p className="mt-2 min-h-[2.5rem] text-xs leading-snug text-ink/60">
                  {translateFeature && tier.taglineKey
                    ? translateFeature(tier.taglineKey)
                    : (tier.tagline ?? "")}
                </p>
              )}

              <ul className="mt-4 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-ink/80"
                  >
                    <Icon.check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isComingSoon ? "text-muted" : "text-moss"
                      }`}
                    />
                    {translateFeature ? translateFeature(f) : f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isComingSoon ? (
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted"
                  >
                    {labels.comingSoon}
                  </button>
                ) : isCurrent ? (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full rounded-full border border-line bg-mint/50 px-4 py-2.5 text-sm font-semibold text-pine"
                    >
                      {labels.currentPlan}
                    </button>
                    {billingSource === "apple_iap" && (
                      <a
                        href="https://apps.apple.com/account/subscriptions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs text-muted underline"
                      >
                        {labels.manageInAppInstructions}
                      </a>
                    )}
                  </div>
                ) : mode === "landing" && tier.id === "free" ? (
                  <Link
                    href="/signup"
                    className="block w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-pine/90"
                  >
                    {labels.startFree}
                  </Link>
                ) : mode === "upgrade" && (tier.id === "plus" || tier.id === "pro") ? (
                  <PurchaseButton
                    plan={tier.id}
                    cadence={cadence}
                    billingSource={billingSource}
                    hasActiveSubscription={hasActiveSubscription}
                    checkoutEnabled={labels.checkoutEnabled}
                  />
                ) : mode === "landing" && labels.checkoutEnabled && (tier.id === "plus" || tier.id === "pro") ? (
                  <CheckoutButton plan={tier.id} cadence={cadence} />
                ) : (
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted"
                  >
                    {labels.upgradeSoon}
                  </button>
                )}
              </div>
            </Card>
          );

          // Web path: coming-soon tiers are still wrapped in NativeGate as a
          // client-side fallback (the isNative server skip above already
          // handles the native-UA case).
          return isComingSoon ? (
            <NativeGate key={tier.id}>{card}</NativeGate>
          ) : (
            card
          );
        })}
      </div>
      )}

      {/* Restore Purchases — App Store Review Guideline 3.1.1 requires a
          discrete control the user can tap. Native only: there is nothing to
          restore on web (Stripe), and the RevenueCat plugin is a native
          plugin. Placed above the billing notice so it sits with the purchase
          buttons rather than below the legal footnotes. */}
      {isNative && (
        <div className="mx-auto max-w-xs">
          <RestorePurchasesButton />
        </div>
      )}

      {isNative ? (
        <p className="text-center text-xs text-muted">
          {labels.nativeBillingNotice ?? DEFAULT_LABELS.nativeBillingNotice}
        </p>
      ) : (
        <NativeGate
          fallback={
            <p className="text-center text-xs text-muted">
              {labels.nativeBillingNotice ?? DEFAULT_LABELS.nativeBillingNotice}
            </p>
          }
        >
          <p className="text-center text-xs text-muted">
            {labels.betaNotice}
          </p>
        </NativeGate>
      )}

      {/* Renewal terms + EULA / privacy links, directly below the purchase
          buttons. Required on the subscription purchase screen itself by App
          Store Review Guideline 3.1.2(c) (the App Store rejection of build 3
          cited this). Rendered on web too — the same disclosure is expected
          there, and keeping one code path avoids the links silently
          disappearing if the native detection ever changes. Same-origin
          routes, so <Link> navigates in place inside the iOS WebView. */}
      <p className="text-center text-xs text-muted">
        {labels.legalIntro ?? DEFAULT_LABELS.legalIntro}{" "}
        <Link href="/terms" className="font-semibold text-moss-600 underline hover:text-pine">
          {labels.termsLink ?? DEFAULT_LABELS.termsLink}
        </Link>
        {" · "}
        <Link href="/privacy" className="font-semibold text-moss-600 underline hover:text-pine">
          {labels.privacyLink ?? DEFAULT_LABELS.privacyLink}
        </Link>
      </p>
    </div>
  );
}
