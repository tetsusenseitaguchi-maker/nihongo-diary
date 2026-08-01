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
    4. The tail of the reading repeated as okurigana
       (<ruby>心地<rt>ここち</rt></ruby>ちよい,
        <ruby>観察<rt>かんさつ</rt></ruby>さつ) — see dropEchoedOkurigana.
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
        // The AI repeated the leading kanji and left the WHOLE compound's
        // reading on the last one (今日<ruby>日<rt>きょう</rt></ruby>), so the
        // base is widened to swallow the duplicate.
        //
        // The same shape also occurs with a reading that belongs to the
        // fragment alone (観察<ruby>察<rt>さつ</rt></ruby>), where widening
        // states that 観察 reads さつ and loses かん. The two are not
        // distinguishable from here — 図書館<ruby>館<rt>としょかん</rt></ruby>
        // and 観察<ruby>察<rt>さつ</rt></ruby> are the same pattern — because
        // it would take knowing how the leading kanji is read.
        //
        // What IS knowable is the compound itself: when the dictionary has it,
        // its reading is correct under either interpretation, and it also
        // repairs an rt the AI simply got wrong (今日<ruby>日<rt>にち</rt>).
        // Without an entry the old behaviour stands — widening is right for
        // the 図書館 shape, and guessing is not better than leaving it.
        const known = READING_BY_WORD.get(preKanji);
        return `<ruby>${preKanji}<rt>${known ?? reading}</rt></ruby>${trailing}`;
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

  return dropEchoedOkurigana(segments);
}

/** Leading run of hiragana (plus ー) in a text segment. */
const LEADING_KANA = /^[ぁ-ゖー]+/;

/**
 * Glitch 4: okurigana that only repeats the tail of the reading in front of it.
 *
 * <ruby>心地<rt>ここち</rt></ruby>ちよい draws as 心地ちよい and speaks as
 * ここちちよい; <ruby>観察<rt>かんさつ</rt></ruby>さつ gives 観察さつ /
 * かんさつさつ. The duplicate is in the STORED string — the AI writes it, and
 * nothing downstream was removing it, because the three repairs above only
 * merge duplicated KANJI around the tag and this run is kana. Stripping it
 * here rather than in the callers means the rows already saved come out right
 * on the next render, with no migration.
 *
 * Two guards keep real okurigana intact, because a reading whose last kana
 * equals the first kana of the okurigana is not a duplicate:
 *
 *   1. rt of length 1 is skipped outright. <ruby>言<rt>い</rt></ruby>いました
 *      is correct Japanese — 言 reads い and the okurigana genuinely starts
 *      with い — and it is the common shape for one-mora kun'yomi.
 *   2. only a PROPER suffix of rt counts. Matching the whole of rt is what
 *      case 1 would be, one character up; requiring something to be left over
 *      is what separates 「ここ|ち」+ち from 「い」+い.
 *
 * Longest match wins, so かんさつ + さつする drops both kana rather than
 * stopping at つ.
 */
