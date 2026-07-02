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

/* ── AI ruby-HTML parsing / recovery ──────────────────────────────────────
   Shared by <Furigana> (renders to React) and normalizeRubyText (rebuilds a
   clean string before AI output is saved to the DB). Recovers three known
   GPT formatting glitches instead of showing garbled/duplicated text:
    1. <ruby>BASE</rt></ruby> — missing <rt> open tag.
    2. Duplicate/fragment kanji before a <ruby> tag
       (今日<ruby>日<rt>きょう</rt></ruby>, 昨日<ruby>昨<rt>きの</rt></ruby>).
    3. Leftover fragment trailing right after </ruby> from a 3-way split
       (昨日<ruby>昨<rt>きの</rt></ruby>日).
   Both consumers must stay in sync with this parser — fix bugs here once,
   not separately in each caller. */

const RUBY_HAS_KANJI = /[一-鿿々〆ヶ]/;
const RUBY_KANJI_PLUS_READING = /^([一-鿿々〆ヶ]+)([ぁ-ん]+)$/;

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

export type RubySegment =
  | { type: "ruby"; base: string; rt: string }
  | { type: "text"; value: string };

export function parseRubySegments(text: string): RubySegment[] {
  if (!text) return [];

  // Strip/merge kanji that immediately precede their own <ruby> tag.
  const processed = text.replace(
    /([一-鿿々〆ヶ]+)<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>([一-鿿々〆ヶ]*)/g,
    (
      match,
      preKanji: string,
      rubyBase: string,
      reading: string,
      trailing: string,
    ) => {
      if (rubyBase.startsWith(preKanji)) {
        return `<ruby>${rubyBase}<rt>${reading}</rt></ruby>${trailing}`;
      }
      if (preKanji !== rubyBase && preKanji.startsWith(rubyBase)) {
        const missing = preKanji.slice(rubyBase.length);
        const newTrailing =
          missing && trailing.startsWith(missing) ? trailing.slice(missing.length) : trailing;
        return `<ruby>${preKanji}<rt>${reading}</rt></ruby>${newTrailing}`;
      }
      if (preKanji !== rubyBase && preKanji.endsWith(rubyBase)) {
        return `<ruby>${preKanji}<rt>${reading}</rt></ruby>${trailing}`;
      }
      return match;
    },
  );

  // [^<] (not [\s\S]) keeps a malformed <ruby> from lazily matching across
  // into the NEXT tag's <rt>...</rt></ruby>, which would garble both words.
  const TOKEN =
    /<ruby>([^<]*?)<rt>([^<]*?)<\/rt><\/ruby>|<ruby>([^<]*?)<\/rt><\/ruby>|([一-鿿々〆ヶ]+)[（(]([ぁ-んァ-ヶーゝゞ]+)[）)]/g;

  const segments: RubySegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(processed)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: stripHtmlTags(processed.slice(last, m.index)) });
    }

    let base: string;
    let rt: string;
    if (m[1] !== undefined) {
      base = stripHtmlTags(m[1]);
      rt = stripHtmlTags(m[2]);
    } else if (m[3] !== undefined) {
      const stripped = stripHtmlTags(m[3]);
      const split = stripped.match(RUBY_KANJI_PLUS_READING);
      base = split ? split[1] : stripped;
      rt = split ? split[2] : "";
    } else {
      base = stripHtmlTags(m[4]);
      rt = stripHtmlTags(m[5]);
    }

    if (!RUBY_HAS_KANJI.test(base) || rt === base || !rt) {
      segments.push({ type: "text", value: base });
    } else {
      segments.push({ type: "ruby", base, rt });
    }
    last = m.index + m[0].length;
  }
  if (last < processed.length) {
    segments.push({ type: "text", value: stripHtmlTags(processed.slice(last)) });
  }

  return segments;
}

/**
 * Rebuilds a clean, well-formed ruby-HTML string from possibly-malformed AI
 * output. Use this to sanitize AI responses before they're saved to the DB,
 * so downstream renderers never have to recover from broken markup at all.
 */
export function normalizeRubyText(text: string): string {
  if (!text) return text;
  return parseRubySegments(text)
    .map((seg) => (seg.type === "ruby" ? `<ruby>${seg.base}<rt>${seg.rt}</rt></ruby>` : seg.value))
    .join("");
}

/** Same as normalizeRubyText, but discards furigana entirely — for fields
 * (e.g. diary titles) that are stored/displayed as plain text. */
export function stripRubyText(text: string): string {
  if (!text) return text;
  return parseRubySegments(text)
    .map((seg) => (seg.type === "ruby" ? seg.base : seg.value))
    .join("")
    .trim();
}
