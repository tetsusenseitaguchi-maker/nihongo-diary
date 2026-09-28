"use client";

import { useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { hasSeenRecapToday } from "@/lib/daily-recap/seen";
import { hasSeenTour } from "@/lib/tour/seen";
import { useTour } from "@/contexts/tour";
import { getClientTZ, todayInTZ } from "@/lib/date-tz";

/**
 * The one moment Obie's walk moves: the newest footprint fades in and Obie
 * steps up to it. Everything else on the road holds still.
 *
 * ── When ───────────────────────────────────────────────────────────────────
 * Saving a diary never lands on the dashboard — the correction stays on /write
 * and "just save" goes to /diary/[id] — and nothing is handed over when the
 * learner does come back. So this compares instead: the count this browser saw
 * last time against the count the server just rendered. It plays when all of
 * these hold:
 *
 *   - the count went up since the last dashboard view on this browser
 *     (a first-ever view has nothing to compare with and does not play)
 *   - it has not played today, by the learner's day (todayStr from the server,
 *     the same day the dashboard's other cards use)
 *   - the dashboard was reached by navigating inside the app, not by a cold
 *     start or a reload — see below
 *   - neither the tour nor 「今日のあなた」 is about to cover the screen
 *
 * Whatever happens, the count is recorded, so a skipped arrival is skipped for
 * good rather than saved up for later.
 *
 * ── Why not on a cold start or a reload ────────────────────────────────────
 * Then the server's HTML paints the finished road before any script runs, and
 * starting the animation afterwards would mean the footprint vanishing and
 * Obie jumping back a step on screen before they move. On an in-app
 * navigation this runs in a layout effect — after React has put the new page
 * in the DOM, before the browser paints it — so the first frame shown is
 * already the first frame of the animation.
 *
 * ── Why 「今日のあなた」 is predicted rather than observed ─────────────────
 * DailyRecapOverlay decides in a passive effect, which runs after this layout
 * effect. So this asks the same questions it will ask (tour seen, recap not yet
 * shown today by the learner's clock) instead of looking for it in the DOM.
 * The overlay is not waited for: if it is coming, the arrival is skipped.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 * The data-walk-arrive attribute is set straight on the wrapper — no state, so
 * no second render — and globals.css does the rest in 1.2s regardless of the
 * count. With prefers-reduced-motion the same attribute lands on the finished
 * road: the rules there are guarded individually.
 */

const STORAGE_KEY = "nihongo-diary-walk-seen";

interface Seen {
  /** The diary count the dashboard last showed on this browser. */
  total: number;
  /** The learner's day the arrival last played, "YYYY-MM-DD". */
  playedOn: string | null;
}

function readSeen(): Seen | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Seen>;
    return typeof v.total === "number" ? { total: v.total, playedOn: v.playedOn ?? null } : null;
  } catch {
    return null;
  }
}

function writeSeen(v: Seen): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // Private mode and blocked storage throw. Losing this costs one animation.
  }
}

const noSubscribe = () => () => {};

/**
 * False when this component's first render is the hydration of server HTML
 * (a cold start or a reload), true when it was rendered on the client by an
 * in-app navigation. useSyncExternalStore reads the server snapshot while
 * hydrating and the client snapshot otherwise; the ref keeps that first answer.
 */
function useRenderedByNavigation(): boolean {
  const onClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  return useRef(onClient).current;
}

export function WalkArrival({
  total,
  todayStr,
  children,
}: {
  total: number;
  todayStr: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const byNavigation = useRenderedByNavigation();
  const { isActive: tourRunning } = useTour();

  useLayoutEffect(() => {
    const seen = readSeen();
    const recapComing = hasSeenTour() && !hasSeenRecapToday(todayInTZ(getClientTZ()));

    const play =
      seen !== null &&
      total > seen.total &&
      seen.playedOn !== todayStr &&
      byNavigation &&
      !tourRunning &&
      hasSeenTour() &&
      !recapComing;

    if (play) ref.current?.setAttribute("data-walk-arrive", "");
    writeSeen({ total, playedOn: play ? todayStr : (seen?.playedOn ?? null) });
    // Once per mount: this is about how the page was arrived at, not about
    // anything that changes while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref}>{children}</div>;
}
