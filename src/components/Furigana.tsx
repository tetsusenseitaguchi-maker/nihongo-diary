import { Fragment } from "react";
import { parseRubySegments, stripRubyText } from "@/lib/furigana";

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

/**
 * Renders a field that must NEVER show furigana — the explanatory ones the AI
 * writes in the learner's UI language (englishExplanation, correctionNote,
 * every meaning / note / explanation), plus the plain-Japanese labels that
 * carry no markup by contract (nextGrammar[].pattern, alternativeWords[].
 * original, practice_answer).
 *
 * Those fields are rendered as raw text, so a stray <ruby> tag from the AI
 * shows up as literal characters ("<ruby>今日<rt>きょう</rt></ruby>") instead of
 * as furigana. The prompts now forbid ruby in these fields, but that only
 * helps corrections generated from here on: english_explanation and friends
 * are persisted, so every diary already saved would keep showing the raw tags.
 * Stripping at render time fixes stored rows too, and stays as the guard for
 * when the model ignores the prompt anyway.
 *
 * stripRubyText() (unchanged, from @/lib/furigana) drops the markup and keeps
 * the base text, so a quoted 「<ruby>今日<rt>きょう</rt></ruby>」 reads as 「今日」
 * rather than disappearing.
 *
 * Returns a bare string, no wrapper element — every call site already sits
 * inside its own styled <p>/<span>, and this must not change their layout.
 */
export function NoRuby({ text }: { text?: string | null }) {
  if (!text) return null;
  return <>{stripRubyText(text)}</>;
}
