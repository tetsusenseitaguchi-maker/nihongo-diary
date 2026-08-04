/**
 * AI correction response → Correction.
 *
 * One place where the model's JSON becomes the app's shape, so "which
 * transform does this field get" is answered once instead of at every
 * assignment. Four *Ruby fields reached the screen with no
 * normalizeRubyText() on them because that answer used to live in an 80-line
 * object literal where a missing call looked exactly like a present one.
 *
 * ── The table is the point ────────────────────────────────────────────────
 * CORRECTION_SPEC is typed `{ [K in keyof Correction]-?: … }`. The `-?` makes
 * every key required, optional ones included: add a field to Correction and
 * this file stops compiling until the field says what it is. Same for each
 * item shape. That is the part that actually prevents the next omission —
 * a transform you forget to declare is a compile error, where a transform you
 * forget to call was invisible.
 *
 * Field order matters: keys are evaluated in declaration order, and a
 * "reading" entry reads the word it belongs to out of the object built so
 * far (wordFrom). Declare the word before the reading.
 *
 * ── On "plain" fields ─────────────────────────────────────────────────────
 * The kinds here are named for what they DO today, not for what the fields
 * are. `text` means str() and nothing else — explanation, meaning, note and
 * the plain-Japanese labels are read verbatim.
 *
 * They are not stripRubyText()'d here on purpose. Ruby leaking into an
 * explanation is stripped at RENDER instead, by <NoRuby> — which also fixes
 * the rows already in the database, where a parse-time strip would only help
 * new ones. Moving the strip here as well would be a real change, not a
 * refactor: stripRubyText() trims, so " Hello " would start being stored as
 * "Hello". Worth doing, separately, with its own before/after.
 */

import { normalizeRubyText, stripRubyText } from "@/lib/furigana";
import { sanitizeReading } from "@/lib/reading-validation";
import { plainValue } from "@/lib/text-kinds";
import { buildMiniLessonFromAI } from "@/lib/lessons";
import { fixMasuIncompatibleBlank, ensureAnswerInChoices } from "@/lib/drills";
import type {
  AiMiniLessonPayload,
  AlternativeWord,
  Correction,
  DrillType,
  MistakeItem,
  NextGrammarItem,
  NextVocabItem,
  PracticeDrill,
  VocabItem,
} from "@/lib/types";

/* ── Reading whatever the model actually sent ─────────────────────────────
   The response is parsed JSON and nothing more: a field may be absent, null,
   or the wrong type. These two say what happens then, once. */

/** A field that should be a string. Anything else reads as absent. */
export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** A field that should be an array of objects. Anything else reads as empty. */
export function objArr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

/** First non-empty of the listed source fields — how a *Ruby field falls back
 *  to its non-ruby twin (correctedJapaneseRuby, else correctedJapanese). */
/**
 * The AI's relatedMiniLesson, kept exactly as it arrived, for the DB column.
 *
 * Null when there is nothing usable — Free corrections, where the prompt never
 * asks for it, and any response where the model omitted the field or gave an
 * id that is not a number. A row with a bad id would come back through
 * buildMiniLessonFromAI as lesson 1 rather than as nothing, which is a worse
 * answer than showing no lesson at all.
 *
 * The four text fields are stored raw, without normalizeRubyText: hydration on
 * read runs them through it, and normalising twice is how a repaired string
 * gets repaired again. An absent field becomes "" and falls back to the static
 * library at render time, which is buildMiniLessonFromAI's existing behaviour.
 */
function aiMiniLessonPayload(raw: unknown): AiMiniLessonPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : Number.parseInt(String(r.id ?? ""), 10);
  if (!Number.isFinite(id)) return null;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id,
    shortExplanation: s(r.shortExplanation),
    exampleJapaneseRuby: s(r.exampleJapaneseRuby),
    exampleEnglish: s(r.exampleEnglish),
    shortNote: s(r.shortNote),
  };
}

function readFrom(raw: Record<string, unknown>, from: string | string[]): string {
  if (typeof from === "string") return str(raw[from]);
  for (const key of from) {
    const value = str(raw[key]);
    if (value) return value;
  }
  return "";
}

/* ── What a field can be ──────────────────────────────────────────────────── */

