/**
 * Dictation — picking the sentence, and marking the answer.
 *
 * Pure functions only. No DB, no React, so this is callable from a server
 * route, a client component or a plain Node script, the same way
 * learned-match.ts is.
 *
 * Reads parseRubySegments and nothing else from furigana.ts. buildRubyNotation,
 * normalizeRubyText and applyReadingDictionary are hands-off and are not
 * touched here.
 *
 * ── Why the marking is arithmetic and not AI ─────────────────────────────
 * A grader that answers differently on two identical submissions is worse than
 * no grader. Everything below is deterministic: the same input scores the same
 * every time, costs nothing, and returns instantly.
 *
 * ── The trick that makes it work ─────────────────────────────────────────
 * Grading a dictation means comparing sounds, but the learner types letters,
 * and Japanese lets them choose: 公園 and こうえん are the same answer. Turning
 * arbitrary kanji into kana needs a dictionary this app does not have —
 * TinySegmenter only splits, it carries no readings, and READING_DICTIONARY is
 * ~300 irregular compounds, not a lexicon.
 *
 * It does not need one. The SENTENCE being dictated carries its own readings:
 * natural_japanese is stored with its <ruby> markup, so for every kanji run in
 * the answer we already know how it sounds. Substituting those readings into
 * whatever the learner typed lands kanji, kana and any mixture of the two on
 * the same kana string, and then the comparison is between two kana strings.
 */

import { parseRubySegments } from "@/lib/furigana";

/** Anything that would be a distraction rather than a mistake. */
const IGNORED = /[。、．，,.!！?？「」『』（）()[\]〜~…・\s　]/g;

const HAS_KANJI = /[一-鿿々〆ヶ]/;

/**
 * Bounds on a sentence worth setting. Under the minimum there is nothing to
 * hear; over the maximum a single slip drags the score down over text the
 * learner cannot hold in memory anyway. Measured in kana, after IGNORED.
 */
const MIN_KANA = 6;
const MAX_KANA = 60;

function toHiragana(s: string): string {
  // Katakana → hiragana. ー, small kana and the iteration marks are left alone:
  // コーヒー and こーひー should match, but っ and ゃ change the word.
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** The sentence as it is written, ruby markup resolved to its base text. */
export function sentenceSurface(rubySentence: string): string {
  return parseRubySegments(rubySentence)
    .map((seg) => (seg.type === "ruby" ? seg.base : seg.value))
    .join("");
}

/** The sentence as it SOUNDS: every annotated run replaced by its reading. */
export function sentenceKana(rubySentence: string): string {
  return toHiragana(
    parseRubySegments(rubySentence)
      .map((seg) => (seg.type === "ruby" ? seg.rt : seg.value))
      .join(""),
  ).replace(IGNORED, "");
}

/**
 * Split a paragraph into sentences, keeping the ruby markup intact.
 *
 * Splitting the raw string is safe: 。！？ cannot appear inside a <ruby> or
 * <rt> tag, so a boundary never lands in the middle of markup.
 */
export function splitSentences(rubyText: string): string[] {
  if (!rubyText) return [];
  return rubyText
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => sentenceKana(s).length > 0);
}

/**
 * Can this sentence be marked at all?
 *
 * The answer key is its kana, so a kanji that survives into sentenceKana is a
 * kanji with no reading attached — an entry saved before the ruby pipeline, or
 * one the AI only partly annotated. There is no way to know what it sounds
 * like, so the sentence is not usable and neither, if it has no usable
 * sentence, is the diary.
 */
export function isGradable(rubySentence: string): boolean {
  const kana = sentenceKana(rubySentence);
  return kana.length >= MIN_KANA && kana.length <= MAX_KANA && !HAS_KANJI.test(kana);
}

/**
 * The sentence to set, or null when the diary has none worth setting.
 *
 * The middle one, and deliberately not a random one. A diary always sets the
 * same sentence, so coming back to it a second time replays audio that is
 * already in the cache — and a cached clip costs no credit. A random pick
 * would spend one of a Free learner's three on every visit.
 *
 * The middle is where a diary is usually past its opening 今日は… and not yet
 * at its closing line, so the sentence tends to carry the actual content.
 */
