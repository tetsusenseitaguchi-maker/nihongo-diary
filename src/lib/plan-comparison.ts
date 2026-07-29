import { PLAN_LIMITS } from "@/lib/plans";
import { RECHECK_LIMITS } from "@/lib/recheck-limits";

/**
 * Row data for the plan comparison table.
 *
 * A read-only consumer of PLAN_LIMITS and RECHECK_LIMITS — the same pattern
 * recheck-limits.ts already uses and documents, and for the same reason:
 * billing-adjacent numbers get imported, never copied. Nothing here writes
 * back, and plans.ts is untouched. normalizePlan is not imported at all.
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
  // The four `emphasis` rows lead, and they lead together: 1→10→25,
  // 300→500, 10→unlimited, 3→unlimited. Read top-down, the difference
  // between the plans lands before any yes/no row dilutes it. This ordering
  // is the whole reason for the table — the old cards listed Free's ten
  // bullets against Plus's five and made Free look like the richer tier.
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
        // source: FREE_VOCAB_LIMIT in api/vocabulary/route.ts:12, whose gate
        // (line 68) tests `plan === "free"` and nothing else — plus and pro
        // are both uncapped. The "up to 100 items" that the old Plus card
        // advertised was never implemented anywhere.
        //
        // ⚠️ The 3 is duplicated rather than imported, and has to be: that
        // constant lives in a route module that imports @/lib/supabase/server
        // and @/lib/ai-provider, so importing it would drag next/headers and
        // the OpenAI SDK into the client bundle this file ships in. If
        // FREE_VOCAB_LIMIT ever changes, change it here too.
        id: "vocabulary",
        labelKey: "plans.row.vocabulary",
        emphasis: true,
        cells: {
          free: { kind: "num", n: 3 },
          plus: { kind: "i18n", key: "plans.value.unlimited" },
          pro: { kind: "i18n", key: "plans.value.unlimited" },
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
        cells: { free: { kind: "no" }, plus: { kind: "yes" }, pro: { kind: "yes" } },
      },
      {
        // source: api/correct:302 `includeMiniLesson = plan !== "free"`.
        // The lesson attached to a correction, not the browsable library
        // two rows below — Free can read that one's titles.
        id: "miniLessonInCorrection",
        labelKey: "plans.row.miniLessonInCorrection",
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
        id: "weeklyReport",
        labelKey: "plans.row.weeklyReport",
        cells: {
          free: { kind: "i18n", key: "plans.value.reportDaysOnly" },
          plus: { kind: "i18n", key: "plans.value.reportFull" },
          pro: { kind: "i18n", key: "plans.value.reportFull" },
        },
      },
      {
        // source: WeeklyReport.tsx renders the streak line under
        // `isPlus && !!data.streak`, and the route only computes streak
        // after the Free early-return above.
        id: "reportStreak",
        labelKey: "plans.row.reportStreak",
        cells: { free: { kind: "no" }, plus: { kind: "yes" }, pro: { kind: "yes" } },
      },
    ],
  },
];

/**
 * i18n keys the table needs that are not attached to a row.
 *
 * Kept here so this file is the complete inventory of what the table asks
 * of the message catalogue: 11 row labels + 3 group headings + 6 value
 * phrases + 2 notes above, plus the 7 below — 29 keys in all.
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
  teacherTitle: "plans.teacher.title",
  teacherDesc: "plans.teacher.desc",
} as const;
