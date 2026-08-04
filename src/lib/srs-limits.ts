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
