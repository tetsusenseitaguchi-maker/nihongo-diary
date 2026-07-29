/**
 * POST /api/learned/scan — 「保存した表現を日記で実際に使えたか」を記録する。
 *
 * Step 3。まだどこからも呼ばれていない。日記保存側への接続は別ステップ。
 *
 * 設計の柱は3つ:
 *
 * 1. 認証必須・他人のデータには触れない
 *    anon キー + RLS のサーバークライアントだけを使う（admin.ts は使わない）。
 *    その上で全クエリに .eq("user_id", user.id) を明示している。RLS が効いて
 *    いれば冗長だが、ポリシーを1本外した瞬間に他人の単語帳を書き換える種類の
 *    事故を、コード側でも止めるため。
 *
 * 2. 冪等 — 同じ日記に何度呼んでも DB の最終状態が変わらない
 *    ・usages は unique(vocabulary_entry_id, diary_entry_id) に対して
 *      ignoreDuplicates の upsert。2回目以降は0行挿入。
 *    ・use_count は加算しない。毎回 vocabulary_usages の行数から数え直す。
 *    ・照合対象は未卒業（graduated_at is null）の語だけ。卒業済みの語は
 *      候補から外れるので、graduated_at が後から上書きされることもない。
 *
 * 3. 絶対に例外を投げない
 *    この API は日記保存の後ろで走る「おまけ」。ここが失敗しても日記が
 *    保存できない事態は許されないので、全体を try/catch で包み、
 *    失敗しても 200 + { ok: false, reason } を返してログだけ残す。
 *    唯一の例外は未認証で、これは呼び出し側のバグなので 401 を返す
 *    （他の API ルートと同じ扱い）。
 *
 * 変更禁止ロジックには一切触れていない: normalizePlan / try_use_correction /
 * correction_count / translation_count / buildRubyNotation /
 * normalizeRubyText / applyReadingDictionary / 既存 DB トリガー は
 * import も参照もしていない。use_count / graduated_at は今回追加した
 * 単語帳専用の列で、課金カウンターとは無関係。
 *
 * DB 側（vocabulary_usages と vocabulary_entries.use_count / graduated_at）は
 * Step 1 で手動作成済み。構造は supabase/add-learned-items.sql に起こしてある。
 * それでも schema_missing を見ているのは、PostgREST のスキーマキャッシュが
 * 古いときに 42P01 / PGRST205 が返ることがあり、それで日記保存を巻き込みたく
 * ないため。実測で確認したコードだけを列挙している。
 *
 * 既知の割り切り: 日記を編集して語を消しても、既に立った実績行は消えない
 * （use_count も減らない）。「一度使えた」の取り消しは学習体験として妥当で、
 * かつ再スキャンの冪等性はこの仕様でも保たれている。取り消しが要るなら
 * 別ステップで提案する。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  findUsedExpressions,
  GRADUATION_THRESHOLD,
  type LearnedCandidate,
} from "@/lib/learned-match";

export const runtime = "nodejs";

/** テーブル・列がまだ無いときに PostgREST / Postgres が返すコード。 */
const SCHEMA_MISSING_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);

function isSchemaMissing(error: { code?: string } | null): boolean {
  return !!error?.code && SCHEMA_MISSING_CODES.has(error.code);
}

