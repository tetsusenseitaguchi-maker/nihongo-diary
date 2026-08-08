import { PLAN_LIMITS } from "@/lib/plans";
import { RECHECK_LIMITS } from "@/lib/recheck-limits";
import { AUDIO_DAILY_LIMITS } from "@/lib/audio-limits";
import { WORD_LOOKUP_DAILY_LIMITS } from "@/lib/word-lookup-limits";
import { REVIEW_DAILY_LIMITS } from "@/lib/srs-limits";

/**
 * Row data for the plan comparison table.
 *
 * A read-only consumer of PLAN_LIMITS, RECHECK_LIMITS, AUDIO_DAILY_LIMITS,
 * WORD_LOOKUP_DAILY_LIMITS and REVIEW_DAILY_LIMITS — the same pattern
 * recheck-limits.ts already uses and documents, and for the same reason:
 * billing-adjacent numbers get imported, never copied. Nothing here writes
 * back, and plans.ts is untouched. normalizePlan is not imported at all.
 *
 * Those five are the whole set. Audited 2026-08-08: SHADOWING_DAILY_LIMITS is
 * null on every plan by decision (shadowing-limits.ts explains why), peer
 * corrections carry no plan check anywhere, and Discovery is a privacy toggle
 * on the profile rather than a paid feature — so their absence here is
 * correct, not an oversight. If a sixth limits module appears, it needs a row.
 *
 * The two audio/lookup maps cost nothing to pull in: both modules import only
 * @/lib/plans, and audio-limits.ts already ships to the client through
 * PlayButton and DictationExercise. That is what separates them from
 * FREE_VOCAB_LIMIT below, which is stuck inside a route module and has to be
 * duplicated.
 *
 * Every row carries the line that actually enforces it. The point of a
 * comparison table over feature cards is that it states specific numbers, and
 * a stated number that the code does not enforce is a false claim on a
 * purchase screen (App Store Review Guideline 2.3.1). Cards could be vague
 * about "up to 100 items"; a table cannot.
 *
 * Teacher is deliberately not a column. It is comingSoon (unbuyable),
 * PLAN_LIMITS gives it byte-for-byte the same limits as pro — so every cell
 * would duplicate the pro column — and PricingGrid has to hide coming-soon
 * tiers from the native shell (Guideline 3.1.1). Leaving the column out
 * deletes that requirement from this table rather than reimplementing it.
 * Teacher survives as a NativeGate'd note underneath.
 */

/** Columns, in display order. */
export type ComparisonPlan = "free" | "plus" | "pro";

export const COMPARISON_PLANS: ComparisonPlan[] = ["free", "plus", "pro"];

export type Cell =
  /** A bare number, rendered large: "1", "300", "10". */
  | { kind: "num"; n: number }
  /** A translated phrase; `vars` feeds t()'s {interpolation}. */
  | { kind: "i18n"; key: string; vars?: Record<string, number> }
  /** Included / not included. The renderer supplies an sr-only label. */
  | { kind: "yes" }
  | { kind: "no" };

export interface ComparisonRow {
  /** Stable id — React key, and the suffix of the label i18n key. */
  id: string;
  labelKey: string;
  /** Small print under the label, where a bare cell would mislead. */
  noteKey?: string;
  /** The rows where the number visibly climbs; the renderer draws attention. */
  emphasis?: boolean;
  cells: Record<ComparisonPlan, Cell>;
}

export interface ComparisonGroup {
  id: string;
  headingKey: string;
  rows: ComparisonRow[];
}

/**
 * A per-day allowance straight from PLAN_LIMITS, where null means unlimited.
 *
 * Exists so the null case is handled once instead of asserted away at each
 * call site: PLAN_LIMITS.plus.translationsPerDay really is null, and a
 * non-null assertion there would render "null" the day a plan's shape
 * changes. This way the table follows plans.ts wherever it goes.
 */
