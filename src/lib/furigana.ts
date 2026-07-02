// Shared furigana utilities — used in CorrectionResult and the vocabulary page.

const ONLY_KANJI = /^[一-鿿々〆ヶ]+$/;

/**
 * Builds ruby notation from a kanji headword and its hiragana reading.
 * Handles okurigana correctly by comparing trailing characters.
 *
 * Pure-kanji base → （）notation (handled by Furigana's simple path).
 * Mixed kanji+kana (e.g. 待ち遠) → <ruby> HTML directly, because
 * the （）regex only matches contiguous-kanji runs.
 */
export function buildRubyNotation(word: string, reading: string): string {
  const wc = [...word];
  const rc = [...reading];
  let okuLen = 0;
  while (
    okuLen < wc.length &&
    okuLen < rc.length &&
    wc[wc.length - 1 - okuLen] === rc[rc.length - 1 - okuLen]
  ) okuLen++;
  const kanjiBase = wc.slice(0, wc.length - okuLen).join("");
  const okurigana = okuLen > 0 ? wc.slice(-okuLen).join("") : "";
  const kanjiReading = okuLen > 0 ? rc.slice(0, -okuLen).join("") : reading;
  if (!kanjiBase || !kanjiReading) return word;
  if (ONLY_KANJI.test(kanjiBase)) {
    return `${kanjiBase}（${kanjiReading}）${okurigana}`;
  }
  return `<ruby>${kanjiBase}<rt>${kanjiReading}</rt></ruby>${okurigana}`;
}

/**
 * Returns the display string for a vocabulary headword.
 *
 * Priority:
 *  1. word + reading (preferred) → buildRubyNotation
 *  2. Already contains <ruby> or （）markup → pass through unchanged
 *  3. Old concatenated "公園こうえん" (2+ leading kanji) → wrap in （）
 */
export function vocabWordText(word: string, reading?: string): string {
  if (!word) return "";
  if (reading) return buildRubyNotation(word, reading);
  if (word.includes("<ruby>") || word.includes("（") || word.includes("(")) return word;
  const m = word.match(/^([一-鿿々〆ヶ]{2,})([ぁ-ゖ]+)$/u);
  if (m) return `${m[1]}（${m[2]}）`;
  return word;
}

/* ── AI ruby-HTML parsing / recovery ──────────────────────────────────────
   Shared by <Furigana> (renders to React) and normalizeRubyText (rebuilds a
   clean string before AI output is saved to the DB). Recovers three known
   GPT formatting glitches instead of showing garbled/duplicated text:
    1. <ruby>BASE</rt></ruby> — missing <rt> open tag.
    2. Duplicate/fragment kanji before a <ruby> tag
       (今日<ruby>日<rt>きょう</rt></ruby>, 昨日<ruby>昨<rt>きの</rt></ruby>).
    3. Leftover fragment trailing right after </ruby> from a 3-way split
       (昨日<ruby>昨<rt>きの</rt></ruby>日).
   Both consumers must stay in sync with this parser — fix bugs here once,
   not separately in each caller. */

const RUBY_HAS_KANJI = /[一-鿿々〆ヶ]/;
const RUBY_KANJI_PLUS_READING = /^([一-鿿々〆ヶ]+)([ぁ-ん]+)$/;

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

export type RubySegment =
  | { type: "ruby"; base: string; rt: string }
  | { type: "text"; value: string };

