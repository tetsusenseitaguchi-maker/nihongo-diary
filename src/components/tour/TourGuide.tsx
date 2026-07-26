"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useTour } from "@/contexts/tour";
import { TOUR_SCENARIO, anchorSelector, type TourStepDef } from "@/lib/tour/steps";
import { TourMask, type TourRect } from "./TourMask";
import { TourTooltip } from "./TourTooltip";
import { TourSampleSheet, sampleSheetHeight } from "./TourSampleSheet";

/**
 * The interactive onboarding tour: mask, bubble, and the rules that move it
 * from one step to the next.
 *
 * Mounted once in the (app) layout, inside TourProvider. Renders nothing at
 * all unless a tour is running.
 */

/** Breathing room around the highlighted element. */
const PAD = 8;
/** A page can still be mounting right after a navigation — keep looking. */
const LOCATE_RETRY_MS = 100;
const LOCATE_MAX_TRIES = 20;

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * The elements this step spotlights.
 *
 * Normally the first anchor that is actually rendered and visible: elements
 * hidden with `lg:hidden` / `hidden lg:block` measure 0×0, which is how the
 * mobile bottom nav and the desktop sidebar — same anchor on both — resolve to
 * whichever one the current breakpoint shows. With `combine`, every visible
 * anchor is returned and the caller draws one box around them all.
 */
function findAnchorEls(def: TourStepDef): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const anchor of def.anchors) {
    for (const el of document.querySelectorAll<HTMLElement>(anchorSelector(anchor))) {
      if (!isVisible(el)) continue;
      if (!def.combine) return [el];
      found.push(el);
    }
  }
  return found;
}

/**
 * Smallest rectangle containing all of them, plus breathing room, clipped to
 * the viewport.
 *
 * The clipping matters: the feed timeline is one element taller than the
 * screen, and an unclipped box leaves the mask with nothing to shade above or
 * below the hole, and gives the bubble a negative top and a bottom past the
 * end of the screen to position against. Highlighting the part the user can
 * actually see is both correct and what the step means.
 */
function boundingRect(els: HTMLElement[]): TourRect | null {
  const rects = els.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 || r.height > 0);
  if (rects.length === 0) return null;

  const top = Math.max(Math.min(...rects.map((r) => r.top)) - PAD, 0);
  const left = Math.max(Math.min(...rects.map((r) => r.left)) - PAD, 0);
  const bottom = Math.min(Math.max(...rects.map((r) => r.bottom)) + PAD, window.innerHeight);
  const right = Math.min(Math.max(...rects.map((r) => r.right)) + PAD, window.innerWidth);

  // Scrolled fully out of view — no hole, just an even shade.
  if (bottom <= top || right <= left) return null;

  return { top, left, width: right - left, height: bottom - top };
}

