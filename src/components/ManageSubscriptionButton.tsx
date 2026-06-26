"use client";
import { useState } from "react";
import { useT } from "@/contexts/locale";

export function ManageSubscriptionButton() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
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
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/40 disabled:opacity-60"
      >
        {loading ? t("stripe.managingSubscription") : t("stripe.manageSubscription")}
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-red-500">{t("stripe.portalError")}</p>
      )}
    </div>
  );
}
