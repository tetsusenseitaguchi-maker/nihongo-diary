import type { Correction, DiaryEntry, NavItem, Template } from "./types";

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Write Diary", href: "/write", icon: "pen" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "History", href: "/history", icon: "history" },
  { label: "Feed", href: "/feed", icon: "feed" },
  { label: "My Places", href: "/places", icon: "mapPin" },
  { label: "Learn", href: "/support", icon: "template" },
  { label: "Profile", href: "/profile", icon: "profile" },
  { label: "Upgrade", href: "/upgrade", icon: "star" },
];

/** Bottom-tab navigation for mobile. */
export const mobileNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Write", href: "/write", icon: "pen" },
  { label: "History", href: "/history", icon: "history" },
  { label: "Support", href: "/support", icon: "support" },
];

/* ------------------------------------------------------------------ */
/*  Streak + progress                                                  */
/* ------------------------------------------------------------------ */

export const streak = {
  current: 12,
  longest: 28,
  daysThisMonth: 14,
  monthlyGoal: 20,
  totalEntries: 86,
};

/** Day numbers in the CURRENT month that have a saved diary. */
export const activeDays: number[] = [
  1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18,
];

/* ------------------------------------------------------------------ */
/*  Live mock correction (used on the Write page)                      */
/* ------------------------------------------------------------------ */

export const sampleDraft =
  "きょうは私は友だちと公園に行きました。天気がいいですから、たくさん歩きました。小さい犬を見ました。とてもかわいいでした。";

