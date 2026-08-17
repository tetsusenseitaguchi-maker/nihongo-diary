// Returns "YYYY-MM-DD" for the current moment in the given IANA timezone.
// en-CA locale guarantees ISO 8601 (YYYY-MM-DD) output in all environments.
// Works in both the browser and Node.js 18+.
export function todayInTZ(tz = "UTC"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

/**
 * The calendar day before a "YYYY-MM-DD" string, as another "YYYY-MM-DD".
 *
 * Pure calendar arithmetic: the string is read as UTC midnight and stepped back
 * a day in UTC, so no timezone and no daylight-saving transition can move the
 * result. The input is already a local date produced by todayInTZ — it carries
 * no time and needs none.
 *
 * ⚠️ Does NOT replace the private prevDay() inside lib/diary.ts. That one
 * belongs to the streak calculation, which is hands-off; a shared helper is
 * worth having but not at the price of editing streak logic to get it.
 */
export function previousDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The Monday of the week containing `dateStr`, as another "YYYY-MM-DD".
 *
 * Same shape as previousDay above and for the same reason: the string is read
 * as UTC midnight and stepped back in UTC, so no timezone and no daylight-saving
 * transition can move the result. Give it a date that is already local — the
 * caller decides whose clock the week belongs to.
 *
 * Monday-start (Mon=0 … Sun=6), which is NOT what the rest of the app draws:
 * lib/dates.ts weekdayLabels starts "S" and buildMonthGrid uses getDay(), so
 * MiniCalendar renders Sunday-first on the same dashboard page. The weekly goal
 * was specified Monday-start deliberately; the mismatch is with the calendar's
 * first column only, and nothing computes across the two.
 *
 * Verified across the rollover minute (Sun 23:59 → Mon 00:00), month and year
 * boundaries, and a week spanning Feb 29.
 */
export function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const mondayIndex = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - mondayIndex);
  return d.toISOString().slice(0, 10);
}

// Returns { year, month (0-indexed like Date.getMonth()), day, dateStr }
// for the current moment in the given IANA timezone.
export function nowInTZ(tz = "UTC"): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
} {
  const dateStr = todayInTZ(tz);
  const [year, m, day] = dateStr.split("-").map(Number);
  return { year, month: m - 1, day, dateStr };
}
