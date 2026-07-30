"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hasSeenDiscoveryIntro, markDiscoveryIntroSeen } from "@/lib/discovery/seen";
import { useT } from "@/contexts/locale";

/**
 * One-time announcement that Discovery exists, and that public entries can now
 * be found through it.
 *
 * Lives on /feed rather than /dashboard. TourGuide auto-starts 800ms after the
 * dashboard mounts and paints a full-screen mask at z-index 10000, so anything
 * overlaid there would either fight the mask or force a change to the tour's
 * auto-start rules. /feed is also where the thing being announced actually is,
 * so the notice is one tap from the tab it describes. Nothing under src/lib/tour
 * or src/components/tour is touched.
 *
 * The flag is written on mount, not on dismiss — the same rule the tour and the
 * plan intro follow. Shown once is the promise, not dismissed once: closing the
 * tab or navigating away without touching the button must not bring it back on
 * every visit.
 *
 * Read before write, or marking on mount would hide the notice from the very
 * first render that was supposed to show it.
 */
export function DiscoveryIntroModal() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenDiscoveryIntro()) return;
    markDiscoveryIntroSeen();
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
        aria-labelledby="discovery-intro-title"
        className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl"
      >
        <h2 id="discovery-intro-title" className="font-serif text-lg font-bold text-pine">
          {t("discoveryIntro.title")}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          {t("discoveryIntro.body1")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          {t("discoveryIntro.body2")}
        </p>

        {/* Set apart rather than run on from the sentence above it. The line
            people need to be sure of is the one about private entries, and it
            should not have to be found inside a paragraph about visibility. */}
        <p className="mt-3 rounded-xl bg-mint/40 px-3 py-2 text-sm font-medium leading-relaxed text-pine">
          {t("discoveryIntro.privateNote")}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {/* A link to the setting, not a copy of the switch. Two controls
              writing the same row is two things to keep in agreement, and the
              one on /profile is where someone will go looking for it later. */}
          <Link
            href="/profile#discovery"
            onClick={() => setOpen(false)}
            className="rounded-full border border-line bg-paper px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-mint/50"
          >
            {t("discoveryIntro.optOut")}
          </Link>
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-cream hover:bg-moss-600"
          >
            {t("discoveryIntro.gotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}
