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
 * The learner's own IANA timezone, read in the browser.
 *
 * Moved here verbatim from write/page.tsx, where it had been a private
 * function — the 「今日/昨日」 toggle and the daily recap overlay both need to
 * agree on what "today" is, and a second copy is how two answers start.
 * Behaviour is unchanged: same cookie, same validation, same fallback.
 *
 * Reads the user_tz cookie set by TimezoneSyncer, so it matches what
 * lib/tz-server.ts resolves on the server for the same request. Falls back to
 * the browser's own zone when the cookie is missing or unparseable.
 *
 * ⚠️ Browser only — it reads document.cookie. On the server use
 * getTimezoneFromCookie() from lib/tz-server.ts instead.
 *
 * (The literal "user_tz" still appears in tz-server.ts and TimezoneSyncer.tsx.
 * Consolidating those three is a separate change and deliberately not done
 * here; this was a move, not a refactor.)
 */
export function getClientTZ(): string {
  if (typeof document === "undefined") return "UTC";
  const match = document.cookie.match(/(?:^|;\s*)user_tz=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : null;
  if (raw) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: raw });
      return raw;
    } catch { /* invalid cookie value */ }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
