export interface DiaryRow {
  id: string;
  diary_date: string; // YYYY-MM-DD
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

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStats(entries: DiaryRow[], now: Date = new Date()): DiaryStats {
  const year = now.getFullYear();
  const month = now.getMonth();

  const dateSet = new Set(entries.map((e) => e.diary_date));

  // This / last month counts
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

  // Current streak — consecutive days ending today (or yesterday if today is blank)
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!dateSet.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(ymd(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
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

  const today = entries.find((e) => e.diary_date === ymd(now)) ?? null;

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
