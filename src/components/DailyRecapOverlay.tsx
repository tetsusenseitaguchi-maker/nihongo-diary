"use client";

import { useEffect, useRef, useState } from "react";
import { hasSeenRecapToday, markRecapSeen } from "@/lib/daily-recap/seen";
import { hasSeenTour } from "@/lib/tour/seen";
import { useTour } from "@/contexts/tour";
import { getClientTZ, todayInTZ } from "@/lib/date-tz";
import { useT } from "@/contexts/locale";

/**
 * 「今日のあなた」 — a full-screen recap, once a day, that gets out of the way.
 *
 * ── Every number arrives as a prop ─────────────────────────────────────────
 * ⚠️ Nothing here reads the database, and nothing here recomputes a streak.
 * The dashboard has already worked all four figures out, and they must be the
 * SAME figures the cards below are about to show. A streak computed here would
 * be the fourth definition in this codebase — lib/streak.ts, layout.tsx's
 * inline copy and api/report/weekly already disagree with each other, and the
 * one thing worse than three definitions is two of them on one screen.
 *
 * ── What it will and will not say ─────────────────────────────────────────
 * A line appears only when it has something to report:
 *
 *   weekly goal   — whenever a goal is set. 0/5 on a Monday is a fresh week,
 *                   not a failure, and the dots make that legible.
 *   streak        — only above zero. The hero greeting already refuses to draw
 *                   a 0 next to a flame ("a 0 next to a flame is a scolding");
 *                   this follows that rule rather than inventing its own.
 *                   Measured: 84.3% of learners active in the last 30 days are
 *                   on a zero streak, so this is the common case, not an edge.
 *   characters    — only above zero.
 *
 * With no goal set, the recap is a single line offering to set one — see the
 * tap behaviour below.
 *
 * ── Tap ────────────────────────────────────────────────────────────────────
 * The whole surface is one target, and what it does depends on the state:
 * skip the animation and close, and — when no goal is set — scroll the goal
 * card into view on the way out. That card lives in the dashboard hero, so
 * there is nowhere to navigate to; closing IS arriving. The scroll matters
 * because at 375px the hero's profile card pushes the goal card below the
 * fold, and an overlay that closed onto empty screen would have promised
 * something it did not deliver.
 *
 * The tap is a shortcut, never a requirement: the overlay auto-closes in every
 * state, so ignoring it costs nothing. That is the whole reason a
 * tap-to-navigate line can coexist with an auto-dismissing surface.
 */

/** Tuned on device. Count-up first, then hold the final state, then fade. */
const COUNT_UP_MS = 400;
const HOLD_MS = 1200;
const FADE_MS = 200;

/** The goal card's anchor in the dashboard hero. */
export const WEEKLY_GOAL_ANCHOR_ID = "weekly-goal";

function useCountUp(target: number, run: boolean, skip: boolean): number {
  const [value, setValue] = useState(skip ? target : 0);
  useEffect(() => {
    if (!run) return;
    if (skip) { setValue(target); return; }
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / COUNT_UP_MS);
      // easeOutQuad — fast first, settles rather than stopping dead.
      setValue(Math.round(target * (1 - (1 - p) * (1 - p))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, skip]);
  return value;
}

export function DailyRecapOverlay({
  weeklyTarget,
  daysThisWeek,
  currentStreak,
  totalChars,
}: {
  /** weekly_goals.target_days, or null when the learner has not set one. */
  weeklyTarget: number | null;
  daysThisWeek: number;
  currentStreak: number;
  totalChars: number;
}) {
  const t = useT();
  const { isActive } = useTour();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Set once on mount so the count-up and the auto-close agree about motion.
  const reduceMotion = useRef(false);
  const closedRef = useRef(false);

  useEffect(() => {
    // A tour that is RUNNING owns the screen — its mask is z-index 10000 and
    // this would sit under it. isActive is checked as well as hasSeenTour
    // because TourGuide marks the tour seen when it STARTS (800ms after mount),
    // so the flag alone stops being a reliable "the tour is not up" signal a
    // moment later.
    if (isActive) return;
    // A brand-new browser is about to get the tour. Leave the screen to it and
    // do not record today — this shows tomorrow instead, or later today.
    if (!hasSeenTour()) return;

    const today = todayInTZ(getClientTZ());
    if (hasSeenRecapToday(today)) return;

    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    // Recorded on open, not on close: shown once is the promise, the same rule
    // the tour, the plan intro and the audio notice follow. Closing the tab
    // mid-animation must not bring it back on the next load.
    markRecapSeen(today);
    setOpen(true);
  }, [isActive]);

  // Auto-close. Skipped entirely once the learner has tapped.
  useEffect(() => {
    if (!open || closedRef.current) return;
    const countUp = reduceMotion.current ? 0 : COUNT_UP_MS;
    const settle = setTimeout(() => setDone(true), countUp);
    const leave = setTimeout(() => close(), countUp + HOLD_MS);
    return () => { clearTimeout(settle); clearTimeout(leave); };
  }, [open]);

  // The page behind a full-screen surface should not scroll under the thumb.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function close(scrollToGoal = false) {
    if (closedRef.current) return;
    closedRef.current = true;
    setDone(true);
    setLeaving(true);
    setTimeout(() => {
      setOpen(false);
      if (scrollToGoal) {
        document
          .getElementById(WEEKLY_GOAL_ANCHOR_ID)
          ?.scrollIntoView({ behavior: reduceMotion.current ? "auto" : "smooth", block: "center" });
      }
    }, reduceMotion.current ? 0 : FADE_MS);
  }

  const skip = done || reduceMotion.current;
  const days = useCountUp(daysThisWeek, open, skip);
  const streak = useCountUp(currentStreak, open, skip);
  const chars = useCountUp(totalChars, open, skip);

  if (!open) return null;

  const noGoal = weeklyTarget === null;
  const showStreak = currentStreak > 0;
  const showChars = totalChars > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("recap.title")}
      onClick={() => close(noGoal)}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-cream/95 p-6 backdrop-blur-sm transition-opacity duration-200 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-sm text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss-600">
          {t("recap.title")}
        </p>

        {noGoal ? (
          <>
            <p className="mt-4 font-serif text-2xl font-bold leading-snug text-pine">
              {t("recap.noGoalTitle")}
            </p>
            <p className="mt-2 text-sm text-ink/70">{t("recap.noGoalTapHint")}</p>
          </>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted">{t("weeklyGoal.title")}</p>
              <div className="mt-2 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden>
                  {Array.from({ length: weeklyTarget }, (_, i) => (
                    <span
                      key={i}
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        i < Math.min(days, weeklyTarget) ? "bg-pine" : "border border-line bg-paper"
                      }`}
                    />
                  ))}
                </div>
                <p className="font-serif text-4xl font-bold leading-none text-pine">
                  {days}
                  <span className="text-xl">{t("weeklyGoal.outOf", { n: weeklyTarget })}</span>
                </p>
              </div>
            </div>

            {showStreak && (
              <p className="font-serif text-2xl font-bold text-pine">
                🔥 {t("recap.streak", { n: streak })}
              </p>
            )}

            {showChars && (
              <p className="font-serif text-2xl font-bold text-pine">
                ✍️ {t("recap.chars", { n: chars.toLocaleString("en-US") })}
              </p>
            )}
          </div>
        )}

        {!noGoal && <p className="mt-6 text-xs text-muted">{t("recap.tapHint")}</p>}
      </div>
    </div>
  );
}
