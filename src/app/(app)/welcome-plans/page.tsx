import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";
import { PricingGrid } from "@/components/PricingGrid";
import { PlansIntroSkipButton } from "@/components/PlansIntroSkipButton";
import { PlansIntroSeenMarker } from "@/components/PlansIntroSeenMarker";
import { getServerT } from "@/lib/i18n-server";
import { isNativeRequest } from "@/lib/native";
import { isNewAccount } from "@/lib/plans-intro/seen";
import { parseCadence } from "@/lib/stripe";

/**
 * One-time "here are the paid plans" screen, shown straight after signup.
 *
 * Sits between /profile-setup and /dashboard. Deliberately a route of its own
 * rather than a modal on the dashboard: TourGuide auto-starts the onboarding
 * tour 800ms after /dashboard mounts and paints a full-screen mask at
 * z-index 10000, so anything overlaid there would either fight the mask or
 * force a change to the tour's auto-start rules. A separate route needs
 * neither — the tour still starts on arrival at /dashboard, exactly as before,
 * and nothing under src/lib/tour or src/components/tour is touched.
 *
 * Not a hard sell: the skip control below is at least as prominent as the
 * purchase buttons, and skipping lands the user on a fully usable free plan.
 *
 * force-dynamic because isNativeRequest() reads headers(), same as /upgrade.
 */
export const dynamic = "force-dynamic";

export default async function WelcomePlansPage({
  searchParams,
}: {
  searchParams: Promise<{ cadence?: string | string[] }>;
}) {
  // Same allowlist as /upgrade — this screen sells the same subscriptions.
  const cadence = parseCadence((await searchParams).cadence);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, t, isNative] = await Promise.all([
    // A query of its own, not an extra column bolted onto an existing plan
    // read. Every column here already exists in production (schema.sql,
    // plans.sql, add-revenuecat-columns.sql), but keeping it separate is the
    // structural guarantee: if this select ever fails, it degrades to the
    // redirect below and cannot make some other caller read a null profile
    // and fall through to "free".
    supabase
      .from("profiles")
      .select("plan, billing_source, stripe_subscription_id, created_at")
      .eq("id", user.id)
      .single(),
    getServerT(),
    isNativeRequest(),
  ]);

  // The server-side backstop under the localStorage flag, and the reason
  // /profile-setup can route here at all: that screen is not new-user-only —
  // it is also the "Edit profile" destination from profile/page.tsx and
  // dashboard/page.tsx — so an existing subscriber must never land on a plan
  // pitch by editing their profile. isNewAccount fails closed, so a missing
  // row or an unreadable created_at goes quietly to the dashboard. Shared with
  // profile-setup, which has to reach the same verdict or the user would be
  // sent here and bounced straight back.
  if (!isNewAccount(profile?.created_at)) {
    redirect("/dashboard");
  }

  const plan = normalizePlan(profile?.plan);

  return (
    <div className="space-y-6">
      {/* Renders nothing; writes the "shown" flag as soon as this mounts.
          Marking on the way out was not enough — leaving by subscribing never
          touches the skip control, so a new subscriber editing their profile
          inside the account window used to meet the pitch again. Same rule the
          tour follows: shown once, not dismissed once. */}
      <PlansIntroSeenMarker />

      <div className="text-center">
        <p className="text-sm font-medium text-muted">{t("welcomePlans.label")}</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">
          {t("welcomePlans.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink/70">{t("welcomePlans.description")}</p>
      </div>

      {/*
        Skip, above the grid so it is on screen without scrolling on a phone.
        size="lg" (h-12, full width) makes it taller than the purchase buttons
        inside PricingGrid (px-4 py-2.5 text-sm), so the way out is never the
        less visible option — App Store Review Guideline 2.1 / 3.1.1 take a dim
        view of onboarding that reads as pay-to-continue, and this screen is
        explicitly not that. A second copy sits below the grid for anyone who
        scrolled past this one.
      */}
      <div className="mx-auto max-w-xs">
        <PlansIntroSkipButton label={t("welcomePlans.skip")} />
        <p className="mt-2 text-center text-xs text-muted">{t("welcomePlans.skipHint")}</p>
      </div>

      {/*
        mode="upgrade" is required, not stylistic. In mode="landing" PricingGrid
        renders tier.price directly, which would put the hardcoded USD "$9" /
        "$19" in front of the native iOS shell (App Store Guideline 3.1.1/3.1.2 —
        external pricing). mode="upgrade" routes plus/pro through <PlanPrice/>,
        which shows the real StoreKit priceString on native and never falls back
        to USD.
        isNative comes from the request User-Agent, so the native build never
        receives the Stripe markup at all — <NativeGate/> alone would ship it and
        only hide it after hydration. It also drives PricingGrid's own native
        handling: the Teacher tier is dropped, the Stripe footer is swapped for
        the Apple billing notice, and Restore Purchases is rendered (3.1.1).
        For a brand-new account billing_source and stripe_subscription_id are
        both null, so PurchaseButton resolves to <IAPPurchaseButton/> on native
        and <CheckoutButton/> on web — Stripe is unreachable from the iOS app by
        construction. Both are read here rather than assumed null so that a user
        who has already bought sees the correct state.

        layout="table" is the first place the comparison table is rendered, and
        this screen is deliberately the first: nothing routes here yet, so it
        can be checked on a device before /upgrade — the actual purchase
        screen — is switched over. /upgrade stays on the cards until then.
        The table drops Teacher on web too, not only on native, since Teacher
        is unbuyable and PLAN_LIMITS gives it Pro's limits exactly; it appears
        as a NativeGate'd note underneath instead. Everything the App Store
        requires below the tiers — Restore Purchases, the Apple billing notice,
        the renewal terms and the EULA/privacy links — is rendered by
        PricingGrid itself and is identical under either layout.
      */}
      <PricingGrid
        currentPlan={plan}
        hasActiveSubscription={!!profile?.stripe_subscription_id}
        billingSource={(profile?.billing_source as "stripe" | "apple_iap" | null) ?? null}
        mode="upgrade"
        layout="table"
        cadence={cadence}
        cadenceBasePath="/welcome-plans"
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

      <div className="mx-auto max-w-xs">
        <PlansIntroSkipButton label={t("welcomePlans.skip")} />
      </div>
    </div>
  );
}
