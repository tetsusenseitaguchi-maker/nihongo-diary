import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { getDueSummary } from "@/lib/srs-server";

export const runtime = "nodejs";

/**
 * GET /api/vocabulary/srs — 今日出す分と、今日の残り枚数。
 *
 * 選び方そのものは lib/srs-server.ts にある。ダッシュボードの「今日の復習 N枚」
 * が同じ関数を呼ぶので、カードに出る数と開いたときの枚数が構造的に一致する。
 * 数える場所を2つに増やさないための薄い層。
 *
 * 読み取りだけ。カウンターは1枚採点するごとに answer 側で claim するので、
 * この画面を開くだけでは1枚も消費しない。
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // tz は cookie（TimezoneSyncer が入れる）→ profiles の順。どちらも Intl で
  // 検証してから使う。ここを new Date() のサーバー時刻にすると東の学習者の
  // 日付が1日ずれる。
  let tz = await getTimezoneFromCookie();
  if (tz === "UTC") {
    const { data: prof } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    const dbTz = prof?.timezone as string | null | undefined;
    if (dbTz) tz = validateTZ(dbTz);
  }

  const summary = await getDueSummary(supabase, user.id, tz);
  return NextResponse.json(summary);
}
