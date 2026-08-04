/**
 * Writing prompts ("今日のお題") shown on the Write page.
 *
 * Display-only learning content — no DB access, no plan gating, no usage
 * counters. Every user sees the same prompt on a given calendar day.
 *
 * Japanese text uses the hand-authored 漢字(かな) ruby notation, which
 * <Furigana> renders directly via parseRubySegments(). Nothing here goes
 * through buildRubyNotation / normalizeRubyText.
 *
 * Notation rule: the reading attaches to the kanji run immediately before the
 * parenthesis, so okurigana stays outside it — 起(お)きる, not 起きる(おきる).
 * Writing it the other way leaves the parentheses visible as plain text.
 *
 * Target level: JLPT N5.
 */

export type WritingPrompt = {
  /** Stable id — the daily rotation keys off array position, so never reorder. */
  id: number;
  /** The prompt itself, in 漢字(かな) ruby notation. */
  jp: string;
  /** English gloss. Kept in English for every locale (see PRESET_TAGS / tips). */
  en: string;
  /** 5–7 words the learner can lean on. */
  words: { jp: string; en: string }[];
  /**
   * One way this prompt could be answered — a model to read, not a template.
   *
   * Optional, and the card simply omits the section when it is absent, so the
   * thirty can be written one at a time instead of all at once. A prompt with
   * no example looks exactly as it does today.
   *
   * Same 漢字(かな) notation as `jp` above — <Furigana> renders both, and the
   * notation rule at the top of this file applies unchanged. `en` is a plain
   * English gloss shown in every locale, matching `words` and the Write-page
   * tips; it is not an i18n key.
   *
   * ⚠️ Deliberately has no `insert` counterpart, and that absence is the
   * design. support/page.tsx's TEMPLATES carries one because it feeds
   * /write?starter=; this must never reach the textarea. Everything the
   * learner saves in original_text has to be text they typed — learned-match.ts
   * treats that column as "what the learner wrote themselves" and counts
   * saved vocabulary as used on the strength of it. A one-tap copy of a model
   * answer would put an authored sentence there and quietly graduate words
   * nobody practised. The card says as much in write.prompt.exampleNote.
   */
  example?: { jp: string; en: string };
};

