"use client";

import { useEffect } from "react";

// Runs only inside the Capacitor iOS native app. Configures RevenueCat once
// per app session, tying purchases to this user's Supabase id (appUserID) so
// a future RevenueCat webhook can match back to profiles.id.
export function RevenueCatInit({ userId }: { userId: string }) {
  useEffect(() => {
    void configurePurchases(userId);
  }, [userId]);

  return null;
}

async function configurePurchases(userId: string) {
  // Only run inside Capacitor native shell — same window.Capacitor global
  // pattern used everywhere else in this codebase (no static @capacitor/core
  // import, so it stays out of the web bundle's evaluation path).
  type CapWindow = Window & {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  };
  const cap = (window as CapWindow).Capacitor;
  if (!cap?.isNativePlatform?.()) return;

  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    // iOS-only app — no Android build target — but keep the check explicit
    // and self-documenting in case that ever changes.
    if (cap.getPlatform?.() === "ios") {
      await Purchases.configure({
        apiKey: "test_hgxAFzLTypgtCAUcqGeFtkzCbHN",
        appUserID: userId,
      });
    }
  } catch (e) {
    console.error("[RevenueCat] configure failed:", e);
  }
}
