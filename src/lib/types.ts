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
  englishExplanation: string;
}

export interface VocabItem {
  word: string;
  reading?: string;
  meaning: string;
  example?: string;
}

export interface MistakeItem {
  before: string;
  after: string;
  note: string;
}

export interface PointExample {
  jp: string; // Japanese with 漢字(かな) notation — rendered by Furigana component
  en: string; // English translation / explanation
}

export interface MiniLessonPoint {
  text: string;
  example?: string;          // existing single example (kept for backward compat)
  examples?: PointExample[]; // NEW: 2–3 richer examples with English translations
}

export interface CommonMistake {
  wrong: string; // ✗ incorrect form
  right: string; // ✓ correct form
  note: string;  // short English explanation of why it's wrong
}

export interface MiniLesson {
  id: number;
  order: number;
  title: string;
  shortExplanation: string;
  visualImage: string;
  points: MiniLessonPoint[];
  exampleJapanese: string;
  exampleJapaneseRuby: string;
  exampleEnglish: string;
  shortNote: string;
  commonMistakes?: CommonMistake[]; // NEW
}

/** A word from the user's diary annotated with its approximate JLPT level. */
export interface JlptWord {
  word: string;      // kanji form (or hiragana if no kanji)
  reading: string;   // complete hiragana reading
  level: string;     // "N5" | "N4" | "N3" | "N2" | "N1"
}

/** A suggested next-level vocabulary word based on diary context. */
export interface NextVocabItem {
  word: string;     // kanji form
  reading: string;  // hiragana reading
  meaning: string;  // short definition in UI language
  level: string;    // "N5" | "N4" | "N3" | "N2" | "N1"
}

/** A suggested next-level grammar pattern based on diary context. */
export interface NextGrammarItem {
  pattern: string;       // e.g. 〜てくる
  explanation: string;   // in UI language
  exampleRuby: string;   // Japanese example sentence with <ruby> furigana
}

/** A synonym / paraphrase suggestion for a word used in the diary. */
export interface AlternativeWord {
  original: string;            // word as written in the diary
  alternative: string;         // suggested replacement (dictionary form)
  alternativeReading: string;  // complete hiragana reading of the alternative
}

export interface Correction {
  original: string;
  corrected: string;
  natural: string;
  explanation: string;
  correctionNote?: string;
  mistakes: MistakeItem[];
  vocabulary: VocabItem[];
  practice: { jp: string; en: string };
  relatedMiniLesson?: MiniLesson | null;
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
  /** A natural Japanese phrase Obie teaches (with <ruby> furigana). */
  obiePhraseRuby?: string;
  /** Explanation of obiePhraseRuby in the user's UI language. */
  obiePhraseExplanation?: string;
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
  corrected_japanese: string | null;
  natural_japanese: string | null;
  english_explanation: string | null;
  /** Per-language translation cache keyed by BCP-47 code, e.g. {"en": "…", "es": "…"} */
  translations: Record<string, string> | null;
  key_mistakes: MistakeItem[] | null;
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
