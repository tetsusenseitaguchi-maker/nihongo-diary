import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayInTZ } from "@/lib/date-tz";
import { validateTZ } from "@/lib/tz-server";
import { sendPush } from "@/lib/apns";

export const runtime = "nodejs";

function prevDay(s: string): string {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

function subtractDays(s: string, n: number): string {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() - n);
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", user.id)
    .single();
  const pushToken = (profile?.push_token as string | null) ?? null;

  const cookieStore = await cookies();
  const rawTz = cookieStore.get("user_tz")?.value;
  const tz = rawTz ? validateTZ(decodeURIComponent(rawTz)) : "UTC";
  const today = todayInTZ(tz);
  const yesterday = prevDay(today);

  // ── Obie 1: Haven't written today (max once per 18 hours) ──────────────
  const eighteenHoursAgo = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();

  const [{ count: diaryToday }, { count: obieWriteRecent }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("diary_date", today),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "obie_write")
      .gte("created_at", eighteenHoursAgo),
  ]);

  if ((diaryToday ?? 0) === 0 && (obieWriteRecent ?? 0) === 0) {
    await supabase
      .from("notifications")
      .insert({ user_id: user.id, type: "obie_write" });
    if (pushToken) {
      void sendPush(pushToken, "今日の日記を書こう 📝", "毎日続けることが上達の近道です。");
    }
  }

  // ── Obie 2: Streak milestone ────────────────────────────────────────────
  const { data: allDates } = await supabase
    .from("diary_entries")
    .select("diary_date")
    .eq("user_id", user.id)
    .order("diary_date", { ascending: false });

  const dateSet = new Set((allDates ?? []).map((r) => r.diary_date as string));

  let streak = 0;
  let cur = today;
  if (!dateSet.has(cur)) cur = prevDay(cur);
  while (dateSet.has(cur)) {
    streak++;
    cur = prevDay(cur);
  }

  const MILESTONES = [3, 7, 14, 30, 60, 100];
  if (MILESTONES.includes(streak)) {
    const { data: existingStreakNotifs } = await supabase
      .from("notifications")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("type", "obie_streak");

    const alreadySent = (existingStreakNotifs ?? []).some(
      (n) => (n.metadata as Record<string, unknown>)?.streak === streak
    );

    if (!alreadySent) {
      await supabase
        .from("notifications")
        .insert({ user_id: user.id, type: "obie_streak", metadata: { streak } });
      if (pushToken) {
        void sendPush(pushToken, `🎉 ${streak}日連続達成！`, "すばらしい！この調子で続けよう。");
      }
    }
  }

  // ── Obie 3: Welcome back (away for 7+ days) ────────────────────────────
  // Check past 7 days EXCLUDING today so the returning user still gets welcomed
  // even if they just wrote a diary today.
  const sevenDaysAgo = subtractDays(today, 7);

  const [{ count: recentDiaries }, { count: olderDiaries }] = await Promise.all([
    // Diaries in the last 7 days, excluding today
    supabase
      .from("diary_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("diary_date", sevenDaysAgo)
      .lte("diary_date", yesterday),
    // Diaries older than 7 days (confirms the user is not brand-new)
    supabase
      .from("diary_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lt("diary_date", sevenDaysAgo),
  ]);

  if ((olderDiaries ?? 0) > 0 && (recentDiaries ?? 0) === 0) {
    const { count: recentWelcomeBack } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "obie_welcome_back")
      .gte("created_at", sevenDaysAgo + "T00:00:00Z");

    if ((recentWelcomeBack ?? 0) === 0) {
      await supabase
        .from("notifications")
        .insert({ user_id: user.id, type: "obie_welcome_back" });
      if (pushToken) {
        void sendPush(pushToken, "おかえり！👋", "久しぶりですね。また一緒に日本語を練習しましょう。");
      }
    }
  }

  return NextResponse.json({ ok: true });
}