type FieldSpec =
  /** Japanese carrying <ruby> markup → normalizeRubyText(). */
  | { kind: "ruby"; from: string | string[] }
  /** Read verbatim — UI-language prose, plain Japanese labels, levels. */
  | { kind: "text"; from: string | string[] }
  /** A hiragana reading, checked against the word it belongs to.
   *  `wordFrom` names a key already built on THIS item. */
  | { kind: "reading"; from: string; wordFrom: string }
  /** Passed through as-is when it is an array, [] otherwise. */
  | { kind: "stringArray"; from: string }
  /** Built by code below, because a table cannot express it. `why` is not
   *  decoration: it is the record of what the table could not hold. */
  | { kind: "custom"; why: string };

/** Every key of T, none optional. Omit one and this file stops compiling. */
type ItemSpec<T> = { [K in keyof T]-?: FieldSpec };

type CustomBuilders = Record<
  string,
  (raw: Record<string, unknown>, built: Record<string, unknown>) => unknown
>;

function buildItem<T>(
  spec: ItemSpec<T>,
  raw: Record<string, unknown>,
  customs: CustomBuilders = {},
): T {
  const built: Record<string, unknown> = {};
  // Declaration order — see the note on field order in the header.
  for (const key of Object.keys(spec)) {
    const field = spec[key as keyof T] as FieldSpec;
    switch (field.kind) {
      case "ruby":
        built[key] = normalizeRubyText(readFrom(raw, field.from));
        break;
      case "text":
        built[key] = readFrom(raw, field.from);
        break;
      case "reading":
        built[key] = sanitizeReading(str(built[field.wordFrom]), str(raw[field.from]));
        break;
      case "stringArray":
        built[key] = Array.isArray(raw[field.from]) ? raw[field.from] : [];
        break;
      case "custom":
        built[key] = customs[key]?.(raw, built);
        break;
    }
  }
  return built as T;
}

/* ── Item shapes ──────────────────────────────────────────────────────────── */

const MISTAKE_SPEC: ItemSpec<MistakeItem> = {
  before: { kind: "ruby", from: ["mistakeRuby", "mistake"] },
  after: { kind: "ruby", from: ["correctionRuby", "correction"] },
  note: { kind: "text", from: "explanation" },
};

/** Same shape as MISTAKE_SPEC, deliberately NOT the same spec: grammarFocus
 *  has never fallen back to the non-ruby `correction`. Kept side by side so
 *  the difference is visible rather than buried in a second code path. */
const GRAMMAR_FOCUS_SPEC: ItemSpec<MistakeItem> = {
  before: { kind: "ruby", from: ["mistakeRuby", "mistake"] },
  after: { kind: "ruby", from: "correctionRuby" },
  note: { kind: "text", from: "explanation" },
};

const VOCAB_SPEC: ItemSpec<VocabItem> = {
  // Before `reading` — it reads this back out via wordFrom.
  word: { kind: "custom", why: "falls back to wordRuby with its tags stripped" },
  reading: { kind: "reading", from: "reading", wordFrom: "word" },
  meaning: { kind: "text", from: "meaning" },
  example: { kind: "ruby", from: ["exampleRuby", "example"] },
};

const VOCAB_CUSTOMS: CustomBuilders = {
  word: (raw) => str(raw.word) || (raw.wordRuby ? str(raw.wordRuby).replace(/<[^>]*>/g, "") : ""),
};

const NEXT_VOCAB_SPEC: ItemSpec<NextVocabItem> = {
  word: { kind: "text", from: "word" },
  reading: { kind: "reading", from: "reading", wordFrom: "word" },
  meaning: { kind: "text", from: "meaning" },
  level: { kind: "text", from: "level" },
};

const NEXT_GRAMMAR_SPEC: ItemSpec<NextGrammarItem> = {
  pattern: { kind: "text", from: "pattern" },
  explanation: { kind: "text", from: "explanation" },
  exampleRuby: { kind: "ruby", from: "exampleRuby" },
};

const ALTERNATIVE_SPEC: ItemSpec<AlternativeWord> = {
  original: { kind: "text", from: "original" },
  alternative: { kind: "text", from: "alternative" },
  alternativeReading: { kind: "reading", from: "alternativeReading", wordFrom: "alternative" },
};

const DRILL_SPEC: ItemSpec<PracticeDrill> = {
  type: { kind: "custom", why: "any string the model sent, defaulting to fill-in" },
  question: { kind: "text", from: "question" },
  questionRuby: { kind: "ruby", from: "questionRuby" },
  // Plain text on purpose: PracticeDrills.tsx matches a choice against the
  // answer with a strict `choice === answer`, so neither may be rewritten.
  choices: { kind: "stringArray", from: "choices" },
  answer: { kind: "text", from: "answer" },
  answerRuby: { kind: "ruby", from: "answerRuby" },
  englishExplanation: { kind: "text", from: "englishExplanation" },
};

