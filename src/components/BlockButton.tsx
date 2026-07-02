"use client";

import { useState } from "react";
import { useT } from "@/contexts/locale";

type Step = "closed" | "confirm";

export function BlockButton({
  targetUserId,
  initialBlocked,
  className = "",
}: {
  targetUserId: string;
  initialBlocked: boolean;
  className?: string;
}) {
  const t = useT();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [step, setStep] = useState<Step>("closed");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setStep("confirm");
  }

  function closeModal() {
    if (submitting) return;
    setStep("closed");
    setError(null);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      if (blocked) {
        const res = await fetch(`/api/blocks?blocked_id=${encodeURIComponent(targetUserId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setError(t("block.errorGeneric"));
          return;
        }
        setBlocked(false);
      } else {
        const res = await fetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocked_id: targetUserId }),
        });
        if (!res.ok) {
          setError(t("block.errorGeneric"));
          return;
        }
        setBlocked(true);
      }
      setStep("closed");
    } catch {
      setError(t("block.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          blocked
            ? "border-line bg-paper text-ink hover:bg-mint/40"
            : "border-red-300 bg-paper text-red-600 hover:bg-red-50"
        } ${className}`}
      >
        {blocked ? t("block.unblockButton") : t("block.blockButton")}
      </button>

      {step === "confirm" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl">
            <h2 className="font-serif text-lg font-bold text-pine">
              {blocked ? t("block.unblockTitle") : t("block.blockTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              {blocked ? t("block.unblockDesc") : t("block.blockDesc")}
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-apricot/10 px-3 py-2 text-xs text-apricot">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint/50 disabled:opacity-50"
              >
                {t("block.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                    {t("block.submitting")}
                  </span>
                ) : blocked ? (
                  t("block.confirmUnblock")
                ) : (
                  t("block.confirmBlock")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
