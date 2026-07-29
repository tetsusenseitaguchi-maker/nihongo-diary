/**
 * Learned Items — 「保存した表現を日記で実際に使えたか」の照合ロジック。
 *
 * 判定対象は diary_entries.original_text（学習者が自分で書いた原文）だけ。
 * corrected_japanese / natural_japanese は AI が書き換えたテキストなので
 * 使わない — AI が使った語で「使えた」が立つと、指標として破綻するため。
 *
 * 純関数のみ。DB にも React にも依存しないので、サーバールートからも
 * 単体の Node スクリプトからもそのまま呼べる。
 *
 * 変更禁止ロジック（buildRubyNotation / normalizeRubyText /
 * applyReadingDictionary / 既存 DB トリガー）には一切依存していない。
 */

import { segmentJapanese } from "@/lib/segmenter";

/** 卒業に必要な使用回数。プランに依存しないので learned-limits.ts ではなくここ。 */
export const GRADUATION_THRESHOLD = 3;

/* ── 文字クラス ────────────────────────────────────────────────────────
   src/lib/furigana.ts の ONLY_KANJI / RUBY_HAS_KANJI と同じ範囲にそろえて
   ある（あちらは変更禁止なので参照はせず、同じ定義を持つだけ）。 */
const HAS_KANJI = /[一-鿿々〆ヶ]/;
const IS_KANA = /[ぁ-んァ-ヶーゝゞ]/;

/* ── 活用語尾の再結合 ──────────────────────────────────────────────────
   ⚠️ src/components/WordTranslateText.tsx:33-67 からの複製。
   あちらは "use client" コンポーネントで、この関数を export していない。
   サーバー側の lib からクライアント境界を跨いで import するのを避けるため、
   ここに同一の定義を置いている。1文字も変えていない — 変えると
   タップ翻訳と「使えた」判定でトークン境界がずれる。

   将来的には src/lib/segmenter.ts に集約して双方から import するのが
   正しい形。その統合は別ステップで提案する。 */
const ATTACH_TO_PREV = new Set([
  // polite-form fragments
  "まし", "ます", "ました", "ません",
  // copula fragments
  "でし", "でした",
  // adjective past-form fragment (おいしかっ+た)
  "かっ",
  // negative fragments
  "なかっ", "ない",
  // negative-polite fragment + nasal coda (ませ+ん in いません)
  "ませ", "ん",
  // passive / potential / causative stems
  "られ", "させ",
  // past tense auxiliary
  "た",
  // te-form connector (食べて、行って)
  "て",
  // volitional final mora (行きましょ+う)
  "う",
]);

function mergeInflections(tokens: string[]): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    if (out.length > 0 && ATTACH_TO_PREV.has(tok)) {
      out[out.length - 1] += tok;
    } else {
      out.push(tok);
    }
  }
  return out;
}

/* ── ストップリスト ────────────────────────────────────────────────────
   機能語・超高頻度語。日記にほぼ必ず出るため、照合対象にすると
   「保存した瞬間に3回使えた」が起きて卒業が無意味になる。
   1文字語は別途 MIN_WORD_LENGTH で弾いているので、ここには入れていない。 */
const STOPWORDS = new Set([
  // 形式名詞・指示語
  "こと", "もの", "とき", "ところ", "ため", "よう", "ほう", "うち", "はず", "つもり",
  "これ", "それ", "あれ", "どれ", "ここ", "そこ", "あそこ", "どこ",
  "この", "その", "あの", "どの", "わたし", "ぼく", "じぶん",
  // 超高頻度の基本動詞・補助動詞
  "する", "ある", "いる", "なる", "いう", "おる", "やる", "くる", "いく",
  "できる", "しまう", "みる", "おく", "くれる", "もらう", "あげる",
  // 判定詞・副詞・接続詞まわり
  "です", "ます", "でも", "そう", "たら", "けど", "から", "ので", "のに",
  "とても", "すごく", "ちょっと", "たくさん", "いっぱい", "まだ", "もう",
  "また", "でした", "みたい", "だけ", "ぐらい", "くらい", "ほど",
  // 意味が広すぎて誤検出源になりやすい語
  "いい", "よい", "ない", "たい", "ほしい",
]);

/** これ未満の長さの語は照合しない。1文字語（本・木・日 等）の誤検出を防ぐ。 */
const MIN_WORD_LENGTH = 2;

/**
 * かなのみの語に必要な最小長。
 *
 * TinySegmenter は かなが連続する箇所の境界を外しやすく
 * （「とてもきれい」→ ["とて","もきれい"]、「さんぽ」→ ["さん","ぽ"]）、
 * トークン照合が当てにならない。そこで かな語だけは生文字列の
 * 部分一致で探す代わりに、偶然の一致を避けるため3文字以上に限る。
 */
const MIN_KANA_ONLY_LENGTH = 3;

