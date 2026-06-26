import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n-server";
import { normalizePlan } from "@/lib/plans";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ plan?: string; session_id?: string }>;
}

// Features shown on the success page for each plan
const PLAN_FEATURES = {
  plus: ["stripe.success.plus.f1", "stripe.success.plus.f2", "stripe.success.plus.f3"],
  pro: [
    "stripe.success.pro.f1",
    "stripe.success.pro.f2",
    "stripe.success.pro.f3",
    "stripe.success.pro.f4",
  ],
} as const;

export default async function UpgradeSuccessPage({ searchParams }: Props) {
  const { plan: planParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Authoritative plan from DB (set by webhook)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  // Use the query param for display (fast), DB is the source of truth for gating
  const displayPlan = normalizePlan(planParam ?? profile?.plan);
  if (displayPlan === "free") redirect("/upgrade");

  const t = await getServerT();
  const planLabel = displayPlan === "pro" ? "Pro" : "Plus";
  const features =
    (PLAN_FEATURES as Record<string, readonly string[]>)[displayPlan] ?? PLAN_FEATURES.plus;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-8 text-center">
      {/* Animated checkmark */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mint ring-4 ring-mint ring-offset-4 ring-offset-cream">
        <Icon.check className="h-9 w-9 text-pine" />
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-pine">
          {t("stripe.success.title", { plan: planLabel })}
        </h1>
        <p className="mt-2 text-ink/70">{t("stripe.success.subtitle")}</p>
      </div>

      {/* Unlocked features */}
      <Card className="w-full p-6 text-left">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
          {t("stripe.success.unlocked")}
        </p>
        <ul className="space-y-2.5">
          {features.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-sm text-ink/80">
              <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              {t(key)}
            </li>
          ))}
        </ul>
      </Card>

      {/* CTAs */}
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/write"
          className="w-full rounded-full bg-pine px-6 py-3 text-center font-bold text-cream shadow-lift transition-opacity hover:opacity-90"
        >
          {t("stripe.success.startWriting")}
        </Link>
        <Link
          href="/dashboard"
          className="w-full rounded-full border border-line bg-paper px-6 py-3 text-center text-sm font-semibold text-pine hover:bg-mint/40"
        >
          {t("stripe.success.dashboard")}
        </Link>
      </div>
    </div>
  );
}
