"use client";

import { useT } from "@/contexts/locale";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import type { PaidPlan } from "@/lib/stripe";

// Same native-detection pattern as NativeGate.tsx: evaluated once at module
// scope. Server-rendered pass has no `window`, so this is false during SSR
// and corrects itself on client hydration inside the Capacitor shell.
type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
const isNativeApp =
  typeof window !== "undefined" && !!(window as CapWindow).Capacitor?.isNativePlatform?.();

function ManagedElsewhereNotice({ text }: { text: string }) {
  return (
    <button
      disabled
      className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-muted"
    >
      {text}
    </button>
  );
}

/**
 * Resolves which purchase mechanism to show for a paid tier (plus/pro) on
 * the /upgrade page: platform (native IAP vs web Stripe) crossed with
 * billing_source (which rail, if any, the user is already on). Centralizes
 * that so PricingGrid.tsx's own branching doesn't have to grow a third axis.
 */
export function PurchaseButton({
  plan,
  billingSource,
  hasActiveSubscription,
  checkoutEnabled,
}: {
  plan: PaidPlan;
  billingSource: "stripe" | "apple_iap" | null;
  hasActiveSubscription: boolean;
  checkoutEnabled?: boolean;
}) {
  const t = useT();

  if (isNativeApp) {
    if (billingSource === "stripe") {
      return <ManagedElsewhereNotice text={t("pricing.manageOnWeb")} />;
    }
    // TODO(next step): replace with <IAPPurchaseButton plan={plan} />
    return <ManagedElsewhereNotice text={t("pricing.upgradeSoon")} />;
  }

  // Web
  if (billingSource === "apple_iap") {
    return <ManagedElsewhereNotice text={t("pricing.manageInApp")} />;
  }
  if (hasActiveSubscription) {
    return <ManageSubscriptionButton />;
  }
  if (checkoutEnabled) {
    return <CheckoutButton plan={plan} />;
  }
  return <ManagedElsewhereNotice text={t("pricing.upgradeSoon")} />;
}