/* ── 語幹抽出 ──────────────────────────────────────────────────────────
   活用しても変わらない先頭部分を取り出す。

   規則:
     1. 「〜する」で終わるサ変動詞は する を落とす（勉強する → 勉強）。
        TinySegmenter は 勉強しました を ["勉強","しました"] に割るので、
        する を残すと永久にマッチしない。
     2. 漢字を含み、末尾がかなの語は、末尾1文字だけ落とす。
          食べる → 食べ / 歩く → 歩 / 面白い → 面白 / 出かける → 出かけ
        全部のかなを落とす（食べる → 食）と語幹が短くなりすぎ、
        出かける → 出 が 出して に当たるような誤検出を生む。
     3. それ以外（純漢字語・かなのみの語）は語そのもの。完全一致で照合する。 */
export function stemOf(word: string): string {
  const w = word.trim();
  if (w.length > 2 && w.endsWith("する")) return w.slice(0, -2);
  if (HAS_KANJI.test(w) && IS_KANA.test(w[w.length - 1])) return w.slice(0, -1);
  return w;
}

/** 照合対象にしてよい語か。ストップリスト・最小長・空文字を弾く。 */
export function isMatchable(word: string): boolean {
  const w = word.trim();
  if (w.length < MIN_WORD_LENGTH) return false;
  if (STOPWORDS.has(w)) return false;
  if (STOPWORDS.has(stemOf(w))) return false;
  return true;
}

/**
 * 日記本文をトークン列にする。
 *
 * plainText はルビを含まない素のテキストであることが前提
 * （original_text は常にそう。write/page.tsx:420 と 522 の両経路とも
 * ルビ付きは original_text_ruby という別カラムに入る）。
 * 万一ルビ HTML が混ざっても、タグ文字を含むトークンがどの語幹とも
 * 一致しなくなるだけで、誤検出は増えない（取りこぼしに倒れる）。
 */
export function tokenize(plainText: string): string[] {
  return mergeInflections(segmentJapanese(plainText));
}

/**
 * 語が日記に現れるか。現れた表層形を返す（無ければ null）。
 *
 * 漢字を含む語 — トークンの前方一致で活用を吸収しつつ、
 * 「語幹の直後がかなであること」を条件に付けて誤検出を抑える:
 *   歩く（語幹 歩）  × 歩いて     → 直後が「い」= かな → ○
 *   歩く（語幹 歩）  × 歩道       → 直後が「道」= 漢字 → ×
 *   天気（語幹 天気）× 天気でした → 直後が「で」= かな → ○
 *   公園（語幹 公園）× 遊園地     → 前方一致しない       → ×
 * 純漢字の名詞も同じ経路を通る。mergeInflections が「天気」に
 * 「でし」「た」を貼り付けて1トークンにしてしまうため、完全一致だけでは
 * 取りこぼす。かなガードがあるので 元気・天気予報 には当たらない。
 *
 * かなのみの語 — トークン境界が信頼できないので生文字列の部分一致。
 * MIN_KANA_ONLY_LENGTH 未満は偶然の一致が怖いので照合しない。
 */
export function findMatch(word: string, tokens: string[], plainText: string): string | null {
  const stem = stemOf(word);
  if (!stem) return null;

  if (!HAS_KANJI.test(stem)) {
    if (stem.length < MIN_KANA_ONLY_LENGTH) return null;
    return plainText.includes(stem) ? stem : null;
  }

  for (const tk of tokens) {
    if (!tk.startsWith(stem)) continue;
    if (tk.length === stem.length) return tk;
    if (IS_KANA.test(tk[stem.length])) return tk;
  }
  return null;
}

/** vocabulary_entries の1行のうち、照合に必要な最小限。 */
export interface LearnedCandidate {
  id: string;
  word: string;
  /** "word" | "grammar"。v1 では grammar を対象外にする。 */
  entryType?: string | null;
}

export interface LearnedMatch {
  id: string;
  word: string;
  /** 日記中で実際にマッチした表層形（例: 食べる → "食べました"）。DB の matched_text に入る。 */
  matchedText: string;
}

/**
 * 日記の原文と、そのユーザーの保存済み表現から、「使えた」ものを返す。
 *
 * v1 の対象は entryType === "word" のみ。文法パターン（〜てから 等）は
 * 形態素境界に対応しないため、トークン照合では原理的に判定できない。
 *
 * 同じ語が本文に複数回出ても1件にまとまる（DB 側も
 * unique (vocabulary_entry_id, diary_entry_id) で1行に制限している）。
 */
export function findUsedExpressions(
  plainText: string,
  candidates: LearnedCandidate[],
): LearnedMatch[] {
  if (!plainText || candidates.length === 0) return [];

  const tokens = tokenize(plainText);
  if (tokens.length === 0) return [];

  const matches: LearnedMatch[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if ((c.entryType ?? "word") !== "word") continue; // v1: 文法は対象外
    if (seen.has(c.id)) continue;
    if (!isMatchable(c.word)) continue;

    const matchedText = findMatch(c.word, tokens, plainText);
    if (matchedText) {
      seen.add(c.id);
      matches.push({ id: c.id, word: c.word, matchedText });
    }
  }

  return matches;
}
