import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";
import { PricingGrid } from "@/components/PricingGrid";
import { LinkButton } from "@/components/ui";
import { getServerT } from "@/lib/i18n-server";
import { isNativeRequest } from "@/lib/native";

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

/**
 * How recently the account must have been created for this screen to show.
 *
 * The real "show it once" flag is localStorage (see the follow-up step; same
 * pattern as lib/tour/seen.ts). This is the server-side backstop underneath
 * it: /profile-setup is *not* new-user-only — it is also the "Edit profile"
 * destination from profile/page.tsx and dashboard/page.tsx — so without this
 * check an existing subscriber editing their profile could be routed to a
 * plan-pitch screen. profiles.created_at already exists (schema.sql), so this
 * costs no migration and no new column.
 *
 * Seven days rather than hours: signup with email confirmation on can leave a
 * real gap between the row being created and the user finishing setup.
 */
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default async function WelcomePlansPage() {
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

  // Fail closed. A missing profile row or a missing/unparseable created_at
  // means we cannot prove this is a new account, and the wrong failure mode
  // here is showing a plan pitch to a paying user — so anything uncertain
  // goes quietly to the dashboard instead.
  const createdAtMs = profile?.created_at ? Date.parse(profile.created_at) : NaN;
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > NEW_ACCOUNT_WINDOW_MS) {
    redirect("/dashboard");
  }

  const plan = normalizePlan(profile?.plan);

  return (
    <div className="space-y-6">
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
        <LinkButton href="/dashboard" variant="secondary" size="lg" className="w-full">
          {t("welcomePlans.skip")}
        </LinkButton>
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
          checkoutEnabled: true,
        }}
      />

      <div className="mx-auto max-w-xs">
        <LinkButton href="/dashboard" variant="secondary" size="lg" className="w-full">
          {t("welcomePlans.skip")}
        </LinkButton>
      </div>
    </div>
  );
}