function dropEchoedOkurigana(segments: RubySegment[]): RubySegment[] {
  let changed = false;
  const out = segments.slice();

  for (let i = 0; i < out.length - 1; i++) {
    const ruby = out[i];
    const next = out[i + 1];
    if (ruby.type !== "ruby" || next.type !== "text") continue;

    const rt = ruby.rt;
    if (rt.length < 2) continue; // guard 1

    const run = next.value.match(LEADING_KANA)?.[0] ?? "";
    if (!run) continue;

    for (let len = Math.min(run.length, rt.length - 1); len >= 1; len--) {
      // guard 2 — len never reaches rt.length
      if (run.startsWith(rt.slice(rt.length - len))) {
        out[i + 1] = { type: "text", value: next.value.slice(len) };
        changed = true;
        break;
      }
    }
  }

  if (!changed) return segments;
  // A segment emptied by the strip is dropped: applyReadingDictionary keys its
  // offset maps by segment start, and two segments starting at the same offset
  // would collide there.
  return out.filter((s) => s.type === "ruby" || s.value !== "");
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
  ["今夜", "こんや"], ["昨夜", "ゆうべ"], ["今年", "ことし"], ["去年", "きょねん"],
  ["昨年", "さくねん"], ["一昨年", "おととし"],
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
  ["浴衣", "ゆかた"], ["相撲", "すもう"], ["布団", "ふとん"], ["胡座", "あぐら"],
  ["雪崩", "なだれ"],
  ["吹雪", "ふぶき"], ["笑顔", "えがお"], ["泣き顔", "なきがお"], ["寝顔", "ねがお"],
  ["素直", "すなお"], ["意地悪", "いじわる"], ["意気地", "いくじ"], ["浮気", "うわき"],
  ["頑張る", "がんばる"], ["我慢", "がまん"], ["勿体ない", "もったいない"], ["可哀想", "かわいそう"],
  ["面倒臭い", "めんどうくさい"], ["馬鹿", "ばか"], ["冗談", "じょうだん"],
  ["本物", "ほんもの"], ["偽物", "にせもの"], ["果物", "くだもの"],
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

  /* ── 頻出複合語（音読み／訓読みが混ざりやすいもの） ──────────────────
     GPT が「読書→よしょ」のように、片方の字を訓読み・もう片方を音読みで
     読んでしまう事故への対策。ここは漢字だけで構成された語に限る：
     送り仮名を含む語（診て・貰う など）を入れると、置換結果が
     <ruby>診て<rt>みて</rt></ruby> のように送り仮名ごとルビで包まれて
     位置がズレるうえ、活用形ごとにセグメント境界が変わって
     そもそもマッチしない。活用形の誤読はここでは扱わない。 */
  // 時間・日付
  ["本日", "ほんじつ"], ["先日", "せんじつ"], ["週末", "しゅうまつ"], ["毎朝", "まいあさ"],
  ["毎晩", "まいばん"], ["昼間", "ひるま"], ["夕方", "ゆうがた"], ["夜中", "よなか"],
  ["真夜中", "まよなか"], ["半年", "はんとし"], ["正月", "しょうがつ"], ["大晦日", "おおみそか"],
  ["誕生日", "たんじょうび"], ["記念日", "きねんび"], ["今度", "こんど"], ["当時", "とうじ"],
  ["普段", "ふだん"],
  // 週・月。今/来/先 は 日・年 側だけ揃っていた。月 が げつ になるのと
  // 毎月 が抜けているのは意図的で、まいつき と まいげつ のどちらも正しく、
  // 一方に固定すれば必ず半分は誤りになる。
  ["今週", "こんしゅう"], ["来週", "らいしゅう"], ["先週", "せんしゅう"], ["毎週", "まいしゅう"],
  ["今月", "こんげつ"], ["来月", "らいげつ"], ["先月", "せんげつ"],
  // 天気・自然
  ["天気", "てんき"], ["大雨", "おおあめ"], ["小雨", "こさめ"], ["大雪", "おおゆき"],
  ["初雪", "はつゆき"], ["青空", "あおぞら"], ["星空", "ほしぞら"], ["夜空", "よぞら"],
  ["朝日", "あさひ"], ["夕日", "ゆうひ"], ["花見", "はなみ"], ["花火", "はなび"],
  // 体・健康
  ["体調", "たいちょう"], ["元気", "げんき"], ["病気", "びょうき"], ["診察", "しんさつ"],
  ["寝坊", "ねぼう"], ["昼寝", "ひるね"], ["風呂", "ふろ"], ["散髪", "さんぱつ"],
  ["髪型", "かみがた"], ["温泉", "おんせん"],
  /* 医療・診療科：同じ字が語によって音読み／訓読みに割れるもの。
     「眼科（がんか）」の音読みに引かれて 眼医者→がんいしゃ と読む事故の対策。
     正しくは 眼医者=めいしゃ（訓読み）。眼鏡=めがね は上の熟字訓ブロックに既出。
     近眼（きんがん／ちかめ）のように読みが文脈依存の語は、強制すると
     かえって誤るので入れない。 */
  ["眼医者", "めいしゃ"], ["眼科", "がんか"], ["双眼鏡", "そうがんきょう"], ["医者", "いしゃ"],
  ["内科", "ないか"], ["外科", "げか"], ["歯科", "しか"], ["皮膚科", "ひふか"],
  ["耳鼻科", "じびか"], ["小児科", "しょうにか"], ["目薬", "めぐすり"], ["薬局", "やっきょく"],
  ["頭痛", "ずつう"], ["腹痛", "ふくつう"], ["手術", "しゅじゅつ"], ["注射", "ちゅうしゃ"],
  // 食事
  ["夕飯", "ゆうはん"], ["御飯", "ごはん"], ["弁当", "べんとう"], ["味噌汁", "みそしる"],
  ["納豆", "なっとう"], ["麦茶", "むぎちゃ"], ["砂糖", "さとう"], ["醤油", "しょうゆ"],
  // 人・家族
  ["家族", "かぞく"], ["両親", "りょうしん"], ["祖父", "そふ"], ["祖母", "そぼ"],
  ["息子", "むすこ"], ["親戚", "しんせき"], ["彼女", "かのじょ"], ["彼氏", "かれし"],
  ["恋人", "こいびと"], ["同僚", "どうりょう"], ["上司", "じょうし"], ["先輩", "せんぱい"],
  ["後輩", "こうはい"], ["知人", "ちじん"], ["近所", "きんじょ"], ["自分", "じぶん"],
  ["一緒", "いっしょ"], ["名前", "なまえ"],
  // 仕事・学校
  ["残業", "ざんぎょう"], ["出張", "しゅっちょう"], ["給料", "きゅうりょう"], ["職場", "しょくば"],
  ["試験", "しけん"], ["受験", "じゅけん"], ["図書館", "としょかん"], ["練習", "れんしゅう"],
  ["辞書", "じしょ"], ["単語", "たんご"], ["漢字", "かんじ"], ["発音", "はつおん"],
  ["会話", "かいわ"], ["留学", "りゅうがく"], ["日本語", "にほんご"], ["英語", "えいご"],
  ["外国人", "がいこくじん"], ["給食", "きゅうしょく"], ["運動会", "うんどうかい"],
  // 移動・場所
  ["電車", "でんしゃ"], ["地下鉄", "ちかてつ"], ["新幹線", "しんかんせん"], ["自転車", "じてんしゃ"],
  ["飛行機", "ひこうき"], ["駅前", "えきまえ"], ["改札", "かいさつ"], ["切符", "きっぷ"],
  ["渋滞", "じゅうたい"], ["地図", "ちず"], ["旅行", "りょこう"], ["旅館", "りょかん"],
  ["本屋", "ほんや"], ["銀行", "ぎんこう"], ["郵便局", "ゆうびんきょく"], ["交番", "こうばん"],
  ["店員", "てんいん"], ["値段", "ねだん"], ["財布", "さいふ"], ["玄関", "げんかん"],
  ["階段", "かいだん"], ["屋上", "おくじょう"], ["自宅", "じたく"], ["実家", "じっか"],
  ["家賃", "やちん"], ["動物園", "どうぶつえん"], ["遊園地", "ゆうえんち"], ["映画館", "えいがかん"],
  ["空港", "くうこう"], ["出発", "しゅっぱつ"], ["到着", "とうちゃく"],
  // 国・地域。帰国 が ききょく と描かれたのが発端で、国 を 局 と取り違えた
  // 形。読みが割れているわけではなく当てずっぽうなので、防ぎ方は正しい読みを
  // 置いておくことしかない。国 は こく と ごく のどちらにもなる（外国／中国）。
  ["帰国", "きこく"], ["出国", "しゅっこく"], ["入国", "にゅうこく"], ["外国", "がいこく"],
  ["韓国", "かんこく"], ["中国", "ちゅうごく"], ["全国", "ぜんこく"], ["国内", "こくない"],
  ["国際", "こくさい"], ["都市", "とし"], ["地方", "ちほう"], ["北部", "ほくぶ"],
  ["南部", "なんぶ"], ["東部", "とうぶ"], ["西部", "せいぶ"],
  // 感情・状態
  ["気分", "きぶん"], ["気楽", "きらく"], ["気軽", "きがる"], ["最高", "さいこう"],
  ["最悪", "さいあく"], ["最後", "さいご"], ["最初", "さいしょ"], ["途中", "とちゅう"],
  ["残念", "ざんねん"], ["心配", "しんぱい"], ["安心", "あんしん"], ["無理", "むり"],
  ["無事", "ぶじ"], ["大切", "たいせつ"], ["普通", "ふつう"], ["一番", "いちばん"],
  ["一生懸命", "いっしょうけんめい"], ["半分", "はんぶん"], ["全部", "ぜんぶ"], ["大体", "だいたい"],
  ["大変", "たいへん"], ["結局", "けっきょく"], ["理由", "りゆう"], ["場所", "ばしょ"],
  ["場合", "ばあい"], ["様子", "ようす"], ["雰囲気", "ふんいき"], ["言葉", "ことば"],
  ["物語", "ものがたり"], ["中身", "なかみ"],
  // 予定・交流
  ["予定", "よてい"], ["約束", "やくそく"], ["連絡", "れんらく"], ["相談", "そうだん"],
  ["挨拶", "あいさつ"], ["結婚", "けっこん"], ["結婚式", "けっこんしき"], ["初詣", "はつもうで"],
  ["神様", "かみさま"], ["試合", "しあい"], ["選手", "せんしゅ"], ["応援", "おうえん"],
  ["野球", "やきゅう"], ["予約", "よやく"],
  // 趣味・持ち物
  ["読書", "どくしょ"], ["写真", "しゃしん"], ["音楽", "おんがく"], ["映画", "えいが"],
  ["漫画", "まんが"], ["番組", "ばんぐみ"], ["趣味", "しゅみ"], ["歌手", "かしゅ"],
  ["電話", "でんわ"], ["携帯", "けいたい"], ["料金", "りょうきん"], ["洗濯物", "せんたくもの"],
  ["毛布", "もうふ"], ["洋服", "ようふく"], ["着物", "きもの"], ["帽子", "ぼうし"],
  ["靴下", "くつした"], ["手袋", "てぶくろ"], ["指輪", "ゆびわ"],
  // 畳語（々 は ONLY_KANJI に含まれるので （）記法で正しく描画される）
  ["時々", "ときどき"], ["色々", "いろいろ"], ["別々", "べつべつ"], ["段々", "だんだん"],
  ["少々", "しょうしょう"], ["様々", "さまざま"], ["人々", "ひとびと"], ["日々", "ひび"],
  ["久々", "ひさびさ"],
];

// Longest word first, so "一昨日" is matched before "昨日" can claim part of it.
// (Guards against 1-char headwords too, in case one is ever added back.)
const READING_DICTIONARY = READING_DICTIONARY_RAW.filter(([word]) => word.length >= 2).sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * Same entries, keyed for a direct lookup. Used by parseRubySegments when it
 * widens a ruby base over a duplicated kanji and needs the reading of the
 * whole compound rather than of the fragment the AI annotated.
 *
 * Read-only view of READING_DICTIONARY — applyReadingDictionary below still
 * owns the segment-alignment logic and is untouched by this.
 */
const READING_BY_WORD = new Map(READING_DICTIONARY);

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
