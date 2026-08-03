/**
 * How many days in a row the learner has written — one definition, one place.
 *
 * ── The definition ───────────────────────────────────────────────────────
 * Count back from the learner's LOCAL today over the set of diary_date values.
 * If today has nothing yet, start from yesterday instead. That grace is the
 * whole point: a streak that reads 0 at breakfast because the day is young
 * punishes people for not having written yet, and the number is being shown
 * precisely to make them want to keep it.
 *
 * Missing a whole day still breaks it. Yesterday empty AND today empty is 0.
 *
 * ── Why local dates ──────────────────────────────────────────────────────
 * diary_date is written in the learner's own timezone (write/page.tsx uses
 * todayInTZ(getClientTZ())), so the day being counted has to come from the
 * same clock. Callers pass todayStr from todayInTZ(tz) — never from
 * new Date() on the server, which is UTC on Vercel.
 *
 * ⚠️ Passing a UTC date for a learner east of it hides the entry they wrote
 *    today: at 08:00 in Tokyo the server's date is still yesterday, the
 *    diary_date reads as tomorrow, and the walk never reaches it. The number
 *    comes out short, sometimes zero on the day someone wrote. This is the
 *    same class of mistake as the timezone incident that once made every user
 *    Free — it is not this module's job to guess, so it takes the date.
 *
 * ── What it deliberately is not ──────────────────────────────────────────
 * Not the weekly report's definition. That one (api/report/weekly/route.ts)
 * starts at today and stops dead if today is empty, so the same learner can
 * read 36 there and 0 here. It is out of scope and untouched; anything new
 * uses this file so the two do not multiply further.
 *
 * No DB column, no trigger, no cache. Measured on production: the heaviest
 * learner has 40 diaries, the median has 1, and every caller already holds
 * the rows. A stored counter would be a trigger on profiles — the table with
 * the incident history — bought for nothing.
 */

/** The previous calendar day of a YYYY-MM-DD string. */
export function previousDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Days in a row up to `todayStr`, counting each date once.
 *
 * `dates` may contain duplicates (several diaries in one day) and any order —
 * it is read as a set.
 */
export function currentStreak(dates: Iterable<string>, todayStr: string): number {
  const written = dates instanceof Set ? dates : new Set(dates);
  let cursor = todayStr;
  if (!written.has(cursor)) cursor = previousDay(cursor);
  let days = 0;
  while (written.has(cursor)) {
    days++;
    cursor = previousDay(cursor);
  }
  return days;
}

/** Did today itself get written? Separate from the streak, which forgives it. */
export function wroteToday(dates: Iterable<string>, todayStr: string): boolean {
  const written = dates instanceof Set ? dates : new Set(dates);
  return written.has(todayStr);
}

/**
 * The rungs the streak is climbing. Same list as Sidebar.tsx's — the sidebar
 * keeps its own copy for now rather than being rewired, but if one moves the
 * other must follow.
 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

/** Days left to the next milestone, or null once every rung is behind them. */
export function daysToNextMilestone(streak: number): { next: number; remaining: number } | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return { next: m, remaining: m - streak };
  }
  return null;
}

/**
 * Which message the badge shows.
 *
 * "day1" on the first day AND on the first day after a break — the copy for
 * starting again is the copy for starting. Nothing anywhere announces that a
 * streak ended: the number simply reads 1 again. Telling someone they lost a
 * seven-day run is not a nudge, it is a reason to close the app.
 *
 * "none" is the state where nothing should be drawn at all, which is only
 * possible before the first diary exists.
 */
export function streakTone(streak: number): "none" | "day1" | "running" {
  if (streak <= 0) return "none";
  if (streak === 1) return "day1";
  return "running";
}
