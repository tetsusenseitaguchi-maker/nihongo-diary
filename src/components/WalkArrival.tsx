"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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
 *
 * ── Checking it on a phone ─────────────────────────────────────────────────
 * It plays at most once a day, so a real device would otherwise cost a day
 * per attempt. Same idea as /dashboard?recap=1:
 *
 *   ?walk=replay  plays it now, whatever the conditions. Writes nothing.
 *                 Opened by typing a URL it is a reload, so the finished road
 *                 shows for a moment before it plays — fine for a check.
 *   ?walk=debug   shows, under the card, what is stored, how THIS view would
 *                 decide, and how the LAST ordinary view decided — including
 *                 where the card was on screen. Writes nothing.
 *
 * The last ordinary decision is recorded on every view (LAST_KEY), because the
 * view worth diagnosing is the one reached from the bottom nav after writing,
 * and typing ?walk=debug is always a reload, never that.
 *
 * ⚠️ The iOS app has no address bar, so neither can be typed there. Both work
 * in Safari on the phone, which runs the same code with its own storage.
 */

const STORAGE_KEY = "nihongo-diary-walk-seen";
const LAST_KEY = "nihongo-diary-walk-last";

/** How one dashboard view decided. Kept only for ?walk=debug. */
interface Decision {
  at: string;
  total: number;
  today: string;
  stored: Seen | null;
  byNavigation: boolean;
  tourRunning: boolean;
  tourSeen: boolean;
  recapComing: boolean;
  play: boolean;
  /** The card's top edge, and the viewport height, when the decision ran. */
  cardTop: number;
  viewportHeight: number;
}

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

function readLast(): Decision | null {
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as Decision) : null;
  } catch {
    return null;
  }
}

function writeLast(v: Decision): void {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(v));
  } catch {
    // Diagnostics only.
  }
}

/** Plain key=value lines: a developer readout, not interface copy. */
function describe(label: string, d: Decision): string {
  const visible = d.cardTop < d.viewportHeight;
  return [
    `${label} @ ${d.at}`,
    `  total=${d.total} today=${d.today} stored=${JSON.stringify(d.stored)}`,
    `  byNavigation=${d.byNavigation} tourRunning=${d.tourRunning} tourSeen=${d.tourSeen} recapComing=${d.recapComing}`,
    `  play=${d.play} cardTop=${Math.round(d.cardTop)} viewportHeight=${d.viewportHeight} cardOnScreen=${visible}`,
  ].join("\n");
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
  const [debug, setDebug] = useState<string | null>(null);

  useLayoutEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("walk");
    if (mode === "replay") {
      ref.current?.setAttribute("data-walk-arrive", "");
      return;
    }

    const seen = readSeen();
    const tourSeen = hasSeenTour();
    const recapComing = tourSeen && !hasSeenRecapToday(todayInTZ(getClientTZ()));

    const play =
      seen !== null &&
      total > seen.total &&
      seen.playedOn !== todayStr &&
      byNavigation &&
      !tourRunning &&
      tourSeen &&
      !recapComing;

    const decision: Decision = {
      at: new Date().toISOString(),
      total,
      today: todayStr,
      stored: seen,
      byNavigation,
      tourRunning,
      tourSeen,
      recapComing,
      play,
      cardTop: ref.current?.getBoundingClientRect().top ?? -1,
      viewportHeight: window.innerHeight,
    };

    if (mode === "debug") {
      // Read-only: this view is a reload by construction, so it must not
      // overwrite the record of the view that is actually being diagnosed.
      const last = readLast();
      setDebug(
        [describe("this view (not played, not recorded)", decision), last ? describe("last ordinary view", last) : "last ordinary view: none recorded"].join("\n\n"),
      );
      return;
    }

    if (play) ref.current?.setAttribute("data-walk-arrive", "");
    writeSeen({ total, playedOn: play ? todayStr : (seen?.playedOn ?? null) });
    writeLast(decision);
    // Once per mount: this is about how the page was arrived at, not about
    // anything that changes while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref}>
      {children}
      {debug && (
        <pre className="mx-3 mb-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-sand/60 p-2 font-mono text-[10px] leading-snug text-ink/80">
          {debug}
        </pre>
      )}
    </div>
  );
}
