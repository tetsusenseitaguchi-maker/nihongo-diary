import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInTZ } from "@/lib/date-tz";
import { normalizePlan, type Plan } from "@/lib/plans";
import { resolveReviewLimit } from "@/lib/srs-limits";
import { isReviewable, SRS_NEW_STAGE } from "@/lib/srs";

/**
 * 「今日出す分」を決める、ただ1つの実装。
 *
 * ルートとダッシュボードの両方がここを呼ぶ。同じ数を2箇所で別々に数えると、
 * カードに「5枚」と出てから開いたら3枚だった、という形でしか気づけないズレが
 * 生まれる。数える場所は1つにしてある。
 *
 * ── 呼ぶ側が守ること ──────────────────────────────────────
 * tz は getTimezoneFromCookie() → profiles.timezone の順で解決したものを渡す。
 * サーバーの new Date() は渡さない — Vercel は UTC なので、東の学習者の
 * 「今日」と1日ずれる。
 *
 * ⚠️ 変更禁止ロジックには触れていない。use_count / graduated_at は select も
 * update もしない。learned-match.ts / api/learned/scan / 既存の try_use_* も
 * 参照しない。normalizePlan は呼ぶだけ。
 */

/** テーブルがまだ無い状態でも落ちないための判定。learned/scan と同じ集合。 */
const SCHEMA_MISSING_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);
function isSchemaMissing(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && SCHEMA_MISSING_CODES.has(error.code);
}

/** 単語帳の1行のうち、カードに要るぶんだけ。 */
export interface SrsCard {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example_jp_ruby: string | null;
  example_translation: string | null;
  jlpt_level: string | null;
  entry_type: string | null;
  /** 0 = 新規。1..5 は次に正解したら上がる段階。 */
  stage: number;
  /** vocabulary_srs に行が無い語。UI の「New」バッジ用。 */
  isNew: boolean;
}

export interface DueSummary {
  /** 今日この場で出す分。上限で切ってある。 */
  cards: SrsCard[];
  /** cards.length。ダッシュボードはこれだけ見る。 */
  count: number;
  /** 枠に入りきらず今日は出さない枚数。「あと N 枚は明日」に使う。 */
  dueRemaining: number;
  /** 出題できる語が単語帳に1つでもあるか。false = まだ何も保存していない。 */
  hasReviewable: boolean;
  /** 今日より後で最初に期限が来る日。無ければ null。 */
  nextDueOn: string | null;
  plan: Plan;
  /** null = 無制限。 */
  limit: number | null;
  usedToday: number;
  today: string;
}

/**
 * その学習者の今日の実効上限。null = 無制限。
 *
 * ⚠️ 上限を決める経路はこの関数1つだけ。getDueSummary も
 * api/vocabulary/srs/answer もここを通る。片方が reviewLimitFor() を直接
 * 呼ぶ形に戻すと、画面が言う枚数と RPC に渡る p_limit が食い違う。
 *
 * ⚠️ plan と設定値は別々のクエリで読む。畳み込んで
 * `profiles.select("plan, ...")` にしないこと — 列が1つ無いだけで行ごと
 * 落ち、normalizePlan(undefined) が全員を Free と判定する（timezone 列で
 * 実際に起きた事故）。設定を別テーブルに置いたのはこのためで、
 * vocab_review_settings が無い環境ではその1本だけが失敗し、プラン既定に
 * 倒れる。
 */
export async function resolveLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: Plan; limit: number | null; target: number | null }> {
  const [planRes, settingRes] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).single(),
    supabase
      .from("vocab_review_settings")
      .select("daily_target")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (settingRes.error && !isSchemaMissing(settingRes.error)) {
    console.error("[srs] review settings read failed:", settingRes.error.message);
  }

  const rawPlan = planRes.data?.plan as string | null | undefined;
  // 読めなければ未設定扱い = プラン既定。安全な向きはこちらで、最悪でも
  // 学習者が既定の枚数に戻るだけ。
  const target = (settingRes.data?.daily_target as number | null | undefined) ?? null;

  return {
    plan: normalizePlan(rawPlan),
    limit: resolveReviewLimit(rawPlan, target),
    target,
  };
}

/** 何も出せないときの答え。失敗時もこれに倒すので、呼ぶ側は例外を扱わなくてよい。 */
function empty(plan: Plan, limit: number | null, today: string, usedToday = 0): DueSummary {
  return {
    cards: [],
    count: 0,
    dueRemaining: 0,
    hasReviewable: false,
    nextDueOn: null,
    plan,
    limit,
    usedToday,
    today,
  };
}

/**
 * 今日の出題と残数。
 *
 * ── 選び方 ──────────────────────────────────────────────
 * 期限切れが先、余った枠に新規。期限切れの語は実際に忘却が進んでいるもので、
 * 新規語にはまだ守るべき予定が無い。枠を超えた期限切れは due_on を書き換えずに
 * 残すので、翌日そのまま最優先で戻ってくる。
 *
 * 「新規」は vocabulary_srs に行が無い語。この定義のおかげでバックフィルが
 * 要らず、明日保存される語も同じ経路で拾える。卒業済みの語は行があるので
 * ここには混ざらない。
 *
 * ── 失敗の扱い ────────────────────────────────────────
 * SRS 側のテーブルが無い／読めないときは 0 枚に倒して黙って返す。ダッシュボードは
 * カードを描かないだけで通常どおり表示される。単語帳そのものが読めないときも
 * 同じ — ここが原因で他の画面が壊れることはない。
 */
