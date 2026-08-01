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

/* ── Symbols the voice must not spell out ────────────────────────────────
   escapeXml only handles the five characters XML needs. Everything else
   reaches ja-JP-Wavenet-A as literal text, and it reads punctuation aloud:
   「〜すぎて / 〜ばかり」 comes out with "スラッシュ" in the middle of it.

   These characters are structure for the eye, not words. Each one is either
   a pause or nothing:

     / ／        → 、  a separator between alternatives ("A or B")
     〜 ～       → ""  the placeholder in a grammar pattern (〜ながら). Not a
                       word, and "から" is what follows it in 〜てから — a
                       pause there would split the pattern in half.
     → ← ⇒ ⇔    → 、  "becomes / leads to", read as an arrow otherwise
     ・          → 、  separator between listed items
     … ‥        → 、  a trailing-off pause is exactly what it means
     （ ） ( )   → ""  parenthesised asides. The 漢字（かんじ） reading form is
                       already consumed by parseRubySegments, so anything left
                       here is a real bracket.
     「」『』【】 → ""  quotation, carried by prosody rather than spoken
     * # _ | \   → ""  markdown that leaked out of an AI response

   Applied to the spoken TEXT only. A ruby base is never spoken (the <sub>
   alias replaces it) and an alias is a hiragana reading, so neither needs it.

   ⚠️ Order matters: this runs BEFORE escapeXml, so a replacement must never
   introduce &, <, >, " or '. 、 and "" are safe. */
const SPEECH_SYMBOLS: [RegExp, string][] = [
  [/[/／]/g, "、"],
  [/[〜～]/g, ""],
  [/[→←⇒⇔]/g, "、"],
  [/[・]/g, "、"],
  [/[…‥]/g, "、"],
  [/[（）()「」『』【】]/g, ""],
  [/[*#_|\\]/g, ""],
];

/**
 * Rewrite a run of plain text into something worth reading aloud.
 *
 * Consecutive pauses collapse into one so that 「A / ・ B」 is a single beat,
 * and the whitespace that sat around the symbol goes with them — 「A / B」
 * would otherwise leave "A 、B", pausing twice. 　 is in the class
 * because \s does not cover the full-width space.
 */
function toSpeech(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SPEECH_SYMBOLS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/[\s　]*、[\s　、]*/g, "、");
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
        : escapeXml(toSpeech(seg.value)),
    )
    .join("");

  // A pause at either end of the utterance is silence with a comma's worth of
  // delay in front of it. Safe as a whole-body pass: a <sub> tag never begins
  // or ends with 、, so only real text can match here.
  return `<speak>${body.replace(/^、+/, "").replace(/、+$/, "")}</speak>`;
}
