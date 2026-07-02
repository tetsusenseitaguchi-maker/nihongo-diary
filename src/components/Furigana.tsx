import { Fragment } from "react";

// Supports BOTH:
//   <ruby>漢字<rt>かんじ</rt></ruby>   (AI output)
//   漢字(かな) / 漢字（かな）           (hand-authored UI strings)

const HAS_KANJI = /[一-鿿々〆ヶ]/;
// Recovers a specific AI formatting glitch: <ruby>BASE</rt></ruby> with the
// <rt> opening tag missing, where BASE is itself a kanji-run + hiragana
// reading concatenated together (e.g. <ruby>友達ともだち</rt></ruby>).
const KANJI_PLUS_READING = /^([一-鿿々〆ヶ]+)([ぁ-ん]+)$/;

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

/**
 * Renders Japanese text with furigana. Accepts ruby-HTML and 漢字(かな) notation.
 * Safety: if a "base" has no kanji (e.g. furigana mistakenly placed over kana),
 * or the reading equals the base, it is rendered as plain text — never as ruby.
 */
export function Furigana({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  // Strip kanji that immediately precede their own <ruby> tag
  // e.g. AI outputs 公<ruby>公園<rt>... or 清水寺<ruby>清水寺<rt>... → remove the leading duplicate.
  // Also handles the fragment variant, where the preceding plain kanji is the
  // FULL word and <ruby> only wraps a suffix or prefix fragment of it while
  // carrying the whole word's reading (e.g. 今日<ruby>日<rt>きょう</rt></ruby>,
  // 昨日<ruby>昨<rt>きの</rt></ruby>日) — merge onto the fuller preKanji instead.
  const processed = text.replace(
    /([一-鿿々〆ヶ]+)(<ruby>([^<]*)<rt>)/g,
    (match, preKanji: string, rubyOpen: string, rubyBase: string) => {
      if (rubyBase.startsWith(preKanji)) return rubyOpen;
      if (preKanji !== rubyBase && (preKanji.endsWith(rubyBase) || preKanji.startsWith(rubyBase))) {
        return `<ruby>${preKanji}<rt>`;
      }
      return match;
    },
  );

  // Fresh RegExp per call — module-level /g regex shares lastIndex across concurrent renders
  // [^<] (not [\s\S]) inside the well-formed alternative keeps a malformed
  // <ruby> from lazily matching across into the NEXT tag's <rt>...</rt></ruby>,
  // which would otherwise garble multiple words together.
  const TOKEN =
    /<ruby>([^<]*?)<rt>([^<]*?)<\/rt><\/ruby>|<ruby>([^<]*?)<\/rt><\/ruby>|([一-鿿々〆ヶ]+)[（(]([ぁ-んァ-ヶーゝゞ]+)[）)]/g;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(processed)) !== null) {
    if (m.index > last) nodes.push(stripTags(processed.slice(last, m.index)));

    let base: string;
    let rt: string;
    if (m[1] !== undefined) {
      // Well-formed <ruby>base<rt>reading</rt></ruby>
      base = stripTags(m[1]);
      rt = stripTags(m[2]);
    } else if (m[3] !== undefined) {
      // Malformed <ruby>base</rt></ruby> — <rt> opening tag missing.
      const stripped = stripTags(m[3]);
      const split = stripped.match(KANJI_PLUS_READING);
      base = split ? split[1] : stripped;
      rt = split ? split[2] : "";
    } else {
      // 漢字（かな）
      base = stripTags(m[4]);
      rt = stripTags(m[5]);
    }

    if (!HAS_KANJI.test(base) || rt === base || !rt) {
      nodes.push(base);
    } else {
      nodes.push(
        <ruby key={m.index}>
          {base}
          <rt>{rt}</rt>
        </ruby>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < processed.length) nodes.push(stripTags(processed.slice(last)));

  return (
    <span className={className}>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </span>
  );
}
