import type { MiniLesson } from "@/lib/types";

// FIXED curriculum order — never randomized, never reordered by the AI.
export const MINI_LESSONS: MiniLesson[] = [
  {
    id: 1,
    order: 1,
    title: "Hiragana",
    shortExplanation:
      "Hiragana is the foundation of Japanese. Every sound in the language can be written with these 46 characters.",
    visualImage:
      "Think of hiragana as the alphabet of Japanese — but instead of single letters, each character is a whole syllable (a sound like 'ka' or 'mi'). Once you know all 46, you can sound out anything written in hiragana.",
    points: [
      {
        text: "The 5 vowels: a(あ) i(い) u(う) e(え) o(お) — every syllable ends in one of these.",
        example: "あいうえお",
      },
      {
        text: "Consonant rows: each row adds a consonant before a vowel. The か-row = ka ki ku ke ko.",
        example: "かきくけこ、さしすせそ、たちつてと",
      },
      {
        text: "Voiced sounds: add ゛(dakuten) to get the voiced version — か→が, さ→ざ, た→だ, は→ば. Add ゜for p-sounds: は→ぱ.",
        example: "がぎぐげご、ぱぴぷぺぽ",
      },
      {
        text: "Combination sounds (拗音): small ゃゅょ after an い-row sound creates a new syllable.",
        example: "きゃく、しゅくだい、ちょっと",
      },
      {
        text: "Long vowels (おかあさん) and the double consonant っ — a tiny っ means a short pause before the next consonant.",
        example: "おかあさん、きって、ざっし",
      },
    ],
    exampleJapanese: "日本語の勉強をします。",
    exampleJapaneseRuby:
      "<ruby>日本語<rt>にほんご</rt></ruby>の<ruby>勉強<rt>べんきょう</rt></ruby>をします。",
    exampleEnglish: "I study Japanese.",
    shortNote:
      "Start with the 5 vowels — they never change, and every other sound in Japanese builds on them.",
  },
  {
    id: 2,
    order: 2,
    title: "Katakana",
    shortExplanation:
      "Katakana looks sharper than hiragana, but it represents the same sounds. It is mainly used for foreign words and emphasis.",
    visualImage:
      "Katakana is hiragana's straight-lined twin — same sounds, different costume. Think of it as the 'foreign word' font of Japanese. When you see blocky, angular characters, you are looking at katakana.",
    points: [
      {
        text: "Same 46 sounds as hiragana, just written with angular strokes: ア(a) イ(i) ウ(u) エ(e) オ(o).",
        example: "アイスクリーム、コーヒー",
      },
      {
        text: "Foreign loanwords (外来語): most words borrowed from other languages are written in katakana.",
        example: "テレビ、スマホ、パソコン",
      },
      {
        text: "The long vowel mark ー stretches the previous vowel sound.",
        example: "ケーキ、スーパー、コーヒー",
      },
      {
        text: "Special combinations for foreign sounds not in hiragana: ファ、ティ、ウィ etc.",
        example: "ファン、パーティー、ウィーク",
      },
      {
        text: "Also used for: emphasis (like italics), animal and plant names in science, and onomatopoeia.",
        example: "ネコ、ワンワン、ドキドキ",
      },
    ],
    exampleJapanese: "コーヒーとケーキを注文しました。",
    exampleJapaneseRuby:
      "コーヒーとケーキを<ruby>注文<rt>ちゅうもん</rt></ruby>しました。",
    exampleEnglish: "I ordered coffee and cake.",
    shortNote:
      "The long vowel mark ー only appears in katakana. In hiragana, long vowels are written out in full (おかあさん).",
  },
  {
    id: 3,
    order: 3,
    title: "Sentence Structure",
    shortExplanation:
      "Japanese sentences are built differently from English — the verb always comes at the very end.",
    visualImage:
      "A Japanese sentence is a train. The topic marker は is the station name board at the front. Time and place cars come next. The object car sits near the back. The verb is the engine at the very last position. Don't decide what the sentence means until the engine arrives.",
    points: [
      {
        text: "Basic order: Topic → Time/Place → Object → Verb. Everything builds toward the verb at the end.",
        example: "わたしは　きのう　こうえんで　ほんを　よみました。",
      },
      {
        text: "The verb always closes the sentence — no exceptions in standard Japanese.",
        example: "いぬが　にわで　あそんでいます。",
      },
      {
        text: "The subject is often dropped when it is already understood from context.",
        example: "（わたしは）がくせいです。",
      },
      {
        text: "Adjectives always come directly before the noun they describe.",
        example: "おいしいラーメン、きれいなはな",
      },
      {
        text: "Add か at the end to turn any statement into a question — no word order change needed.",
        example: "いきますか？　がくせいですか？",
      },
    ],
    exampleJapanese: "私は昨日図書館で本を読みました。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>昨日<rt>きのう</rt></ruby><ruby>図書館<rt>としょかん</rt></ruby>で<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みました。",
    exampleEnglish: "I read a book at the library yesterday.",
    shortNote:
      "If you get lost in a long sentence, jump to the end and find the verb — that tells you what is happening.",
  },
  {
    id: 4,
    order: 4,
    title: "Topic & は",
    shortExplanation:
      "The particle は (wa) sets the topic of the sentence. Everything after it says something about that topic.",
    visualImage:
      "は is a wide spotlight on a stage. Whatever は lands on becomes the topic — the 'headline' of the sentence. Imagine saying 'As for [X]...' before the rest. That is exactly what は does.",
    points: [
      {
        text: "は marks the topic: 'As for X...' — the sentence then makes a comment about X.",
        example: "ねこは　かわいいです。",
      },
      {
        text: "Usually one は per sentence — it sets the main topic for what follows.",
        example: "わたしは　がくせいです。",
      },
      {
        text: "は can replace が or を to bring that word into topic position.",
        example: "コーヒーは　すきです。（コーヒーが → は）",
      },
      {
        text: "Contrast: using は...は highlights a comparison between two things.",
        example: "さかなは　すきですが、にくは　きらいです。",
      },
      {
        text: "Once a topic is established, it can be dropped in the sentences that follow.",
        example: "わたしはがくせいです。まいにちにほんごをべんきょうしています。",
      },
    ],
    exampleJapanese: "私は毎朝コーヒーを飲みます。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>毎朝<rt>まいあさ</rt></ruby>コーヒーを<ruby>飲<rt>の</rt></ruby>みます。",
    exampleEnglish: "I drink coffee every morning.",
    shortNote:
      "は marks the topic, not necessarily the grammatical subject. The subject and topic are often different.",
  },
  {
    id: 5,
    order: 5,
    title: "Particles 1: を, に, で",
    shortExplanation:
      "Particles are small words that show how each word connects to the verb — like road signs telling each word where to go.",
    visualImage:
      "を is an arrow hitting a target: the thing the action reaches out and touches. に is a pin dropped on a map — it marks a destination or a point in time. で is a stage or spotlight — it marks where the action performs, or the tool used to do it.",
    points: [
      {
        text: "を = the target of the action — the thing the verb acts on.",
        example: "ほんを　よむ。パンを　たべる。",
      },
      {
        text: "に = destination — where you are heading or arriving.",
        example: "がっこうに　いく。うちに　かえる。",
      },
      {
        text: "に = time pin — attaches the action to a specific moment.",
        example: "さんじに　おきます。にちようびに　あいます。",
      },
      {
        text: "で = stage — the location where the action takes place.",
        example: "こうえんで　あそぶ。がっこうで　べんきょうする。",
      },
      {
        text: "で = tool or means — what you use to do something.",
        example: "バスで　いく。はしで　たべる。えいごで　はなす。",
      },
    ],
    exampleJapanese: "学校で友だちとパンを食べました。",
    exampleJapaneseRuby:
      "<ruby>学校<rt>がっこう</rt></ruby>で<ruby>友<rt>とも</rt></ruby>だちとパンを<ruby>食<rt>た</rt></ruby>べました。",
    exampleEnglish: "I ate bread with a friend at school.",
    shortNote:
      "に vs で: に is where you arrive or land; で is where the action plays out. 学校に行く (go TO school) vs 学校で勉強する (study AT school).",
  },
  {
    id: 6,
    order: 6,
    title: "Particles 2: へ, から, まで, と, も",
    shortExplanation:
      "These five particles add direction, range, company, and addition to your sentences.",
    visualImage:
      "へ is an arrow showing direction. から is a bridge with a starting point. まで is a finish line or stop sign. と is a plus-sign linking people or things together. も is a 'me too' stamp that says 'same here / also.'",
    points: [
      {
        text: "へ = heading in a direction — softer and more poetic than に.",
        example: "にほんへ　いきたい。",
      },
      {
        text: "から = starting point in space or time.",
        example: "くじから　べんきょうする。えきから　あるく。",
      },
      {
        text: "から = reason (because) — used after a plain form verb or noun.",
        example: "すきだから、まいにち　れんしゅうします。",
      },
      {
        text: "まで = ending point — 'until' or 'as far as.'",
        example: "ごじまで　はたらきます。えきまで　あるく。",
      },
      {
        text: "と = together with (people) / and (listing things). も = also / too — it swaps in for は, が, or を.",
        example: "ともだちと　えいがをみた。コーヒーも　すきです。",
      },
    ],
    exampleJapanese: "友達と駅から公園まで歩きました。",
    exampleJapaneseRuby:
      "<ruby>友達<rt>ともだち</rt></ruby>と<ruby>駅<rt>えき</rt></ruby>から<ruby>公園<rt>こうえん</rt></ruby>まで<ruby>歩<rt>ある</rt></ruby>きました。",
    exampleEnglish: "I walked with my friend from the station to the park.",
    shortNote:
      "から and まで are natural partners — 'from X to Y' = X から Y まで.",
  },
  {
    id: 7,
    order: 7,
    title: "は vs が",
    shortExplanation:
      "Both は and が can appear where the subject is, but they shine a different kind of light.",
    visualImage:
      "は is a wide, soft stage spotlight — it says 'we are talking about this topic.' が is a laser pointer — it picks out the exact thing and says 'THIS one, specifically.' New information, answers to who/what questions, and emotional statements use が.",
    points: [
      {
        text: "は = wide spotlight (topic is known or has been set up already).",
        example: "ねこは　かわいいです。",
      },
      {
        text: "が = focus spotlight (new information, or the specific thing being identified).",
        example: "ねこが　きた！（The cat just appeared — new info.）",
      },
      {
        text: "Answers to 'who' or 'what' questions use が.",
        example: "だれが　きましたか？→ やまださんが　きました。",
      },
      {
        text: "Feelings and abilities use が: what you like, want, or can do.",
        example: "にほんごが　すきです。およぐのが　できます。",
      },
      {
        text: "A sentence can have both は (topic) and が (subject) at the same time.",
        example: "わたしは　ねこが　すきです。",
      },
    ],
    exampleJapanese: "私は日本語が好きです。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>日本語<rt>にほんご</rt></ruby>が<ruby>好<rt>す</rt></ruby>きです。",
    exampleEnglish: "I like Japanese. (Topic: me — Focus: Japanese)",
    shortNote:
      "When someone asks だれが…? or なにが…?, the answer word takes が — it is the new, focused piece of information.",
  },
  {
    id: 8,
    order: 8,
    title: "Nouns & です",
    shortExplanation:
      "Japanese nouns do not change for singular, plural, or gender. Add です at the end to make a polite statement.",
    visualImage:
      "です is a polite wrapper you slip over any noun or adjective to say 'this is so' in a formal way. Think of it as gift-wrap — the noun inside does not change, but the package looks presentable for polite conversation.",
    points: [
      {
        text: "Noun + です = 'is / am / are' (polite present).",
        example: "わたしは　がくせいです。これは　ほんです。",
      },
      {
        text: "Past tense: replace です with でした.",
        example: "きのうは　にちようびでした。",
      },
      {
        text: "Negative: ではありません (formal) or じゃないです (casual).",
        example: "にほんじんでは　ありません。がくせいじゃないです。",
      },
      {
        text: "Question: add か at the end.",
        example: "がくせいですか？　せんせいですか？",
      },
      {
        text: "ですね seeks gentle agreement ('right?'). ですよ offers new information ('you know').",
        example: "いい　てんきですね！　これは　むずかしいですよ。",
      },
    ],
    exampleJapanese: "私は日本語の学生です。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>日本語<rt>にほんご</rt></ruby>の<ruby>学生<rt>がくせい</rt></ruby>です。",
    exampleEnglish: "I am a Japanese student.",
    shortNote:
      "です is always at the very end. It does not change for I / you / he / she — one form fits all.",
  },
  {
    id: 9,
    order: 9,
    title: "Adjectives: い & な",
    shortExplanation:
      "Japanese has two types of adjectives, and they behave in completely different ways.",
    visualImage:
      "い-adjectives are shape-shifters — they change their own ending (おおきい → おおきかった). な-adjectives are sticky notes — they stay exactly the same but need to borrow な to stick onto a noun (きれいな).",
    points: [
      {
        text: "い-adjectives end in い and modify a noun directly — no extra word needed.",
        example: "おいしいラーメン、たかいやま",
      },
      {
        text: "な-adjectives need な before a noun.",
        example: "しずかなとしょかん、きれいなはな",
      },
      {
        text: "い-adjective past: drop い, add かった.",
        example: "おいしかったです。たのしかった！",
      },
      {
        text: "い-adjective negative: drop い, add くない.",
        example: "たかくないです。むずかしくない。",
      },
      {
        text: "な-adjective past: + でした. Negative: + じゃないです.",
        example: "しずかでした。きれいじゃないです。",
      },
    ],
    exampleJapanese: "この映画はとても面白かったです。",
    exampleJapaneseRuby:
      "この<ruby>映画<rt>えいが</rt></ruby>はとても<ruby>面白<rt>おもしろ</rt></ruby>かったです。",
    exampleEnglish: "This movie was very interesting.",
    shortNote:
      "い-adjectives NEVER use でした for past tense. The #1 mistake: ✗ たのしいでした → ✓ たのしかったです.",
  },
  {
    id: 10,
    order: 10,
    title: "Verb Types: Ichidan & Godan",
    shortExplanation:
      "Japanese verbs fall into two main groups, and the group a verb belongs to determines how it changes in every conjugation.",
    visualImage:
      "Ichidan verbs are simple one-gear engines — you just remove る. Godan verbs are five-gear gearboxes — the final sound shifts through five rows (that is the 'godan'). Which engine you have decides every conjugation you will ever make.",
    points: [
      {
        text: "Ichidan (一段 / る-verbs): remove る to get the stem, which never changes.",
        example: "食(た)べる→食(た)べ…、見(み)る→見(み)…",
      },
      {
        text: "Godan (五段 / う-verbs): the final u-row sound shifts when conjugating.",
        example: "書(か)く、話(はな)す、読(よ)む、飲(の)む、帰(かえ)る",
      },
      {
        text: "The る-trap: some Godan verbs look like Ichidan because they end in る. Check the vowel before る.",
        example: "帰(かえ)る、走(はし)る、切(き)る — all Godan, not Ichidan.",
      },
      {
        text: "Irregular verbs (just two): する (do) and くる (come). Memorise these as exceptions.",
        example: "する→します、くる→きます",
      },
      {
        text: "The group decides ALL conjugations — ます form, ない form, て-form, た-form.",
        example: "食(た)べる(Ichidan) → 食(た)べます vs 読(よ)む(Godan) → 読(よ)みます",
      },
    ],
    exampleJapanese: "毎日日本語を読んで、書いています。",
    exampleJapaneseRuby:
      "<ruby>毎日<rt>まいにち</rt></ruby><ruby>日本語<rt>にほんご</rt></ruby>を<ruby>読<rt>よ</rt></ruby>んで、<ruby>書<rt>か</rt></ruby>いています。",
    exampleEnglish: "I read and write Japanese every day.",
    shortNote:
      "When you learn a new verb, note its group right away. It changes everything about how that verb conjugates.",
  },
  {
    id: 11,
    order: 11,
    title: "ます Form (Polite Verbs)",
    shortExplanation:
      "The ます form is the polite mode of any verb. It is the standard form for speaking to teachers, coworkers, or people you do not know well.",
    visualImage:
      "ます is like a dress shirt you slip onto the verb. The same action, but now it is polite and presentable. Every verb in the dictionary gets this same shirt — just put on differently depending on whether it is Ichidan or Godan.",
    points: [
      {
        text: "Ichidan: remove る, add ます.",
        example: "食(た)べる→食(た)べます、見(み)る→見(み)ます",
      },
      {
        text: "Godan: shift the final sound to its い-row version, then add ます.",
        example: "書(か)く→書(か)きます、読(よ)む→読(よ)みます、行(い)く→行(い)きます",
      },
      {
        text: "Four essential forms: ます (present/future) / ました (past) / ません (negative) / ませんでした (past negative).",
        example: "飲(の)みます、飲(の)みました、飲(の)みません、飲(の)みませんでした",
      },
      {
        text: "ましょう = 'Let's …' — a cheerful invitation to do something together.",
        example: "いっしょに食(た)べましょう！べんきょうしましょう。",
      },
      {
        text: "Irregular two: する→します、くる→きます.",
        example: "べんきょうします。がっこうにきます。",
      },
    ],
    exampleJapanese: "毎朝６時に起きます。",
    exampleJapaneseRuby:
      "<ruby>毎朝<rt>まいあさ</rt></ruby>６<ruby>時<rt>じ</rt></ruby>に<ruby>起<rt>お</rt></ruby>きます。",
    exampleEnglish: "I wake up at 6 every morning.",
    shortNote:
      "When in doubt, use ます. It is always polite and correct in most everyday situations.",
  },
  {
    id: 12,
    order: 12,
    title: "Dictionary & ない Form",
    shortExplanation:
      "The dictionary form is the plain base of a verb. The ない form is how you make it negative. Both are essential for casual speech and grammar patterns.",
    visualImage:
      "The dictionary form is the verb standing in its resting state — ready to work but not yet dressed up. The ない form is the same verb with a 'NOT' stamp on it. Godan verbs shift to the あ-row before ない; Ichidan verbs just drop る.",
    points: [
      {
        text: "Dictionary form: Ichidan verbs end in る, Godan verbs end in an う-row sound.",
        example: "食(た)べる（Ichidan）、飲(の)む、書(か)く、行(い)く（Godan）",
      },
      {
        text: "Ichidan negative: drop る, add ない.",
        example: "食(た)べる→食(た)べない、見(み)る→見(み)ない",
      },
      {
        text: "Godan negative: shift the final sound to the あ-row, then add ない.",
        example: "飲(の)む→飲(の)まない、書(か)く→書(か)かない、行(い)く→行(い)かない",
      },
      {
        text: "Irregular negatives: する→しない、くる→こない. And: ある→ない (not あらない).",
        example: "べんきょうしない。きょうはこない。おかねがない。",
      },
      {
        text: "The plain form appears before patterns like と思(おも)う (I think…) and かもしれない (maybe).",
        example: "いくかもしれない。おいしいと思(おも)う。",
      },
    ],
    exampleJapanese: "今日は学校に行かない。",
    exampleJapaneseRuby:
      "<ruby>今日<rt>きょう</rt></ruby>は<ruby>学校<rt>がっこう</rt></ruby>に<ruby>行<rt>い</rt></ruby>かない。",
    exampleEnglish: "I'm not going to school today.",
    shortNote:
      "Godan negatives shift to the あ-row — not the い-row. Common mistake: ✗ いきない → ✓ いかない.",
  },
  {
    id: 13,
    order: 13,
    title: "Past Form",
    shortExplanation:
      "Past tense marks a completed action or a past state. Japanese changes the verb or adjective ending — there is no separate word like 'did' or 'was.'",
    visualImage:
      "Past tense is like stamping a calendar day 'DONE.' Verbs get ました (polite) or た (plain). い-adjectives swap the last い for かった. Nouns and な-adjectives get でした. Three stamps, one rule for each type.",
    points: [
      {
        text: "Verbs (polite past): ます → ました.",
        example: "食(た)べます→食(た)べました、行(い)きます→行(い)きました",
      },
      {
        text: "Verbs (plain past): make the て-form, then change て→た, で→だ.",
        example: "食(た)べた、飲(の)んだ、行(い)った、した",
      },
      {
        text: "い-adjectives past: drop い, add かった.",
        example: "たのしい→たのしかった、おいしい→おいしかった",
      },
      {
        text: "な-adjectives and nouns past: add でした.",
        example: "しずかでした、がくせいでした",
      },
      {
        text: "The most common mistake: putting い-adjectives with でした.",
        example: "✗ たのしいでした → ✓ たのしかったです",
      },
    ],
    exampleJapanese: "昨日は友達と映画を見ました。",
    exampleJapaneseRuby:
      "<ruby>昨日<rt>きのう</rt></ruby>は<ruby>友達<rt>ともだち</rt></ruby>と<ruby>映画<rt>えいが</rt></ruby>を<ruby>見<rt>み</rt></ruby>ました。",
    exampleEnglish: "Yesterday I watched a movie with my friend.",
    shortNote:
      "い-adjectives have their own built-in past tense (かった). Never pair them with でした.",
  },
  {
    id: 14,
    order: 14,
    title: "Te-form: How to Make It",
    shortExplanation:
      "The て-form is one of the most important verb forms in Japanese. It connects actions, makes requests, and is the building block for dozens of grammar patterns.",
    visualImage:
      "Making the て-form is learning one master key that opens many doors. Ichidan is easy — just swap る for て. Godan verbs follow sound-change patterns. Think of them as music: the sound shifts according to which group the verb belongs to.",
    points: [
      {
        text: "Ichidan: drop る, add て.",
        example: "食(た)べる→食(た)べて、見(み)る→見(み)て、起(お)きる→起(お)きて",
      },
      {
        text: "Godan く/ぐ → いて/いで (voiced g softens the ending to いで).",
        example: "書(か)く→書(か)いて、泳(およ)ぐ→泳(およ)いで",
      },
      {
        text: "Godan す → して.",
        example: "話(はな)す→話(はな)して、貸(か)す→貸(か)して",
      },
      {
        text: "Godan ぬ/ぶ/む → んで.",
        example: "飲(の)む→飲(の)んで、遊(あそ)ぶ→遊(あそ)んで、死(し)ぬ→死(し)んで",
      },
      {
        text: "Godan る/う/つ → って. Irregular: する→して、くる→きて. Exception: 行(い)く→行(い)って (not 行(い)いて).",
        example: "帰(かえ)る→帰(かえ)って、買(か)う→買(か)って、待(ま)つ→待(ま)って",
      },
    ],
    exampleJapanese: "手を洗ってから、食べてください。",
    exampleJapaneseRuby:
      "<ruby>手<rt>て</rt></ruby>を<ruby>洗<rt>あら</rt></ruby>ってから、<ruby>食<rt>た</rt></ruby>べてください。",
    exampleEnglish: "Please wash your hands before eating.",
    shortNote:
      "行く is the one exception: its て-form is 行って, not 行いて. Remember it on its own.",
  },
  {
    id: 15,
    order: 15,
    title: "Te-form Uses",
    shortExplanation:
      "Once you can make the て-form, it opens up a huge range of natural Japanese — from requests to permissions to sequences.",
    visualImage:
      "The て-form is super-glue. It sticks actions together (A て B = first A, then B), and it sticks to helper words to create new meanings (てください, てもいい, etc.). The more patterns you know, the more glue you have.",
    points: [
      {
        text: "てください = please do ~ (polite request).",
        example: "ここに名前(なまえ)を書(か)いてください。",
      },
      {
        text: "てもいいですか = may I? / is it okay to do ~?",
        example: "写真(しゃしん)を撮(と)ってもいいですか？",
      },
      {
        text: "てはいけない = must not / prohibited.",
        example: "ここでたばこを吸(す)ってはいけません。",
      },
      {
        text: "てから = after finishing ~ completely, then do the next thing.",
        example: "ごはんを食(た)べてから、さんぽします。",
      },
      {
        text: "Chaining actions: A て B て C = do A, then B, then C in sequence.",
        example: "起(お)きて、シャワーをあびて、がっこうにいきました。",
      },
    ],
    exampleJapanese: "宿題をしてから、ゲームをしてもいいです。",
    exampleJapaneseRuby:
      "<ruby>宿題<rt>しゅくだい</rt></ruby>をしてから、ゲームをしてもいいです。",
    exampleEnglish: "After doing your homework, you may play games.",
    shortNote:
      "てから means 'after finishing X completely.' It is different from just て, which links two actions in sequence without stressing completion.",
  },
  {
    id: 16,
    order: 16,
    title: "〜ている & 〜てある",
    shortExplanation:
      "Attach ている to show an ongoing action or a resulting state. てある shows that something has been set up or prepared by someone.",
    visualImage:
      "ている is a movie playing right now (action in progress) — or a freeze-frame of what happened (resulting state). てある is a stage that has already been set by someone: 'it was done, and the result is here for a reason.' It shifts focus from the actor to the situation.",
    points: [
      {
        text: "ている (ongoing action): actively doing right now.",
        example: "おんがくを聞(き)いています。ごはんを食(た)べています。",
      },
      {
        text: "ている (resulting state): the action is done, but the result is still here.",
        example: "まどが開(あ)いています。（The window is open — result of opening.）",
      },
      {
        text: "てある (prepared state): someone intentionally did it, and the result is here for a purpose.",
        example: "まどが開(あ)けてあります。（The window has been opened — by someone.）",
      },
      {
        text: "ている focuses on the subject / who is acting. てある focuses on the situation.",
        example: "でんきがついている（describing the light） vs でんきをつけてある（someone prepared it）",
      },
      {
        text: "Common ている 'state' verbs: 結婚(けっこん)している (married)、知(し)っている (know)、住(す)んでいる (live in).",
        example: "とうきょうに住(す)んでいます。",
      },
    ],
    exampleJapanese: "テーブルの上にお茶が置いてあります。",
    exampleJapaneseRuby:
      "テーブルの<ruby>上<rt>うえ</rt></ruby>にお<ruby>茶<rt>ちゃ</rt></ruby>が<ruby>置<rt>お</rt></ruby>いてあります。",
    exampleEnglish: "Tea has been placed on the table (someone prepared it).",
    shortNote:
      "ている asks 'who is doing / what is happening?' てある asks 'what has been set up?' Both describe present states but from different angles.",
  },
  {
    id: 17,
    order: 17,
    title: "〜てみる / 〜ておく / 〜てしまう",
    shortExplanation:
      "These three て-form helpers each add a different attitude — trying, preparing in advance, or completing (sometimes with regret).",
    visualImage:
      "てみる = dipping a toe in the water to test it. ておく = setting an umbrella by the door before it rains. てしまう = the cookie jar is empty — it is done, for better or worse.",
    points: [
      {
        text: "てみる = try doing something to see what happens — an experiment.",
        example: "このお菓子(かし)を食(た)べてみてください。",
      },
      {
        text: "ておく = do something in advance and leave it ready for later.",
        example: "よやくしておきます。（I'll make a reservation in advance.）",
      },
      {
        text: "てしまう = finish completely. With regret: 'I went and did it...'",
        example: "ケーキをぜんぶ食(た)べてしまった…",
      },
      {
        text: "てしまう also shows something unintended happened.",
        example: "でんしゃに　のりおくれてしまった。（I accidentally missed the train.）",
      },
      {
        text: "Casual spoken forms: てしまう → ちゃう (after た/て sounds) or じゃう (after で sounds).",
        example: "食(た)べちゃった！飲(の)んじゃった！",
      },
    ],
    exampleJapanese: "旅行の前に荷物をまとめておきました。",
    exampleJapaneseRuby:
      "<ruby>旅行<rt>りょこう</rt></ruby>の<ruby>前<rt>まえ</rt></ruby>に<ruby>荷物<rt>にもつ</rt></ruby>をまとめておきました。",
    exampleEnglish: "I packed my luggage in advance before the trip.",
    shortNote:
      "てみる = testing. ておく = preparing. てしまう = completing (sometimes regretfully). Context decides which feeling is strongest.",
  },
  {
    id: 18,
    order: 18,
    title: "〜てくる & 〜ていく",
    shortExplanation:
      "Combine the て-form with くる or いく to show the direction of an action or change — toward the speaker, or away from the speaker.",
    visualImage:
      "てくる is something approaching from the horizon toward you — 'it came this way.' ていく is something moving away from you toward the distance — 'it is going that way.' Both work for physical movement and for abstract changes over time.",
    points: [
      {
        text: "てくる = movement or change that comes toward the speaker or the present moment.",
        example: "あめが降(ふ)ってきた。（It has started raining — coming toward now.）",
      },
      {
        text: "ていく = movement or change that goes away from the speaker or into the future.",
        example: "だんだんさむくなっていく。（Getting colder — moving forward.）",
      },
      {
        text: "Physical movement with てくる: go, do something, then come back.",
        example: "かいものしてきます。（I'll go shopping and be back.）",
      },
      {
        text: "Physical movement with ていく: go somewhere and continue away.",
        example: "あるいていった。（Walked away.）",
      },
      {
        text: "Abstract change: 増(ふ)えてきた = has been increasing up to now. 増(ふ)えていく = will keep increasing.",
        example: "にほんごが上手(じょうず)になってきました！",
      },
    ],
    exampleJapanese: "だんだん日本語が上手になってきました。",
    exampleJapaneseRuby:
      "だんだん<ruby>日本語<rt>にほんご</rt></ruby>が<ruby>上手<rt>じょうず</rt></ruby>になってきました。",
    exampleEnglish: "My Japanese has been gradually getting better.",
    shortNote:
      "てくる = 'up to now' (looking back). ていく = 'from now on' (looking forward). They are often paired to describe a full arc of change.",
  },
  {
    id: 19,
    order: 19,
    title: "Reasons: から & ので",
    shortExplanation:
      "Both から and ので mean 'because,' but から is more direct and assertive, while ので sounds softer and more polite.",
    visualImage:
      "から is a sturdy, direct bridge: 'because of this, therefore that.' ので is a suspension bridge — the same connection, but it sways gently. ので sounds more objective and explanatory, like you are offering evidence rather than asserting a cause.",
    points: [
      {
        text: "から = direct, assertive reason. Natural in casual speech.",
        example: "つかれたから、もうねます。",
      },
      {
        text: "ので = soft, polite reason. Preferred in formal writing and when making requests.",
        example: "からだの調子(ちょうし)が悪(わる)いので、きょうはやすみます。",
      },
      {
        text: "Both follow the plain form of verbs and い-adjectives.",
        example: "あめがふるから / あめがふるので",
      },
      {
        text: "な-adjectives and nouns: use なので (not ですので in the middle of a sentence).",
        example: "しずかなので、よくねむれます。がくせいなので、わりびきがあります。",
      },
      {
        text: "Casual から can stand alone at the end of a sentence as a full explanation.",
        example: "いそがしいから。（That's why. / Because I'm busy.）",
      },
    ],
    exampleJapanese: "明日テストがあるので、今日は早く寝ます。",
    exampleJapaneseRuby:
      "<ruby>明日<rt>あした</rt></ruby>テストがあるので、<ruby>今日<rt>きょう</rt></ruby>は<ruby>早<rt>はや</rt></ruby>く<ruby>寝<rt>ね</rt></ruby>ます。",
    exampleEnglish: "I'll go to bed early tonight because I have a test tomorrow.",
    shortNote:
      "ので sounds more objective — it is the safer choice in formal situations or when making a polite request.",
  },
  {
    id: 20,
    order: 20,
    title: "Wants & Invitations",
    shortExplanation:
      "These everyday patterns let you say what you want to do, invite someone to join you, and make polite requests.",
    visualImage:
      "たい is a magnet pulling you toward something you desire. ましょう is an open hand inviting someone to join in. ませんか is a gentle knock on a door: 'Would you like to...?' ください is a hand reaching out and asking.",
    points: [
      {
        text: "〜たい = want to do ~ . Attach to the ます-stem (the verb before ます).",
        example: "にほんにいきたいです。ラーメンを食(た)べたい。",
      },
      {
        text: "たい conjugates like an い-adjective: たくない (don't want to), たかった (wanted to).",
        example: "もっと食(た)べたかった…　いきたくない。",
      },
      {
        text: "ましょう = 'Let's …' — a cheerful shared suggestion.",
        example: "いっしょにべんきょうしましょう！",
      },
      {
        text: "ませんか = 'Would you like to…?' — a polite, gentle invitation.",
        example: "おちゃを飲(の)みませんか？",
      },
      {
        text: "〜てください = 'Please do …' — a polite request using the て-form.",
        example: "もういちどいってください。ここにすわってください。",
      },
    ],
    exampleJapanese: "今度いっしょに日本料理を食べに行きませんか？",
    exampleJapaneseRuby:
      "<ruby>今度<rt>こんど</rt></ruby>いっしょに<ruby>日本料理<rt>にほんりょうり</rt></ruby>を<ruby>食<rt>た</rt></ruby>べに<ruby>行<rt>い</rt></ruby>きませんか？",
    exampleEnglish: "Would you like to go eat Japanese food together next time?",
    shortNote:
      "たい is about your own desire. ましょう and ませんか are about doing something together. Use ませんか when you want to sound especially warm and non-pushy.",
  },
];

export function lessonById(id: number | undefined | null): MiniLesson | null {
  if (!id) return null;
  return MINI_LESSONS.find((l) => l.id === id) ?? null;
}
