/**
 * Reading validation — the guard that sits in FRONT of buildRubyNotation.
 *
 * buildRubyNotation assumes `reading` is the reading of the WHOLE word,
 * okurigana included (歩く → あるく). Nothing ever checked that assumption, and
 * the AI breaks it in a predictable way: the correction prompt spends fifty
 * lines teaching <ruby>歩<rt>ある</rt></ruby>きます — the reading of the kanji
 * ALONE — and that habit bleeds into the standalone "reading" field, which
 * comes back as ある.
 *
 * The result is not a missing ruby, it is a WRONG one. buildRubyNotation
 * compares trailing characters to find the okurigana; く vs る don't match, so
 * it concludes there is no okurigana and wraps the whole word:
 *
 *   buildRubyNotation("歩く", "ある")   → <ruby>歩く<rt>ある</rt></ruby>
 *   buildRubyNotation("歩く", "あるく") → 歩（ある）く
 *
 * The first renders as 歩く with あるく's reading truncated to ある sitting over
 * both characters — a learner reads it as "arku". Showing no furigana at all
 * teaches nothing; showing the wrong one teaches something false, so when the
 * reading fails the check here we drop it and render the bare word.
 *
 * This module only ever DECIDES. buildRubyNotation, normalizeRubyText and
 * applyReadingDictionary are imported and called, never modified — the fix is
 * a layer in front of them, not a change to them.
 *
 * Applied in two places, and it needs both:
 *  - at render, so the readings already sitting in useful_vocabulary and
 *    vocabulary_entries stop rendering wrong furigana;
 *  - at save, so new ones stop being written.
 */

import { buildRubyNotation, vocabWordText } from "@/lib/furigana";

/* ── The Reading type ─────────────────────────────────────────────────────
   A hiragana reading that has PASSED isReadingConsistent(). The point is not
   the check itself — that already exists below — it is that the check can no
   longer be skipped: sanitizeReading() is the only function that returns a
   Reading, so a field typed `Reading` cannot be filled from a raw AI string
   without going through it. Forgetting the guard becomes a compile error
   instead of wrong furigana on a learner's screen.

   Opaque rather than `string & { brand }`, matching the RubyText / PlainText
   design chosen for the rest of this work, so the two arrive in the same
   shape. For Reading specifically the two would be near-equivalent: nothing
   renders a reading as JSX, which is the case a branded string fails to catch.

   What this does NOT stop is `any`. TypeScript assigns `any` to every type,
   opaque ones included, so a reading sourced from an untyped AI payload still
   slips through — measured, not assumed. That is why the two save paths also
   annotate the shape they are building (VocabItem / NextVocabItem /
   AlternativeWord): the annotation is what stops `any` from propagating, and
   the type is what makes the annotation mean something. Until the AI response
   itself is typed (Step 3), those annotations are the only thing holding.

   At RUNTIME a Reading IS a string. The opacity is type-level only, so
   template literals, JSON payloads and DB writes all behave normally; they
   just have to say so via readingValue(). */
declare const READING_BRAND: unique symbol;
export type Reading = { readonly [READING_BRAND]: true };

/** Unwraps a Reading for the places that genuinely need the string: prompt
 *  interpolation, JSON request bodies, DB columns. */
export function readingValue(reading?: Reading | null): string {
  return (reading as unknown as string | null | undefined) ?? "";
}

/** The one place the runtime string is recovered internally. */
function asString(reading?: string | Reading | null): string {
  return typeof reading === "string" ? reading : readingValue(reading);
}

/** Hiragana + katakana, the long-vowel mark, and the iteration marks. */
const KANA_ONLY = /^[ぁ-ゖァ-ヺーゝゞヽヾ]+$/u;

/** The run of kana at the END of a word — its okurigana (歩く → く). */
const TRAILING_KANA = /[ぁ-ゖァ-ヺーゝゞヽヾ]+$/u;

const HAS_KANJI = /[一-鿿々〆ヶ]/u;

/**
 * Is `reading` usable as the furigana for `word`?
 *
 * Three checks, cheapest first:
 *  1. The reading is kana only. A reading with kanji, latin or spaces in it is
 *     not a reading.
 *  2. If the word ends in kana (its okurigana), the reading must end in that
 *     same kana — because the okurigana IS pronounced, so it is part of the
 *     word's reading. This is the check that catches 歩く/ある.
 *  3. A word containing kanji needs reading left over AFTER the okurigana, or
 *     there is nothing to put over the kanji (歩く/く).
 *
 * Deliberately NOT checked: whether the reading is the *correct* one. 天気/て
 * んけ passes — this layer catches structural breakage, not wrong lookups.
 * READING_DICTIONARY in furigana.ts is what corrects known-wrong readings.
 *
 * Note on check 2 for kana-only words: 「かわいい」's okurigana is the whole
 * word, so the reading must equal it. That is what we want — it lets the
 * correct かわいい/かわいい through, and rejects こんにちは/こんにちわ, where
 * buildRubyNotation would otherwise put わ-for-は furigana over plain kana.
 */
export function isReadingConsistent(word: string, reading: string): boolean {
  if (!word || !reading) return false;
  if (!KANA_ONLY.test(reading)) return false;

  const okurigana = word.match(TRAILING_KANA)?.[0] ?? "";
  if (!okurigana) return true;
  if (!reading.endsWith(okurigana)) return false;
  if (HAS_KANJI.test(word) && reading.length <= okurigana.length) return false;

  return true;
}

/**
 * vocabWordText(), but a reading that fails the check is dropped rather than
 * rendered. Drop-in replacement at every existing vocabWordText call site:
 * passing no reading is already a supported path there, so a rejected reading
 * takes the same route as a word that never had one.
 */
export function safeVocabWordText(word: string, reading?: string | Reading | null): string {
  const trimmed = asString(reading).trim();
  return vocabWordText(word, isReadingConsistent(word, trimmed) ? trimmed : undefined);
}

/**
 * buildRubyNotation(), but a reading that fails the check yields the bare word.
 * For the two call sites that build ruby directly instead of going through
 * vocabWordText — kept separate so those sites keep their exact semantics.
 */
export function safeRubyNotation(word: string, reading?: string | Reading | null): string {
  const trimmed = asString(reading).trim();
  return isReadingConsistent(word, trimmed) ? buildRubyNotation(word, trimmed) : word;
}

/**
 * The save-time counterpart, and the ONLY constructor of a Reading. Returns
 * the reading to STORE; one that fails the check becomes "" — the column
 * stays, the broken value does not.
 *
 * Empty is the right fallback rather than rejecting the write: the word itself
 * is still worth saving, and every reader already handles a missing reading by
 * showing the word without furigana.
 *
 * Because nothing else returns a Reading, every field typed `Reading` is
 * reachable only through this check. That is the whole point of the type.
 */
export function sanitizeReading(word: string, reading?: string | Reading | null): Reading {
  const trimmed = asString(reading).trim();
  const kept = isReadingConsistent(word, trimmed) ? trimmed : "";
  return kept as unknown as Reading;
}
