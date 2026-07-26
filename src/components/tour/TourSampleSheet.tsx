"use client";

import { CorrectionResult } from "@/components/CorrectionResult";
import { mockCorrection } from "@/lib/mock-data";
import { useT } from "@/contexts/locale";

/**
 * "Press it and you get this" — the sample correction shown on the /write step.
 *
 * It reuses the real CorrectionResult with the canned mockCorrection, so the
 * user sees the actual layout without /api/correct ever being called and
 * without a correction credit being spent.
 *
 * The sheet is inert: `pointer-events: none` on the container means nothing
 * inside it can be pressed. That matters, because CorrectionResult's
 * vocabulary buttons POST to /api/vocabulary for real — a sample must not be
 * able to write to anyone's word list. Being inert also rules out scrolling,
 * so the content is clipped and faded at the bottom rather than given a
 * scrollbar it could not use.
 */

/** Fraction of the viewport the sheet covers, and its ceiling in pixels. */
const RATIO = 0.45;
const MAX_HEIGHT = 420;

/** Room the sheet takes at the bottom of the screen, in px. */
export function sampleSheetHeight(): number {
  return Math.min(window.innerHeight * RATIO, MAX_HEIGHT);
}

export function TourSampleSheet() {
  const t = useT();

  return (
    <div
      className="fixed inset-x-0 bottom-0 overflow-hidden rounded-t-2xl border-t border-line bg-cream shadow-2xl"
      style={{ height: sampleSheetHeight(), pointerEvents: "none" }}
      // Decorative: the bubble above already explains what this is, and the
      // canned diary is not the user's own writing.
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
        <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-pine">
          {t("tour.sample.badge")}
        </span>
        <p className="truncate text-xs text-muted">{t("tour.sample.note")}</p>
      </div>

      <div className="px-4 pt-3">
        <CorrectionResult correction={mockCorrection} />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to top, var(--color-cream), transparent)" }}
      />
    </div>
  );
}