const DRILL_CUSTOMS: CustomBuilders = {
  type: (raw) => (typeof raw.type === "string" ? raw.type : "fill-in") as DrillType,
};

/* ── The whole response ───────────────────────────────────────────────────── */

const CORRECTION_SPEC: { [K in keyof Correction]-?: FieldSpec } = {
  original: { kind: "custom", why: "falls back to the text the learner submitted" },
  originalRuby: { kind: "ruby", from: "originalTextRuby" },
  corrected: { kind: "ruby", from: ["correctedJapaneseRuby", "correctedJapanese"] },
  natural: { kind: "ruby", from: ["naturalJapaneseRuby", "naturalJapanese"] },
  explanation: { kind: "text", from: "englishExplanation" },
  correctionNote: { kind: "text", from: "correctionNote" },
  mistakes: { kind: "custom", why: "array of MISTAKE_SPEC" },
  grammarFocus: { kind: "custom", why: "first keyMistake, or null — GRAMMAR_FOCUS_SPEC" },
  vocabulary: { kind: "custom", why: "array of VOCAB_SPEC" },
  practice: { kind: "custom", why: "reshaped into { jp, en }" },
  relatedMiniLesson: { kind: "custom", why: "buildMiniLessonFromAI fills the rest from MINI_LESSONS" },
  relatedMiniLessonRaw: { kind: "custom", why: "the AI's five fields, kept unhydrated for the DB column" },
  practiceDrills: { kind: "custom", why: "DRILL_SPEC, then the two drill repairs" },
  jlptWords: { kind: "custom", why: "legacy, read from the DB only — never in this response" },
  alternativeWords: { kind: "custom", why: "array of ALTERNATIVE_SPEC" },
  nextVocab: { kind: "custom", why: "array of NEXT_VOCAB_SPEC" },
  nextGrammar: { kind: "custom", why: "array of NEXT_GRAMMAR_SPEC" },
  diaryTitle: { kind: "ruby", from: "diaryTitleRuby" },
  obieCheer: { kind: "ruby", from: "obieCheerRuby" },
  obiePhraseRuby: { kind: "ruby", from: "obiePhraseRuby" },
  // The gloss for obiePhraseRuby, written in the learner's UI language.
  obiePhraseExplanation: { kind: "text", from: "obiePhraseExplanation" },
};

/**
 * Turns one parsed AI correction response into a Correction.
 *
 * `raw` is unknown because that is the truth — it is whatever JSON.parse
 * returned. `fallbackOriginal` is the text the learner submitted, used when
 * the model does not echo it back.
 *
 * Never throws: a malformed or absent field reads as empty rather than
 * failing the correction. The learner's diary has already been paid for by
 * the time this runs.
 */
export function parseCorrectionPayload(raw: unknown, fallbackOriginal: string): Correction {
  const data: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const out: Record<string, unknown> = {};

  for (const key of Object.keys(CORRECTION_SPEC)) {
    const field = CORRECTION_SPEC[key as keyof Correction];
    switch (field.kind) {
      case "ruby":
        out[key] = normalizeRubyText(readFrom(data, field.from));
        break;
      case "text":
        out[key] = readFrom(data, field.from);
        break;
      // No scalar reading / stringArray at this level; the arrays below carry
      // them. Left explicit so a new one cannot fall through silently.
      case "reading":
      case "stringArray":
      case "custom":
        break;
    }
  }

  /* ── The ones the table defers, each named above with its reason ───────── */

  out.original = typeof data.original === "string" ? data.original : fallbackOriginal;

  out.mistakes = objArr(data.keyMistakes).map((m) => buildItem(MISTAKE_SPEC, m));

  out.grammarFocus = (() => {
    const first = objArr(data.keyMistakes)[0];
    if (!first || !first.mistake) return null;
    return buildItem(GRAMMAR_FOCUS_SPEC, first);
  })();

  out.vocabulary = objArr(data.usefulVocabulary).map((v) =>
    buildItem(VOCAB_SPEC, v, VOCAB_CUSTOMS),
  );

  out.practice = {
    jp: normalizeRubyText(readFrom(data, ["practiceSentenceRuby", "practiceSentence"])),
    en: "",
  };

  out.relatedMiniLesson = buildMiniLessonFromAI(data.relatedMiniLesson);
  // Kept beside the hydrated lesson, not derived from it. Reading the five
  // fields back off a MiniLesson would also pick up whatever
  // buildMiniLessonFromAI filled in from the static library, and store the
  // fallback as though the model had written it. Only what actually came back
  // is saved; anything the model omitted stays absent and falls through to the
  // library again on the next read.
  out.relatedMiniLessonRaw = aiMiniLessonPayload(data.relatedMiniLesson);

  out.practiceDrills = objArr(data.practiceDrills).map((d) =>
    ensureAnswerInChoices(fixMasuIncompatibleBlank(buildItem(DRILL_SPEC, d, DRILL_CUSTOMS))),
  );

  out.nextVocab = objArr(data.nextVocab).map((v) => buildItem(NEXT_VOCAB_SPEC, v));

  out.nextGrammar = objArr(data.nextGrammar).map((g) => buildItem(NEXT_GRAMMAR_SPEC, g));

  out.alternativeWords = objArr(data.alternativeWords).map((a) =>
    buildItem(ALTERNATIVE_SPEC, a),
  );

  // jlptWords is intentionally never set — see its entry in the table.

  // The one cast in this file. TypeScript cannot see that the loop above plus
  // the block below cover exactly the keys of Correction — that guarantee is
  // held by CORRECTION_SPEC being exhaustive, and by every deferred entry
  // having a line here. Both are checked: the spec by the compiler, this
  // block by the round-trip test.
  return out as unknown as Correction;
}

