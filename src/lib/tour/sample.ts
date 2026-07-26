import type { Correction } from "@/lib/types";

/**
 * The canned correction the tour shows on the /write step.
 *
 * Written out here rather than reusing mockCorrection from @/lib/mock-data,
 * which is shared with the diary history fixtures. The sheet is scrollable —
 * and therefore reachable — so what it can contain must not depend on what
 * someone adds to a fixture later.
 *
 * Only three fields make CorrectionResult render a Save button, and every one
 * of them saves a word to the user's vocabulary through /api/vocabulary for
 * real: nextVocab, nextGrammar and alternativeWords. The type below makes
 * them impossible to set, so the button cannot be rendered at all. That is the
 * first of the sample sheet's three layers of protection; the other two live
 * in TourSampleSheet.
 *
 * The Japanese is a beginner's diary with the kind of mistakes the correction
 * is meant to demonstrate. The English prose matches the rest of the sample —
 * unlike the app's real corrections it is not translated per locale, which is
 * an accepted limitation of a fixed example.
 */
type SampleCorrection = Correction & {
  nextVocab?: never;
  nextGrammar?: never;
  alternativeWords?: never;
  practiceDrills?: never;
};

export const TOUR_SAMPLE_CORRECTION: SampleCorrection = {
  original:
    "きょうは私は友だちと公園に行きました。天気がいいですから、たくさん歩きました。小さい犬を見ました。とてもかわいいでした。",
  corrected:
    "今日は友だちと公園に行きました。天気がよかったので、たくさん歩きました。小さい犬を見ました。とてもかわいかったです。",
  natural:
    "今日は友だちと公園へ行ってきました。天気がよかったので、のんびりたくさん歩きました。途中で小さい犬を見かけて、すごくかわいかったです。",
  explanation:
    "Great entry! Two things to watch. First, you wrote two topic markers in one sentence (「きょうは私は」). One is enough, so dropping 私は keeps it natural. Second, かわいい is an い-adjective, so its past tense is かわいかったです, not かわいいでした. Your sentences are clear and easy to read.",
  correctionNote:
    "Nothing wrong with 「公園に行きました」 — it is correct. In a diary, though, 「公園へ行ってきました」 sounds warmer, because 〜てきました carries the sense of having gone and come back.",
  mistakes: [
    {
      before: "きょうは私は",
      after: "今日は",
      note: "Only one topic marker は per sentence — 私は is unnecessary here.",
    },
    {
      before: "かわいいでした",
      after: "かわいかったです",
      note: "Past tense of an い-adjective: drop い → add かった + です.",
    },
    {
      before: "いいですから",
      after: "よかったので",
      note: "Past reason: use the past form よかった, and ので sounds softer than から in writing.",
    },
  ],
  vocabulary: [
    { word: "天気", reading: "てんき", meaning: "weather" },
    { word: "散歩", reading: "さんぽ", meaning: "a walk, a stroll" },
    { word: "見かける", reading: "みかける", meaning: "to happen to see, to spot" },
  ],
  practice: {
    jp: "公園で大きい犬を見かけて、とてもかわいかったです。",
    en: "I spotted a big dog in the park, and it was really cute.",
  },
};
