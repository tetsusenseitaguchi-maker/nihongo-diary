// Shared furigana utilities — used in CorrectionResult and the vocabulary page.

const ONLY_KANJI = /^[一-鿿々〆ヶ]+$/;

/**
 * Builds ruby notation from a kanji headword and its hiragana reading.
 * Handles okurigana correctly by comparing trailing characters.
 *
 * Pure-kanji base → （）notation (handled by Furigana's simple path).
 * Mixed kanji+kana (e.g. 待ち遠) → <ruby> HTML directly, because
 * the （）regex only matches contiguous-kanji runs.
 */
export function buildRubyNotation(word: string, reading: string): string {
  const wc = [...word];
  const rc = [...reading];
  let okuLen = 0;
  while (
    okuLen < wc.length &&
    okuLen < rc.length &&
    wc[wc.length - 1 - okuLen] === rc[rc.length - 1 - okuLen]
  ) okuLen++;
  const kanjiBase = wc.slice(0, wc.length - okuLen).join("");
  const okurigana = okuLen > 0 ? wc.slice(-okuLen).join("") : "";
  const kanjiReading = okuLen > 0 ? rc.slice(0, -okuLen).join("") : reading;
  if (!kanjiBase || !kanjiReading) return word;
  if (ONLY_KANJI.test(kanjiBase)) {
    return `${kanjiBase}（${kanjiReading}）${okurigana}`;
  }
  return `<ruby>${kanjiBase}<rt>${kanjiReading}</rt></ruby>${okurigana}`;
}

/**
 * Returns the display string for a vocabulary headword.
 *
 * Priority:
 *  1. word + reading (preferred) → buildRubyNotation
 *  2. Already contains <ruby> or （）markup → pass through unchanged
 *  3. Old concatenated "公園こうえん" (2+ leading kanji) → wrap in （）
 */
export function vocabWordText(word: string, reading?: string): string {
  if (!word) return "";
  if (reading) return buildRubyNotation(word, reading);
  if (word.includes("<ruby>") || word.includes("（") || word.includes("(")) return word;
  const m = word.match(/^([一-鿿々〆ヶ]{2,})([ぁ-ゖ]+)$/u);
  if (m) return `${m[1]}（${m[2]}）`;
  return word;
}
