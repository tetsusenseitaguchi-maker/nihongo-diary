import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { type Plan } from "@/lib/plans";

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
      "1 AI correction / day",
      "300 characters per entry",
      "Unlimited diary saves",
      "Full correction details (explanation, vocabulary, practice drills)",
      "All correction styles incl. Native",
      "Follow / Feed / Reactions",
      "Mini Lesson Preview after each correction",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$9",
    cadence: "/month",
    highlight: true,
    features: [
      "5 AI corrections / day",
      "500 characters per entry",
      "Everything in Free",
      "Mini Lesson Library — all 20 lessons",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    cadence: "/month",
    features: [
      "10 AI corrections / day",
      "500 characters per entry",
      "Everything in Plus",
      "Mini Lesson Review Drills (AI-generated)",
    ],
  },
  {
    id: "teacher_feedback",
    name: "Teacher",
    price: "$49",
    cadence: "/month",
    comingSoon: true,
    features: [
      "Personal feedback from Tetsu-sensei",
      "Everything in Pro",
      "Limited spots",
    ],
  },
];

/**
 * Shared pricing grid used on both the landing page and /upgrade.
 *
 * mode="landing"  — Free tier shows a real "Start for free" link to /signup.
 *                   No "current plan" detection (user may not be logged in).
 * mode="upgrade"  — All CTAs are disabled buttons. Pass currentPlan to
 *                   highlight the user's active tier.
 */
export function PricingGrid({
  currentPlan,
  mode = "landing",
}: {
  currentPlan?: Plan;
  mode?: "landing" | "upgrade";
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => {
          const isCurrent = mode === "upgrade" && currentPlan === t.id;
          const isComingSoon = t.comingSoon === true;

          return (
            <Card
              key={t.id}
              className={[
                "relative flex flex-col p-6",
                t.highlight ? "ring-2 ring-moss" : "",
                isComingSoon ? "opacity-70" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pine px-3 py-1 text-[11px] font-bold text-cream">
                  Most popular
                </span>
              )}
              {isComingSoon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-cream">
                  Coming soon
                </span>
              )}

              <h2 className="font-serif text-xl font-bold text-pine">{t.name}</h2>
              <p className="mt-1">
                <span className="font-serif text-3xl font-bold text-pine">
                  {t.price}
                </span>
                {t.cadence && (
                  <span className="text-sm text-muted">{t.cadence}</span>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-ink/80"
                  >
                    <Icon.check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isComingSoon ? "text-muted" : "text-moss"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isComingSoon ? (
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted"
                  >
                    Coming soon
                  </button>
                ) : isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-mint/50 px-4 py-2.5 text-sm font-semibold text-pine"
                  >
                    Current plan
                  </button>
                ) : mode === "landing" && t.id === "free" ? (
                  <Link
                    href="/signup"
                    className="block w-full rounded-full bg-pine px-4 py-2.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-pine/90"
                  >
                    Start for free
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted"
                  >
                    Upgrade soon
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Payments aren&apos;t live yet — this is a public beta. Pricing may
        change before launch.
      </p>
    </div>
  );
}
