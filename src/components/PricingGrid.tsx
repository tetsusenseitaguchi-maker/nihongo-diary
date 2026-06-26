import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { type Plan } from "@/lib/plans";
import { CheckoutButton } from "@/components/CheckoutButton";

type Tier = {
  id: Plan;
  name: string;
  price: string;
  cadence?: string;
  highlight?: boolean;
  comingSoon?: boolean;
  features: string[];
};

// Single source of truth for all plan tiers.
// Both /upgrade page and the landing page read from here.
export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: [
      "pricing.features.free.1",
      "pricing.features.free.2",
      "pricing.features.free.3",
      "pricing.features.free.4",
      "pricing.features.free.5",
      "pricing.features.free.6",
      "pricing.features.free.7",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$9",
    cadence: "/month",
    highlight: true,
    features: [
      "pricing.features.plus.1",
      "pricing.features.plus.2",
      "pricing.features.plus.3",
      "pricing.features.plus.4",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    cadence: "/month",
    features: [
      "pricing.features.pro.1",
      "pricing.features.pro.2",
      "pricing.features.pro.3",
      "pricing.features.pro.4",
    ],
  },
  {
    id: "teacher_feedback",
    name: "Teacher",
    price: "$49",
    cadence: "/month",
    comingSoon: true,
    features: [
      "pricing.features.teacher.1",
      "pricing.features.teacher.2",
      "pricing.features.teacher.3",
    ],
  },
];

export type PricingLabels = {
  mostPopular: string;
  comingSoon: string;
  currentPlan: string;
  startFree: string;
  upgradeSoon: string;
  betaNotice: string;
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
  mode = "landing",
  labels = DEFAULT_LABELS,
  translateFeature,
}: {
  currentPlan?: Plan;
  mode?: "landing" | "upgrade";
  labels?: PricingLabels;
  translateFeature?: (key: string) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier) => {
          const isCurrent = mode === "upgrade" && currentPlan === tier.id;
          const isComingSoon = tier.comingSoon === true;

          return (
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
                <span className="font-serif text-3xl font-bold text-pine">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-muted">{tier.cadence}</span>
                )}
              </p>

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
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-mint/50 px-4 py-2.5 text-sm font-semibold text-pine"
                  >
                    {labels.currentPlan}
                  </button>
                ) : mode === "landing" && tier.id === "free" ? (
                  <Link
                    href="/signup"
                    className="block w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-pine/90"
                  >
                    {labels.startFree}
                  </Link>
                ) : labels.checkoutEnabled && (tier.id === "plus" || tier.id === "pro") ? (
                  <CheckoutButton plan={tier.id} />
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
        })}
      </div>

      <p className="text-center text-xs text-muted">
        {labels.betaNotice}
      </p>
    </div>
  );
}
