/**
 * Writing prompts ("今日のお題") shown on the Write page.
 *
 * Display-only learning content — no DB access, no plan gating, no usage
 * counters. Every user sees the same prompt on a given calendar day.
 *
 * Japanese text uses the hand-authored 漢字(かな) ruby notation, which
 * <Furigana> renders directly via parseRubySegments(). Nothing here goes
 * through buildRubyNotation / normalizeRubyText.
 *
 * Target level: JLPT N5.
 */

export type WritingPrompt = {
  /** Stable id — the daily rotation keys off array position, so never reorder. */
  id: number;
  /** The prompt itself, in 漢字(かな) ruby notation. */
  jp: string;
  /** English gloss. Kept in English for every locale (see PRESET_TAGS / tips). */
  en: string;
  /** 5–7 words the learner can lean on. */
  words: { jp: string; en: string }[];
};

// FIXED order — the daily prompt is chosen by index, so reordering this array
// would change which prompt every user sees today.
export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 1,
    jp: "今日(きょう)、何(なに)を食(た)べましたか？",
    en: "What did you eat today?",
    words: [
      { jp: "朝(あさ)ごはん", en: "breakfast" },
      { jp: "昼(ひる)ごはん", en: "lunch" },
      { jp: "晩(ばん)ごはん", en: "dinner" },
      { jp: "おいしい", en: "delicious" },
      { jp: "作(つく)る", en: "to make / cook" },
      { jp: "食(た)べる", en: "to eat" },
    ],
  },
  {
    id: 2,
    jp: "今日(きょう)の天気(てんき)はどうでしたか？",
    en: "How was the weather today?",
    words: [
      { jp: "晴(は)れ", en: "sunny" },
      { jp: "雨(あめ)", en: "rain" },
      { jp: "曇(くも)り", en: "cloudy" },
      { jp: "暑(あつ)い", en: "hot" },
      { jp: "寒(さむ)い", en: "cold" },
      { jp: "傘(かさ)", en: "umbrella" },
    ],
  },
  {
    id: 3,
    jp: "週末(しゅうまつ)は何(なに)をしたいですか？",
    en: "What do you want to do this weekend?",
    words: [
      { jp: "休(やす)み", en: "day off" },
      { jp: "友(とも)だち", en: "friend" },
      { jp: "買(か)い物(もの)", en: "shopping" },
      { jp: "映画(えいが)", en: "movie" },
      { jp: "行(い)く", en: "to go" },
      { jp: "休(やす)む", en: "to rest" },
    ],
  },
];

/**
 * The prompt for a given "YYYY-MM-DD" day. Same day → same prompt for every
 * user (no per-user seed), so the choice stays reproducible.
 *
 * Pass a date produced by todayInTZ(tz) — never a UTC-fixed or mount-fixed one.
 */
export function promptForDate(dateStr: string): WritingPrompt | null {
  if (WRITING_PROMPTS.length === 0) return null;
  const n = Number(dateStr.replace(/-/g, ""));
  if (!Number.isFinite(n)) return WRITING_PROMPTS[0];
  return WRITING_PROMPTS[n % WRITING_PROMPTS.length];
}

/**
 * A random prompt other than the current one, for the "another prompt" button.
 * Callers must only invoke this from an event handler / effect — never during
 * render — so server and client markup stay identical.
 */
export function randomPromptExcept(currentId: number | undefined): WritingPrompt | null {
  if (WRITING_PROMPTS.length === 0) return null;
  const pool = WRITING_PROMPTS.filter((p) => p.id !== currentId);
  if (pool.length === 0) return WRITING_PROMPTS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
