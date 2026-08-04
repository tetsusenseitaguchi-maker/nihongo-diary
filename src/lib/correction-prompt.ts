/**
 * ドリルとミニレッスンのプロンプト断片。
 *
 * /api/correct と /api/correct-existing の2つの systemPrompt が、この2機能に
 * ついてだけ同じ文字列を使うための置き場。
 *
 * ── なぜ切り出したか ────────────────────────────────────────────
 * 2つのプロンプトは独立して書かれていて、実際にドリフトした記録がある
 * （correct-existing の「Map AI response」のコメント — 日記タイトルのルビ処理が
 * 片方だけ変わった）。ドリルを correct-existing に手書きでコピーすれば3件目を
 * 作ることになるので、文言を物理的に1箇所へ寄せてある。片方だけ直す、ができない。
 *
 * ⚠️ ここにある文字列は /api/correct から1字も変えずに移したもの。移動の前後で
 * 組み上がるプロンプトが4通りの分岐すべてでバイト単位に一致することを確認済み。
 * 添削品質の中核なので、変えるときは同じ確認をしてから。
 *
 * ⚠️ 2つのフラグは連動させること。ドリルのルールは「relatedMiniLesson のトピック
 * に基づけ」と書いてあるので、ミニレッスン無しでドリルだけ有効にすると、もう
 * 要求していないフィールドを指すプロンプトになる。
 *
 * プラン判定はここでは行わない。呼び出し側が plan !== "free" を渡す。
 * normalizePlan も PLAN_LIMITS も import していない。
 */


export function drillsSchema(include: boolean): string {
  return include
    ? `  "practiceDrills": [
    { "type": "", "question": "", "questionRuby": "", "choices": [], "answer": "", "answerRuby": "", "englishExplanation": "" }
  ],
`
    : "";
}

  // Each fragment carries its own leading comma so rule 1's list closes with a
  // period no matter which combination is active.
export function drillsInRule1(include: boolean): string {
  return include ? ", every practiceDrills[].englishExplanation" : "";
}

export function miniLessonInRule1(include: boolean): string {
  return include
    ? ", and relatedMiniLesson shortExplanation / exampleEnglish / shortNote"
    : "";
}

export function miniLessonSchema(include: boolean): string {
  return include
    ? `  "relatedMiniLesson": { "id": 1, "shortExplanation": "", "exampleJapaneseRuby": "", "exampleEnglish": "", "shortNote": "" },
`
    : "";
}

export function drillsRule(include: boolean, lang: string): string {
  return include
    ? `11. practiceDrills: generate exactly 2 short practice drills based on the learner's mistakes or the relatedMiniLesson topic.
- Types (use the exact string): "fill-in" (blank fill — mark the blank as ___), "particle-choice" (choose the correct particle), "desu-masu" (choose です or ます), "reorder" (reorder the given words into a correct sentence; put the shuffled words in choices), "rewrite" (rewrite the given phrase more naturally; no choices needed).
- question: plain text (no ruby tags). questionRuby: same sentence with <ruby> furigana on all kanji. answer: plain text. answerRuby: with <ruby> furigana. englishExplanation: one sentence in ${lang} explaining why.
- choices:
  - fill-in: EXACTLY 2 options — the correct answer plus ONE plausible
    wrong answer. Both must be complete, well-formed words/phrases
    (never a truncated fragment like "行ってき"), and must be distinct
    strings from each other.
  - particle-choice / desu-masu: 3–4 options, all distinct from each other.
  - reorder: shuffled words. rewrite: [].
  - For every drill type that has choices, the array MUST include a
    string that is character-for-character identical to "answer" — same
    kanji/hiragana notation, not just the same reading (e.g. if answer
    is "行ってきました", a choice must be "行ってきました", not "行って
    来ました").
- Keep every drill simple and at the learner's level. Vary the types. If there were no mistakes, base drills on the relatedMiniLesson.
- Grammatical consistency (fill-in especially): the fixed text immediately before and after the blank — including the sentence ending — must connect naturally with the answer's actual grammatical form. Forms like 〜そう (様態/looks-like), 〜らしい, 〜ようだ, and 〜みたいだ cannot be directly followed by ます. If the correct answer is (or ends in) one of these forms, do NOT end the sentence in ます — use です instead, or rewrite the whole sentence so the fixed text around the blank fits that form naturally. Mentally fill in the blank and confirm the complete sentence is grammatical before finalizing.

`
    : "";
}

export function miniLessonRule(include: boolean, lang: string): string {
  return include
    ? `12. relatedMiniLesson: choose the ONE most relevant lesson for the learner's main grammar point, by id, from this FIXED list:
1 = Hiragana
2 = Katakana
3 = Sentence Structure
4 = Topic & は
5 = Particles 1: を, に, で
6 = Particles 2: へ, から, まで, と, も
7 = は vs が
8 = Nouns & です
9 = Adjectives: い & な
10 = Verb Types: Ichidan & Godan
11 = ます Form
12 = Dictionary & ない Form
13 = Past Form
14 = Te-form: How to Make It
15 = Te-form Uses (てください / てもいい / てから)
16 = 〜ている & 〜てある (progressive / resulting / prepared state)
17 = 〜てみる / 〜ておく / 〜てしまう
18 = 〜てくる & 〜ていく (directional change)
19 = Reasons: から & ので
20 = Wants & Invitations
Return only: id (1-20), shortExplanation (in ${lang}, tailored to the learner's level), exampleJapaneseRuby (with <ruby> furigana, tailored to level — keep in Japanese), exampleEnglish (in ${lang}), shortNote (in ${lang}, friendly). If nothing clearly fits, use id 3. Do NOT invent new lessons or change titles.

`
    : "";
}
