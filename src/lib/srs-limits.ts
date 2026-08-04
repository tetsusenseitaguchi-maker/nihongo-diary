import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * 1日に出す復習カードの枚数。
 *
 * plans.ts の PLAN_LIMITS とは別ファイルにしてある。あちらは課金隣接の
 * 挙動（添削回数・翻訳回数・文字数）を動かしていて hands-off なので、
 * 新しいカウンターはここに置く。recheck-limits.ts / audio-limits.ts /
 * shadowing-limits.ts / word-lookup-limits.ts と同じ分け方で、同じ理由。
 * normalizePlan は import して呼ぶだけ — プラン判定は昔から1つの関数のまま。
 *
 * ── なぜ枚数を絞るのか ──────────────────────────────────
 * サーバーの費用ではない。復習は DB を数行読むだけで、AI も合成も呼ばない。
 * 絞っているのは、1日にまとめて100枚やって翌週やめる形が、間隔反復として
 * いちばん効かないやり方だから。Free の5枚は単語帳の上限10語と噛み合って
 * いて、全語がおよそ2日で一巡する。
 *
 * ── null = 無制限 ──────────────────────────────────────
 * 数字が入っているプランだけが try_use_vocab_review に到達する。無制限の
 * 学習者は RPC を通らないので vocab_review_usage に行が溜まらず、
 * アップグレード時に何かを消す必要もない。translationsPerDay / AUDIO_DAILY_LIMITS
 * / WORD_LOOKUP_DAILY_LIMITS と同じ形。
 *
 * teacher_feedback が pro と同じなのは PLAN_LIMITS がそう定めているから
 * （あちらでも corrections / maxChars / reviewDrills が pro と同一）。
 *
 * 上限は p_limit として関数に渡すので、この数字を変えてもマイグレーションは
 * 要らない。
 */
export const REVIEW_DAILY_LIMITS: Record<Plan, number | null> = {
  free: 5,
  plus: 30,
  pro: null,
  teacher_feedback: null,
};

/**
 * 生の profiles.plan 値に対する1日の枚数、無制限なら null。
 *
 * 読めない / 知らない値は normalizePlan が free に倒す。安全な向きはこちら —
 * 最悪でも有料の学習者が5枚で止まるだけで、無料の学習者が無制限になることは
 * ない。
 */
export function reviewLimitFor(plan: string | null | undefined): number | null {
  return REVIEW_DAILY_LIMITS[normalizePlan(plan)];
}

/**
 * 設定できる最小値。
 *
 * 0 を通してはいけない。try_use_vocab_review は p_limit <= 0 で常に false を
 * 返すので、0 が入ると復習が黙って死ぬ — エラーも出ず、カードが1枚も出ない
 * 状態になる。DB 側の CHECK も 1 以上を要求しているが、そちらは保険で、
 * 実際に効くのはここ。
 */
export const REVIEW_TARGET_MIN = 1;

/**
 * 有料プランの学習者が選べる枚数。UI のチップはこの2本から作る。
 *
 * 10 を最小にしてあるのは、Free の 5 より必ず多くするため。有料にして
 * 選択肢が減るのは筋が通らない。Plus の 30 は REVIEW_DAILY_LIMITS.plus と
 * 同じ値で、天井そのもの。
 *
 * Pro の「無制限」はここに数値として現れない。null で表すので、UI 側が
 * 別の選択肢として足す。
 */
export const REVIEW_TARGET_PRESETS_PLUS = [10, 20, 30] as const;
export const REVIEW_TARGET_PRESETS_PRO = [10, 20, 30, 50, 100] as const;

/**
 * プラン上限と学習者の希望から、その日の実効上限を出す。null = 無制限。
 *
 * ── ⚠️ クランプはここにしかない ────────────────────────────────
 * vocab_review_settings は本人が insert / update できるテーブルなので、
 * Plus の学習者が 100 を書き込むことは技術的にできる。UI が選択肢を絞るのは
 * 親切のためであって、強制ではない。強制はこの関数が担う。
 *
 * 同じ仕組みが Pro → Plus のダウングレードも吸収する。DB に 100 が残った
 * ままでも、plan が plus になった瞬間から実効値は 30 になる。ダウングレード
 * 時に設定値を書き換えて回る処理は要らないし、書き換えてしまうと Pro に
 * 戻したときに元の希望が失われる。
 *
 * ── 呼ぶ側が守ること ────────────────────────────────────────
 * getDueSummary と api/vocabulary/srs/answer は、どちらも
 * srs-server.ts の resolveLimit() 経由でこの関数に到達する。片方が
 * reviewLimitFor() を直接呼ぶ形に戻すと、画面が「今日 50 枚」と言いながら
 * RPC には 30 が渡る、という食い違いが起きる。
 */
export function resolveReviewLimit(
  plan: string | null | undefined,
  userTarget: number | null | undefined,
): number | null {
  const ceiling = reviewLimitFor(plan); // null = プランとして無制限
  if (userTarget == null) return ceiling; // 未設定 → プラン既定（Pro なら無制限）

  const wanted = Math.max(REVIEW_TARGET_MIN, Math.floor(userTarget));
  if (ceiling === null) return wanted; // Pro: 天井が無いので希望をそのまま
  return Math.min(wanted, ceiling); // それ以外: プラン上限で頭を打つ
}
