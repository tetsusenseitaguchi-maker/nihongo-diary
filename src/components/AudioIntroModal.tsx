"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasSeenAudioIntro, markAudioIntroSeen } from "@/lib/audio-intro/seen";
import { hasSeenTour } from "@/lib/tour/seen";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

/**
 * One-time announcement that corrections can now be listened to, and that
 * dictation exists.
 *
 * ── Why this can live on /dashboard when DiscoveryIntroModal could not ──────
 * TourGuide auto-starts 800ms after the dashboard mounts and paints a
 * full-screen mask at z-index 10000, which is why the Discovery notice went to
 * /feed instead. The clash is avoided here by a condition rather than by a
 * different address: a browser that has not seen the tour does not get this.
 *
 * TourGuide marks the tour seen when it STARTS, so the two can never be up at
 * once — on a first visit this returns early and the tour runs; from the
 * second visit the flag is set and the notice appears. Everyone the
 * announcement is actually for (people with an account and corrections already
 * behind them) has that flag long since. Nothing under src/lib/tour or
 * src/components/tour is touched; hasSeenTour is read, never written.
 *
 * The flag is written on MOUNT, not on dismiss — the same rule the tour, the
 * plan intro and the Discovery notice follow. Shown once is the promise, not
 * dismissed once: closing the tab without touching the button must not bring
 * it back on the next visit.
 *
 * Read before write, or marking on mount would hide the notice from the very
 * first render that was supposed to show it.
 */
export function AudioIntroModal({
  /**
   * A diary that has a sentence worth dictating, if the learner has one.
   * Decided on the server, where the entries already are.
   */
  dictationDiaryId,
  /**
   * Server-side native detection. The plan line is neutral inside the iOS
   * shell — no plan names, no prices, no link (App Store Guideline 3.1.1) —
   * and passing it from the server means that copy is never sent to the app at
   * all, rather than being sent and hidden after hydration.
   */
  isNative,
}: {
  dictationDiaryId: string | null;
  isNative: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenAudioIntro()) return;
    // A brand-new browser is about to get the tour. Leave the screen to it and
    // do not burn the flag — this shows on the next visit instead.
    if (!hasSeenTour()) return;
    markAudioIntroSeen();
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // The page behind a full-screen sheet should not scroll under the thumb.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-intro-title"
        className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl"
      >
        <h2
          id="audio-intro-title"
          className="flex items-center gap-2 font-serif text-lg font-bold text-pine"
        >
          <Icon.speaker className="h-5 w-5 shrink-0" />
          {t("audioIntro.title")}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-ink/70">{t("audioIntro.body1")}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">{t("audioIntro.body2")}</p>

        {/* Set apart rather than run on from the paragraph above it: what the
            free plan includes is the line people need to be sure of, and it
            should not have to be found inside a description of the feature. */}
        <p className="mt-3 rounded-xl bg-mint/40 px-3 py-2 text-sm font-medium leading-relaxed text-pine">
          {isNative ? t("audioIntro.limitIos") : t("audioIntro.limit")}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {/* Dictation needs a diary of the learner's own with readings on it.
              Without one the honest next step is not a disabled button, it is
              the thing that would give them one. */}
          {dictationDiaryId ? (
            <Link
              href={`/dictation/${dictationDiaryId}`}
              onClick={() => setOpen(false)}
              className="rounded-full border border-line bg-paper px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-mint/50"
            >
              {t("audioIntro.tryDictation")}
            </Link>
          ) : (
            <Link
              href="/write"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line bg-paper px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-mint/50"
            >
              {t("audioIntro.writeFirst")}
            </Link>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-cream hover:bg-moss-600"
          >
            {t("audioIntro.gotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}
