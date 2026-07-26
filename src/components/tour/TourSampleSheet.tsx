"use client";

import { useEffect, useState } from "react";
import { CorrectionResult } from "@/components/CorrectionResult";
import { TOUR_SAMPLE_CORRECTION } from "@/lib/tour/sample";
import { useT } from "@/contexts/locale";

/**
 * "Press it and you get this" — the sample correction shown on the /write step.
 *
 * It reuses the real CorrectionResult so the user sees the actual layout,
 * while /api/correct is never called and no correction credit is spent.
 *
 * The sheet scrolls, which means anything inside it can be reached, so the
 * vocabulary Save buttons — which POST to /api/vocabulary for real — are
 * blocked three ways over. Any one of them would do; all three together mean
 * a stray save needs three independent failures:
 *
 *   1. The sample cannot contain the fields those buttons come from, by type
 *      (see @/lib/tour/sample), so they are never rendered in the first place.
 *   2. The content sits inside a disabled fieldset, which natively disables
 *      every descendant button — not just clicks, but keyboard focus too,
 *      which a pointer-events rule would leave open.
 *   3. Clicks and activation keys are swallowed on the way down, before any
 *      handler in the subtree sees them.
 *
 * Links are not form controls, so a disabled fieldset does not touch them;
 * they get pointer-events: none of their own.
 */

/** Fraction of the viewport the sheet covers, and its ceiling in pixels. */
const RATIO = 0.6;
const MAX_HEIGHT = 560;

/** Room the sheet takes at the bottom of the screen, in px. */
export function sampleSheetHeight(): number {
  return Math.min(window.innerHeight * RATIO, MAX_HEIGHT);
}

export function TourSampleSheet() {
  const t = useT();
  // Slides up on mount: the sheet appears when the user asks to see the
  // example, and the movement is what connects the two.
  const [slidIn, setSlidIn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t border-line bg-cream shadow-2xl"
      style={{
        height: sampleSheetHeight(),
        // Interactive so the sample can be scrolled; everything that could
        // act on a press is disabled below.
        pointerEvents: "auto",
        transform: slidIn ? "translateY(0)" : "translateY(100%)",
        transition: "transform 220ms ease-out",
      }}
      // Layer 3. React runs this at the root before the event reaches the
      // subtree, and stopping the synthetic event stops the native one with
      // it, so no handler inside — React's or anyone else's — is called.
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDownCapture={(e) => {
        // Only the keys that activate a control. Anything else is left alone
        // so Escape still reaches the tour's own handler.
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      // Decorative: the bubble above already explains what this is, and the
      // canned diary is not the user's own writing.
      aria-hidden="true"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
        <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-pine">
          {t("tour.sample.badge")}
        </span>
        <p className="truncate text-xs text-muted">{t("tour.sample.note")}</p>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-16 pt-3"
        // Keeps a flick at the end of the sample from scrolling the page
        // behind the tour.
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Layers 2 (disabled fieldset) and, for links, pointer-events. */}
        <fieldset disabled className="m-0 min-w-0 border-0 p-0 [&_a]:pointer-events-none">
          <CorrectionResult correction={TOUR_SAMPLE_CORRECTION} />
        </fieldset>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to top, var(--color-cream), transparent)" }}
      />
    </div>
  );
}
