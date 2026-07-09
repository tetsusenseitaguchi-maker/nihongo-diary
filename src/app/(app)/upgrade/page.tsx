import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, PLAN_LABELS } from "@/lib/plans";
import { PricingGrid } from "@/components/PricingGrid";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { NativeGate } from "@/components/NativeGate";
import { Card } from "@/components/ui";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, t] = await Promise.all([
    supabase.from("profiles").select("plan, stripe_customer_id, stripe_subscription_id").eq("id", user.id).single(),
    getServerT(),
  ]);
  const plan = normalizePlan(profile?.plan);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted">{t("upgrade.plansLabel")}</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">{t("upgrade.title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink/70">
          {t("upgrade.description")}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-mint/50 px-4 py-1.5 text-sm font-semibold text-pine">
          <span className="h-2 w-2 rounded-full bg-moss" />
          {t("upgrade.currentPlan", { plan: PLAN_LABELS[plan] })}
        </div>
      </div>

      <NativeGate
        fallback={
          <Card className="mx-auto max-w-sm p-6 text-center">
            <h2 className="font-serif text-lg font-bold text-pine">{t("upgrade.nativeFallbackTitle")}</h2>
            <p className="mt-2 text-sm text-ink/70">
              {profile?.stripe_customer_id
                ? t("upgrade.nativeFallbackDescSub")
                : t("upgrade.nativeFallbackDescFree")}
            </p>
            {profile?.stripe_customer_id && (
              <div className="mt-4 flex justify-center">
                <ManageSubscriptionButton />
              </div>
            )}
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-moss-600 hover:text-pine">
              {t("upgrade.nativeFallbackBack")}
            </Link>
          </Card>
        }
      >
        <PricingGrid
          currentPlan={plan}
          hasActiveSubscription={!!profile?.stripe_subscription_id}
          mode="upgrade"
          translateFeature={t}
          labels={{
            mostPopular: t("pricing.mostPopular"),
            comingSoon: t("pricing.comingSoon"),
            currentPlan: t("pricing.currentPlan"),
            startFree: t("pricing.startFree"),
            upgradeSoon: t("pricing.upgradeSoon"),
            betaNotice: t("pricing.betaNotice"),
            checkoutEnabled: true,
          }}
        />
      </NativeGate>
    </div>
  );
}
