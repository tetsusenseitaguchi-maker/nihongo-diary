import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { todayInTZ } from "@/lib/date-tz";
import { normalizePlan } from "@/lib/plans";
import { reviewLimitFor } from "@/lib/srs-limits";
import { isReviewable, SRS_NEW_STAGE } from "@/lib/srs";

export const runtime = "nodejs";

/**
 * GET /api/vocabulary/srs — 今日出す分と、今日の残り枚数。
 *
 * 読み取りだけ。カウンターは1枚採点するごとに answer 側で claim するので、
 * この画面を開いただけでは1枚も消費しない。
 *
 * ── 選び方 ──────────────────────────────────────────────
 * 期限切れが先、余った枠に新規。期限切れの語は実際に忘却が進んでいるもので、
 * 新規語にはまだ守るべき予定が無い。新規を先に入れると覚えかけが後ろに
 * ずれて崩れる。期限切れが枠を超えた分は due_on を書き換えずに残すので、
 * 翌日そのまま最優先で戻ってくる。
 *
 * ── 「新規」の定義 ────────────────────────────────────
 * vocabulary_srs に行が無い単語帳の語。バックフィルを要らなくするための
 * 定義で、昨日保存された語も今日保存された語も同じ扱いになる。
 *
 * ⚠️ 変更禁止ロジックには触れていない。use_count / graduated_at は select も
 * update もしない。learned-match.ts / api/learned/scan / normalizePlan の
 * 実装、既存の try_use_* も一切参照しない（normalizePlan は呼ぶだけ）。
 */

/** テーブルがまだ無い状態でも 500 を出さないための判定。learned/scan と同じ。 */
const SCHEMA_MISSING_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);
function isSchemaMissing(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && SCHEMA_MISSING_CODES.has(error.code);
}

/** 単語帳の1行のうち、カードに要るぶんだけ。 */
type CardRow = {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example_jp_ruby: string | null;
  example_translation: string | null;
  jlpt_level: string | null;
  entry_type: string | null;
};

export interface SrsCard extends CardRow {
  /** 0 = 新規。1..5 は次に正解したら上がる段階。 */
  stage: number;
  /** 新規（vocabulary_srs に行が無い）かどうか。UI のラベル用。 */
  isNew: boolean;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // プランと「今日」。tz は cookie（TimezoneSyncer が入れる）→ profiles の順で、
  // どちらも Intl で検証してから使う。ここを new Date() のサーバー時刻にすると
  // 東の学習者の日付が1日ずれる。
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(prof?.plan);
  const limit = reviewLimitFor(prof?.plan);

  let tz = await getTimezoneFromCookie();
  const dbTz = prof?.timezone as string | null | undefined;
  if (tz === "UTC" && dbTz) tz = validateTZ(dbTz);
  const today = todayInTZ(tz);

  // ── 今日すでに何枚やったか ─────────────────────────────────
  // 無制限プランは行が溜まらないので読みにも行かない。テーブルがまだ無い間は
  // 0 として続行する（SQL 実行前でも画面が壊れない）。
  let usedToday = 0;
  if (limit !== null) {
    const { data: usage, error: usageError } = await supabase
      .from("vocab_review_usage")
      .select("review_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    if (usageError && !isSchemaMissing(usageError)) {
      console.error("[vocab/srs] usage read failed:", usageError.message);
    }
    usedToday = (usage?.review_count as number | undefined) ?? 0;
  }

  const remaining = limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - usedToday);

  // ── 期限が来ている語 ────────────────────────────────────
  // 卒業行は srs_graduated_at で除外。due_on が null なので二重に外れる。
  const { data: dueRows, error: dueError } = await supabase
    .from("vocabulary_srs")
    .select("vocabulary_entry_id, stage, due_on")
    .eq("user_id", user.id)
    .is("srs_graduated_at", null)
    .not("due_on", "is", null)
    .lte("due_on", today)
    .order("due_on", { ascending: true })
    .order("vocabulary_entry_id", { ascending: true });

  if (dueError && !isSchemaMissing(dueError)) {
    console.error("[vocab/srs] due lookup failed:", dueError.message);
  }

  const dueAll = (dueRows ?? []).map((r) => ({
    id: r.vocabulary_entry_id as string,
    stage: r.stage as number,
  }));

  // ── 単語帳の中身 ────────────────────────────────────────
  // 一度に読んで、期限切れ・新規の両方をここから引く。単語帳は数十件規模なので
  // 2回に分けて問い合わせる意味がない。
  const { data: entryRows, error: entryError } = await supabase
    .from("vocabulary_entries")
    .select("id, word, reading, meaning, example_jp_ruby, example_translation, jlpt_level, entry_type")
    .eq("user_id", user.id)
    .eq("entry_type", "word")
    .order("created_at", { ascending: true });

  if (entryError) {
    console.error("[vocab/srs] entry lookup failed:", entryError.message);
    return NextResponse.json({ error: "Could not load your vocabulary." }, { status: 500 });
  }

  // entry_type と meaning<>word の両方をここで落とす。判定は srs.ts の純関数。
  const reviewable = (entryRows ?? []).filter((e) =>
    isReviewable(e as unknown as CardRow & { meaning: string; word: string }),
  ) as unknown as CardRow[];
  const byId = new Map(reviewable.map((e) => [e.id, e]));

  // 期限切れ。単語帳から消えた語や、出題対象でなくなった語は落ちる。
  const dueCards: SrsCard[] = [];
  for (const d of dueAll) {
    const entry = byId.get(d.id);
    if (entry) dueCards.push({ ...entry, stage: d.stage, isNew: false });
  }

  // 新規 = SRS 行がまだ無い語。srs_graduated_at や due_on ではなく「行の有無」で
  // 判定するので、卒業済みの語がここに紛れることはない。
  const known = new Set((dueRows ?? []).map((r) => r.vocabulary_entry_id as string));
  const { data: allSrsRows, error: allSrsError } = await supabase
    .from("vocabulary_srs")
    .select("vocabulary_entry_id")
    .eq("user_id", user.id);

  if (allSrsError && !isSchemaMissing(allSrsError)) {
    console.error("[vocab/srs] srs id lookup failed:", allSrsError.message);
  }
  for (const r of allSrsRows ?? []) known.add(r.vocabulary_entry_id as string);

  const newCards: SrsCard[] = reviewable
    .filter((e) => !known.has(e.id))
    .map((e) => ({ ...e, stage: SRS_NEW_STAGE, isNew: true }));

  // ── 枠に収める ──────────────────────────────────────────
  const capped =
    remaining === Number.POSITIVE_INFINITY
      ? [...dueCards, ...newCards]
      : [...dueCards, ...newCards].slice(0, remaining);

  return NextResponse.json({
    cards: capped,
    plan,
    limit,
    usedToday,
    /** 枠に入りきらず今日は出さない期限切れ。UI が「あと N 枚は明日」を出す。 */
    dueRemaining: Math.max(0, dueCards.length + newCards.length - capped.length),
    /** 単語帳に出題できる語が1つも無い = まだ何も保存していない状態。 */
    hasReviewable: reviewable.length > 0,
    today,
  });
}