export async function getDueSummary(
  supabase: SupabaseClient,
  userId: string,
  tz: string,
): Promise<DueSummary> {
  const today = todayInTZ(tz);

  // 4本を並列で投げる。直列にすると、これを Promise.all に並べた呼び出し側の
  // 「1往復ぶん」という前提が崩れる。resolveLimit も内部で2本を並列に投げる
  // ので、全体では最も遅い1本ぶんで済む。
  const [{ plan, limit }, entryRes, srsRes, usageRes] = await Promise.all([
    resolveLimit(supabase, userId),
    // 単語帳の全行を読む。単語も文法パターンも出題するので entry_type では
    // 絞らない。
    //
    // ⚠️ ここに .eq("entry_type", "word") を復活させないこと。絞り込みは
    // 下の isReviewable() が1箇所で行う決まりで、SQL 側にもう一枚フィルタを
    // 置くと、srs.ts のコメントを読まずに片側だけ元へ戻せてしまう。文法を
    // 出題する理由（照合ではなく出題だから）はあちらに書いてある。
    supabase
      .from("vocabulary_entries")
      .select("id, word, reading, meaning, example_jp_ruby, example_translation, jlpt_level, entry_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("vocabulary_srs")
      .select("vocabulary_entry_id, stage, due_on, srs_graduated_at")
      .eq("user_id", userId),
    supabase
      .from("vocab_review_usage")
      .select("review_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle(),
  ]);

  if (entryRes.error) {
    console.error("[srs] entry lookup failed:", entryRes.error.message);
    return empty(plan, limit, today);
  }

  if (srsRes.error && !isSchemaMissing(srsRes.error)) {
    console.error("[srs] state lookup failed:", srsRes.error.message);
  }
  if (usageRes.error && !isSchemaMissing(usageRes.error)) {
    console.error("[srs] usage lookup failed:", usageRes.error.message);
  }

  // 無制限プランは vocab_review_usage に行が溜まらないので、読めても 0 のまま。
  const usedToday = limit === null ? 0 : ((usageRes.data?.review_count as number | undefined) ?? 0);
  const remaining = limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - usedToday);

  // 出題できない行を落とす唯一の場所。判定は srs.ts の純関数で、
  // api/vocabulary/srs/answer も同じ関数を呼ぶので、出題と採点で条件がずれない。
  const reviewable = (entryRes.data ?? []).filter((e) =>
    isReviewable(e as { entry_type?: string | null; word: string; meaning: string }),
  ) as unknown as Omit<SrsCard, "stage" | "isNew">[];

  if (reviewable.length === 0) return empty(plan, limit, today, usedToday);

  const srsRows = (srsRes.data ?? []) as {
    vocabulary_entry_id: string;
    stage: number;
    due_on: string | null;
    srs_graduated_at: string | null;
  }[];

  const stateById = new Map(srsRows.map((r) => [r.vocabulary_entry_id, r]));

  // 期限切れ。卒業行は srs_graduated_at で外れ、due_on が null なので二重に外れる。
  const due = reviewable
    .map((e) => ({ entry: e, state: stateById.get(e.id) }))
    .filter(
      (x): x is { entry: Omit<SrsCard, "stage" | "isNew">; state: (typeof srsRows)[number] } =>
        !!x.state && !x.state.srs_graduated_at && !!x.state.due_on && x.state.due_on <= today,
    )
    .sort((a, b) =>
      a.state.due_on! === b.state.due_on!
        ? a.entry.id.localeCompare(b.entry.id)
        : a.state.due_on!.localeCompare(b.state.due_on!),
    )
    .map<SrsCard>((x) => ({ ...x.entry, stage: x.state.stage, isNew: false }));

  // 新規 = SRS 行がまだ無い語。reviewable は created_at 昇順のまま。
  const fresh = reviewable
    .filter((e) => !stateById.has(e.id))
    .map<SrsCard>((e) => ({ ...e, stage: SRS_NEW_STAGE, isNew: true }));

  const all = [...due, ...fresh];
  const cards = remaining === Number.POSITIVE_INFINITY ? all : all.slice(0, remaining);

  // 今日より後で最初に来る期限。状態Cの「次は◯日」に使う。
  const nextDueOn =
    srsRows
      .filter((r) => !r.srs_graduated_at && !!r.due_on && r.due_on > today)
      .map((r) => r.due_on as string)
      .sort()[0] ?? null;

  return {
    cards,
    count: cards.length,
    dueRemaining: all.length - cards.length,
    hasReviewable: true,
    nextDueOn,
    plan,
    limit,
    usedToday,
    today,
  };
}
