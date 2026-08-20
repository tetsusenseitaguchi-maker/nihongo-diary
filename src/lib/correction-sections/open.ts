/**
 * "Does this browser want the practice drills / the mini lesson open?"
 *
 * Same shape and the same trade as @/lib/discovery/seen and its siblings:
 * localStorage, because the preference has to outlive the tab, and per browser
 * rather than per account, because the alternative is columns on profiles —
 * the table plan and billing live on — for two booleans.
 *
 * Every access is wrapped. Safari in private mode throws on storage access
 * rather than returning null, and a storage failure must never take a
 * correction result down. A failed read degrades to closed, which is the
 * initial state anyway.
 *
 * ── Why remember at all ───────────────────────────────────────────────────
 * CorrectionResult renders on /write straight after a correction AND on
 * /diary/[id] whenever a past entry is opened, so a learner who does the
 * drills every day would otherwise tap twice, every day, forever. Open or
 * closed is a preference about how they work, not a fact about one correction.
 *
 * Two keys, not one: opening the drills says nothing about wanting the grammar
 * lesson, and someone who wants both will open both once.
 */

export const PRACTICE_OPEN_KEY = "nihongo-diary-correction-practice-open";
export const MINI_LESSON_OPEN_KEY = "nihongo-diary-correction-lesson-open";

/** Reads the stored preference. Never call during render — see the note in
 *  the components: the server has no localStorage and would disagree. */
export function isSectionOpen(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setSectionOpen(key: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, open ? "1" : "0");
  } catch {
    // Storage unavailable — the section still opens and closes for this
    // visit, it just will not be remembered for the next one.
  }
}
