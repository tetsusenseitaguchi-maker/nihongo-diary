"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/contexts/locale";
import type { PaidPlan } from "@/lib/stripe";
import { IAP_PRODUCT_IDS } from "@/lib/revenuecat";

interface Props {
  plan: PaidPlan;
  className?: string;
}

export function IAPPurchaseButton({ plan, className }: Props) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const label = plan === "pro" ? t("stripe.upgradeToPro") : t("stripe.upgradeToPlus");

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");

      const offerings = await Purchases.getOfferings();
      const productId = IAP_PRODUCT_IDS[plan];
      const pkg = offerings.current?.availablePackages.find(
        (p) => p.product.identifier === productId,
      );
      if (!pkg) {
        setError(true);
        setLoading(false);
        return;
      }

      await Purchases.purchasePackage({ aPackage: pkg });

      // Purchase succeeded on-device. profiles.plan / billing_source update
      // asynchronously once the RevenueCat webhook (INITIAL_PURCHASE)
      // lands — not guaranteed to have happened yet, but refreshing is
      // simple and correct in the common case (per project decision, no
      // optimistic client-side entitlement check for now).
      router.refresh();
    } catch (e) {
      const cancelled = (e as { userCancelled?: boolean } | null)?.userCancelled;
      if (!cancelled) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "w-full rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        }
      >
        {loading ? t("stripe.upgrading") : label}
      </button>
      {error && (
        <p className="mt-1.5 text-center text-xs text-red-500">
          {t("stripe.checkoutError")}
        </p>
      )}
    </div>
  );
}