export function parseRubySegments(text: string): RubySegment[] {
  if (!text) return [];

  // Strip/merge kanji that immediately precede their own <ruby> tag.
  const processed = text.replace(
    /([一-鿿々〆ヶ]+)<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>([一-鿿々〆ヶ]*)/g,
    (
      match,
      preKanji: string,
      rubyBase: string,
      reading: string,
      trailing: string,
    ) => {
      if (rubyBase.startsWith(preKanji)) {
        return `<ruby>${rubyBase}<rt>${reading}</rt></ruby>${trailing}`;
      }
      if (preKanji !== rubyBase && preKanji.startsWith(rubyBase)) {
        const missing = preKanji.slice(rubyBase.length);
        const newTrailing =
          missing && trailing.startsWith(missing) ? trailing.slice(missing.length) : trailing;
        return `<ruby>${preKanji}<rt>${reading}</rt></ruby>${newTrailing}`;
      }
      if (preKanji !== rubyBase && preKanji.endsWith(rubyBase)) {
        return `<ruby>${preKanji}<rt>${reading}</rt></ruby>${trailing}`;
      }
      return match;
    },
  );

  // [^<] (not [\s\S]) keeps a malformed <ruby> from lazily matching across
  // into the NEXT tag's <rt>...</rt></ruby>, which would garble both words.
  const TOKEN =
    /<ruby>([^<]*?)<rt>([^<]*?)<\/rt><\/ruby>|<ruby>([^<]*?)<\/rt><\/ruby>|([一-鿿々〆ヶ]+)[（(]([ぁ-んァ-ヶーゝゞ]+)[）)]/g;

  const segments: RubySegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(processed)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: stripHtmlTags(processed.slice(last, m.index)) });
    }

    let base: string;
    let rt: string;
    if (m[1] !== undefined) {
      base = stripHtmlTags(m[1]);
      rt = stripHtmlTags(m[2]);
    } else if (m[3] !== undefined) {
      const stripped = stripHtmlTags(m[3]);
      const split = stripped.match(RUBY_KANJI_PLUS_READING);
      base = split ? split[1] : stripped;
      rt = split ? split[2] : "";
    } else {
      base = stripHtmlTags(m[4]);
      rt = stripHtmlTags(m[5]);
    }

    if (!RUBY_HAS_KANJI.test(base) || rt === base || !rt) {
      segments.push({ type: "text", value: base });
    } else {
      segments.push({ type: "ruby", base, rt });
    }
    last = m.index + m[0].length;
  }
  if (last < processed.length) {
    segments.push({ type: "text", value: stripHtmlTags(processed.slice(last)) });
  }

  return segments;
}

/* ── Fixed-reading dictionary (熟字訓 / irregular compound readings) ──────
   GPT sometimes gets these wrong even when the prompt explicitly states the
   correct reading (e.g. 今日=きょう is spelled out in the prompt, yet the
   model has produced にち). Rather than rely solely on prompt-following,
   force these specific words to their correct reading at save time.
   Only 2+ character entries — single-kanji headwords (e.g. 十) have too many
   context-dependent readings (十時=じゅうじ vs 十=とお) to safely force. */
