/**
 * The two kinds of text this app keeps confusing for each other.
 *
 * A learner's correction carries Japanese that MUST show furigana (the natural
 * version, the practice sentence, Obie's phrase) and prose that must NEVER
 * show it (the English explanation, a word's meaning, a teacher's note). Both
 * are `string`, so nothing has ever stopped one being rendered as the other —
 * which is how ruby markup ended up printed as literal characters in the
 * explanation, and why twenty-odd render sites had to be audited by hand.
 *
 * ── Why these are not `string & { brand }` ────────────────────────────────
 * A branded string is still a string, so React accepts it as a child and
 * `{correction.explanation}` compiles exactly as before. Measured on this
 * codebase: reintroducing the original bug under branded strings produced
 * zero new errors. Opaque types are not assignable to ReactNode, so the raw
 * render is what fails to compile — the whole point.
 *
 * At RUNTIME both are ordinary strings. The opacity is type-level only, so
 * JSON payloads, DB columns and template literals behave normally; code that
 * genuinely needs the string says so by unwrapping.
 *
 * ── This file alone changes nothing ───────────────────────────────────────
 * Step 1 of the migration. The types exist and `authored()` is applied to the
 * hand-written content tables, but no field of Correction or MiniLesson is
 * branded yet, so `Unbranded<T>` is currently the identity and every table is
 * type-checked exactly as before. What it buys is that when the fields ARE
 * branded, those tables need no further edits: measured on this codebase,
 * branding produces 1085 errors and sealing the four files of hand-authored
 * Japanese and English removes 1030 of them.
 */

import type { Reading } from "@/lib/reading-validation";

declare const RUBY_BRAND: unique symbol;
declare const PLAIN_BRAND: unique symbol;

/** Japanese that may carry <ruby> / 漢字(かな) markup. Render via <Furigana>. */
export type RubyText = { readonly [RUBY_BRAND]: true };

/** Prose in the learner's UI language, and plain Japanese labels. Must never
 *  render as furigana. Render via <NoRuby>. */
export type PlainText = { readonly [PLAIN_BRAND]: true };

/**
 * T with every branded field replaced by the plain `string` it is at runtime,
 * recursively through arrays and objects.
 *
 * This is what lets a literal be written as a literal. `Unbranded<MiniLesson>`
 * is an ordinary structural type, so a table declared through it is still
 * fully checked — a misspelled key or a missing field is still an error. The
 * only thing relaxed is the brand.
 *
 * `Reading` is deliberately NOT relaxed. It answers a different question: not
 * "which kind of text is this" — which a reviewer can see in the diff — but
 * "does this reading actually belong to this word", which a reviewer cannot.
 * Writing 歩く with the reading ある is the kind of slip a human makes and a
 * reviewer's eye slides straight past, so hand-written tables go through
 * sanitizeReading() exactly like the AI's output does.
 */
export type Unbranded<T> = T extends RubyText
  ? string
  : T extends PlainText
    ? string
    : T extends Reading
      ? Reading
      : T extends readonly (infer U)[]
        ? Unbranded<U>[]
        : T extends object
          ? { [K in keyof T]: Unbranded<T[K]> }
          : T;

/**
 * Seals a table of hand-written content into its branded shape.
 *
 * The brands exist to keep the MODEL's output from being rendered as the wrong
 * kind of text. Content in this repo is not the model's output — it is written
 * by hand, reviewed in the diff, and correct by construction. `authored()` is
 * where that claim is made, once per table, instead of at every string in it.
 *
 * It makes no claim about readings: a `Reading` field inside the table still
 * has to be built by sanitizeReading(), which is why those tables say
 * `reading: sanitizeReading("天気", "てんき")` and not a bare string.
 *
 * The type argument has to be explicit: T is not inferable from Unbranded<T>.
 *
 *   export const MINI_LESSONS: MiniLesson[] = authored<MiniLesson[]>([ … ]);
 *
 * Do NOT reach for this on anything the AI produced. That path is
 * parseCorrectionPayload(), whose field table decides the kind per field.
 */
export function authored<T>(value: Unbranded<T>): T {
  return value as T;
}

/**
 * Lifts a string the AI wrote into PlainText.
 *
 * The parse boundary is the one place a raw string legitimately becomes a
 * branded one, and CORRECTION_SPEC already decides which fields those are —
 * `kind: "text"`. This is that decision written as a value, for the handful of
 * places the table cannot reach: buildMiniLessonFromAI(), where an AI override
 * and a hand-written fallback meet in a single expression.
 *
 * Lift once, at the end, rather than per branch. `plain(a) || plain(b)` reads
 * as a choice between two PlainTexts, but an opaque type has no falsy value for
 * `||` to test, so the fallback would be dead. Join the strings first:
 *
 *   plain(str(r.shortExplanation) || plainValue(base.shortExplanation))
 */
export function plain(text: string): PlainText {
  return text as unknown as PlainText;
}

/**
 * The string a PlainText is at runtime, for the places that genuinely need it:
 * DB columns, request bodies, Map keys, props typed `string`.
 *
 * Also accepts a plain string, so a call site fed from both a Correction field
 * and a DB row does not have to branch. Mirrors readingValue(), including the
 * empty string for null — a missing field renders as nothing, never "null".
 */
export function plainValue(text?: PlainText | string | null): string {
  return (text as unknown as string | null | undefined) ?? "";
}
