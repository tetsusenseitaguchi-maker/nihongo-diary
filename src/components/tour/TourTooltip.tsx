"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/contexts/locale";
import type { TourStepDef } from "@/lib/tour/steps";
import type { TourRect } from "./TourMask";

/**
 * The speech-bubble card. Sits next to the hole when there is one, centred
 * otherwise, and is always clickable even though the mask around it is not.
 *
 * Placement works off the card's measured height rather than an estimate.
 * Guessing does not survive eight locales — German runs long, and a card that
 * is taller than assumed hangs off the bottom of the screen.
 */

const GAP = 14;
const MARGIN = 16;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function position(
  rect: TourRect | null,
  width: number,
  avoidBottom: number,
  cardH: number,
): React.CSSProperties {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  // Everything below this line belongs to the sample sheet, if one is showing.
  const usableH = winH - avoidBottom;
  const minTop = MARGIN;
  const maxTop = Math.max(MARGIN, usableH - cardH - MARGIN);

  if (!rect) {
    return {
      top: clamp(usableH / 2 - cardH / 2, minTop, maxTop),
      left: "50%",
      transform: "translateX(-50%)",
      width,
    };
  }

  const left = clamp(rect.left, MARGIN, Math.max(MARGIN, winW - width - MARGIN));
  const below = rect.top + rect.height + GAP;
  const above = rect.top - GAP - cardH;

  let top: number;
  if (below + cardH + MARGIN <= usableH) {
    top = below;
  } else if (above >= MARGIN) {
    top = above;
  } else {
    // Neither side has room — the target is taller than the screen, as the
    // feed timeline is. Sit at the bottom of the usable area, on top of the
    // highlight. Those steps are inert, so covering part of it is harmless.
    top = maxTop;
  }
  return { top: clamp(top, minTop, maxTop), left, width };
}

export function TourTooltip({
  def,
  step,
  total,
  rect,
  avoidBottom = 0,
  onNext,
  onPrev,
  onSkip,
}: {
  def: TourStepDef;
  step: number;
  total: number;
  rect: TourRect | null;
  /** Height reserved at the bottom of the screen, e.g. by the sample sheet. */
  avoidBottom?: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardH, setCardH] = useState(0);
  const width = Math.min(320, window.innerWidth - MARGIN * 2);
  const isFirst = step === 0;
  const isLast = step === total - 1;
  // "click" steps advance when the user actually presses the highlighted
  // control, so they deliberately have no Next button.
  const waitsForClick = def.mode === "click";

  // Re-measures when the text changes with the step or the locale, and when a
  // narrow screen reflows the card to more lines.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => setCardH(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="fixed rounded-2xl bg-paper shadow-2xl"
      style={{
        ...position(rect, width, avoidBottom, cardH),
        pointerEvents: "auto",
        // One frame with no measurement yet: stay invisible rather than
        // appear in the wrong place and jump.
        visibility: cardH === 0 ? "hidden" : "visible",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t(def.titleKey)}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === step ? 18 : 6, background: i === step ? "#2d6a4f" : "#d4d4c8" }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {t("tour.stepOf", { current: String(step + 1), total: String(total) })}
          </span>
          <button onClick={onSkip} className="text-xs text-muted transition-colors hover:text-pine">
            {t("tour.skip")}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h3 className="font-serif text-base font-bold leading-snug text-pine">{t(def.titleKey)}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{t(def.descKey)}</p>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        {!isFirst && (
          <button
            onClick={onPrev}
            className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-pine transition-colors hover:bg-mint/40"
          >
            {t("tour.prev")}
          </button>
        )}
        {waitsForClick ? (
          <p className="flex-1 text-center text-sm font-semibold text-moss-600">{t("tour.clickHint")}</p>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 rounded-xl bg-pine px-4 py-2 text-sm font-bold text-cream transition-opacity hover:opacity-90"
          >
            {isFirst ? t("tour.start") : isLast ? t("tour.finish") : t("tour.next")}
          </button>
        )}
      </div>
    </div>
  );
}
