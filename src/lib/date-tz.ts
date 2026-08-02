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