const READING_DICTIONARY_RAW: [string, string][] = [
  ["今日", "きょう"], ["昨日", "きのう"], ["明日", "あした"], ["明後日", "あさって"],
  ["一昨日", "おととい"], ["一昨昨日", "さきおととい"], ["今朝", "けさ"], ["今晩", "こんばん"],
  ["今夜", "こんや"], ["今年", "ことし"], ["去年", "きょねん"], ["一昨年", "おととし"],
  ["来年", "らいねん"], ["再来年", "さらいねん"], ["毎日", "まいにち"], ["一日中", "いちにちじゅう"],
  ["今日中", "きょうじゅう"], ["何時", "なんじ"], ["時計", "とけい"], ["時雨", "しぐれ"],
  ["梅雨", "つゆ"], ["五月雨", "さみだれ"], ["七夕", "たなばた"],
  ["二日", "ふつか"], ["三日", "みっか"], ["四日", "よっか"], ["五日", "いつか"],
  ["六日", "むいか"], ["七日", "なのか"], ["八日", "ようか"], ["九日", "ここのか"],
  ["十日", "とおか"], ["十四日", "じゅうよっか"], ["二十日", "はつか"], ["二十四日", "にじゅうよっか"],
  ["一つ", "ひとつ"], ["二つ", "ふたつ"], ["三つ", "みっつ"], ["四つ", "よっつ"],
  ["五つ", "いつつ"], ["六つ", "むっつ"], ["七つ", "ななつ"], ["八つ", "やっつ"],
  ["九つ", "ここのつ"], ["一人", "ひとり"], ["二人", "ふたり"], ["三人", "さんにん"],
  ["四人", "よにん"], ["七人", "ななにん"], ["十人", "じゅうにん"], ["二十歳", "はたち"],
  ["一言", "ひとこと"], ["一目", "ひとめ"], ["一晩", "ひとばん"], ["一休み", "ひとやすみ"],
  ["一安心", "ひとあんしん"], ["一息", "ひといき"], ["一通り", "ひととおり"], ["大人", "おとな"],
  ["子供", "こども"], ["友達", "ともだち"], ["仲人", "なこうど"], ["玄人", "くろうと"],
  ["素人", "しろうと"], ["若人", "わこうど"], ["乙女", "おとめ"], ["叔父", "おじ"],
  ["伯父", "おじ"], ["叔母", "おば"], ["伯母", "おば"], ["兄弟", "きょうだい"],
  ["姉妹", "しまい"], ["夫婦", "ふうふ"], ["親子", "おやこ"], ["迷子", "まいご"],
  ["お巡りさん", "おまわりさん"], ["坊主", "ぼうず"], ["赤ちゃん", "あかちゃん"], ["母屋", "おもや"],
  ["眼鏡", "めがね"], ["土産", "みやげ"], ["お土産", "おみやげ"], ["上手", "じょうず"],
  ["下手", "へた"], ["真面目", "まじめ"], ["大丈夫", "だいじょうぶ"], ["可愛い", "かわいい"],
  ["綺麗", "きれい"], ["素敵", "すてき"], ["面白い", "おもしろい"], ["可笑しい", "おかしい"],
  ["嬉しい", "うれしい"], ["美味しい", "おいしい"], ["不味い", "まずい"], ["大好き", "だいすき"],
  ["大嫌い", "だいきらい"], ["苦手", "にがて"], ["得意", "とくい"], ["気持ち", "きもち"],
  ["心地", "ここち"], ["居心地", "いごこち"], ["本当", "ほんとう"], ["本気", "ほんき"],
  ["本音", "ほんね"], ["建前", "たてまえ"], ["出来る", "できる"], ["出来事", "できごと"],
  ["お手伝い", "おてつだい"], ["手伝い", "てつだい"], ["手紙", "てがみ"], ["荷物", "にもつ"],
  ["部屋", "へや"], ["風邪", "かぜ"], ["怪我", "けが"], ["煙草", "たばこ"],
  ["台詞", "せりふ"], ["欠伸", "あくび"], ["田舎", "いなか"], ["故郷", "ふるさと"],
  ["景色", "けしき"], ["土地", "とち"], ["市場", "いちば"], ["台所", "だいどころ"],
  ["浴衣", "ゆかた"], ["布団", "ふとん"], ["胡座", "あぐら"], ["雪崩", "なだれ"],
  ["吹雪", "ふぶき"], ["笑顔", "えがお"], ["泣き顔", "なきがお"], ["寝顔", "ねがお"],
  ["素直", "すなお"], ["意地悪", "いじわる"], ["意気地", "いくじ"], ["浮気", "うわき"],
  ["頑張る", "がんばる"], ["我慢", "がまん"], ["勿体ない", "もったいない"], ["可哀想", "かわいそう"],
  ["面倒臭い", "めんどうくさい"], ["馬鹿", "ばか"], ["冗談", "じょうだん"], ["噂", "うわさ"],
  ["嘘", "うそ"], ["本物", "ほんもの"], ["偽物", "にせもの"], ["果物", "くだもの"],
  ["野菜", "やさい"], ["小豆", "あずき"], ["海苔", "のり"], ["山葵", "わさび"],
  ["胡麻", "ごま"], ["大蒜", "にんにく"], ["生姜", "しょうが"], ["唐辛子", "とうがらし"],
  ["蒲鉾", "かまぼこ"], ["寿司", "すし"], ["天麩羅", "てんぷら"], ["蕎麦", "そば"],
  ["饂飩", "うどん"], ["八百屋", "やおや"], ["酒屋", "さかや"], ["居酒屋", "いざかや"],
  ["買物", "かいもの"], ["勉強", "べんきょう"], ["宿題", "しゅくだい"], ["授業", "じゅぎょう"],
  ["学校", "がっこう"], ["先生", "せんせい"], ["生徒", "せいと"], ["学生", "がくせい"],
  ["部活", "ぶかつ"], ["仕事", "しごと"], ["会社", "かいしゃ"], ["休憩", "きゅうけい"],
  ["休日", "きゅうじつ"], ["用事", "ようじ"], ["返事", "へんじ"], ["掃除", "そうじ"],
  ["洗濯", "せんたく"], ["料理", "りょうり"], ["散歩", "さんぽ"], ["運動", "うんどう"],
  ["病院", "びょういん"], ["歯医者", "はいしゃ"], ["美容院", "びよういん"], ["海原", "うなばら"],
  ["川原", "かわら"], ["河原", "かわら"], ["山奥", "やまおく"], ["山道", "やまみち"],
  ["砂利", "じゃり"], ["紅葉", "もみじ"], ["木枯らし", "こがらし"], ["日和", "ひより"],
  ["小春日和", "こはるびより"], ["神社", "じんじゃ"], ["お寺", "おてら"], ["東京", "とうきょう"],
  ["京都", "きょうと"], ["大阪", "おおさか"], ["北海道", "ほっかいどう"], ["札幌", "さっぽろ"],
  ["函館", "はこだて"], ["小樽", "おたる"], ["青森", "あおもり"], ["秋田", "あきた"],
  ["宮城", "みやぎ"], ["仙台", "せんだい"], ["新潟", "にいがた"], ["長野", "ながの"],
  ["名古屋", "なごや"], ["神奈川", "かながわ"], ["横浜", "よこはま"], ["鎌倉", "かまくら"],
  ["奈良", "なら"], ["広島", "ひろしま"], ["福岡", "ふくおか"], ["沖縄", "おきなわ"],
];

