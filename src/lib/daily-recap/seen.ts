/**
 * "Has this browser already seen today's recap?"
 *
 * Same shape and the same trade as @/lib/tour/seen, @/lib/audio-intro/seen,
 * @/lib/plans-intro/seen and @/lib/web-push/banner-dismissed: localStorage,
 * because the flag has to outlive the tab, and per browser rather than per
 * account.
 *
 * ⚠️ The value is a DATE, not "1". sessionStorage would have been wrong for
 * the obvious reason (a tab left open all week would suppress it forever) but
 * a boolean in localStorage is wrong too — it would suppress the recap for
 * good. Storing the day it was last shown is what makes "once a day" mean the
 * day rather than the visit.
 *
 * The date is the LEARNER's, from todayInTZ(getClientTZ()) — the same answer
 * the 「今日/昨日」 toggle gets on /write. Deliberately not WEEK_TZ: the weekly
 * goal's week is pinned to Asia/Tokyo, but "have I already seen today's recap"
 * is a question about the person holding the phone. The two disagree only in
 * the small hours, and nothing breaks when they do — the recap can show once
 * more, or once later, and the numbers inside it are identical either way.
 *
 * ── Failure direction ──────────────────────────────────────────────────────
 * Every access is wrapped: Safari in private mode THROWS on storage access
 * rather than returning null, and a storage failure must never take the
 * dashboard down.
 *
 * ⚠️ Unlike the four modules above, a failed read degrades to "already seen"
 * — the recap does NOT show. Those four guard small, dismissible things where
 * showing again costs one tap. This one is a full-screen overlay: a browser
 * that cannot remember would be interrupted on every single dashboard load,
 * which is far worse than never seeing it at all.
 */

export const DAILY_RECAP_SEEN_KEY = "nihongo-diary-daily-recap-seen";

/** True when the recap has already been shown on `today` ("YYYY-MM-DD"). */
export function hasSeenRecapToday(today: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DAILY_RECAP_SEEN_KEY) === today;
  } catch {
    // Storage unavailable — fail closed. See the note above: repeating a
    // full-screen overlay every load is the worse of the two failures.
    return true;
  }
}

export function markRecapSeen(today: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DAILY_RECAP_SEEN_KEY, today);
  } catch {
    // Storage unavailable. The read above already returned true in this
    // browser, so the recap never opened and there is nothing to record.
  }
}
