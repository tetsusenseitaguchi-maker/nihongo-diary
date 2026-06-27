import { Fragment } from "react";

// Supports BOTH:
//   <ruby>漢字<rt>かんじ</rt></ruby>   (AI output)
//   漢字(かな) / 漢字（かな）           (hand-authored UI strings)

const HAS_KANJI = /[一-鿿々〆ヶ]/;

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
  // e.g. AI outputs 公<ruby>公園<rt>... or 清水寺<ruby>清水寺<rt>... → remove the leading duplicate
  const processed = text.replace(
    /([一-鿿々〆ヶ]+)(<ruby>([^<]*)<rt>)/g,
    (match, preKanji: string, rubyOpen: string, rubyBase: string) =>
      rubyBase.startsWith(preKanji) ? rubyOpen : match,
  );

  // Fresh RegExp per call — module-level /g regex shares lastIndex across concurrent renders
  const TOKEN =
    /<ruby>([\s\S]*?)<rt>([\s\S]*?)<\/rt><\/ruby>|([一-鿿々〆ヶ]+)[（(]([ぁ-んァ-ヶーゝゞ]+)[）)]/g;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(processed)) !== null) {
    if (m.index > last) nodes.push(stripTags(processed.slice(last, m.index)));
    const base = stripTags(m[1] !== undefined ? m[1] : m[3]);
    const rt = stripTags(m[1] !== undefined ? m[2] : m[4]);

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
