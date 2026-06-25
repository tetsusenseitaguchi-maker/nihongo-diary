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
        examples: [
          { jp: "あ・い・う・え・お", en: "The five core vowels — the building blocks of every Japanese sound." },
          { jp: "あおい（青(あお)い）", en: "Blue — uses three different vowels in a row." },
        ],
      },
      {
        text: "Consonant rows: each row adds a consonant before a vowel. The か-row = ka ki ku ke ko.",
        example: "かきくけこ、さしすせそ、たちつてと",
        examples: [
          { jp: "かきくけこ → か(ka) き(ki) く(ku) け(ke) こ(ko)", en: "The か-row. Each character = one full syllable." },
          { jp: "さしすせそ → さ(sa) し(shi) す(su) せ(se) そ(so)", en: "Notice し = 'shi', not 'si' — Japanese has a few irregular sounds." },
        ],
      },
      {
        text: "Voiced sounds: add ゛(dakuten) to get the voiced version — か→が, さ→ざ, た→だ, は→ば. Add ゜for p-sounds: は→ぱ.",
        example: "がぎぐげご、ぱぴぷぺぽ",
        examples: [
          { jp: "かく(書(か)く) → がっこう(学校(がっこう))", en: "か and が look similar but sound completely different — one tiny mark changes everything." },
          { jp: "はな(花(はな)) vs ぱな — ぱ sounds like 'pa' in 'pasta'", en: "The ゜mark creates the p-sound, which is rare in Japanese." },
        ],
      },
      {
        text: "Combination sounds (拗音): small ゃゅょ after an い-row sound creates a new syllable.",
        example: "きゃく、しゅくだい、ちょっと",
        examples: [
          { jp: "しゅくだい(宿題(しゅくだい))", en: "Homework — し + small ゅ = 'shu', one syllable not two." },
          { jp: "きょうと(京都(きょうと))", en: "Kyoto — き + small ょ = 'kyo'. Two syllables total: kyo・to." },
        ],
      },
      {
        text: "Long vowels (おかあさん) and the double consonant っ — a tiny っ means a short pause before the next consonant.",
        example: "おかあさん、きって、ざっし",
        examples: [
          { jp: "きって(切手(きって))", en: "Stamp — the tiny っ creates a short stop: ki-TTE. Without it, きて = 'please come'." },
          { jp: "おかあさん(お母(かあ)さん)", en: "Mother — the extra あ stretches the vowel. One long 'aa' sound, not two separate sounds." },
        ],
      },
    ],
    exampleJapanese: "日本語の勉強をします。",
    exampleJapaneseRuby:
      "<ruby>日本語<rt>にほんご</rt></ruby>の<ruby>勉強<rt>べんきょう</rt></ruby>をします。",
    exampleEnglish: "I study Japanese.",
    shortNote:
      "Start with the 5 vowels — they never change, and every other sound in Japanese builds on them.",
    commonMistakes: [
      {
        wrong: "は(particle) を読(よ)む「わ」と読(よ)むのを忘(わす)れる",
        right: "は as a particle is always pronounced 'wa', not 'ha'.",
        note: "The particle は looks like hiragana 'ha' but is always read 'wa' when used as a topic marker. This trips up almost every beginner.",
      },
      {
        wrong: "っ(small) と つ(big) を混(ま)ぜる — 「きつて」",
        right: "きって (切手(きって)) — small っ makes a pause, not a 'tsu' sound.",
        note: "Small っ is a pause/doubled consonant, not the syllable 'tsu'. Writing big つ changes the word entirely.",
      },
      {
        wrong: "ぬ と め、り と い を混(ま)ぜる",
        right: "ぬ = 'nu', め = 'me' — they look similar but are different characters.",
        note: "Several hiragana pairs look very alike (ぬ/め, り/い, わ/れ). Write them slowly at first and pay attention to the small curve differences.",
      },
    ],
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
        examples: [
          { jp: "ア・イ・ウ・エ・オ", en: "Same five vowel sounds as hiragana — the writing looks different, the sounds are identical." },
          { jp: "アイスクリーム(ice cream)、オレンジ(orange)", en: "Once you know the sounds, you can often guess what the foreign word is." },
        ],
      },
      {
        text: "Foreign loanwords (外来語): most words borrowed from other languages are written in katakana.",
        example: "テレビ、スマホ、パソコン",
        examples: [
          { jp: "テレビ = television、スマホ = smartphone", en: "Japanese adapts the sound, not the spelling. テレビ comes from 'tele-vi(sion)'." },
          { jp: "アメリカ(America)、フランス(France)、イギリス(England)", en: "Country names written in katakana — except Japan itself: 日本(にほん)." },
        ],
      },
      {
        text: "The long vowel mark ー stretches the previous vowel sound.",
        example: "ケーキ、スーパー、コーヒー",
        examples: [
          { jp: "コーヒー(coffee) vs コヒ — without ー it sounds clipped and wrong", en: "The ー mark is crucial. 'Ko-o-hi-i' — each ー adds one beat to the vowel before it." },
          { jp: "スーパー(supermarket)、ケーキ(cake)、ラーメン(ramen)", en: "Common everyday words — all use ー to mark stretched vowels." },
        ],
      },
      {
        text: "Special combinations for foreign sounds not in hiragana: ファ、ティ、ウィ etc.",
        example: "ファン、パーティー、ウィーク",
        examples: [
          { jp: "ファッション(fashion)、ティッシュ(tissue)", en: "ファ = 'fa', ティ = 'ti/chi' — sounds that do not exist in standard hiragana rows." },
          { jp: "ウィーク(week)、フィルム(film)", en: "These are newer additions to handle sounds from English and other languages." },
        ],
      },
      {
        text: "Also used for: emphasis (like italics), animal and plant names in science, and onomatopoeia.",
        example: "ネコ、ワンワン、ドキドキ",
        examples: [
          { jp: "ワンワン(dog bark)、ドキドキ(heartbeat/nervous)", en: "Sound effects and onomatopoeia almost always use katakana for extra impact." },
          { jp: "サクラ(cherry blossom) in a biology textbook vs 桜(さくら) in a poem", en: "Scientific plant/animal names use katakana; literary uses use kanji or hiragana." },
        ],
      },
    ],
    exampleJapanese: "コーヒーとケーキを注文しました。",
    exampleJapaneseRuby:
      "コーヒーとケーキを<ruby>注文<rt>ちゅうもん</rt></ruby>しました。",
    exampleEnglish: "I ordered coffee and cake.",
    shortNote:
      "The long vowel mark ー only appears in katakana. In hiragana, long vowels are written out in full (おかあさん).",
    commonMistakes: [
      {
        wrong: "ソ と ン、シ と ツ を混(ま)ぜる",
        right: "ソ = 'so', ン = 'n' — ン has a tiny bend; ソ is more diagonal. シ = 'shi', ツ = 'tsu'.",
        note: "These four characters look very similar and confuse almost everyone. Compare them side-by-side slowly. ン/ソ differ in stroke angle; シ/ツ differ in stroke direction.",
      },
      {
        wrong: "長音(ちょうおん)を書(か)くとき ー ではなく おお や うう を使(つか)う",
        right: "In katakana, always use ー for long vowels. ✗ コオヒイ → ✓ コーヒー",
        note: "In hiragana you write out the vowel (おかあさん), but in katakana you ALWAYS use ー. Never write the vowel letter twice in katakana.",
      },
      {
        wrong: "外来語(がいらいご)の発音(はつおん)を英語(えいご)のまま使(つか)う",
        right: "Adapt to Japanese sounds: 'McDonald's' → マクドナルド, not the English pronunciation.",
        note: "Japanese loanwords are adapted to fit Japanese sounds, not copied directly. The katakana spelling tells you the Japanese pronunciation.",
      },
    ],
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
        examples: [
          { jp: "わたしは　きのう　こうえんで　ほんを　よみました。", en: "I read a book at the park yesterday. — Topic → Time → Place → Object → Verb." },
          { jp: "いもうとは　まいあさ　がっこうで　にほんごを　べんきょうします。", en: "My little sister studies Japanese at school every morning. — Same structure, longer sentence." },
        ],
      },
      {
        text: "The verb always closes the sentence — no exceptions in standard Japanese.",
        example: "いぬが　にわで　あそんでいます。",
        examples: [
          { jp: "いぬが　にわで　あそんでいます。", en: "The dog is playing in the yard. — Verb (あそんでいます) at the very end." },
          { jp: "ともだちは　きのう　すしを　たべました。", en: "My friend ate sushi yesterday. — Always end with the verb, no matter how long the sentence gets." },
        ],
      },
      {
        text: "The subject is often dropped when it is already understood from context.",
        example: "（わたしは）がくせいです。",
        examples: [
          { jp: "（わたしは）がくせいです。", en: "I am a student. — わたしは is understood from context, so it is usually omitted." },
          { jp: "A：今日(きょう)どこに行(い)く？ B：としょかんに行(い)く。", en: "A: Where are you going today? B: To the library. — 'I' is dropped because it is obvious." },
        ],
      },
      {
        text: "Adjectives always come directly before the noun they describe.",
        example: "おいしいラーメン、きれいなはな",
        examples: [
          { jp: "おいしいラーメン、たかい山(やま)、きれいなはな", en: "Delicious ramen, tall mountain, beautiful flower — adjective always sits before the noun." },
          { jp: "これは　たのしい　えいがです。", en: "This is a fun movie. — たのしい modifies えいが directly." },
        ],
      },
      {
        text: "Add か at the end to turn any statement into a question — no word order change needed.",
        example: "いきますか？　がくせいですか？",
        examples: [
          { jp: "にほんごを　べんきょうします。→ にほんごを　べんきょうしますか？", en: "I study Japanese. → Do you study Japanese? — Just add か. Word order stays the same." },
          { jp: "これは　ほんですか？", en: "Is this a book? — In English you flip the word order; in Japanese you just add か." },
        ],
      },
    ],
    exampleJapanese: "私は昨日図書館で本を読みました。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>昨日<rt>きのう</rt></ruby><ruby>図書館<rt>としょかん</rt></ruby>で<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みました。",
    exampleEnglish: "I read a book at the library yesterday.",
    shortNote:
      "If you get lost in a long sentence, jump to the end and find the verb — that tells you what is happening.",
    commonMistakes: [
      {
        wrong: "動詞(どうし)を文(ぶん)の最後(さいご)に置(お)かない — 「わたしは食(た)べましたラーメンを。」",
        right: "わたしはラーメンを食(た)べました。— Verb always at the end.",
        note: "English speakers instinctively put the verb after the subject. In Japanese, the verb MUST be last. Rearranging even slightly will sound unnatural.",
      },
      {
        wrong: "目的語(もくてきご)を動詞(どうし)の後(あと)に置(お)く — 「食(た)べました　ラーメンを」",
        right: "ラーメンを食(た)べました。— Object before verb.",
        note: "The object (what you act on) always comes BEFORE the verb. Think: 'ramen [を] ate' not 'ate ramen'.",
      },
      {
        wrong: "疑問文(ぎもんぶん)で語順(ごじゅん)を変(か)える — 「ですか　がくせい　あなたは？」",
        right: "あなたはがくせいですか？— Word order does not change for questions.",
        note: "Unlike English, Japanese questions have the exact same word order as statements. Only か at the end marks a question.",
      },
    ],
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
        examples: [
          { jp: "ねこは　かわいいです。", en: "As for cats, they are cute. — は sets 'cats' as the topic; the rest comments on it." },
          { jp: "とうきょうは　おおきいまちです。", en: "As for Tokyo, it is a big city. — は introduces what we are talking about." },
        ],
      },
      {
        text: "Usually one は per sentence — it sets the main topic for what follows.",
        example: "わたしは　がくせいです。",
        examples: [
          { jp: "わたしは　にほんごの　がくせいです。", en: "I am a Japanese student. — は sets the topic (me), then we say what is true about me." },
          { jp: "このほんは　むずかしいです。", en: "This book is difficult. — このほん is the topic; むずかしい is the comment." },
        ],
      },
      {
        text: "は can replace が or を to bring that word into topic position.",
        example: "コーヒーは　すきです。（コーヒーが → は）",
        examples: [
          { jp: "コーヒーは　すきです。（← コーヒーが すきです）", en: "As for coffee, I like it. — は replaces が to make 'coffee' the topic of conversation." },
          { jp: "このえいがは　もうみました。（← このえいがを みました）", en: "As for this movie, I already watched it. — は replaces を to shift focus." },
        ],
      },
      {
        text: "Contrast: using は...は highlights a comparison between two things.",
        example: "さかなは　すきですが、にくは　きらいです。",
        examples: [
          { jp: "さかなは　すきですが、にくは　きらいです。", en: "I like fish, but I don't like meat. — Two は marks signal a contrast." },
          { jp: "なつは　あついですが、ふゆは　さむいです。", en: "Summer is hot, but winter is cold. — は...は pattern for comparing two topics." },
        ],
      },
      {
        text: "Once a topic is established, it can be dropped in the sentences that follow.",
        example: "わたしはがくせいです。まいにちにほんごをべんきょうしています。",
        examples: [
          { jp: "わたしはがくせいです。まいにちにほんごをべんきょうしています。", en: "I am a student. (I) study Japanese every day. — 'I' is dropped in the second sentence because it is already known." },
          { jp: "このレストランは　おいしいです。やすいし、きれいです。", en: "This restaurant is delicious. It's also cheap and clean. — The topic (this restaurant) is set once, then dropped." },
        ],
      },
    ],
    exampleJapanese: "私は毎朝コーヒーを飲みます。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>毎朝<rt>まいあさ</rt></ruby>コーヒーを<ruby>飲<rt>の</rt></ruby>みます。",
    exampleEnglish: "I drink coffee every morning.",
    shortNote:
      "は marks the topic, not necessarily the grammatical subject. The subject and topic are often different.",
    commonMistakes: [
      {
        wrong: "新(あたら)しい情報(じょうほう)に は を使(つか)う — 「だれが来(き)た？→ やまださんは来(き)た。」",
        right: "やまださんが来(き)ました。— New information uses が, not は.",
        note: "When answering 'who?' or introducing new info, use が. は assumes the topic is already known. Using は here sounds like 'as for Yamada-san...' which is evasive.",
      },
      {
        wrong: "感情(かんじょう)や能力(のうりょく)に は を使(つか)う — 「にほんごは　できます。」",
        right: "にほんごが　できます。— Feelings and abilities always use が.",
        note: "Verbs like すき, きらい, できる, わかる, ほしい always pair with が for the thing you like/can do/want. Using は changes the nuance to a contrast ('as for Japanese…').",
      },
      {
        wrong: "すべての文(ぶん)に は を入(い)れる — 「わたしはきのうはこうえんはいきました。」",
        right: "わたしはきのうこうえんにいきました。— One は per sentence is usually enough.",
        note: "Stacking multiple は in one sentence is unnatural. は sets ONE main topic. Use other particles (に, で, を) for everything else.",
      },
    ],
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
        examples: [
          { jp: "コーヒーを　のみます。", en: "I drink coffee. — コーヒー is what the drinking action lands on." },
          { jp: "にほんごを　べんきょうします。", en: "I study Japanese. — を marks Japanese as the direct object of studying." },
        ],
      },
      {
        text: "に = destination — where you are heading or arriving.",
        example: "がっこうに　いく。うちに　かえる。",
        examples: [
          { jp: "がっこうに　いきます。", en: "I go to school. — に marks the destination you are heading toward." },
          { jp: "うちに　かえります。", en: "I return home. — に pins the endpoint of movement." },
        ],
      },
      {
        text: "に = time pin — attaches the action to a specific moment.",
        example: "さんじに　おきます。にちようびに　あいます。",
        examples: [
          { jp: "しちじに　おきます。", en: "I wake up at 7 o'clock. — に attaches the action to a specific time point." },
          { jp: "どようびに　えいがをみます。", en: "I watch a movie on Saturday. — に marks specific day/time." },
        ],
      },
      {
        text: "で = stage — the location where the action takes place.",
        example: "こうえんで　あそぶ。がっこうで　べんきょうする。",
        examples: [
          { jp: "としょかんで　ほんを　よみます。", en: "I read a book at the library. — で marks where the reading happens." },
          { jp: "こうえんで　ともだちと　あそびました。", en: "I played with my friend at the park. — で = stage/venue for the action." },
        ],
      },
      {
        text: "で = tool or means — what you use to do something.",
        example: "バスで　いく。はしで　たべる。えいごで　はなす。",
        examples: [
          { jp: "でんしゃで　かいしゃに　いきます。", en: "I go to work by train. — で marks the means of transportation." },
          { jp: "にほんごで　はなしましょう。", en: "Let's speak in Japanese. — で marks the language/tool used." },
        ],
      },
    ],
    exampleJapanese: "学校で友だちとパンを食べました。",
    exampleJapaneseRuby:
      "<ruby>学校<rt>がっこう</rt></ruby>で<ruby>友<rt>とも</rt></ruby>だちとパンを<ruby>食<rt>た</rt></ruby>べました。",
    exampleEnglish: "I ate bread with a friend at school.",
    shortNote:
      "に vs で: に is where you arrive or land; で is where the action plays out. 学校に行く (go TO school) vs 学校で勉強する (study AT school).",
    commonMistakes: [
      {
        wrong: "場所(ばしょ)に で の代(か)わりに に を使(つか)う — 「がっこうに　べんきょうする。」",
        right: "がっこうで　べんきょうする。— Use で for the place an action happens.",
        note: "に marks destination (arriving somewhere). で marks where an action takes place. If you are doing something there (not just going there), use で.",
      },
      {
        wrong: "移動(いどう)に に の代(か)わりに で を使(つか)う — 「でんしゃで　いえで　かえる。」",
        right: "でんしゃで　いえに　かえる。— Use に for the destination you return/arrive at.",
        note: "Two particles in one sentence — でんしゃで (by train = means/tool) and いえに (to home = destination). Each で/に has its own job.",
      },
      {
        wrong: "特定(とくてい)の時間(じかん)に に を忘(わす)れる — 「さんじ　おきます。」",
        right: "さんじに　おきます。— Specific times need に.",
        note: "Specific clock times and days (さんじ, にちようび, ごがつ) need に. But relative time words like きのう, まいにち, いま do NOT take に.",
      },
    ],
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
        examples: [
          { jp: "にほんへ　いきたいです。", en: "I want to go to Japan. — へ feels more dreamlike/directional than the plain に." },
          { jp: "うみへ　むかいます。", en: "I head toward the sea. — へ = direction, not necessarily the final stop." },
        ],
      },
      {
        text: "から = starting point in space or time.",
        example: "くじから　べんきょうする。えきから　あるく。",
        examples: [
          { jp: "えきから　うちまで　あるきます。", en: "I walk from the station to my house. — から marks the start; まで marks the end." },
          { jp: "くじから　じゅういちじまで　べんきょうします。", en: "I study from 9 o'clock to 11 o'clock. — から and まで work together for time ranges too." },
        ],
      },
      {
        text: "から = reason (because) — used after a plain form verb or noun.",
        example: "すきだから、まいにち　れんしゅうします。",
        examples: [
          { jp: "にほんごが　すきだから、まいにち　れんしゅうします。", en: "Because I like Japanese, I practice every day. — から after plain form = reason/because." },
          { jp: "あめだから、いえに　います。", en: "Because it's raining, I'm staying home. — あめ (rain) + だ + から = 'because it's raining'." },
        ],
      },
      {
        text: "まで = ending point — 'until' or 'as far as.'",
        example: "ごじまで　はたらきます。えきまで　あるく。",
        examples: [
          { jp: "ごじまで　はたらきます。", en: "I work until 5 o'clock. — まで marks the endpoint in time." },
          { jp: "ここから　えきまで　とおいですか？", en: "Is it far from here to the station? — から〜まで = from〜to range." },
        ],
      },
      {
        text: "と = together with (people) / and (listing things). も = also / too — it swaps in for は, が, or を.",
        example: "ともだちと　えいがをみた。コーヒーも　すきです。",
        examples: [
          { jp: "ともだちと　えいがを　みました。", en: "I watched a movie with my friend. — と marks who you did something together with." },
          { jp: "わたしも　にほんごを　べんきょうしています。", en: "I also study Japanese. — も replaces は/が/を and adds 'also/too' meaning." },
        ],
      },
    ],
    exampleJapanese: "友達と駅から公園まで歩きました。",
    exampleJapaneseRuby:
      "<ruby>友達<rt>ともだち</rt></ruby>と<ruby>駅<rt>えき</rt></ruby>から<ruby>公園<rt>こうえん</rt></ruby>まで<ruby>歩<rt>ある</rt></ruby>きました。",
    exampleEnglish: "I walked with my friend from the station to the park.",
    shortNote:
      "から and まで are natural partners — 'from X to Y' = X から Y まで.",
    commonMistakes: [
      {
        wrong: "助詞(じょし)を重(かさ)ねる — 「えきからに　いきます。」",
        right: "えきから　いきます。/ えきに　いきます。— Use one particle per role.",
        note: "から and に cannot stack together. から = starting point, に = destination. Choose which role you want to express.",
      },
      {
        wrong: "から（理由(りゆう)）の後(あと)に結果(けっか)を書(か)かない — 「にほんごが　すきだから。」",
        right: "にほんごが　すきだから、まいにち　べんきょうします。— The result must follow から.",
        note: "When から means 'because', it must be followed by the result/action. Ending a sentence with だから alone sounds unfinished (used in casual speech only for trailing off).",
      },
      {
        wrong: "と と も を混(ま)ぜる — 「ともだちと　わたしも　いきました。」",
        right: "ともだちと　いきました。/ わたしも　いきました。— と and も have different jobs.",
        note: "と = with someone (who you did it with). も = 'also' (adding yourself to others who did it). They cannot stack together for the same purpose.",
      },
    ],
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
        examples: [
          { jp: "ねこは　かわいいです。", en: "As for cats, they are cute. — は sets 'cats' as something we are now talking about together." },
          { jp: "この　えいがは　おもしろかったです。", en: "As for this movie, it was interesting. — は introduces the topic of our comment." },
        ],
      },
      {
        text: "が = focus spotlight (new information, or the specific thing being identified).",
        example: "ねこが　きた！（The cat just appeared — new info.）",
        examples: [
          { jp: "あ！ねこが　きた！", en: "Oh! A cat came! — が highlights new, unexpected information entering the scene." },
          { jp: "だれが　うたいましたか？→ やまださんが　うたいました。", en: "Who sang? → Yamada-san sang. — が identifies the specific person as new information." },
        ],
      },
      {
        text: "Answers to 'who' or 'what' questions use が.",
        example: "だれが　きましたか？→ やまださんが　きました。",
        examples: [
          { jp: "だれが　にほんごを　おしえますか？→ たなかさんが　おしえます。", en: "Who teaches Japanese? → Tanaka-san teaches. — が picks out the specific answer." },
          { jp: "なにが　おいしいですか？→ ラーメンが　おいしいです。", en: "What is delicious? → Ramen is delicious. — が identifies the answer to なにが." },
        ],
      },
      {
        text: "Feelings and abilities use が: what you like, want, or can do.",
        example: "にほんごが　すきです。およぐのが　できます。",
        examples: [
          { jp: "にほんごが　すきです。", en: "I like Japanese. — が marks what is liked; it is ALWAYS が with すき/きらい." },
          { jp: "ピアノが　ひけます。", en: "I can play the piano. — が marks what you can do with できる/わかる." },
        ],
      },
      {
        text: "A sentence can have both は (topic) and が (subject) at the same time.",
        example: "わたしは　ねこが　すきです。",
        examples: [
          { jp: "わたしは　ねこが　すきです。", en: "I like cats. — は = topic (me), が = focus (cats is what I like). Both in one sentence." },
          { jp: "にほんは　ふゆが　さむいです。", en: "In Japan, winter is cold. — は = topic (Japan), が = subject (winter that is cold)." },
        ],
      },
    ],
    exampleJapanese: "私は日本語が好きです。",
    exampleJapaneseRuby:
      "<ruby>私<rt>わたし</rt></ruby>は<ruby>日本語<rt>にほんご</rt></ruby>が<ruby>好<rt>す</rt></ruby>きです。",
    exampleEnglish: "I like Japanese. (Topic: me — Focus: Japanese)",
    shortNote:
      "When someone asks だれが…? or なにが…?, the answer word takes が — it is the new, focused piece of information.",
    commonMistakes: [
      {
        wrong: "「だれが来(き)た？」の答(こた)えに は を使(つか)う — 「やまださんは来(き)ました。」",
        right: "やまださんが来(き)ました。— Answering who/what always uses が.",
        note: "は implies 'as for Yamada-san…' which sounds evasive or like a change of subject. が directly says 'Yamada-san is the one who came' — that is the correct answer pattern.",
      },
      {
        wrong: "好(す)きです・できます に は を使(つか)う — 「にほんごは　すきです。」",
        right: "にほんごが　すきです。— Feelings and abilities always use が for the thing/skill.",
        note: "すき, きらい, できる, わかる, ほしい always pair with が for the thing being liked/wanted/understood. Using は sounds like a contrast ('as for Japanese [unlike other things]…').",
      },
      {
        wrong: "新(あたら)しいものに は を使(つか)う — 「むこうに大(おお)きいたてものはあります。」",
        right: "むこうに大(おお)きいたてものがあります。— New, unexpected information uses が.",
        note: "When you are pointing out something new ('there is a…'), use が. は would imply 'that big building we were already talking about' — but it was just introduced.",
      },
    ],
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
