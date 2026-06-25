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

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

  // Current streak — walk backwards from today (or yesterday if today has no entry)
  let currentStreak = 0;
  let cursor = ref;
  if (!dateSet.has(cursor)) cursor = prevDay(cursor);
  while (dateSet.has(cursor)) {
    currentStreak++;
    cursor = prevDay(cursor);
  }

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
    currentStreak,
    longestStreak,
    activeDaysThisMonth,
    today,
  };
}
