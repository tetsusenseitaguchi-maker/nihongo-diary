"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/contexts/locale";

export interface TourStep {
  titleKey: string;
  descKey: string;
  /** CSS selector for the element to spotlight. null = centered modal. */
  targetSelector?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    titleKey: "tutorial.step1.title",
    descKey: "tutorial.step1.desc",
    targetSelector: 'a[href="/write"]',
  },
  {
    titleKey: "tutorial.step2.title",
    descKey: "tutorial.step2.desc",
  },
  {
    titleKey: "tutorial.step3.title",
    descKey: "tutorial.step3.desc",
  },
  {
    titleKey: "tutorial.step4.title",
    descKey: "tutorial.step4.desc",
    targetSelector: 'a[href="/feed"]',
  },
  {
    titleKey: "tutorial.step5.title",
    descKey: "tutorial.step5.desc",
  },
];

export const TOUR_SEEN_KEY = "nihongo-diary-tour-seen";

const PAD = 10;

type Rect = { top: number; left: number; width: number; height: number };

function findVisible(selector: string): Element | null {
  const els = document.querySelectorAll<HTMLElement>(selector);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight) {
      return el;
    }
  }
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TourOverlay({ open, onClose }: Props) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset to step 0 whenever tour opens
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Calculate spotlight position for current step
  useEffect(() => {
    if (!open) return;
    const sel = TOUR_STEPS[step]?.targetSelector;
    if (!sel) {
      setSpotRect(null);
      return;
    }
    const el = findVisible(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      setSpotRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    } else {
      setSpotRect(null);
    }
  }, [open, step]);

  function advance() {
    if (step < TOUR_STEPS.length - 1) setStep((s) => s + 1);
    else done();
  }
  function retreat() {
    if (step > 0) setStep((s) => s - 1);
  }
  function done() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    }
    onClose();
  }

  if (!mounted || !open) return null;

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Compute tooltip position relative to spotlight (or centred)
  const WIN_W = window.innerWidth;
  const WIN_H = window.innerHeight;
  const TOOLTIP_W = Math.min(296, WIN_W - 32);
  const GAP = 14;

  let tooltipStyle: React.CSSProperties;
  if (spotRect) {
    const leftPos = Math.min(
      Math.max(spotRect.left, 16),
      WIN_W - TOOLTIP_W - 16,
    );
    const spaceBelow = WIN_H - (spotRect.top + spotRect.height);
    if (spaceBelow >= 170 || spaceBelow > spotRect.top) {
      tooltipStyle = {
        top: spotRect.top + spotRect.height + GAP,
        left: leftPos,
        width: TOOLTIP_W,
      };
    } else {
      tooltipStyle = {
        bottom: WIN_H - spotRect.top + GAP,
        left: leftPos,
        width: TOOLTIP_W,
      };
    }
  } else {
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: TOOLTIP_W,
    };
  }

  return createPortal(
    /* Outer: catches all clicks (closes tour when clicking dark area) */
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999, pointerEvents: "all" }}
      onClick={done}
    >
      {/* Dark overlay when no spotlight */}
      {!spotRect && (
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.45)", pointerEvents: "none" }}
        />
      )}

      {/* Spotlight: box-shadow creates the surrounding dark overlay */}
      {spotRect && (
        <div
          style={{
            position: "fixed",
            top: spotRect.top,
            left: spotRect.left,
            width: spotRect.width,
            height: spotRect.height,
            borderRadius: 12,
            boxShadow:
              "0 0 0 4000px rgba(0,0,0,0.52), 0 0 0 2px rgba(255,255,255,0.6)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card — clicks don't bubble to the close handler */}
      <div
        className="fixed rounded-2xl bg-paper shadow-2xl"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: dots + counter + skip */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 18 : 6,
                  background: i === step ? "#2d6a4f" : "#d4d4c8",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {t("tutorial.stepOf", {
                current: String(step + 1),
                total: String(TOUR_STEPS.length),
              })}
            </span>
            <button
              onClick={done}
              className="text-xs text-muted transition-colors hover:text-pine"
            >
              {t("tutorial.skip")}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <h3 className="font-serif text-base font-bold leading-snug text-pine">
            {t(currentStep.titleKey)}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/80">
            {t(currentStep.descKey)}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-4 pb-4">
          {step > 0 && (
            <button
              onClick={retreat}
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-pine transition-colors hover:bg-mint/40"
            >
              {t("tutorial.prev")}
            </button>
          )}
          <button
            onClick={isLast ? done : advance}
            className="flex-1 rounded-xl bg-pine px-4 py-2 text-sm font-bold text-cream transition-opacity hover:opacity-90"
          >
            {isLast ? t("tutorial.finish") : t("tutorial.next")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
