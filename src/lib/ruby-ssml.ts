import { parseRubySegments } from "@/lib/furigana";

/**
 * Turn the app's ruby markup into SSML that forces the intended reading.
 *
 * The corrections, vocabulary and lesson content all carry furigana as
 * <ruby>漢字<rt>かんじ</rt></ruby>. Handed to a TTS engine as plain text the
 * markup is either read aloud verbatim or stripped, and the engine then picks
 * its own reading for the kanji — which is exactly the case the furigana was
 * there to disambiguate (端 / 箸 / 橋, 中 as なか or ちゅう).
 *
 * <sub alias="かんじ">漢字</sub> makes the engine say the alias instead. The
 * reading in <rt> is the one the app already decided on, so the audio and the
 * furigana on screen can no longer disagree.
 *
 * Parsing is delegated to parseRubySegments (read-only import — furigana.ts is
 * hands-off), so this stays in step with the several markup shapes it accepts,
 * including 漢字（かんじ） parenthesised readings.
 *
 * ⚠️ What <sub> does NOT carry is pitch accent. It fixes WHICH reading, not
 * how the reading is intoned; 公園 still gets whatever accent the voice
 * defaults to. Google's ja-JP alternative,
 * <phoneme alphabet="yomigana" ph="^こうえん">, does encode accent (^ starts a
 * pitch phrase, ! marks the downstep) and is verified to work on
 * ja-JP-Wavenet-A. Moving to it needs an accent source the app does not have
 * yet — <rt> holds readings only — so <sub> is the right call for now.
 */

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escape for both element text and attribute values. */
function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
}

/**
 * Build the <speak> document for a piece of ruby-annotated Japanese.
 *
 * Every segment is escaped, including the ones that came out of parsing, so a
 * stray "&" or "<" in learner-authored text cannot produce invalid SSML (which
 * Google rejects with a 400 for the whole request).
 */
export function rubyToSsml(text: string): string {
  const body = parseRubySegments(text)
    .map((seg) =>
      seg.type === "ruby"
        ? `<sub alias="${escapeXml(seg.rt)}">${escapeXml(seg.base)}</sub>`
        : escapeXml(seg.value),
    )
    .join("");

  return `<speak>${body}</speak>`;
}
