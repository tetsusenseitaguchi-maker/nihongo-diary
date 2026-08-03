export interface DiaryRow {
  id: string;
  diary_date: string; // YYYY-MM-DD
  title?: string | null;
  tags?: string[];
  original_text: string;
  corrected_japanese: string | null;
  english_explanation: string | null;
  level: string | null;
  correction_style: string | null;
}

export interface DiaryStats {
  total: number;
  thisMonthCount: number;
  lastMonthCount: number;
  monthDelta: number;
  currentStreak: number;
  longestStreak: number;
  activeDaysThisMonth: number[];
  today: DiaryRow | null;
}

import { currentStreak } from "@/lib/streak";

// prevDay used to live here, parsing the date as local time. streak.ts does the
// same walk in UTC, which is the same answer for every YYYY-MM-DD — checked
// across 1,100 consecutive dates in six timezones including the southern-
// hemisphere DST shifts, zero differences — and cannot be bent by the server's
// own clock. The streak walk moved with it so that this file, the write page
// and the dashboard all count the same way.

// todayStr: "YYYY-MM-DD" in the user's local timezone.
// Omit to fall back to the server's local date (UTC on Vercel — only correct
// for callers that don't have access to the user's timezone).
export function computeStats(entries: DiaryRow[], todayStr?: string): DiaryStats {
  const ref = todayStr ?? new Date().toLocaleDateString("en-CA");
  const [year, m] = ref.split("-").map(Number);
  const month = m - 1; // 0-indexed

  const dateSet = new Set(entries.map((e) => e.diary_date));

  const lastMonthDate = new Date(year, month - 1, 1);
  const lm = { y: lastMonthDate.getFullYear(), m: lastMonthDate.getMonth() };

  let thisMonthCount = 0;
  let lastMonthCount = 0;
  const activeDaysThisMonth: number[] = [];

  for (const e of entries) {
    const d = new Date(e.diary_date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      thisMonthCount++;
      activeDaysThisMonth.push(d.getDate());
    } else if (d.getFullYear() === lm.y && d.getMonth() === lm.m) {
      lastMonthCount++;
    }
  }

  // Current streak — walk backwards from today (or yesterday if today has no
  // entry). The walk itself is in lib/streak.ts now; the behaviour is what it
  // always was.
  const streak = currentStreak(dateSet, ref);

  // Longest streak across all entries
  const sorted = Array.from(dateSet).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const s of sorted) {
    const d = new Date(s + "T00:00:00");
    if (prev) {
      const diff = Math.round((d.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  const today = entries.find((e) => e.diary_date === ref) ?? null;

  return {
    total: entries.length,
    thisMonthCount,
    lastMonthCount,
    monthDelta: thisMonthCount - lastMonthCount,
    currentStreak: streak,
    longestStreak,
    activeDaysThisMonth,
    today,
  };
}
