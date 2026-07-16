"use client";

import { useEffect, useState } from "react";
import type { PaidPlan } from "@/lib/stripe";
import { IAP_PRODUCT_IDS } from "@/lib/revenuecat";

// Same native-detection pattern as PurchaseButton.tsx/NativeGate.tsx.
type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
const isNativeApp =
  typeof window !== "undefined" && !!(window as CapWindow).Capacitor?.isNativePlatform?.();

/**
 * Shows the real App Store price (product.priceString) on native.
 *
 * Web shows the static USD `fallback`. Native NEVER shows the USD fallback —
 * that price ($9/$19) is an external price under App Store Guideline 3.1.2 and
 * would flash before the IAP price resolves (worse on slow connections). While
 * the IAP price loads, native shows a skeleton instead.
 *
 * `isNative` is the server-authoritative flag (request UA); `isNativeApp` is
 * the client-side check used to actually fetch. Either one suppresses the USD
 * fallback, so the skeleton is rendered in the SSR HTML sent to the native app
 * — not just swapped in after hydration.
 */
export function PlanPrice({
  plan,
  fallback,
  cadence,
  isNative = false,
}: {
  plan: PaidPlan;
  fallback: string;
  cadence?: string;
  isNative?: boolean;
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
        // Keep showing the skeleton on native (never fall back to USD).
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  // On native, never render the USD fallback — show the IAP price once loaded,
  // otherwise a skeleton. On web, show the static fallback.
  const suppressUsdFallback = isNative || isNativeApp;
  const display = suppressUsdFallback ? price : fallback;

  return (
    <>
      {display ? (
        <span className="font-serif text-3xl font-bold text-pine">{display}</span>
      ) : (
        <span
          aria-hidden
          className="inline-block h-8 w-16 animate-pulse rounded-md bg-line/50 align-middle"
        />
      )}
      {cadence && <span className="text-sm text-muted">{cadence}</span>}
    </>
  );
}