export function TourGuide() {
  const { hydrated, isActive, step, start, next, prev, stop } = useTour();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<TourRect | null>(null);
  /**
   * Whether the sample sheet has been opened on the current step. Local on
   * purpose: it is presentation state, not part of the saved tour, so a
   * reload lands back on the step with the sheet closed and the step list —
   * and TOUR_VERSION with it — stays untouched.
   */
  const [sampleOpen, setSampleOpen] = useState(false);
  const targetsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);

  const def = isActive ? TOUR_SCENARIO[step] : undefined;
  const sampleShowing = def?.sample === true && sampleOpen;

  useEffect(() => setMounted(true), []);

  // Leaving the step — forwards, backwards, or out of the tour — closes the
  // sheet, so coming back to this step starts from the explanation again.
  useEffect(() => setSampleOpen(false), [step, isActive]);

  /**
   * Temporary launcher for development: /dashboard?tour=1.
   * Part 3 replaces this with the real "first visit" check, and this effect
   * goes away with it. Guarded by a ref so that stopping the tour while the
   * query string is still in the URL does not immediately restart it.
   */
  useEffect(() => {
    if (!hydrated || isActive || autoStartedRef.current) return;
    if (pathname !== "/dashboard") return;
    if (new URLSearchParams(window.location.search).get("tour") !== "1") return;
    autoStartedRef.current = true;
    start();
  }, [hydrated, isActive, pathname, start]);

  /**
   * Part 2-C — the tour follows the user's navigation.
   *
   * Order matters: a "click" step's target takes the user to another route, so
   * arriving there is success, not going off-script. Only after that check can
   * a mismatched route mean the user left the scenario.
   *
   * Nothing runs before `hydrated`: on a mid-tour reload the step is restored
   * one frame late, and acting on the frame before it would read step 0 and
   * abandon the tour immediately.
   */
  useEffect(() => {
    if (!hydrated || !isActive || !def) return;
    if (def.advanceOn && pathname === def.advanceOn) {
      next();
      return;
    }
    if (def.route && pathname !== def.route) {
      stop();
    }
  }, [hydrated, isActive, def, pathname, next, stop]);

  const measure = useCallback(() => {
    setRect(boundingRect(targetsRef.current));
  }, []);

  /** Find this step's targets, scroll them into view, and keep the hole on them. */
  useEffect(() => {
    targetsRef.current = [];
    setRect(null);
    if (!isActive || !def || def.anchors.length === 0) return;

    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        // Crossing the lg breakpoint swaps the bottom nav for the sidebar, so
        // the element we measured can simply stop existing. Look again rather
        // than leaving the hole on a ghost.
        if (targetsRef.current.length > 0 && !targetsRef.current.some(isVisible)) {
          targetsRef.current = [];
          locate();
          return;
        }
        measure();
      });
    };

    const locate = () => {
      if (cancelled) return;
      const els = findAnchorEls(def);
      if (els.length === 0) {
        // The route may have changed a moment ago and the page is still
        // rendering. Give up eventually and fall back to a centred bubble.
        if (tries++ < LOCATE_MAX_TRIES) timer = setTimeout(locate, LOCATE_RETRY_MS);
        return;
      }
      targetsRef.current = els;

      // An open sample sheet covers the bottom of the screen, so the target
      // moves up to the top third — otherwise the sheet hides the very thing
      // being pointed at. Closing the sheet brings it back to the middle.
      const focus = sampleShowing ? 0.3 : 0.5;
      const r = els[0].getBoundingClientRect();
      const offBy = r.top + r.height / 2 - window.innerHeight * focus;
      const offScreen = r.top < 0 || r.bottom > window.innerHeight;
      if (offScreen || (def.sample && Math.abs(offBy) > 24)) {
        // Smooth scrolling is fine: the scroll listener below re-measures on
        // every frame of the animation, so the hole tracks the element.
        // A fixed-position target (the bottom nav) never needs this — it is
        // always on screen, so neither condition fires.
        window.scrollBy({ top: offBy, behavior: "smooth" });
      }
      schedule();

      // Re-locating replaces the previous observer.
      observer?.disconnect();
      observer = new ResizeObserver(schedule);
      for (const el of els) observer.observe(el);
    };

    locate();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, def, pathname, measure, sampleShowing]);

  /** Escape leaves the tour, like the Skip button. */
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, stop]);

  if (!mounted || !hydrated || !isActive || !def) return null;

  return createPortal(
    // The wrapper itself must not catch clicks — the mask panels and the
    // bubble opt back in individually. z-index sits one above the old
    // TourOverlay's 9999 so that, in the window before part 3 retires it, a
    // first-time visitor who gets both does not end up with this one buried.
    <div className="fixed inset-0" style={{ zIndex: 10000, pointerEvents: "none" }}>
      <TourMask rect={rect} clickThrough={def.mode === "click"} />
      {sampleShowing && <TourSampleSheet />}
      <TourTooltip
        def={def}
        step={step}
        total={TOUR_SCENARIO.length}
        rect={rect}
        avoidBottom={sampleShowing ? sampleSheetHeight() : 0}
        sample={
          def.sample
            ? {
                open: sampleOpen,
                onShow: () => setSampleOpen(true),
                onClose: () => setSampleOpen(false),
              }
            : undefined
        }
        onNext={next}
        onPrev={prev}
        onSkip={stop}
      />
    </div>,
    document.body,
  );
}