// FIXED order — the daily prompt is chosen by index, so reordering this array
// would change which prompt every user sees today.
export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 1,
    jp: "今日(きょう)、何(なに)をしましたか？",
    en: "What did you do today?",
    words: [
      { jp: "今日(きょう)", en: "today" },
      { jp: "勉強(べんきょう)", en: "study" },
      { jp: "仕事(しごと)", en: "work" },
      { jp: "買(か)い物(もの)", en: "shopping" },
      { jp: "行(い)く", en: "to go" },
      { jp: "家(いえ)", en: "home" },
      { jp: "楽(たの)しい", en: "fun" },
    ],
    example: { jp: "今日(きょう)は友(とも)だちと買(か)い物(もの)に行(い)きました。", en: "I went shopping with a friend today." },
  },
  {
    id: 2,
    jp: "今日(きょう)は何時(なんじ)に起(お)きましたか？",
    en: "What time did you wake up today?",
    words: [
      { jp: "起(お)きる", en: "to wake up" },
      { jp: "朝(あさ)", en: "morning" },
      { jp: "時(じ)", en: "o'clock" },
      { jp: "眠(ねむ)い", en: "sleepy" },
      { jp: "早(はや)い", en: "early" },
      { jp: "遅(おそ)い", en: "late" },
      { jp: "元気(げんき)", en: "well" },
    ],
    example: { jp: "今日(きょう)は七時(しちじ)に起(お)きました。", en: "I woke up at seven today." },
  },
  {
    id: 3,
    jp: "今日(きょう)、何(なに)を食(た)べましたか？",
    en: "What did you eat today?",
    words: [
      { jp: "朝(あさ)ごはん", en: "breakfast" },
      { jp: "昼(ひる)ごはん", en: "lunch" },
      { jp: "晩(ばん)ごはん", en: "dinner" },
      { jp: "食(た)べる", en: "to eat" },
      { jp: "おいしい", en: "delicious" },
      { jp: "作(つく)る", en: "to make" },
      { jp: "レストラン", en: "restaurant" },
    ],
    example: { jp: "朝(あさ)ごはんはパンとコーヒーでした。", en: "I had bread and coffee for breakfast." },
  },
  {
    id: 4,
    jp: "今日(きょう)は何(なに)を飲(の)みましたか？",
    en: "What did you drink today?",
    words: [
      { jp: "水(みず)", en: "water" },
      { jp: "お茶(ちゃ)", en: "tea" },
      { jp: "コーヒー", en: "coffee" },
      { jp: "牛乳(ぎゅうにゅう)", en: "milk" },
      { jp: "飲(の)む", en: "to drink" },
      { jp: "冷(つめ)たい", en: "cold" },
      { jp: "あたたかい", en: "warm" },
    ],
    example: { jp: "今日(きょう)はお茶(ちゃ)をたくさん飲(の)みました。", en: "I drank a lot of tea today." },
  },
  {
    id: 5,
    jp: "今日(きょう)はどこへ行(い)きましたか？",
    en: "Where did you go today?",
    words: [
      { jp: "学校(がっこう)", en: "school" },
      { jp: "スーパー", en: "supermarket" },
      { jp: "公園(こうえん)", en: "park" },
      { jp: "店(みせ)", en: "shop" },
      { jp: "行(い)く", en: "to go" },
      { jp: "バス", en: "bus" },
      { jp: "歩(ある)く", en: "to walk" },
    ],
    example: { jp: "午後(ごご)、公園(こうえん)まで歩(ある)きました。", en: "I walked to the park in the afternoon." },
  },
  {
    id: 6,
    jp: "今日(きょう)は誰(だれ)と話(はな)しましたか？",
    en: "Who did you talk with today?",
    words: [
      { jp: "家族(かぞく)", en: "family" },
      { jp: "友(とも)だち", en: "friend" },
      { jp: "先生(せんせい)", en: "teacher" },
      { jp: "話(はな)す", en: "to talk" },
      { jp: "会(あ)う", en: "to meet" },
      { jp: "一緒(いっしょ)に", en: "together" },
      { jp: "電話(でんわ)", en: "phone call" },
    ],
    example: { jp: "今日(きょう)は家族(かぞく)と電話(でんわ)で話(はな)しました。", en: "I talked with my family on the phone today." },
  },
  {
    id: 7,
    jp: "今日(きょう)はどんな天気(てんき)でしたか？",
    en: "What was the weather like today?",
    words: [
      { jp: "晴(は)れ", en: "sunny" },
      { jp: "雨(あめ)", en: "rain" },
      { jp: "曇(くも)り", en: "cloudy" },
      { jp: "暑(あつ)い", en: "hot" },
      { jp: "寒(さむ)い", en: "cold" },
      { jp: "風(かぜ)", en: "wind" },
      { jp: "空(そら)", en: "sky" },
    ],
    example: { jp: "朝(あさ)は雨(あめ)でしたが、午後(ごご)は晴(は)れました。", en: "It rained in the morning, but it cleared up in the afternoon." },
  },
  {
    id: 8,
    jp: "今日(きょう)は何(なに)を勉強(べんきょう)しましたか？",
    en: "What did you study today?",
    words: [
      { jp: "日本語(にほんご)", en: "Japanese" },
      { jp: "英語(えいご)", en: "English" },
      { jp: "漢字(かんじ)", en: "kanji" },
      { jp: "文法(ぶんぽう)", en: "grammar" },
      { jp: "読(よ)む", en: "to read" },
      { jp: "書(か)く", en: "to write" },
      { jp: "勉強(べんきょう)する", en: "to study" },
    ],
    // 三(みっ)つ, not 五(いつ)つ. The reading of 五 ends in the same mora as
    // the okurigana after it, and dropEchoedOkurigana() in furigana.ts reads
    // that as the repeated-okurigana glitch it exists to repair — it deletes
    // the つ and the sentence renders as 「五覚えました」. 五 is the only
    // counter reading this happens to; 一(ひと) 二(ふた) 三(みっ) 七(なな)
    // all parse clean.
    example: { jp: "新(あたら)しい漢字(かんじ)を三(みっ)つ覚(おぼ)えました。", en: "I learned three new kanji." },
  },
  {
    id: 9,
    jp: "今日(きょう)は何(なに)を見(み)ましたか？",
    en: "What did you watch today?",
    words: [
      { jp: "テレビ", en: "TV" },
      { jp: "映画(えいが)", en: "movie" },
      { jp: "動画(どうが)", en: "video" },
      { jp: "本(ほん)", en: "book" },
      { jp: "見(み)る", en: "to watch" },
      { jp: "面白(おもしろ)い", en: "interesting" },
      { jp: "好(す)き", en: "like" },
    ],
    example: { jp: "夜(よる)、映画(えいが)を見(み)ました。", en: "I watched a movie at night." },
  },
  {
    id: 10,
    jp: "今日(きょう)はどんな音楽(おんがく)を聞(き)きましたか？",
    en: "What music did you listen to today?",
    words: [
      { jp: "音楽(おんがく)", en: "music" },
      { jp: "歌(うた)", en: "song" },
      { jp: "聞(き)く", en: "to listen" },
      { jp: "好(す)き", en: "like" },
      { jp: "新(あたら)しい", en: "new" },
      { jp: "毎日(まいにち)", en: "every day" },
      { jp: "アーティスト", en: "artist" },
    ],
    example: { jp: "仕事(しごと)のとき、静(しず)かな音楽(おんがく)を聞(き)きました。", en: "I listened to quiet music while working." },
  },
  {
    id: 11,
    jp: "今日(きょう)、一番(いちばん)楽(たの)しかったことは何(なん)ですか？",
    en: "What was the most fun thing today?",
    words: [
      { jp: "一番(いちばん)", en: "the most" },
      { jp: "楽(たの)しい", en: "fun" },
      { jp: "遊(あそ)ぶ", en: "to play" },
      { jp: "笑(わら)う", en: "to laugh" },
      { jp: "時間(じかん)", en: "time" },
      { jp: "思(おも)う", en: "to think" },
      { jp: "友(とも)だち", en: "friend" },
    ],
    example: { jp: "友(とも)だちとごはんを食(た)べたことが一番(いちばん)楽(たの)しかったです。", en: "Eating with my friend was the most fun." },
  },
  {
    id: 12,
    jp: "今日(きょう)は忙(いそが)しかったですか？",
    en: "Were you busy today?",
    words: [
      { jp: "忙(いそが)しい", en: "busy" },
      { jp: "ひま", en: "free" },
      { jp: "疲(つか)れる", en: "to get tired" },
      { jp: "少(すこ)し", en: "a little" },
      { jp: "とても", en: "very" },
      { jp: "仕事(しごと)", en: "work" },
      { jp: "勉強(べんきょう)", en: "study" },
    ],
    example: { jp: "今日(きょう)は少(すこ)し忙(いそが)しかったですが、元気(げんき)です。", en: "I was a little busy today, but I'm doing fine." },
  },
  {
    id: 13,
    jp: "今日(きょう)は何時(なんじ)に寝(ね)ますか？",
    en: "What time will you go to bed today?",
    words: [
      { jp: "寝(ね)る", en: "to sleep" },
      { jp: "夜(よる)", en: "night" },
      { jp: "時(じ)", en: "o'clock" },
      { jp: "明日(あした)", en: "tomorrow" },
      { jp: "早(はや)い", en: "early" },
      { jp: "遅(おそ)い", en: "late" },
      { jp: "眠(ねむ)い", en: "sleepy" },
    ],
    example: { jp: "今日(きょう)は早(はや)く寝(ね)たいです。", en: "I want to go to bed early today." },
  },
  {
    id: 14,
    jp: "今日(きょう)は家(いえ)で何(なに)をしましたか？",
    en: "What did you do at home today?",
    words: [
      { jp: "家(いえ)", en: "home" },
      { jp: "掃除(そうじ)", en: "cleaning" },
      { jp: "料理(りょうり)", en: "cooking" },
      { jp: "テレビ", en: "TV" },
      { jp: "本(ほん)", en: "book" },
      { jp: "パソコン", en: "computer" },
      { jp: "ゆっくり", en: "relax" },
    ],
    example: { jp: "家(いえ)で掃除(そうじ)をしてから、本(ほん)を読(よ)みました。", en: "I cleaned at home and then read a book." },
  },
  {
    id: 15,
    jp: "今日(きょう)は何(なに)を買(か)いましたか？",
    en: "What did you buy today?",
    words: [
      { jp: "買(か)う", en: "to buy" },
      { jp: "スーパー", en: "supermarket" },
      { jp: "店(みせ)", en: "shop" },
      { jp: "食(た)べ物(もの)", en: "food" },
      { jp: "飲(の)み物(もの)", en: "drink" },
      { jp: "安(やす)い", en: "cheap" },
      { jp: "高(たか)い", en: "expensive" },
    ],
    example: { jp: "スーパーで野菜(やさい)と果物(くだもの)を買(か)いました。", en: "I bought vegetables and fruit at the supermarket." },
  },
  {
    id: 16,
    jp: "今日(きょう)はどんな気分(きぶん)ですか？",
    en: "How do you feel today?",
    words: [
      { jp: "元気(げんき)", en: "well" },
      { jp: "うれしい", en: "happy" },
      { jp: "悲(かな)しい", en: "sad" },
      { jp: "疲(つか)れる", en: "to get tired" },
      { jp: "楽(たの)しい", en: "fun" },
      { jp: "少(すこ)し", en: "a little" },
      { jp: "とても", en: "very" },
    ],
    example: { jp: "今日(きょう)はとても元気(げんき)です。", en: "I feel great today." },
  },
  {
    id: 17,
    jp: "今日(きょう)は何(なに)を料理(りょうり)しましたか？",
    en: "What did you cook today?",
    words: [
      { jp: "料理(りょうり)", en: "cooking" },
      { jp: "作(つく)る", en: "to make" },
      { jp: "野菜(やさい)", en: "vegetables" },
      { jp: "肉(にく)", en: "meat" },
      { jp: "ごはん", en: "rice" },
      { jp: "簡単(かんたん)", en: "easy" },
      { jp: "おいしい", en: "delicious" },
    ],
    example: { jp: "晩(ばん)ごはんに簡単(かんたん)なパスタを作(つく)りました。", en: "I made simple pasta for dinner." },
  },
  {
    id: 18,
    jp: "今日(きょう)はどれくらい日本語(にほんご)を勉強(べんきょう)しましたか？",
    en: "How much Japanese did you study today?",
    words: [
      { jp: "日本語(にほんご)", en: "Japanese" },
      { jp: "時間(じかん)", en: "time" },
      { jp: "分(ふん)", en: "minutes" },
      { jp: "毎日(まいにち)", en: "every day" },
      { jp: "少(すこ)し", en: "a little" },
      { jp: "勉強(べんきょう)する", en: "to study" },
      { jp: "もっと", en: "more" },
    ],
    example: { jp: "今日(きょう)は三十分(さんじゅっぷん)ぐらい勉強(べんきょう)しました。", en: "I studied for about thirty minutes today." },
  },
  {
    id: 19,
    jp: "今日(きょう)はどんな服(ふく)を着(き)ましたか？",
    en: "What did you wear today?",
    words: [
      { jp: "シャツ", en: "shirt" },
      { jp: "ズボン", en: "trousers" },
      { jp: "靴(くつ)", en: "shoes" },
      { jp: "帽子(ぼうし)", en: "hat" },
      { jp: "着(き)る", en: "to wear" },
      { jp: "白(しろ)い", en: "white" },
      { jp: "黒(くろ)い", en: "black" },
    ],
    example: { jp: "寒(さむ)かったので、黒(くろ)いコートを着(き)ました。", en: "It was cold, so I wore a black coat." },
  },
  {
    id: 20,
    jp: "今日(きょう)は何時(なんじ)に家(いえ)を出(で)ましたか？",
    en: "What time did you leave home today?",
    words: [
      { jp: "家(いえ)", en: "home" },
      { jp: "出(で)る", en: "to leave" },
      { jp: "朝(あさ)", en: "morning" },
      { jp: "時(じ)", en: "o'clock" },
      { jp: "バス", en: "bus" },
      { jp: "電車(でんしゃ)", en: "train" },
      { jp: "早(はや)い", en: "early" },
    ],
    example: { jp: "八時(はちじ)に家(いえ)を出(で)て、電車(でんしゃ)に乗(の)りました。", en: "I left home at eight and took the train." },
  },
  {
    id: 21,
    jp: "今日(きょう)は何(なに)を練習(れんしゅう)しましたか？",
    en: "What did you practise today?",
    words: [
      { jp: "練習(れんしゅう)", en: "practice" },
      { jp: "話(はな)す", en: "to speak" },
      { jp: "書(か)く", en: "to write" },
      { jp: "読(よ)む", en: "to read" },
      { jp: "上手(じょうず)", en: "good at" },
      { jp: "毎日(まいにち)", en: "every day" },
      { jp: "少(すこ)し", en: "a little" },
    ],
    example: { jp: "日本語(にほんご)で自己紹介(じこしょうかい)の練習(れんしゅう)をしました。", en: "I practised introducing myself in Japanese." },
  },
  {
    id: 22,
    jp: "今日(きょう)は何(なに)が一番(いちばん)おいしかったですか？",
    en: "What was the most delicious thing today?",
    words: [
      { jp: "一番(いちばん)", en: "the most" },
      { jp: "おいしい", en: "delicious" },
      { jp: "パン", en: "bread" },
      { jp: "果物(くだもの)", en: "fruit" },
      { jp: "ごはん", en: "meal" },
      { jp: "甘(あま)い", en: "sweet" },
      { jp: "食(た)べる", en: "to eat" },
    ],
    example: { jp: "母(はは)が作(つく)ったカレーが一番(いちばん)おいしかったです。", en: "The curry my mother made was the most delicious." },
  },
  {
    id: 23,
    jp: "今日(きょう)は外(そと)で何(なに)をしましたか？",
    en: "What did you do outside today?",
    words: [
      { jp: "外(そと)", en: "outside" },
      { jp: "歩(ある)く", en: "to walk" },
      { jp: "公園(こうえん)", en: "park" },
      { jp: "買(か)い物(もの)", en: "shopping" },
      { jp: "写真(しゃしん)", en: "photo" },
      { jp: "天気(てんき)", en: "weather" },
      { jp: "行(い)く", en: "to go" },
    ],
    example: { jp: "公園(こうえん)で写真(しゃしん)をたくさん撮(と)りました。", en: "I took a lot of photos in the park." },
  },
  {
    id: 24,
    jp: "今日(きょう)は何(なに)に時間(じかん)を使(つか)いましたか？",
    en: "What did you spend most of your time on today?",
    words: [
      { jp: "時間(じかん)", en: "time" },
      { jp: "勉強(べんきょう)", en: "study" },
      { jp: "仕事(しごと)", en: "work" },
      { jp: "ゲーム", en: "game" },
      { jp: "本(ほん)を読(よ)む", en: "to read books" },
      { jp: "長(なが)い", en: "long" },
      { jp: "短(みじか)い", en: "short" },
    ],
    example: { jp: "今日(きょう)は仕事(しごと)に長(なが)い時間(じかん)を使(つか)いました。", en: "I spent a long time on work today." },
  },
  {
    id: 25,
    jp: "今日(きょう)、うれしかったことは何(なん)ですか？",
    en: "What made you happy today?",
    words: [
      { jp: "うれしい", en: "happy" },
      { jp: "友(とも)だち", en: "friend" },
      { jp: "メール", en: "email" },
      { jp: "天気(てんき)", en: "weather" },
      { jp: "できる", en: "to be able to" },
      { jp: "とても", en: "very" },
      { jp: "少(すこ)し", en: "a little" },
    ],
    example: { jp: "友(とも)だちからメールが来(き)て、うれしかったです。", en: "I was happy because I got an email from a friend." },
  },
  {
    id: 26,
    jp: "今日(きょう)、大変(たいへん)だったことは何(なん)ですか？",
    en: "What was difficult today?",
    words: [
      { jp: "大変(たいへん)", en: "tough" },
      { jp: "難(むずか)しい", en: "difficult" },
      { jp: "仕事(しごと)", en: "work" },
      { jp: "宿題(しゅくだい)", en: "homework" },
      { jp: "疲(つか)れる", en: "to get tired" },
      { jp: "時間(じかん)", en: "time" },
      { jp: "がんばる", en: "to do one's best" },
    ],
    example: { jp: "宿題(しゅくだい)が難(むずか)しくて、大変(たいへん)でした。", en: "The homework was difficult, so it was tough." },
  },
  {
    id: 27,
    jp: "今日(きょう)は新(あたら)しいことをしましたか？",
    en: "Did you do anything new today?",
    words: [
      { jp: "新(あたら)しい", en: "new" },
      { jp: "初(はじ)めて", en: "for the first time" },
      { jp: "やってみる", en: "to try" },
      { jp: "覚(おぼ)える", en: "to learn" },
      { jp: "難(むずか)しい", en: "difficult" },
      { jp: "簡単(かんたん)", en: "easy" },
      { jp: "楽(たの)しい", en: "fun" },
    ],
    example: { jp: "初(はじ)めて日本(にほん)の料理(りょうり)を作(つく)ってみました。", en: "I tried making Japanese food for the first time." },
  },
  {
    id: 28,
    jp: "明日(あした)は何(なに)をしますか？",
    en: "What will you do tomorrow?",
    words: [
      { jp: "明日(あした)", en: "tomorrow" },
      { jp: "仕事(しごと)", en: "work" },
      { jp: "休(やす)み", en: "day off" },
      { jp: "行(い)く", en: "to go" },
      { jp: "会(あ)う", en: "to meet" },
      { jp: "予定(よてい)", en: "plan" },
      { jp: "楽(たの)しみ", en: "looking forward to it" },
    ],
    example: { jp: "明日(あした)は友(とも)だちに会(あ)う予定(よてい)です。", en: "I'm planning to meet a friend tomorrow." },
  },
  {
    id: 29,
    jp: "今日(きょう)、一番(いちばん)よかったことは何(なん)ですか？",
    en: "What was the best thing about today?",
    words: [
      { jp: "一番(いちばん)", en: "the best" },
      { jp: "よかった", en: "good" },
      { jp: "家族(かぞく)", en: "family" },
      { jp: "友(とも)だち", en: "friend" },
      { jp: "幸(しあわ)せ", en: "happy" },
      { jp: "笑(わら)う", en: "to laugh" },
      { jp: "楽(たの)しい", en: "fun" },
    ],
    example: { jp: "家族(かぞく)と一緒(いっしょ)に晩(ばん)ごはんを食(た)べたことです。", en: "Eating dinner with my family." },
  },
  {
    id: 30,
    jp: "今日(きょう)はどんな日(ひ)でしたか？",
    en: "What kind of day was today?",
    words: [
      { jp: "忙(いそが)しい", en: "busy" },
      { jp: "楽(たの)しい", en: "fun" },
      { jp: "普通(ふつう)", en: "normal" },
      { jp: "特別(とくべつ)", en: "special" },
      { jp: "疲(つか)れる", en: "to get tired" },
      { jp: "のんびり", en: "relaxing" },
      { jp: "今日(きょう)", en: "today" },
    ],
    example: { jp: "今日(きょう)は普通(ふつう)の日(ひ)でしたが、のんびりできました。", en: "It was an ordinary day, but I could relax." },
  },
];

/**
 * The prompt for a given "YYYY-MM-DD" day. Same day → same prompt for every
 * user (no per-user seed), so the choice stays reproducible.
 *
 * Pass a date produced by todayInTZ(tz) — never a UTC-fixed or mount-fixed one.
 */
export function promptForDate(dateStr: string): WritingPrompt | null {
  if (WRITING_PROMPTS.length === 0) return null;
  const n = Number(dateStr.replace(/-/g, ""));
  if (!Number.isFinite(n)) return WRITING_PROMPTS[0];
  return WRITING_PROMPTS[n % WRITING_PROMPTS.length];
}

/**
 * A random prompt other than the current one, for the "another prompt" button.
 * Callers must only invoke this from an event handler / effect — never during
 * render — so server and client markup stay identical.
 */
export function randomPromptExcept(currentId: number | undefined): WritingPrompt | null {
  if (WRITING_PROMPTS.length === 0) return null;
  const pool = WRITING_PROMPTS.filter((p) => p.id !== currentId);
  if (pool.length === 0) return WRITING_PROMPTS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
