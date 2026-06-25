import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, PLAN_LABELS } from "@/lib/plans";
import { PricingGrid } from "@/components/PricingGrid";

export const dynamic = "force-dynamic";

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

      <PricingGrid currentPlan={plan} mode="upgrade" />
    </div>
  );
}
