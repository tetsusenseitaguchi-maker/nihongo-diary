"use client";

import { useEffect, useState } from "react";
import type { PaidPlan } from "@/lib/stripe";
import { IAP_PRODUCT_IDS } from "@/lib/revenuecat";

// Same native-detection pattern as PurchaseButton.tsx/NativeGate.tsx.
type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
const isNativeApp =
  typeof window !== "undefined" && !!(window as CapWindow).Capacitor?.isNativePlatform?.();

/**
 * Shows the real App Store price (product.priceString) once fetched on
 * native; always shows the static fallback on web, and on native until the
 * fetch resolves (or if it fails) — never a blank/loading state.
 */
export function PlanPrice({
  plan,
  fallback,
  cadence,
}: {
  plan: PaidPlan;
  fallback: string;
  cadence?: string;
}) {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp) return;
    let cancelled = false;

    (async () => {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages.find(
          (p) => p.product.identifier === IAP_PRODUCT_IDS[plan],
        );
        if (!cancelled && pkg) setPrice(pkg.product.priceString);
      } catch {
        // Keep showing the static fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  return (
    <>
      <span className="font-serif text-3xl font-bold text-pine">{price ?? fallback}</span>
      {cadence && <span className="text-sm text-muted">{cadence}</span>}
    </>
  );
}
