"use client";

import type { ReactNode } from "react";

type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

const isNativeApp =
  typeof window !== "undefined" && !!(window as CapWindow).Capacitor?.isNativePlatform?.();

// Hides paid-upgrade / pricing / beta-labeled UI inside the Capacitor iOS
// shell (App Store Guidelines 3.1.1 and 2.2). Web is unaffected: renders
// children normally unless window.Capacitor reports a native platform.
export function NativeGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  if (isNativeApp) return <>{fallback}</>;
  return <>{children}</>;
}
