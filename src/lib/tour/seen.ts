/**
 * "Has this browser been shown the tour yet?"
 *
 * Deliberately separate from @/lib/tour/state, which holds the step of a tour
 * that is running right now: that lives in sessionStorage and is cleared the
 * moment the tour ends. This flag has to outlive the tab, so it is
 * localStorage.
 *
 * It is also a different key from the old five-step tour's, so everyone —
 * including people who saw the old one — gets the new tour once.
 *
 * Per browser rather than per account, which means the tour can reappear after
 * clearing site data or on a second device. That is the cheap failure: the
 * cost is one extra Skip tap, against having to touch the profiles table for
 * the alternative.
 *
 * Every access is wrapped, like the session state: Safari private mode throws
 * on storage access rather than returning null, and a storage failure must
 * never take the app down. Failing to read degrades to "not seen" (the tour
 * may show again); failing to write degrades to the same. Both are harmless.
 */

export const TOUR_SEEN_V2_KEY = "nihongo-diary-tour-v2-seen";

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TOUR_SEEN_V2_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_SEEN_V2_KEY, "1");
  } catch {
    // Storage unavailable — the tour may auto-start again on a later visit.
  }
}
