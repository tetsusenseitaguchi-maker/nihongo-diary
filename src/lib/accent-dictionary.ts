/**
 * Pitch accent, one word at a time.
 *
 * <sub alias="こうえん">公園</sub> fixes WHICH reading is spoken but says
 * nothing about pitch, and ja-JP-Wavenet-A gives 公園 a downstep mid-sentence
 * where the word is actually 平板 (flat, accent type [0]). yomigana can carry
 * the accent — ^ opens the pitch phrase, ! marks the downstep — so a word
 * listed here is emitted as
 *
 *   <phoneme alphabet="yomigana" ph="^こうえん">公園</phoneme>
 *
 * and everything else keeps the <sub> it has always had.
 *
 * ── Measured, not assumed ────────────────────────────────────────────────
 * <sub>, <phoneme> with no marks, and no annotation at all produce BYTE-WISE
 * the same audio (F0 contours compared frame by frame: 0.0 Hz mean difference
 * across the whole utterance). The accent mark is the only thing that changes
 * anything — with ^ the same sentence差 by 56.4 Hz on average, and 公園's
 * contour goes from rise-then-fall to rise-and-hold.
 *
 * Two consequences, and the second is why this file exists at all:
 *   · migrating every reading to <phoneme> would buy nothing;
 *   · it would change every SSML document, and /api/tts keys its cache on a
 *     hash of the SSML. Touching only the listed words means adding an entry
 *     invalidates the clips containing THAT word and no others.
 *
 * ── Rules ────────────────────────────────────────────────────────────────
 * 1. 平板 only — ^ with no !. The ! convention is not verified against this
 *    engine, and a downstep in the wrong place is worse than none at all.
 *    A word whose pitch drops does not belong here; leave it to the engine.
 * 2. Confirm BY EAR before adding. Nothing in the API response reveals the
 *    accent and the duration does not move, so there is no automated check.
 *    scripts/audition-accent.mjs renders a candidate with and without the
 *    mark for exactly this.
 * 3. ^ opens an accent phrase, so it also alters the prosody of what FOLLOWS
 *    the word. Judge a candidate in a sentence, never in isolation.
 * 4. Only words whose ruby tag covers the WHOLE word. Readings in this app
 *    are per kanji-run, so 激しい arrives as <ruby>激<rt>はげ</rt></ruby>しい
 *    — an accent on はげ alone is not the accent of はげしい. In practice that
 *    limits this to compounds carrying no okurigana.
 *
 * Same operating model as READING_DICTIONARY_RAW in furigana.ts: it starts
 * small and grows as broken words turn up, rather than trying to be complete.
 */

/** 語 → ph（読み＋アクセント記号）。値は必ず ^ で始まり、! を含まない。 */
export const ACCENT_DICTIONARY: Record<string, string> = {
  公園: "^こうえん",
};

/** Strip the accent marks back off, to recover the bare reading. */
function bareReading(ph: string): string {
  return ph.replace(/[\^!]/g, "");
}

/**
 * The accented ph for a word, or null to leave it alone.
 *
 * `rt` must match the entry's reading once the marks are removed. Without that
 * check an entry could silently change WHICH word is spoken — 一日 is ついたち
 * or いちにち depending on the sentence, and a table keyed on spelling alone
 * would impose one of them on both. Changing the reading is furigana's job and
 * this file must never do it: it may only change the pitch of a reading the
 * app already decided on.
 */
export function accentFor(base: string, rt: string): string | null {
  const ph = ACCENT_DICTIONARY[base];
  if (!ph) return null;
  return bareReading(ph) === rt ? ph : null;
}
