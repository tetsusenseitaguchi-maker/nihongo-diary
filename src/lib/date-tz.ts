// Returns "YYYY-MM-DD" for the current moment in the given IANA timezone.
// en-CA locale guarantees ISO 8601 (YYYY-MM-DD) output in all environments.
// Works in both the browser and Node.js 18+.
export function todayInTZ(tz = "UTC"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
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