// Longest word first, so "一昨日" is matched before "昨日" can claim part of it.
// (Guards against 1-char headwords too, in case one is ever added back.)
const READING_DICTIONARY = READING_DICTIONARY_RAW.filter(([word]) => word.length >= 2).sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * Forces known compound-kanji words to their correct reading, regardless of
 * what the AI generated. Only replaces a match when it aligns EXACTLY with
 * one or more whole existing segments (start of one, end of another) — if a
 * dictionary word only partially overlaps a segment (AI grouped it
 * differently than expected), this leaves it untouched rather than risk
 * corrupting an unrelated reading.
 */
function applyReadingDictionary(segments: RubySegment[]): RubySegment[] {
  if (segments.length === 0) return segments;

  const bases = segments.map((s) => (s.type === "ruby" ? s.base : s.value));
  const segStartOffset: number[] = [];
  let acc = 0;
  for (const b of bases) {
    segStartOffset.push(acc);
    acc += b.length;
  }
  const flat = bases.join("");
  const total = flat.length;

  const segIndexStartingAt = new Map<number, number>();
  const segIndexEndingAt = new Map<number, number>();
  segStartOffset.forEach((start, i) => {
    segIndexStartingAt.set(start, i);
    segIndexEndingAt.set(start + bases[i].length, i);
  });

  const claimed = new Array(total).fill(false);
  const matches: { segFrom: number; segTo: number; word: string; reading: string }[] = [];

  for (const [word, reading] of READING_DICTIONARY) {
    let searchFrom = 0;
    while (true) {
      const idx = flat.indexOf(word, searchFrom);
      if (idx === -1) break;
      searchFrom = idx + 1;
      const end = idx + word.length;

      let overlaps = false;
      for (let i = idx; i < end; i++) {
        if (claimed[i]) { overlaps = true; break; }
      }
      if (overlaps) continue;

      const segFrom = segIndexStartingAt.get(idx);
      const segTo = segIndexEndingAt.get(end);
      if (segFrom === undefined || segTo === undefined) continue; // doesn't align to segment boundaries — skip

      for (let i = idx; i < end; i++) claimed[i] = true;
      matches.push({ segFrom, segTo, word, reading });
    }
  }

  if (matches.length === 0) return segments;
  matches.sort((a, b) => a.segFrom - b.segFrom);

  const result: RubySegment[] = [];
  let si = 0;
  for (const match of matches) {
    while (si < match.segFrom) {
      result.push(segments[si]);
      si++;
    }
    result.push({ type: "ruby", base: match.word, rt: match.reading });
    si = match.segTo + 1;
  }
  while (si < segments.length) {
    result.push(segments[si]);
    si++;
  }

  return result;
}

/**
 * Rebuilds a clean, well-formed ruby-HTML string from possibly-malformed AI
 * output. Use this to sanitize AI responses before they're saved to the DB,
 * so downstream renderers never have to recover from broken markup at all.
 * Also forces known compound-kanji words (see READING_DICTIONARY) to their
 * correct reading, regardless of what the AI generated.
 */
export function normalizeRubyText(text: string): string {
  if (!text) return text;
  const segments = applyReadingDictionary(parseRubySegments(text));
  return segments
    .map((seg) => (seg.type === "ruby" ? `<ruby>${seg.base}<rt>${seg.rt}</rt></ruby>` : seg.value))
    .join("");
}

/** Same as normalizeRubyText, but discards furigana entirely — for fields
 * (e.g. diary titles) that are stored/displayed as plain text. */
export function stripRubyText(text: string): string {
  if (!text) return text;
  return parseRubySegments(text)
    .map((seg) => (seg.type === "ruby" ? seg.base : seg.value))
    .join("")
    .trim();
}
