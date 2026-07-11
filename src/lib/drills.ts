// Shared safety net for AI-generated fill-in practice drills.
//
// The generation prompts (mini-lesson-drills/route.ts, correct/route.ts)
// instruct the model to never end a fill-in question in ます when the
// answer is a form that can't take ます (〜そう/らしい/ようだ/みたいだ), but
// LLM instruction-following isn't 100% reliable — verified during testing
// that it still happens occasionally (e.g. "もうすぐ___ます。" with answer
// "終わりそうです"). This mechanically fixes it instead of shipping an
// ungrammatical question.

const MASU_INCOMPATIBLE_ANSWER_SUFFIXES = [
  "そうです", "そうだ", "そう",
  "らしいです", "らしい",
  "ようです", "ようだ",
  "みたいです", "みたいだ", "みたい",
];

// endsWith (not substring) to avoid false positives on unrelated words that
// happen to contain these characters (e.g. 暮らし, 散らし contain "らし").
function answerEndsInMasuIncompatibleForm(answer: string): boolean {
  const trimmed = answer.trim();
  return MASU_INCOMPATIBLE_ANSWER_SUFFIXES.some((suf) => trimmed.endsWith(suf));
}

const BLANK_FOLLOWED_BY_MASU = /___(\s*)ます/;

/**
 * If a fill-in drill's answer uses a ます-incompatible form AND the question
 * still ends the blank in ます, replaces that ます with です. Leaves the
 * drill untouched otherwise (including non-fill-in types, and fill-in drills
 * that are already correct).
 */
export function fixMasuIncompatibleBlank<
  T extends { question: string; questionRuby: string; answer: string },
>(drill: T): T {
  if (!answerEndsInMasuIncompatibleForm(drill.answer)) return drill;
  if (!BLANK_FOLLOWED_BY_MASU.test(drill.question)) return drill;

  return {
    ...drill,
    question: drill.question.replace(BLANK_FOLLOWED_BY_MASU, "___$1です"),
    questionRuby: drill.questionRuby.replace(BLANK_FOLLOWED_BY_MASU, "___$1です"),
  };
}

// Shared safety net for AI-generated choice-based drills (fill-in,
// particle-choice, desu-masu).
//
// PracticeDrills.tsx marks a choice as correct via a strict `c ===
// drill.answer` string comparison. If the model generates an answer that
// doesn't literally appear in choices (e.g. answer "行ってきました" but
// choices only has "行って来ました" — same reading, different kanji/
// hiragana notation) or duplicates a choice string, no choice can ever be
// recognized as correct, so a user who picks the right answer sees "Wrong".
// This mechanically guarantees answer is always present in choices exactly
// once, rather than relying on the model to get the notation to match
// character-for-character every time.
export function ensureAnswerInChoices<
  T extends { choices: string[]; answer: string },
>(drill: T): T {
  if (drill.choices.length === 0) return drill; // reorder/rewrite — not this kind of choice

  const unique = Array.from(new Set(drill.choices));
  if (unique.includes(drill.answer)) {
    return unique.length === drill.choices.length ? drill : { ...drill, choices: unique };
  }

  // answer isn't present verbatim — force it in rather than leaving the
  // drill mechanically unsolvable.
  const distractors = unique.filter((c) => c !== drill.answer);
  return {
    ...drill,
    choices: [drill.answer, ...distractors].slice(0, Math.max(drill.choices.length, 2)),
  };
}
