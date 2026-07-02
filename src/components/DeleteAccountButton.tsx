"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/contexts/locale";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";

const CONFIRM_WORD = "DELETE";

type Step = "closed" | "confirm1" | "confirm2" | "blocked";

export function DeleteAccountButton() {
  const t = useT();
  const [step, setStep] = useState<Step>("closed");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setError(null);
    setConfirmText("");
    setStep("confirm1");
  }

  function closeModal() {
    if (loading) return;
    setStep("closed");
    setConfirmText("");
    setError(null);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === "active_plan") {
          setStep("blocked");
        } else {
          setError(t("profile.deleteAccount.errorGeneric"));
        }
        setLoading(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setError(t("profile.deleteAccount.errorNetwork"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-paper px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        {t("profile.deleteAccount.button")}
      </button>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl">
            {step === "blocked" && (
              <>
                <h2 className="font-serif text-lg font-bold text-pine">
                  {t("profile.deleteAccount.activePlanTitle")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {t("profile.deleteAccount.activePlanDesc")}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <ManageSubscriptionButton />
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint/50"
                  >
                    {t("profile.deleteAccount.cancel")}
                  </button>
                </div>
              </>
            )}

            {step === "confirm1" && (
              <>
                <h2 className="font-serif text-lg font-bold text-pine">
                  {t("profile.deleteAccount.step1Title")}
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink/80">
                  {t("profile.deleteAccount.step1Intro")}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/70">
                  <li>{t("profile.deleteAccount.item.diaries")}</li>
                  <li>{t("profile.deleteAccount.item.vocabulary")}</li>
                  <li>{t("profile.deleteAccount.item.streak")}</li>
                  <li>{t("profile.deleteAccount.item.social")}</li>
                </ul>
                <p className="mt-3 text-sm font-semibold text-apricot">
                  {t("profile.deleteAccount.step1Warning")}
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint/50"
                  >
                    {t("profile.deleteAccount.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmText(""); setStep("confirm2"); }}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-cream hover:opacity-90"
                  >
                    {t("profile.deleteAccount.continue")}
                  </button>
                </div>
              </>
            )}

            {step === "confirm2" && (
              <>
                <h2 className="font-serif text-lg font-bold text-pine">
                  {t("profile.deleteAccount.step2Title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  {t("profile.deleteAccount.step2Instruction", { word: CONFIRM_WORD })}
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={loading}
                  placeholder={CONFIRM_WORD}
                  className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink outline-none focus:border-red-400 disabled:opacity-60"
                  autoFocus
                />

                {error && (
                  <p className="mt-3 rounded-xl bg-apricot/10 px-3 py-2 text-xs text-apricot">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { if (!loading) setStep("confirm1"); }}
                    disabled={loading}
                    className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mint/50 disabled:opacity-50"
                  >
                    {t("profile.deleteAccount.back")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading || confirmText !== CONFIRM_WORD}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
                        {t("profile.deleteAccount.deleting")}
                      </span>
                    ) : (
                      t("profile.deleteAccount.confirmButton")
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