function perDay(limit: number | null): Cell {
  return limit === null ? { kind: "i18n", key: "plans.value.unlimited" } : { kind: "num", n: limit };
}

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  // ───────────────────────────────────────────── Everyday use
  //
  // The five `emphasis` rows lead, and they lead together: 1→10→25,
  // 300→500, 10→unlimited, 1→unlimited, 3→unlimited. Read top-down, the
  // difference between the plans lands before any yes/no row dilutes it. This
  // ordering is the whole reason for the table — the old cards listed Free's
  // ten bullets against Plus's five and made Free look like the richer tier.
  //
  // `audio` earns its place in that block and `wordLookup` deliberately does
  // not. One clip a day is a limit a Free learner meets every single day; the
  // twenty lookups are a ceiling on abuse that word-lookup-limits.ts measured
  // as reached on 4% of days. Emphasising the second would sell a limit that
  // barely binds.
  {
    id: "daily",
    headingKey: "plans.group.daily",
    rows: [
      {
        // source: PLAN_LIMITS.corrections — handed to try_use_correction()
        // as p_limit by api/correct and api/correct-existing.
        id: "corrections",
        labelKey: "plans.row.corrections",
        emphasis: true,
        cells: {
          free: { kind: "num", n: PLAN_LIMITS.free.corrections }, // 1
          plus: { kind: "num", n: PLAN_LIMITS.plus.corrections }, // 10
          pro: { kind: "num", n: PLAN_LIMITS.pro.corrections }, // 25
        },
      },
      {
        // source: PLAN_LIMITS.maxChars — enforced in api/correct:305 and
        // api/correct-existing:206.
        id: "maxChars",
        labelKey: "plans.row.maxChars",
        emphasis: true,
        cells: {
          free: { kind: "num", n: PLAN_LIMITS.free.maxChars }, // 300
          plus: { kind: "num", n: PLAN_LIMITS.plus.maxChars }, // 500
          pro: { kind: "num", n: PLAN_LIMITS.pro.maxChars }, // 500
        },
      },
      {
        // source: PLAN_LIMITS.translationsPerDay (null = unlimited).
        // The note is not optional: api/translate (a whole entry) and
        // api/translate-text (tapping one word) spend the same
        // translation_count via the same try_use_translation p_limit, so
        // Free's ten are shared between them. A cache hit returns before
        // the RPC (api/translate:73) and costs nothing.
        id: "translations",
        labelKey: "plans.row.translations",
        noteKey: "plans.note.translationsShared",
        emphasis: true,
        cells: {
          free: perDay(PLAN_LIMITS.free.translationsPerDay), // 10
          plus: perDay(PLAN_LIMITS.plus.translationsPerDay), // unlimited
          pro: perDay(PLAN_LIMITS.pro.translationsPerDay), // unlimited
        },
      },
      {
        // source: AUDIO_DAILY_LIMITS (audio-limits.ts). api/tts:210 resolves
        // it through audioLimitFor() and only a metered plan — Free — ever
        // reaches try_use_audio_daily.
        //
        // ⚠️ "New" is not decoration in the label. The cache lookup sits ABOVE
        // the claim (api/tts:172), so a clip the learner has already heard
        // replays without touching the counter, and one a day only works
        // because of it — audio-limits.ts calls that ordering load-bearing.
        // A label reading "Audio per day" would understate the free tier.
        //
        // The unit lives in the label for the same reason it does two rows
        // up: the cell is a bare "1", and inline under it Free reads
        // "Free: 1", which says nothing on its own.
        id: "audio",
        labelKey: "plans.row.audio",
        noteKey: "plans.note.audio",
        emphasis: true,
        cells: {
          free: perDay(AUDIO_DAILY_LIMITS.free), // 1
          plus: perDay(AUDIO_DAILY_LIMITS.plus), // unlimited
          pro: perDay(AUDIO_DAILY_LIMITS.pro), // unlimited
        },
      },
      {
        // The companion to the row above: that one is how much, this one is
        // how far. Three separate yes/no rows would have said the same thing
        // — natural-audio.ts:91 (Free hears one sentence, paid the whole
        // text), CorrectionResult.tsx:477 (before→after, paid only) and :555
        // (vocabulary examples, paid only) — in three near-identical "— ✓ ✓"
        // lines, which is exactly the shape this table exists to avoid.
        //
        // ⚠️ Free is not "one sentence" flat, and writing that would understate
        // it: the headword 🔊 stays on Free (CorrectionResult.tsx:568 explains
        // why — dictionary words hit the shared bucket). Hence "One sentence +
        // words" rather than a bare sentence count.
        id: "audioScope",
        labelKey: "plans.row.audioScope",
        noteKey: "plans.note.audioScope",
        cells: {
          free: { kind: "i18n", key: "plans.value.audioScopeFree" },
          plus: { kind: "i18n", key: "plans.value.audioScopeAll" },
          pro: { kind: "i18n", key: "plans.value.audioScopeAll" },
        },
      },
      {
        // source: FREE_VOCAB_LIMIT in api/vocabulary/route.ts:12, whose gate
        // (line 68) tests `plan === "free"` and nothing else — plus and pro
        // are both uncapped. The "up to 100 items" that the old Plus card
        // advertised was never implemented anywhere.
        //
        // ⚠️ The 10 is duplicated rather than imported, and has to be: that
        // constant lives in a route module that imports @/lib/supabase/server
        // and @/lib/ai-provider, so importing it would drag next/headers and
        // the OpenAI SDK into the client bundle this file ships in. If
        // FREE_VOCAB_LIMIT ever changes, change it here too — it went from 3
        // to 10 when spaced review shipped, and both sites moved together.
        id: "vocabulary",
        labelKey: "plans.row.vocabulary",
        emphasis: true,
        cells: {
          free: { kind: "num", n: 10 },
          plus: { kind: "i18n", key: "plans.value.unlimited" },
          pro: { kind: "i18n", key: "plans.value.unlimited" },
        },
      },
      {
        // source: REVIEW_DAILY_LIMITS (srs-limits.ts), resolved by
        // api/vocabulary/srs/answer:82 and passed to try_use_vocab_review as
        // p_limit. Only a metered plan reaches the RPC, same shape as the
        // three rows around it.
        //
        // Directly under the vocabulary book because the two numbers were
        // chosen against each other: srs-limits.ts says Free's five "噛み合って
        // いて" with the ten-word cap — a full book comes round in about two
        // days. Listing the book without the review that empties it stated
        // half of one decision.
        //
        // The last plan difference that had no row. Everything else in
        // PLAN_LIMITS, RECHECK_LIMITS, AUDIO_DAILY_LIMITS and
        // WORD_LOOKUP_DAILY_LIMITS was already here; shadowing and peer
        // corrections have no plan difference at all, and Discovery is a
        // privacy toggle rather than a paid feature.
        //
        // `emphasis` for the reason at the top of this group: 5 → 30 →
        // unlimited is a number that climbs, and those lead together.
        id: "vocabReview",
        labelKey: "plans.row.vocabReview",
        noteKey: "plans.note.vocabReview",
        emphasis: true,
        cells: {
          free: perDay(REVIEW_DAILY_LIMITS.free), // 5
          plus: perDay(REVIEW_DAILY_LIMITS.plus), // 30
          pro: perDay(REVIEW_DAILY_LIMITS.pro), // unlimited
        },
      },
      {
        // source: WORD_LOOKUP_DAILY_LIMITS (word-lookup-limits.ts), resolved
        // by api/word-lookup:112. Only Free is a number, so only Free reaches
        // try_use_word_lookup.
        //
        // Next to the vocabulary book on purpose: both are what a learner
        // reaches for mid-sentence, and neither is metered by the translation
        // counter above — word_lookup_usage is its own table precisely so that
        // reading someone else's diary cannot cost you the word you needed to
        // write your own.
        //
        // Not `emphasis` — see the note at the top of this group. Same "new
        // only" caveat as the audio row: the shared cache is read above the
        // claim, so twenty means twenty words nobody has looked up yet.
        id: "wordLookup",
        labelKey: "plans.row.wordLookup",
        noteKey: "plans.note.wordLookup",
        cells: {
          free: perDay(WORD_LOOKUP_DAILY_LIMITS.free), // 20
          plus: perDay(WORD_LOOKUP_DAILY_LIMITS.plus), // unlimited
          pro: perDay(WORD_LOOKUP_DAILY_LIMITS.pro), // unlimited
        },
      },
      {
        // ⚠️ The unit itself differs by plan, which is why this row has a
        // note. Free is per calendar day, enforced server-side by
        // try_use_recheck() (api/recheck:138). Paid is per correction and
        // resets when the next one runs, capped client-side by RECHECK_LIMIT
        // (write/page.tsx:42). recheck-limits.ts documents the same split.
        // Interpolating n keeps the numbers out of the translated strings.
        id: "recheck",
        labelKey: "plans.row.recheck",
        noteKey: "plans.note.recheckUnit",
        cells: {
          free: {
            kind: "i18n",
            key: "plans.value.recheckPerDay",
            vars: { n: RECHECK_LIMITS.free }, // 1
          },
          plus: {
            kind: "i18n",
            key: "plans.value.recheckPerCorrection",
            vars: { n: RECHECK_LIMITS.plus }, // 3
          },
          pro: {
            kind: "i18n",
            key: "plans.value.recheckPerCorrection",
            vars: { n: RECHECK_LIMITS.pro }, // 3
          },
        },
      },
      {
        // source: api/correct:301 `includeDrills = plan !== "free"`. Free
        // gets the locked.combined placeholder instead (write/page.tsx:1159).
        //
        // ⚠️ Not the same feature as "reviewDrills" further down, despite
        // the names. This one rides along with a correction; that one is the
        // standalone drill generator on the Support tab and is Pro-only.
        // They must stay separate rows — merging them would misstate one of
        // the two plans.
        id: "practiceDrills",
        labelKey: "plans.row.practiceDrills",
        noteKey: "plans.note.practiceDrills",
        cells: { free: { kind: "no" }, plus: { kind: "yes" }, pro: { kind: "yes" } },
      },
      {
        // source: api/correct:302 `includeMiniLesson = plan !== "free"`.
        // The lesson attached to a correction, not the browsable library
        // two rows below — Free can read that one's titles.
        id: "miniLessonInCorrection",
        labelKey: "plans.row.miniLessonInCorrection",
        noteKey: "plans.note.miniLessonInCorrection",
        cells: { free: { kind: "no" }, plus: { kind: "yes" }, pro: { kind: "yes" } },
      },
    ],
  },

  // ───────────────────────────────────────────── Study tools
  {
    id: "tools",
    headingKey: "plans.group.tools",
    rows: [
      {
        // source: PLAN_LIMITS.lessonLibrary. Free is not a plain "no", and
        // saying so would understate it: support/page.tsx:199 renders every
        // lesson's title and shortExplanation unconditionally and gates only
        // the accordion body (line 225). support.lessonLockedSub already
        // tells users "Titles and short previews are visible below".
        id: "lessonLibrary",
        labelKey: "plans.row.lessonLibrary",
        noteKey: "plans.note.lessonLibrary",
        cells: {
          free: { kind: "i18n", key: "plans.value.titlesOnly" },
          plus: { kind: "yes" },
          pro: { kind: "yes" },
        },
      },
      {
        // source: PLAN_LIMITS.reviewDrills — free false, plus false, pro
        // true. Gated with a 403 in api/mini-lesson-drills:108. The only
        // genuine Pro-over-Plus difference in the whole table, now that the
        // unimplemented 100-item vocabulary cap is gone.
        id: "reviewDrills",
        labelKey: "plans.row.reviewDrills",
        noteKey: "plans.note.reviewDrills",
        cells: { free: { kind: "no" }, plus: { kind: "no" }, pro: { kind: "yes" } },
      },
    ],
  },

  // ───────────────────────────────────────────── Looking back
  {
    id: "review",
    headingKey: "plans.group.review",
    rows: [
      {
        // source: api/report/weekly:62 — Free returns HTTP 200 carrying
        // { daysWritten, weekStart, weekEnd } and stops there. It is a
        // working feature, not a locked one, but "basic summary" oversold
        // a single number: paid is what adds frequentWords, mistakeNotes
        // and aiSuggestions.
        //
        // The note carries what "Full" contains, and it replaced a row. There
        // used to be a `reportStreak` row here — label "Streak", free cell a
        // bare "no" — and it was wrong twice over. It read as though a Free
        // learner had no streak at all, when dashboard/page.tsx:134 and :198
        // render one on every plan with no plan check anywhere near them; and
        // of the four things the Free early-return above actually withholds
        // (frequentWords, mistakeNotes, aiSuggestions, streak) it named only
        // the one that was not really withheld. Folding all four into this
        // note says more, in one row instead of two, and the last sentence is
        // there to undo the impression the deleted row left.
        id: "weeklyReport",
        labelKey: "plans.row.weeklyReport",
        noteKey: "plans.note.weeklyReport",
        cells: {
          free: { kind: "i18n", key: "plans.value.reportDaysOnly" },
          plus: { kind: "i18n", key: "plans.value.reportFull" },
          pro: { kind: "i18n", key: "plans.value.reportFull" },
        },
      },
    ],
  },
];