/* ── Correction → diary_entries columns ───────────────────────────────────── */

/**
 * The columns of diary_entries that are derived from a Correction, with the
 * transforms each one needs on the way out.
 *
 * Shared by both writers, which had drifted: /api/correct-existing stripped
 * the ruby off the diary title during conversion while the write page kept it
 * on Correction.diaryTitle and stripped at save time. Same column, same value,
 * two places deciding it. Stripping belongs here, at the DB edge — the title
 * is displayed with furigana and stored without.
 *
 * Returns every derived column; it does NOT decide which ones a given writer
 * sends. The write page inserts a new row and sets all of them. Re-correcting
 * an existing diary updates a subset: `title` is omitted when empty so a title
 * the learner already has is not cleared, and `alternative_words` is omitted
 * when empty for the same reason. Columns that are not derived from the
 * correction at all (user_id, diary_date, tags, level, correction_style, and
 * original_text — which a re-correction must never overwrite) stay with their
 * callers.
 */
export interface CorrectionDbColumns {
  corrected_japanese: string;
  natural_japanese: string;
  original_text_ruby: string | null;
  english_explanation: string;
  correction_note: string;
  key_mistakes: MistakeItem[];
  grammar_focus: MistakeItem | null;
  useful_vocabulary: VocabItem[];
  practice_sentence: string;
  title: string | null;
  alternative_words: AlternativeWord[];
  /**
   * Paid plans only — null on every Free correction, because the prompt does
   * not ask for either and the model returns nothing to store.
   *
   * ⚠️ Both are omitted from the update in /api/correct-existing when empty,
   * the same way title and alternative_words are, so re-correcting cannot wipe
   * a lesson or a set of drills the entry already has.
   */
  practice_drills: PracticeDrill[] | null;
  /** The AI's five fields, NOT the hydrated MiniLesson — see AiMiniLessonPayload. */
  related_mini_lesson: AiMiniLessonPayload | null;
}

export function correctionToDbColumns(correction: Correction): CorrectionDbColumns {
  return {
    corrected_japanese: correction.corrected,
    natural_japanese: correction.natural,
    original_text_ruby: correction.originalRuby || null,
    english_explanation: plainValue(correction.explanation),
    // plainValue() already answers a missing field with "", which is what the
    // `?? ""` here did.
    correction_note: plainValue(correction.correctionNote),
    key_mistakes: correction.mistakes,
    grammar_focus: correction.grammarFocus ?? null,
    useful_vocabulary: correction.vocabulary,
    practice_sentence: correction.practice.jp,
    title: correction.diaryTitle ? stripRubyText(correction.diaryTitle) || null : null,
    alternative_words: correction.alternativeWords ?? [],
    // Empty array → null rather than []. The column means "does this diary
    // have drills", and [] would read as "yes, and there are none of them".
    practice_drills: correction.practiceDrills?.length ? correction.practiceDrills : null,
    related_mini_lesson: correction.relatedMiniLessonRaw ?? null,
  };
}
