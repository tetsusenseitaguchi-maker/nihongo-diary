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
