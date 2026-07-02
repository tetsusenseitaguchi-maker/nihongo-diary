import { Fragment } from "react";
import { parseRubySegments } from "@/lib/furigana";

// Supports BOTH:
//   <ruby>漢字<rt>かんじ</rt></ruby>   (AI output)
//   漢字(かな) / 漢字（かな）           (hand-authored UI strings)

/**
 * Renders Japanese text with furigana. Accepts ruby-HTML and 漢字(かな) notation.
 * Safety: if a "base" has no kanji (e.g. furigana mistakenly placed over kana),
 * or the reading equals the base, it is rendered as plain text — never as ruby.
 *
 * Parsing (including recovery from malformed AI ruby-tags) lives in
 * parseRubySegments() in src/lib/furigana.ts, shared with normalizeRubyText()
 * which sanitizes AI output before it's saved to the DB.
 */
export function Furigana({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  const segments = parseRubySegments(text);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === "ruby" ? (
          <ruby key={i}>
            {seg.base}
            <rt>{seg.rt}</rt>
          </ruby>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        ),
      )}
    </span>
  );
}
