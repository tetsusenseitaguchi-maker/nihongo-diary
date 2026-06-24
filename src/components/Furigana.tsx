import { Fragment } from "react";

// Supports BOTH:
//   <ruby>漢字<rt>かんじ</rt></ruby>   (AI output)
//   漢字(かな) / 漢字（かな）           (hand-authored UI strings)
const TOKEN =
  /<ruby>([\s\S]*?)<rt>([\s\S]*?)<\/rt><\/ruby>|([\u4e00-\u9fff々〆ヶ]+)[（(]([ぁ-んァ-ヶーゝゞ]+)[）)]/g;

const HAS_KANJI = /[\u4e00-\u9fff々〆ヶ]/;

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

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;

  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(stripTags(text.slice(last, m.index)));
    const base = stripTags(m[1] !== undefined ? m[1] : m[3]);
    const rt = stripTags(m[1] !== undefined ? m[2] : m[4]);

    if (!HAS_KANJI.test(base) || rt === base || !rt) {
      // Don't put furigana over kana / empty / duplicate readings.
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
  if (last < text.length) nodes.push(stripTags(text.slice(last)));

  return (
    <span className={className}>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </span>
  );
}