export const mockCorrection: Correction = {
  original: sampleDraft,
  corrected:
    "今日は友だちと公園に行きました。天気がよかったので、たくさん歩きました。小さい犬を見ました。とてもかわいかったです。",
  natural:
    "今日は友だちと公園へ行ってきました。天気がよかったので、のんびりたくさん歩きました。途中で小さい犬を見かけて、すごくかわいかったです。",
  explanation:
    "Great entry! Two things to watch. First, you wrote two topic markers in one sentence (「きょうは私は」). One is enough, so dropping 私は keeps it natural. Second, かわいい is an い-adjective, so its past tense is かわいかったです, not かわいいでした. Your sentences are clear and easy to read.",
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

/* ------------------------------------------------------------------ */
/*  Saved diary history                                                */
/* ------------------------------------------------------------------ */

export const diaryEntries: DiaryEntry[] = [
  {
    id: "d-2026-06-21",
    weather: "sunny",
    date: "2026-06-21",
    level: "N4",
    title: "公園で犬を見ました",
    preview: "今日は友だちと公園に行きました。天気がよかったので…",
    body: sampleDraft,
    correction: mockCorrection,
  },
  {
    id: "d-2026-06-20",
    weather: "cloudy",
    date: "2026-06-20",
    level: "N5",
    title: "カフェで勉強しました",
    preview: "今日はカフェで日本語を勉強しました。コーヒーを…",
    body: "今日はカフェで日本語を勉強しました。コーヒーをのみました。二時間ぐらい勉強しました。すこしつかれましたが、たのしかったです。",
    correction: {
      original:
        "今日はカフェで日本語を勉強しました。コーヒーをのみました。二時間ぐらい勉強しました。すこしつかれましたが、たのしかったです。",
      corrected:
        "今日はカフェで日本語を勉強しました。コーヒーを飲みました。二時間ぐらい勉強しました。少し疲れましたが、楽しかったです。",
      natural:
        "今日はカフェで日本語を勉強しました。コーヒーを飲みながら、二時間ほど集中できました。少し疲れたけれど、とても楽しかったです。",
      explanation:
        "Very natural writing. The main suggestion is to use kanji for words you already know (飲む, 疲れる, 少し) to make your diary easier to read back later.",
      mistakes: [
        { before: "のみました", after: "飲みました", note: "Use kanji 飲む where you can." },
        { before: "つかれました", after: "疲れました", note: "疲れる is a useful kanji to recognize." },
      ],
      vocabulary: [
        { word: "集中", reading: "しゅうちゅう", meaning: "concentration" },
        { word: "〜ながら", reading: "", meaning: "while doing ~ (two actions at once)" },
      ],
      practice: {
        jp: "音楽を聞きながら、宿題をしました。",
        en: "I did my homework while listening to music.",
      },
    },
  },
  {
    id: "d-2026-06-18",
    weather: "rainy",
    date: "2026-06-18",
    level: "N4",
    title: "雨の一日",
    preview: "今日は一日中雨でした。だから家でえいがを見ました…",
    body: "今日は一日中雨でした。だから家でえいがを見ました。日本のアニメ映画です。話がよくわかって、うれしかったです。",
    correction: {
      original:
        "今日は一日中雨でした。だから家でえいがを見ました。日本のアニメ映画です。話がよくわかって、うれしかったです。",
      corrected:
        "今日は一日中雨でした。だから、家で映画を見ました。日本のアニメ映画です。話がよくわかって、うれしかったです。",
      natural:
        "今日は一日中雨だったので、家でゆっくり映画を見ました。日本のアニメ映画で、話がほとんど分かって、とてもうれしかったです。",
      explanation:
        "Nicely connected sentences. 「だから」at the start of a sentence is fine, but combining the idea with ので makes it flow better in a diary.",
      mistakes: [
        { before: "えいが", after: "映画", note: "映画 (えいが) — a common word worth writing in kanji." },
      ],
      vocabulary: [
        { word: "一日中", reading: "いちにちじゅう", meaning: "all day long" },
        { word: "ほとんど", reading: "", meaning: "almost, mostly" },
      ],
      practice: {
        jp: "週末は一日中、本を読んでいました。",
        en: "I was reading books all day over the weekend.",
      },
    },
  },
  {
    id: "d-2026-06-16",
    weather: "sunny",
    date: "2026-06-16",
    level: "N3",
    title: "新しい仕事の準備",
    preview: "来週から新しいプロジェクトが始まるので、準備を…",
    body: "来週から新しいプロジェクトが始まるので、今日は準備をしました。資料を読んだり、計画を立てたりしました。少し緊張しますが、がんばりたいです。",
    correction: {
      original:
        "来週から新しいプロジェクトが始まるので、今日は準備をしました。資料を読んだり、計画を立てたりしました。少し緊張しますが、がんばりたいです。",
      corrected:
        "来週から新しいプロジェクトが始まるので、今日は準備をしました。資料を読んだり、計画を立てたりしました。少し緊張しますが、がんばりたいです。",
      natural:
        "来週から新しいプロジェクトが始まるので、今日はその準備をしました。資料を読んだり計画を立てたりして、少し緊張していますが、しっかりがんばりたいです。",
      explanation:
        "Excellent — this entry is already natural and well-structured. The 〜たり〜たり pattern is used perfectly. Only a tiny polish on connection.",
      mistakes: [],
      vocabulary: [
        { word: "緊張", reading: "きんちょう", meaning: "nervousness, tension" },
        { word: "計画を立てる", reading: "けいかくをたてる", meaning: "to make a plan" },
      ],
      practice: {
        jp: "旅行の前に、計画を立てたり、荷物を準備したりしました。",
        en: "Before the trip, I made plans and got my luggage ready.",
      },
    },
  },
  {
    id: "d-2026-06-15",
    weather: "sunny",
    date: "2026-06-15",
    level: "N5",
    title: "おいしい朝ごはん",
    preview: "今日の朝ごはんはパンとたまごでした。おいしかった…",
    body: "今日の朝ごはんはパンとたまごでした。とてもおいしかったです。コーヒーも飲みました。いい朝でした。",
    correction: {
      original:
        "今日の朝ごはんはパンとたまごでした。とてもおいしかったです。コーヒーも飲みました。いい朝でした。",
      corrected:
        "今日の朝ごはんはパンと卵でした。とてもおいしかったです。コーヒーも飲みました。いい朝でした。",
      natural:
        "今日の朝ごはんはパンと卵でした。とてもおいしくて、コーヒーも飲んで、気持ちのいい朝になりました。",
      explanation:
        "Short, clear, and correct — a perfect daily entry. Writing every day like this is exactly how the habit builds.",
      mistakes: [
        { before: "たまご", after: "卵", note: "卵 (たまご) is good kanji practice." },
      ],
      vocabulary: [
        { word: "気持ちいい", reading: "きもちいい", meaning: "pleasant, feels good" },
      ],
      practice: {
        jp: "今日は天気がよくて、気持ちのいい一日でした。",
        en: "The weather was nice today, and it was a pleasant day.",
      },
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

export const templates: Template[] = [
  { id: "t-day", title: "My day", description: "Walk through what you did today, morning to night.", starter: "今日(きょう)は、", category: "Daily Life", starred: true },
  { id: "t-feeling", title: "How I feel", description: "Describe your mood and one reason behind it.", starter: "今日(きょう)の気分(きぶん)は、", category: "Daily Life", starred: true },
  { id: "t-food", title: "What I ate", description: "Write about a meal — what, where, and how it tasted.", starter: "今日(きょう)のごはんは、", category: "Daily Life", starred: false },
  { id: "t-grateful", title: "One good thing", description: "Note one small thing that made today better.", starter: "今日(きょう)うれしかったことは、", category: "Daily Life", starred: true },
  { id: "t-place", title: "A place I went", description: "Describe somewhere you visited and what you saw.", starter: "今日(きょう)は、〜に行(い)きました。", category: "Travel", starred: false },
  { id: "t-trip", title: "Trip plan", description: "Say where you want to travel and why.", starter: "今度(こんど)、〜に行(い)きたいです。", category: "Travel", starred: true },
  { id: "t-class", title: "Today's lesson", description: "Reflect on what you studied today.", starter: "今日(きょう)は、〜を勉強(べんきょう)しました。", category: "School", starred: false },
  { id: "t-word", title: "A new word", description: "Introduce a word you just learned.", starter: "新(あたら)しい言葉(ことば)を覚(おぼ)えました。", category: "School", starred: true },
  { id: "t-plan", title: "Tomorrow's plan", description: "Say what you want to do tomorrow and why.", starter: "明日(あした)は、", category: "Work", starred: false },
  { id: "t-meeting", title: "At work today", description: "Describe one thing that happened at work.", starter: "今日(きょう)の仕事(しごと)で、", category: "Work", starred: false },
];

export const templateCategories: ("All" | import("./types").TemplateCategory)[] = [
  "All",
  "Daily Life",
  "Travel",
  "School",
  "Work",
];

/* ------------------------------------------------------------------ */
/*  Key ideas (Obie learning support)                                  */
/* ------------------------------------------------------------------ */

export const keyIdeas: string[] = [
  "Think in Japanese, not word-for-word English.",
  "The end of the sentence often carries the key meaning.",
  "Particles show the relationship between words.",
  "Short daily writing is better than waiting for perfect Japanese.",
];

export const obieTips: string[] = [
  "Japanese is like a train. The important part often comes at the end.",
  "Don't aim for perfect. Aim for finished — three sentences is a great day.",
  "If you don't know a word, write it in hiragana and keep going.",
  "Re-reading yesterday's correction is the fastest way to improve.",
];
