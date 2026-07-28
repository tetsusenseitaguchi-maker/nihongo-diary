"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/contexts/locale";

type Status = "idle" | "restored" | "none" | "error";

/**
 * "Restore Purchases" — required as a discrete, user-tappable control by App
 * Store Review Guideline 3.1.1 (restoring silently at launch does not satisfy
 * it, and this app never did that anyway).
 *
 * Only rendered inside the native iOS shell; callers gate on `isNative`.
 *
 * Like IAPPurchaseButton, this deliberately does NOT write profiles.plan or
 * billing_source from the client. RevenueCat's webhook is the only writer for
 * those; restoring re-links the App Store receipt to this appUserID on
 * RevenueCat's side, and the webhook follows. router.refresh() re-reads the
 * profile so the new plan shows once that has landed — which is why the
 * success copy tells the user it may take a moment.
 */
export function RestorePurchasesButton({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    setLoading(true);
    setStatus("idle");
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo } = await Purchases.restorePurchases();

      // An App Store receipt with nothing active on it restores successfully
      // but grants no entitlement — that is "nothing to restore", not an
      // error, and must not be reported as one.
      const hasEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasEntitlement) {
        setStatus("restored");
        router.refresh();
      } else {
        setStatus("none");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const message =
    status === "restored"
      ? t("iap.restoreSuccess")
      : status === "none"
        ? t("iap.restoreNone")
        : status === "error"
          ? t("iap.restoreError")
          : null;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "w-full rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-pine transition-opacity hover:opacity-90 disabled:opacity-60"
        }
      >
        {loading ? t("iap.restoring") : t("iap.restore")}
      </button>
      {message && (
        <p
          className={`mt-1.5 text-center text-xs ${
            status === "error" ? "text-red-500" : "text-muted"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