/** 静かに終わるときの共通レスポンス。ステータスは常に 200。 */
function quiet(reason: string, detail?: unknown) {
  if (detail) console.error(`[learned/scan] ${reason}:`, detail);
  else console.warn(`[learned/scan] ${reason}`);
  return NextResponse.json({ ok: false, reason, matched: 0, graduated: [] });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { diaryEntryId } = body as { diaryEntryId?: string };
    if (!diaryEntryId || typeof diaryEntryId !== "string") {
      return quiet("missing_diary_entry_id");
    }

    // ---- 1. 日記の原文。user_id 一致が条件なので他人の日記は取れない ----
    // 判定は original_text だけ。corrected_japanese / natural_japanese は
    // AI の書き換えなので、そこに出た語で「使えた」を立てると指標が壊れる
    // （learned-match.ts の冒頭コメントと同じ理由）。
    const { data: diary, error: diaryError } = await supabase
      .from("diary_entries")
      .select("id, original_text")
      .eq("id", diaryEntryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (diaryError) return quiet("diary_lookup_failed", diaryError);
    if (!diary?.original_text) return quiet("diary_not_found_or_empty");

    // ---- 2. 未卒業の単語だけを候補にする ----
    // entry_type = 'word' 限定。文法パターン（〜てから 等）は形態素境界に
    // 対応しないため、トークン照合では原理的に判定できない（v1 は対象外）。
    const { data: rows, error: candError } = await supabase
      .from("vocabulary_entries")
      .select("id, word, entry_type")
      .eq("user_id", user.id)
      .eq("entry_type", "word")
      .is("graduated_at", null);

    if (isSchemaMissing(candError)) return quiet("schema_missing", candError);
    if (candError) return quiet("candidate_lookup_failed", candError);
    if (!rows || rows.length === 0) return NextResponse.json({ ok: true, matched: 0, graduated: [] });

    const candidates: LearnedCandidate[] = rows.map((r) => ({
      id: r.id as string,
      word: r.word as string,
      entryType: r.entry_type as string | null,
    }));

    // ---- 3. 照合（learned-match.ts の純関数。ここでは読むだけ）----
    const matches = findUsedExpressions(diary.original_text as string, candidates);
    if (matches.length === 0) return NextResponse.json({ ok: true, matched: 0, graduated: [] });

    // ---- 4. 実績を INSERT。既にあれば何もしない ----
    // ignoreDuplicates: true = ON CONFLICT DO NOTHING。日記を編集して
    // 再スキャンしても、同じ (語, 日記) の組は1行のままになる。
    const { error: insertError } = await supabase.from("vocabulary_usages").upsert(
      matches.map((m) => ({
        user_id: user.id,
        vocabulary_entry_id: m.id,
        diary_entry_id: diary.id,
        matched_text: m.matchedText,
      })),
      { onConflict: "vocabulary_entry_id,diary_entry_id", ignoreDuplicates: true },
    );

    if (isSchemaMissing(insertError)) return quiet("schema_missing", insertError);
    if (insertError) return quiet("usage_insert_failed", insertError);

    // ---- 5. use_count を count(*) から数え直す ----
    // 加算（use_count + 1）にしない。加算だと、INSERT が重複で弾かれた回や
    // 途中でリトライが挟まった回にズレが出て、しかも自己修復しない。
    // 数え直しなら、何回呼んでも必ず実績行数と一致する。
    const matchedIds = matches.map((m) => m.id);
    const { data: usageRows, error: countError } = await supabase
      .from("vocabulary_usages")
      .select("vocabulary_entry_id")
      .eq("user_id", user.id)
      .in("vocabulary_entry_id", matchedIds);

    if (countError) return quiet("usage_count_failed", countError);

    const counts = new Map<string, number>();
    for (const row of usageRows ?? []) {
      const id = row.vocabulary_entry_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    // ---- 6. use_count と graduated_at を書き戻す ----
    // graduated_at は閾値に達した回だけ入れる。候補は graduated_at is null に
    // 絞ってあるので、卒業済みの語のタイムスタンプがずれることはない。
    // ここは「今日」の判定ではなく単なる発生時刻なので、todayInTZ ではなく
    // ISO の絶対時刻でよい（streak 系のタイムゾーン処理とは無関係）。
    const now = new Date().toISOString();
    const graduated: string[] = [];

    await Promise.all(
      matchedIds.map(async (id) => {
        const useCount = counts.get(id) ?? 0;
        if (useCount === 0) return;

        const reachedThreshold = useCount >= GRADUATION_THRESHOLD;
        const patch: { use_count: number; graduated_at?: string } = { use_count: useCount };
        if (reachedThreshold) patch.graduated_at = now;

        const { error: updateError } = await supabase
          .from("vocabulary_entries")
          .update(patch)
          .eq("id", id)
          .eq("user_id", user.id)
          .is("graduated_at", null); // 卒業済みは触らない = 二重卒業なし

        if (updateError) {
          // 1語の失敗で他の語を巻き込まない。次回のスキャンで数え直される。
          console.error(`[learned/scan] use_count update failed for ${id}:`, updateError);
          return;
        }
        if (reachedThreshold) graduated.push(id);
      }),
    );

    return NextResponse.json({
      ok: true,
      matched: matches.length,
      used: matches.map((m) => ({
        id: m.id,
        word: m.word,
        matchedText: m.matchedText,
        useCount: counts.get(m.id) ?? 0,
      })),
      graduated,
    });
  } catch (err) {
    // 想定外の例外も外に出さない。日記保存を巻き込まないことが最優先。
    return quiet("unexpected_error", err);
  }
}
