import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { todayInTZ } from "@/lib/date-tz";
import { normalizePlan } from "@/lib/plans";
import { reviewLimitFor } from "@/lib/srs-limits";
import { isReviewable, nextSrsState, SRS_NEW_STAGE } from "@/lib/srs";

export const runtime = "nodejs";

/**
 * POST /api/vocabulary/srs/answer — カード1枚の採点。
 *
 * body: { entryId: string, correct: boolean }
 *
 * ── 1枚ごとに claim する ────────────────────────────────
 * セッション開始時にまとめて確保しない。途中でやめた学習者の枠が消えるから。
 * 既存の try_use_* 4本と同じ「使うときに1つ」の形。
 *
 * ── fail closed ────────────────────────────────────────
 * RPC が壊れたら 500 を返して通さない。fail open にすると、誰にも気づかれない
 * まま上限が消える — 料金表に載っている数字が守られていない状態になる。
 * /api/word-lookup と /api/tts が同じ判断で、緩めているのは /api/recheck だけ
 * （あれは上限を後から足した機能で、添削枠も消費しないため）。
 *
 * ⚠️ 触っていないもの: use_count / graduated_at（あれは「産出」の記録で、
 * ここが書くのは「再認」。しかも api/learned/scan は graduated_at is null で
 * 候補を絞るので、ここが書けばその語は日記側の判定から永久に外れる）。
 * vocabulary_entries も select しかしない。既存の try_use_* / learned-match.ts /
 * normalizePlan の実装にも触れていない。
 */

const SCHEMA_MISSING_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);
function isSchemaMissing(error: { code?: string } | null | undefined): boolean {
  return !!error?.code && SCHEMA_MISSING_CODES.has(error.code);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { entryId, correct } = body as { entryId?: string; correct?: boolean };

  if (!entryId || typeof entryId !== "string") {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
  }
  if (typeof correct !== "boolean") {
    return NextResponse.json({ error: "Missing correct" }, { status: 400 });
  }

  // ── その語が本当に自分のもので、出題対象か ───────────────────
  // eq("user_id") は RLS と重複するが、他人の id を投げられたときに 404 で
  // 返せるのと、entry_type / meaning の確認をここでまとめてできる。
  const { data: entry, error: entryError } = await supabase
    .from("vocabulary_entries")
    .select("id, word, meaning, entry_type")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (entryError) {
    console.error("[vocab/srs/answer] entry lookup failed:", entryError.message);
    return NextResponse.json({ error: "Could not load that word." }, { status: 500 });
  }
  if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isReviewable(entry as { entry_type?: string | null; word: string; meaning: string })) {
    return NextResponse.json({ error: "not_reviewable" }, { status: 400 });
  }

  // ── プランと「今日」 ───────────────────────────────────
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

  // ── 現在の段階 ────────────────────────────────────────
  // 行が無ければ新規。卒業済みの語はそもそも出題されないが、直接叩かれた場合に
  // 備えて 409 で返す（nextSrsState 側も卒業のまま返すので二重に守っている）。
  const { data: srsRow, error: srsError } = await supabase
    .from("vocabulary_srs")
    .select("stage, correct_count, miss_count, srs_graduated_at")
    .eq("vocabulary_entry_id", entryId)
    .maybeSingle();

  if (srsError && !isSchemaMissing(srsError)) {
    console.error("[vocab/srs/answer] srs lookup failed:", srsError.message);
  }
  if (isSchemaMissing(srsError)) {
    // SQL 未実行。カウンターも状態も書けないので、静かに断る。
    return NextResponse.json({ error: "srs_unavailable" }, { status: 503 });
  }
  if (srsRow?.srs_graduated_at) {
    return NextResponse.json({ error: "already_graduated" }, { status: 409 });
  }

  const currentStage = (srsRow?.stage as number | undefined) ?? SRS_NEW_STAGE;

  // ── 1枚ぶん claim（無制限プランは RPC を通らない）──────────────
  if (limit !== null) {
    const { data: allowed, error: rpcError } = await supabase.rpc("try_use_vocab_review", {
      p_user_id: user.id,
      p_date: today,
      p_limit: limit,
    });

    if (rpcError) {
      console.error("[vocab/srs/answer] try_use_vocab_review error:", rpcError.message, "code:", rpcError.code);
      if (isSchemaMissing(rpcError)) {
        return NextResponse.json({ error: "srs_unavailable" }, { status: 503 });
      }
      return NextResponse.json({ error: "Review is temporarily unavailable." }, { status: 500 });
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "daily_review_limit_reached", upgrade: true, plan, limit },
        { status: 429 },
      );
    }
  }

  // ── 段階を進める / 戻す ─────────────────────────────────
  const next = nextSrsState(currentStage, correct, today);

  const { error: writeError } = await supabase.from("vocabulary_srs").upsert(
    {
      vocabulary_entry_id: entryId,
      user_id: user.id,
      stage: next.stage,
      due_on: next.dueOn,
      last_reviewed_on: today,
      correct_count: ((srsRow?.correct_count as number | undefined) ?? 0) + (correct ? 1 : 0),
      miss_count: ((srsRow?.miss_count as number | undefined) ?? 0) + (correct ? 0 : 1),
      // 卒業した回だけ時刻を入れる。既に入っている行はこの手前で 409 にしている
      // ので、上書きで日時がずれることはない。
      srs_graduated_at: next.graduated ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vocabulary_entry_id" },
  );

  if (writeError) {
    // ⚠️ ここで枠は既に1つ消えている。返金はしない — 既存の refund は
    // /api/tts だけが持っていて、あれは1回が Google への実費だから。こちらは
    // DB を数行書くだけで、失敗しても学習者が失うのは今日の1枚。返金経路を
    // 増やすほうが壊れる面が広い。
    console.error("[vocab/srs/answer] srs write failed:", writeError.message);
    return NextResponse.json({ error: "Could not save your answer." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    entryId,
    stage: next.stage,
    dueOn: next.dueOn,
    graduated: next.graduated,
  });
}
