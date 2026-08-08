import type { Reading } from "@/lib/reading-validation";
import type { PlainText } from "@/lib/text-kinds";

/*
 * A `PlainText` field is prose in the learner's UI language, or a plain label,
 * and must never be drawn as furigana. It is a string at runtime and opaque to
 * the type checker, so `{correction.explanation}` does not compile: render it
 * with <NoRuby>, or say plainValue() when a DB column or a `string` prop
 * genuinely needs the text. The fields left as `string` are either Japanese
 * that <Furigana> renders, or values compared and stored verbatim.
 *
 * Which is which is decided once, per field, in CORRECTION_SPEC — see
 * @/lib/correction-payload. Ruby-carrying fields are not branded yet.
 */

export type Level = "N5" | "N4" | "N3" | "Natural";
export type CorrectionStyle = "Light" | "Natural" | "Native";
export type Weather = "sunny" | "cloudy" | "rainy";

export type DrillType = "fill-in" | "particle-choice" | "desu-masu" | "reorder" | "rewrite";

export interface PracticeDrill {
  type: DrillType;
  question: string;
  questionRuby: string;
  choices: string[];
  answer: string;
  answerRuby: string;
  englishExplanation: PlainText;
}

export interface VocabItem {
  word: string;
  /** Validated by sanitizeReading(). See @/lib/reading-validation. */
  reading?: Reading;
  meaning: PlainText;
  example?: string;
}

export interface MistakeItem {
  before: string;
  after: string;
  note: PlainText;
}

export interface PointExample {
  jp: string; // Japanese with 漢字(かな) notation — rendered by Furigana component
  en: PlainText; // English translation / explanation
}

export interface MiniLessonPoint {
  text: string;
  example?: string;          // existing single example (kept for backward compat)
  examples?: PointExample[]; // NEW: 2–3 richer examples with English translations
}

export interface CommonMistake {
  wrong: string;   // ✗ incorrect form
  right: string;   // ✓ correct form
  note: PlainText; // short English explanation of why it's wrong
}

/**
 * What the model returns for relatedMiniLesson — the id of a lesson in the
 * fixed list, plus the four fields it may tailor to this learner.
 *
 * Stored as-is in diary_entries.related_mini_lesson. buildMiniLessonFromAI
 * turns it back into a MiniLesson on read.
 */
export interface AiMiniLessonPayload {
  id: number;
  shortExplanation: string;
  exampleJapaneseRuby: string;
  exampleEnglish: string;
  shortNote: string;
}

export interface MiniLesson {
  id: number;
  order: number;
  title: PlainText;
  shortExplanation: PlainText;
  visualImage: PlainText;
  points: MiniLessonPoint[];
  exampleJapanese: string;
  exampleJapaneseRuby: string;
  exampleEnglish: PlainText;
  shortNote: PlainText;
  commonMistakes?: CommonMistake[]; // NEW
}

/** A word from the user's diary annotated with its approximate JLPT level. */
export interface JlptWord {
  word: string;      // kanji form (or hiragana if no kanji)
  reading: Reading;  // complete hiragana reading — validated by sanitizeReading()
  level: string;     // "N5" | "N4" | "N3" | "N2" | "N1"
}

/** A suggested next-level vocabulary word based on diary context. */
export interface NextVocabItem {
  word: string;       // kanji form
  reading: Reading;   // hiragana reading — validated by sanitizeReading()
  meaning: PlainText; // short definition in UI language
  level: string;      // "N5" | "N4" | "N3" | "N2" | "N1"
}

/** A suggested next-level grammar pattern based on diary context. */
export interface NextGrammarItem {
  pattern: PlainText;     // e.g. 〜てくる
  explanation: PlainText; // in UI language
  exampleRuby: string;    // Japanese example sentence with <ruby> furigana
}

/** A synonym / paraphrase suggestion for a word used in the diary. */
export interface AlternativeWord {
  original: PlainText;         // word as written in the diary
  alternative: string;         // suggested replacement (dictionary form)
  alternativeReading: Reading; // complete hiragana reading — validated by sanitizeReading()
}

