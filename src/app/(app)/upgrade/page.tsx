import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { normalizePlan, PLAN_LABELS, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Tier = {
  id: Plan;
  name: string;
  price: string;
  cadence?: string;
  highlight?: boolean;
  features: string[];
  cta: "current" | "soon" | "coming-soon";
};

const TIERS: Tier[] = [
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
    cta: "soon",
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
    cta: "soon",
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
    cta: "soon",
  },
  {
    id: "teacher_feedback",
    name: "Teacher",
    price: "$49",
    cadence: "/month",
    features: [
      "Personal feedback from Tetsu-sensei",
      "Everything in Pro",
      "Limited spots",
    ],
    cta: "coming-soon",
  },
];

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const plan = normalizePlan(profile?.plan);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted">Plans</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">Grow your Japanese habit</h1>
        <p className="mx-auto mt-2 max-w-md text-ink/70">
          Start free. Upgrade when you want more corrections, longer entries, and AI review drills. 🌸
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-mint/50 px-4 py-1.5 text-sm font-semibold text-pine">
          <span className="h-2 w-2 rounded-full bg-moss" />
          現在のプラン: {PLAN_LABELS[plan]}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => {
          const isCurrent = t.id === plan;
          const isComingSoon = t.cta === "coming-soon";
          return (
            <Card
              key={t.id}
              className={`relative flex flex-col p-6 ${t.highlight ? "ring-2 ring-moss" : ""} ${isComingSoon ? "opacity-70" : ""}`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pine px-3 py-1 text-[11px] font-bold text-cream">
                  Most popular
                </span>
              )}
              {isComingSoon && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-cream">
                  Coming soon
                </span>
              )}
              <h2 className="font-serif text-xl font-bold text-pine">{t.name}</h2>
              <p className="mt-1">
                <span className="font-serif text-3xl font-bold text-pine">{t.price}</span>
                {t.cadence && <span className="text-sm text-muted">{t.cadence}</span>}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink/80">
                    <Icon.check className={`mt-0.5 h-4 w-4 shrink-0 ${isComingSoon ? "text-muted" : "text-moss"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isComingSoon ? (
                  <button disabled className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted">
                    Coming soon
                  </button>
                ) : isCurrent ? (
                  <button disabled className="w-full rounded-full border border-line bg-mint/50 px-4 py-2.5 text-sm font-semibold text-pine">
                    Current plan
                  </button>
                ) : (
                  <button disabled className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted">
                    Upgrade soon
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Payments aren&apos;t live yet — this is a public beta. Pricing may change before launch.
      </p>
    </div>
  );
}