/**
 * i18n keys the table needs that are not attached to a row.
 *
 * Kept here so this file is the complete inventory of what the table asks
 * of the message catalogue: 13 row labels + 3 group headings + 8 value
 * phrases + 10 notes above, plus the 8 below — 42 keys in all.
 *
 * ⚠️ Counting `plans.*` in en.json gives 44, and the two extra are not a
 * drift: PlanComparisonTable owns plans.freeInline and plans.freeInlineNo,
 * which exist only because of how that component lays Free out, and it says
 * so where it declares them. 42 is this file's share.
 *
 * There is no English fallback anywhere in i18n-server.ts — getServerT does
 * `messages[key] ?? key` — so a key missing from one locale renders its own
 * name on the purchase screen. Every key counted here has to exist in all
 * eight locale files, not just en.json.
 *
 * `teacher` is rendered under the table inside <NativeGate>: it names a USD
 * price and a tier that is not an IAP product, so it must not reach the
 * native shell (Guideline 3.1.1).
 */
export const COMPARISON_CHROME_KEYS = {
  caption: "plans.a11y.caption",
  included: "plans.a11y.included",
  notIncluded: "plans.a11y.notIncluded",
  /** Accessible name for the "?" that opens a row's note. */
  noteToggle: "plans.a11y.noteToggle",
  commonFeatures: "plans.footer.commonFeatures",
  /**
   * Second half of the "every plan gets this" footer, split off because one
   * sentence carrying twelve items is a grey block nobody reads.
   *
   * ⚠️ The shadowing clause must keep its subject — "recording yourself
   * reading aloud". Shortened to "reading aloud", it collides head-on with
   * the audio row above it, which says a Free learner gets one a day. The
   * recording is free on every plan (SHADOWING_DAILY_LIMITS is null
   * throughout); hearing the model sentence is the metered half.
   */
  commonSocial: "plans.footer.commonSocial",
  teacherTitle: "plans.teacher.title",
  teacherDesc: "plans.teacher.desc",
} as const;