export function pickSentence(naturalRuby: string): string | null {
  const usable = splitSentences(naturalRuby).filter(isGradable);
  if (usable.length === 0) return null;
  return usable[Math.floor((usable.length - 1) / 2)];
}

/** Does this diary have anything to dictate? Cheap enough for a list view. */
export function hasDictation(naturalRuby: string | null | undefined): boolean {
  return !!naturalRuby && pickSentence(naturalRuby) !== null;
}

/**
 * Rewrite what the learner typed into the same kana the answer key is in.
 *
 * Every kanji run the sentence annotates is swapped for its reading, longest
 * first so 今日 is consumed before 日 can claim half of it. Kanji, kana,
 * katakana and any mixture of them converge here.
 *
 * ⚠️ Known limit: a base also appearing inside a word the learner brought from
 * outside the sentence is rewritten too — with 生(い) in the answer, a typed
 * 先生 becomes 先い. It needs the learner to have typed a compound that is not
 * in the sentence, which means they were already wrong; the effect is a few
 * characters of partial credit, never a wrong verdict. Words that ARE in the
 * sentence are safe, since the longest-first order consumes 先生 before 生.
 */
export function normalizeAnswer(input: string, rubySentence: string): string {
  const readings = parseRubySegments(rubySentence)
    .filter((seg): seg is { type: "ruby"; base: string; rt: string } => seg.type === "ruby")
    .map((seg) => [seg.base, seg.rt] as const)
    .sort((a, b) => b[0].length - a[0].length);

  let out = input;
  for (const [base, rt] of readings) out = out.split(base).join(rt);
  return toHiragana(out).replace(IGNORED, "");
}

/** One character of the marked answer. `ch` is always the ANSWER's character. */
export type MarkOp =
  | { op: "ok"; ch: string }
  | { op: "wrong"; ch: string; typed: string }
  | { op: "missing"; ch: string }
  | { op: "extra"; typed: string };

export interface Mark {
  /** Characters of the ANSWER that were heard correctly, out of `total`. */
  correct: number;
  total: number;
  /**
   * 0–100. Similarity, NOT correct/total.
   *
   * The two differ when the learner typed extra characters, and the difference
   * matters: correct/total counts how much of the answer was reached, so
   * "ともだちとこうえんをあるきましたよ" reaches all of it and scores 16/16 —
   * as would pasting the answer inside a paragraph of noise. Normalising the
   * edit distance by the LONGER of the two strings means every stray character
   * costs something, and 100 means the two strings are the same.
   */
  percent: number;
  /** Levenshtein distance between the two kana strings. */
  distance: number;
  /** Nothing missing, nothing wrong, nothing extra. */
  isPerfect: boolean;
  /** Counts behind the highlight, for a one-line summary. */
  wrong: number;
  missing: number;
  extra: number;
  /** The answer, character by character, for rendering the highlight. */
  ops: MarkOp[];
  /** Both sides in kana, for showing what the comparison actually was. */
  answerKana: string;
  typedKana: string;
}

/**
 * Levenshtein, kept with its backtrace so the score and the highlighting come
 * out of the same table — a "which characters were right" that cannot disagree
 * with the number shown next to it.
 */
export function markAnswer(input: string, rubySentence: string): Mark {
  const a = sentenceKana(rubySentence);
  const b = normalizeAnswer(input, rubySentence);

  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  const ops: MarkOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push(
        a[i - 1] === b[j - 1]
          ? { op: "ok", ch: a[i - 1] }
          : { op: "wrong", ch: a[i - 1], typed: b[j - 1] },
      );
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: "missing", ch: a[i - 1] });
      i--;
    } else {
      ops.push({ op: "extra", typed: b[j - 1] });
      j--;
    }
  }
  ops.reverse();

  const count = (op: MarkOp["op"]) => ops.filter((o) => o.op === op).length;
  const distance = d[m][n];
  const span = Math.max(m, n);

  return {
    correct: count("ok"),
    total: m,
    percent: span === 0 ? 0 : Math.round((1 - distance / span) * 100),
    distance,
    isPerfect: distance === 0,
    wrong: count("wrong"),
    missing: count("missing"),
    extra: count("extra"),
    ops,
    answerKana: a,
    typedKana: b,
  };
}
