"use client";

import { useState } from "react";
import { useT } from "@/contexts/locale";

export type ReportTargetType = "diary_entry" | "comment" | "peer_correction" | "reply";

const MAX_REASON_LENGTH = 500;

type Step = "closed" | "open" | "done" | "already";

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 21V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  );
}

export function ReportButton({
  targetType,
  targetId,
  className = "",
}: {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}) {
  const t = useT();
  const [step, setStep] = useState<Step>("closed");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setReason("");
    setStep("open");
  }

  function closeModal() {
    if (submitting) return;
    setStep("closed");
    setReason("");
    setError(null);
  }

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t("report.reasonRequired"));
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(t("report.reasonTooLong"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "already_reported") {
          setStep("already");
        } else {
          setError(t("report.errorGeneric"));
        }
        return;
      }
      setStep("done");
    } catch {
      setError(t("report.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const isFinal = step === "done" || step === "already";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-500 transition-colors ${className}`}
        aria-label={t("report.button")}
      >
        <FlagIcon className="h-3 w-3" />
        {t("report.button")}
      </button>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl">
            {isFinal ? (
              <>
                <h2 className="font-serif text-lg font-bold text-pine">
                  {step === "done" ? t("report.successTitle") : t("report.alreadyReportedTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {step === "done" ? t("report.successDesc") : t("report.alreadyReportedDesc")}
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-cream hover:bg-pine/90"
                  >
                    {t("report.close")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-lg font-bold text-pine">{t("report.title")}</h2>
                <p className="mt-2 text-sm text-ink/70">{t("report.description")}</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  placeholder={t("report.placeholder")}
                  rows={4}
                  maxLength={MAX_REASON_LENGTH}
                  className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-red-400 disabled:opacity-60"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 rounded-xl bg-apricot/10 px-3 py-2 text-xs text-apricot">
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
                    {t("report.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !reason.trim()}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                        {t("report.submitting")}
                      </span>
                    ) : (
                      t("report.submit")
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
