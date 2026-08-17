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
 *
 * ── ⚠️ ふりがなルールのコピーは「3箇所」ある。2箇所で満足しないこと ──────
 *
 * ドリルとミニレッスンだけがこのファイルに寄せてある。ふりがなルール本体は
 * まだ各ルートに手書きでコピーされたままで、しかも既にドリフトしている：
 *
 *   1. api/correct/route.ts        ルール2 — 完全版（音読みトラップ一覧つき、約35行）
 *   2. api/correct-existing/route.ts ルール2 — 短縮版。1の音読みトラップ一覧が
 *      丸ごと無い。書き込み先は 1 と同じ corrected_japanese / natural_japanese
 *      （correctionToDbColumns）なので、片方だけ直すと再添削で不具合が残る。
 *   3. api/recheck/route.ts        ルール6 — さらに短い版。書き込み先が
 *      quoteRuby / suggestionRuby / encouragementRuby と別なので 1・2 の
 *      修正とは独立だが、同じ不具合は同じように起こりうる。
 *
 * 2026-08-08 の「送り仮名が読みに飲み込まれる」修正（<ruby>話<rt>はなし</rt></ruby>
 * ましょう が 話ましょう と描画される）は 1 と 2 に入れた。3 は別カラムなので
 * 見送っている。次にふりがなルールを触るときは、まず上の3箇所を数えること。
 *
 * ここへ寄せてしまえば済む話ではある。やらずにいるのは、ルール2が level と
 * style に依存する文面と隣接していて、切り出すと並べ替えと同じ危険（下の
 * 2026-08-08 の記録）を踏むため。動かすなら罠14件の前後比較つきで。
 *
 * ── ⚠️ キャッシュ狙いの並べ替えは一度失敗している（2026-08-08）─────────
 *
 * Haiku 4.5 のプロンプトキャッシュは最小 4096 トークン。それを満たす不変
 * ブロックを作るにはルール2〜10（約5,200トークン）を先頭へ移すしかなく、
 * そのためには ${lang} を含むルール1を後ろへ出す必要がある。実装して
 * 計測したところ回帰が出たので戻した。同じ道を再度たどらないように。
 *
 *   ルール1を後半へ移すと、N5 + Light で過剰修正が起きる。
 *     「きょうは あめでした」→ 旧: あめでした のまま / 新: 雨でした
 *     ルール4（N5 はほぼひらがな）とルール5（Light は明らかな誤りだけ）の
 *     両方に違反する。0/6 → 6/6、temperature 0 で再現率 100%。
 *
 *   level / style を後半へ移すと、別の回帰。カタカナに <ruby> が付く
 *     （ルール2違反、<ruby>カフェ<rt>かふぇ</rt></ruby>）。0/26 → 7/26。
 *
 * 切り分け済み。壊れるのは「設定値と、それに依存するルールを引き離したとき」
 * だけで、キャッシュ機構そのものは無罪:
 *     プロンプト丸ごと1ブロック + cache_control  → 0/5（無害）
 *     順序を保ったまま2ブロックに分割           → 0/5（無害）
 *     ルール1だけ移動                            → 5/5（回帰）
 *
 * ふりがなの読みは全条件で無傷だった。罠14件（診=み, 空=す, 止=や/と,
 * 辛=から/つら, 激=はげ, 過=す ほか）すべて新旧一致。ここは動いていない。
 *
 * 次に試すなら: レベル/スタイル依存のルール4・5・5b を、ルール1と一緒に
 * 後半へまとめる。前半を「学習者に依存しないルールだけ」（2,3,6〜10 ≒
 * 4,500トークン）にする設計。最小長ぎりぎりなので count_tokens で先に確認。
 * 失敗した実装は ~/Downloads/nihongo-diary-reorder-attempt-2026-08-08.patch。
 */


/**
 * ── Free の出力量を抑える断片 ─────────────────────────────────────
 *
 * lean=false で全て空文字（または従来と同じ数字）を返す。有料プランの
 * プロンプトが移動前とバイト単位で一致することが前提条件なので、ここに
 * 足すものは必ず「false のとき無」になる形で書くこと。
 *
 * ⚠️ 数は「2」で固定。1 ではない。
 * CorrectionResult の hideMistake / hideVocab / hideAfterFirst は
 * どれも `i > 0` で、アップグレード導線のバナーは `length > 1` を
 * 条件にしている。つまり 1 件しか生成しないと、すりガラスも課金導線も
 * 消える。2 件生成して 1 件見せ 1 件隠す、が Free の設計。
 *
 * ⚠️ keyMistakes だけ「exactly」ではなく「at most」。ルール6b が
 * 「正しい日本語を直すな、直す根拠を言えないなら直すな」と要求して
 * いるので、2件ちょうどを強制すると存在しない誤りを捏造させることに
 * なる。実際に誤りが1つしかない日記（実測27%）ではブラーが出ないが、
 * 捏造よりはるかにましなので、その順序で妥協している。
 */
export function keyMistakesCap(lean: boolean): string {
  return lean
    ? " The keyMistakes array must contain AT MOST 2 objects. If the diary has more mistakes than that, keep only the two most important and omit the rest entirely. Never add a mistake that is not real just to reach two."
    : "";
}

export function vocabularyCap(lean: boolean): string {
  return lean ? " Return exactly 2 words." : "";
}

export function explanationCap(lean: boolean): string {
  return lean ? " Keep englishExplanation to at most 4 sentences." : "";
}

export function correctionNoteCap(lean: boolean): string {
  return lean ? " Keep it to at most 3 sentences." : "";
}

/** The literal digit in "suggest exactly N …". 3 is the pre-existing value. */
export function suggestionCount(lean: boolean): string {
  return lean ? "2" : "3";
}

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
