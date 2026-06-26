"use client";
import { useState } from "react";
import { useT } from "@/contexts/locale";
import type { PaidPlan } from "@/lib/stripe";

interface Props {
  plan: PaidPlan;
  className?: string;
}

export function CheckoutButton({ plan, className }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const label = plan === "pro" ? t("stripe.upgradeToPro") : t("stripe.upgradeToPlus");

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(true);
        setLoading(false);
      }
    } catch {
      setError(true);
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