export interface Correction {
  original: string;
  /** original, with <ruby> furigana on every kanji — same text, no corrections. */
  originalRuby?: string;
  corrected: string;
  natural: string;
  explanation: PlainText;
  correctionNote?: PlainText;
  mistakes: MistakeItem[];
  /** The single grammar mistake selected for next-day review. Same shape as MistakeItem. */
  grammarFocus?: MistakeItem | null;
  vocabulary: VocabItem[];
  practice: { jp: string; en: string };
  relatedMiniLesson?: MiniLesson | null;
  /**
   * The five fields the AI actually returned for relatedMiniLesson, before
   * buildMiniLessonFromAI hydrated the rest from MINI_LESSONS.
   *
   * This is what gets stored in diary_entries.related_mini_lesson, not the
   * hydrated object above. title / points / visualImage / commonMistakes belong
   * to the static library and to LESSON_I18N, which localises them at render
   * time — freezing a copy into every diary row would mean an edit to a lesson
   * never reached the diaries that cite it.
   *
   * Absent when the AI returned nothing (Free, where the prompt does not ask
   * for it) and on every correction written before the column existed.
   */
  relatedMiniLessonRaw?: AiMiniLessonPayload | null;
  practiceDrills?: PracticeDrill[];
  /** ~3 characteristic words from the diary with approximate JLPT levels (legacy — from DB only). */
  jlptWords?: JlptWord[];
  /** ~3 synonym/paraphrase suggestions for words used in the diary. */
  alternativeWords?: AlternativeWord[];
  /** ~3 next-level vocabulary suggestions based on diary topic. */
  nextVocab?: NextVocabItem[];
  /** 2-3 next-level grammar/expression suggestions based on diary content. */
  nextGrammar?: NextGrammarItem[];
  /** AI-generated catchy title for this diary entry (Japanese, with <ruby> furigana HTML). */
  diaryTitle?: string;
  /** Obie's personalised encouragement reacting to diary content (Japanese with <ruby> furigana). */
  obieCheer?: string;
}

/** A single "previous point that was fixed" in the revise & recheck flow. */
export interface RecheckFixedItem {
  point: string;  // short label, in the user's UI language
  detail: string; // one short confirming sentence, in the UI language
}

/** A single "problem that still remains" in the revise & recheck flow. */
export interface RecheckRemainingItem {
  point: string;          // short label, in the UI language
  quoteRuby: string;      // offending phrase from the rewrite, Japanese with <ruby> furigana (may be "")
  suggestionRuby: string; // suggested fix, Japanese with <ruby> furigana (may be "")
  detail: string;         // one short explanation sentence, in the UI language
}

/**
 * Lightweight diff feedback returned by /api/recheck after a learner rewrites
 * their diary. NOT a full Correction — only "what got fixed / what remains".
 */
export interface RecheckResult {
  fixed: RecheckFixedItem[];
  remaining: RecheckRemainingItem[];
  summary: string;             // short progress summary, in the UI language
  encouragementRuby: string;   // warm Japanese cheer with <ruby> furigana
}

export interface DiaryEntry {
  id: string;
  date: string; // ISO date
  level: Level;
  weather: Weather;
  title: string;
  preview: string;
  body: string;
  correction: Correction;
}

export type TemplateCategory = "Daily Life" | "Travel" | "School" | "Work";

export interface Template {
  id: string;
  title: string;
  description: string;
  starter: string;
  category: TemplateCategory;
  starred: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface FeedItem {
  id: string;
  name: string;
  initials: string;
  action: string;
  time: string;
  body?: string;
  badge?: string;
}

export interface SuggestedUser {
  name: string;
  initials: string;
  level: string;
}

export interface FriendProgress {
  name: string;
  initials: string;
  streak: number;
  days: boolean[]; // last 14 days
}

/** A place pin attached to a diary entry. */
export interface DiaryPlace {
  lat: number;
  lng: number;
  name: string;
}

/** A pin displayed on the My Places / diary detail map. */
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  diaryEntryId: string;
  diaryDate: string;
  diaryTitle: string | null;
  /** true = own pin (exact coords); false = friend pin (city-level blurred). Defaults to true. */
  isOwner?: boolean;
  /** Author display name — shown in friend-pin popups. */
  authorName?: string | null;
  /** Author avatar URL — used to render the pin icon. */
  authorAvatar?: string | null;
}

/** A row from the Supabase `diary_entries` table. */
export interface DiaryRow {
  id: string;
  user_id: string;
  diary_date: string;
  title: string | null;
  tags: string[];
  original_text: string;
  original_text_ruby: string | null;
  corrected_japanese: string | null;
  natural_japanese: string | null;
  english_explanation: string | null;
  /** Per-language translation cache keyed by BCP-47 code, e.g. {"en": "…", "es": "…"} */
  translations: Record<string, string> | null;
  key_mistakes: MistakeItem[] | null;
  grammar_focus: MistakeItem | null;
  useful_vocabulary: VocabItem[] | null;
  practice_sentence: string | null;
  level: string | null;
  correction_style: string | null;
  is_public: boolean;
  image_path: string | null;
  audio_path: string | null;
  created_at: string;
  updated_at: string;
}
