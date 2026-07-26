/**
 * Storage layer for the interactive onboarding tour.
 *
 * The live state lives in React context (see @/contexts/tour). Because
 * /dashboard, /write and /feed all sit under the (app) layout group and every
 * link is a next/link, the shared layout is not remounted on those
 * navigations — the context survives the whole happy path without touching
 * storage at all.
 *
 * sessionStorage is only the safety net for a full document load in the middle
 * of a tour: a hard refresh, a plain <a href> (e.g. the /upgrade links), or a
 * middleware redirect. Session scope is deliberate — closing the tab abandons
 * the tour, and stop() (skip / finish / going off-script) clears the state so
 * the next run always begins at step 0.
 *
 * Every storage access is wrapped: Safari private mode and some ITP
 * configurations throw on access rather than returning null. A failure here
 * must never take the app down, so it degrades to "no saved tour".
 */

export const TOUR_STATE_KEY = "nihongo-diary-tour-state";

/** Bump when the step list changes so stale saved states are discarded. */
export const TOUR_VERSION = 1;

/** welcome → write button → editor → correction → feed tab → feed → done */
export const TOUR_STEP_COUNT = 7;

/** A tour left sitting in a background tab this long is treated as abandoned. */
export const TOUR_TTL_MS = 60 * 60 * 1000;

export interface TourState {
  /** Schema version — must match TOUR_VERSION to be restored. */
  v: number;
  /** Zero-based index into the step list. */
  step: number;
  /** Epoch ms the tour started; used for the TTL check. */
  startedAt: number;
}

function isValid(value: unknown): value is TourState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (s.v !== TOUR_VERSION) return false;
  if (
    typeof s.step !== "number" ||
    !Number.isInteger(s.step) ||
    s.step < 0 ||
    s.step >= TOUR_STEP_COUNT
  ) {
    return false;
  }
  if (typeof s.startedAt !== "number" || !Number.isFinite(s.startedAt)) {
    return false;
  }
  if (Date.now() - s.startedAt > TOUR_TTL_MS) return false;
  return true;
}

/** Returns the saved tour, or null when there is none / it is no longer valid. */
export function readTourState(): TourState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TOUR_STATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      clearTourState();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeTourState(state: TourState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOUR_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable or full — the in-memory context stays authoritative,
    // so the tour still works for the rest of this page's lifetime.
  }
}

export function clearTourState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOUR_STATE_KEY);
  } catch {
    // Nothing to do — a stale entry is discarded by isValid() on the next read.
  }
}
