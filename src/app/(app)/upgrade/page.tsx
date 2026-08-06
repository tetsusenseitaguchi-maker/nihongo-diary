import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, PLAN_LABELS } from "@/lib/plans";
import { PricingGrid } from "@/components/PricingGrid";
import { getServerT } from "@/lib/i18n-server";
import { isNativeRequest } from "@/lib/native";
import { parseCadence, isYearlyEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ cadence?: string | string[] }>;
}) {
  // Whoever is typing owns this value, so it goes through the same one-item
  // allowlist the checkout route uses. Anything else is monthly.
  const cadence = parseCadence((await searchParams).cadence);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, t, isNative] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, stripe_customer_id, stripe_subscription_id, billing_source")
      .eq("id", user.id)
      .single(),
    getServerT(),
    isNativeRequest(),
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

      {/*
        layout="table" — the comparison table replaces the tier cards here,
        after running on /welcome-plans first. Only the tiers change shape.
        Everything the App Store requires below them is rendered by PricingGrid
        outside the swapped region and is byte-identical under either layout:
        Restore Purchases (3.1.1), the Stripe-to-Apple footer swap, and the
        renewal terms with the EULA and privacy links (3.1.2(c), which build 3
        was rejected over). The table itself keeps PlanPrice on both paid
        columns, so the native shell still never sees a USD figure.

        This is the live purchase screen: mode="upgrade" and the labels below
        are unchanged, and reverting is deleting this one prop.
      */}
      <PricingGrid
        currentPlan={plan}
        hasActiveSubscription={!!profile?.stripe_subscription_id}
        billingSource={(profile?.billing_source as "stripe" | "apple_iap" | null) ?? null}
        mode="upgrade"
        layout="table"
        cadence={cadence}
        // Undefined hides the toggle entirely. parseCadence above has
        // already forced monthly, so leaving it drawn would offer a
        // switch that changes nothing.
        cadenceBasePath={isYearlyEnabled() ? "/upgrade" : undefined}
        isNative={isNative}
        translateFeature={t}
        labels={{
          mostPopular: t("pricing.mostPopular"),
          comingSoon: t("pricing.comingSoon"),
          currentPlan: t("pricing.currentPlan"),
          startFree: t("pricing.startFree"),
          upgradeSoon: t("pricing.upgradeSoon"),
          betaNotice: t("pricing.betaNotice"),
          manageInAppInstructions: t("pricing.manageInAppInstructions"),
          freeNativePrice: t("pricing.freeNativePrice"),
          nativeBillingNotice: t("pricing.nativeBillingNotice"),
          legalIntro: t("pricing.legalIntro"),
          termsLink: t("pricing.termsLink"),
          privacyLink: t("pricing.privacyLink"),
          cadenceMonth: t("pricing.cadence.month"),
          cadenceYear: t("pricing.cadence.year"),
          toggleMonthly: t("pricing.toggle.monthly"),
          toggleYearly: t("pricing.toggle.yearly"),
          checkoutEnabled: true,
        }}
      />
    </div>
  );
}
