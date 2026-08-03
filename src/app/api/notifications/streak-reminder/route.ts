import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/apns";
import { getServerT } from "@/lib/i18n-server";
import { normaliseLocale } from "@/lib/i18n";
import { currentStreak } from "@/lib/streak";

export const runtime = "nodejs";
// APNs is one HTTP/2 round trip per learner and this runs for a whole hour's
// cohort. The default ten seconds is not enough for a bad minute.
export const maxDuration = 60;

/**
 * "Your streak is still going, and today is empty" — the evening half.
 *
 * Called once an hour by pg_cron (supabase/add-streak-reminder.sql), which
 * carries no logic of its own: it POSTs here and that is all. Who gets a
 * notification is decided in this file and in streak_reminder_candidates,
 * both of which live in version control.
 *
 * ── Its relationship to the morning notification ────────────────────────
 * Separate route, separate RPC, separate table, separate cron job. Nothing
 * here touches daily_review_candidates or daily_review_sends. The two answer
 * different questions — "here is yesterday's sentence again" in the morning,
 * "today is still blank" in the evening — and keeping them apart means either
 * can be switched off, or can break, without the other noticing.
 *
 * The same learner does get both on some days. Only on the days where the
 * morning notification did not work: the evening cohort is defined by "no
 * diary today", so anyone who wrote after the morning nudge is already out.
 *
 * ── What reaches whom ───────────────────────────────────────────────────
 * Only learners inside the iOS app, since push_token is written by
 * PushRegistrar which returns early in a browser. Only those whose local
 * clock has just struck their push_remind_hour (20 for everyone today). Only
 * those who wrote yesterday and have not written today. Only once a day.
 *
 * Learners whose timezone is unknown are excluded in SQL rather than fired at
 * 20:00 UTC — see the ⚠️ block in ⑤ of the SQL file. A reminder that arrives
 * at 5am is not a reminder.
 *
 * ── Order of operations ─────────────────────────────────────────────────
 * Claim the day, THEN send — the same shape as the morning route, and for the
 * same reason. The insert into streak_reminder_sends either takes the
 * (user_id, sent_date) primary key or fails on conflict, so "have we already
 * sent today" is a decision the database makes once, atomically. A failed push
 * after a successful claim is not retried: by the next hourly run the
 * learner's local clock has moved past their reminder hour, and a nudge that
 * lands an hour late is worth less than the risk of sending two.
 *
 * ── What it never touches ───────────────────────────────────────────────
 * No rows in notifications, so the bell and the Database Webhook that mirrors
 * notifications to /api/push/send are unaffected. No counters, no plan
 * lookups, no correction / translation / audio / shadowing allowance.
 */

/** How many learners one invocation will handle. A ceiling, not a target. */
const MAX_PER_RUN = 500;

/** Concurrent APNs sends. Enough to be quick, small enough to stay polite. */
const CONCURRENCY = 8;

interface Candidate {
  user_id: string;
  push_token: string;
  preferred_language: string | null;
  local_date: string;
  /** Up to 100 days of diary_date, newest first. The streak is counted here. */
  written_dates: string[] | null;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Mandatory. Without it this endpoint would let anyone on the internet
  // trigger a push to every learner whose evening it happens to be.
  if (!secret) {
    console.error("[streak-reminder] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // pg_cron sends "{}". The two fields below exist so this can be exercised by
  // hand without waiting for evening and without waking anybody up.
  let dryRun = false;
  let onlyUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = body?.dryRun === true;
    if (typeof body?.onlyUserId === "string" && body.onlyUserId) onlyUserId = body.onlyUserId;
  } catch {
    /* no body is the normal case */
  }

  const admin = createAdminClient();

  // p_user_id is passed explicitly, never omitted: the function has no DEFAULT
  // on it (the Supabase SQL editor would not accept one), so a missing argument
  // is a "function does not exist" error rather than a null. Passing a user id
  // also drops the hour test inside the function, which is what makes
  // onlyUserId usable at any time of day.
  const { data, error } = await admin.rpc("streak_reminder_candidates", {
    p_user_id: onlyUserId,
  });

  if (error) {
    console.error("[streak-reminder] candidate query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Candidate[];

  /**
   * The streak, counted here rather than in SQL.
   *
   * lib/streak.ts owns the definition — count back from the local date, with
   * yesterday allowed to stand in for an empty today — and this is the fourth
   * screen to use it. Writing the walk again in the RPC would have made a
   * fifth implementation, and the app already learned what that costs: the
   * weekly report's own copy answers 0 where the dashboard answers 36.
   *
   * The SQL guarantees yesterday exists, so this is always >= 1. It is read
   * for the copy, not for the filter.
   */
  const withStreak = rows.map((r) => ({
    row: r,
    streak: currentStreak(r.written_dates ?? [], r.local_date),
  }));

  const capped = withStreak.length > MAX_PER_RUN;
  if (capped) {
    console.warn(
      `[streak-reminder] ${withStreak.length} due this hour; handling ${MAX_PER_RUN} this run`,
    );
  }
  const batch = withStreak.slice(0, MAX_PER_RUN);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      onlyUserId,
      candidates: rows.length,
      capped,
      // Deliberately no push_token — a dry run is for reading, and this
      // response goes wherever the person running it is looking.
      recipients: batch.map((b) => ({
        userId: b.row.user_id,
        localDate: b.row.local_date,
        streak: b.streak,
        language: normaliseLocale(b.row.preferred_language ?? undefined),
      })),
    });
  }

  let sent = 0;
  let alreadySent = 0;
  let failed = 0;

  async function handle({ row, streak }: { row: Candidate; streak: number }) {
    // ── Claim the day ────────────────────────────────────────────────────
    // Primary key (user_id, sent_date). A duplicate raises 23505 and means
    // someone — an overlapping run, a pg_net retry — already has this one.
    const { error: claimErr } = await admin
      .from("streak_reminder_sends")
      .insert({ user_id: row.user_id, sent_date: row.local_date, streak_at_send: streak });

    if (claimErr) {
      if (claimErr.code === "23505") {
        alreadySent++;
      } else {
        console.error("[streak-reminder] claim failed:", claimErr.message);
        failed++;
      }
      return;
    }

    // ── Then send ────────────────────────────────────────────────────────
    const t = await getServerT(normaliseLocale(row.preferred_language ?? undefined));

    /**
     * Two things this copy does not do.
     *
     * It does not carry the diary. Notifications are read on a lock screen,
     * often in front of other people, and what someone wrote is theirs to
     * show.
     *
     * It does not say the streak ends tonight. That is the strongest version
     * of the sentence and it was deliberately not chosen: this arrives every
     * evening someone has not written, and a nightly countdown becomes a
     * nightly reproach. The title states the fact, the body offers the
     * smallest possible next step.
     *
     * Day 1 gets its own pair — "1-day streak" is a strange thing to be told,
     * and on the day this was designed 7 of the 13 people due to receive it
     * were on exactly one day.
     */
    const title = streak === 1 ? t("notification.streak.titleDayOne") : t("notification.streak.title", { n: streak });
    const body = streak === 1 ? t("notification.streak.bodyDayOne") : t("notification.streak.body");

    await sendPush(row.push_token, title, body);
    sent++;
  }

  // Small pool rather than one at a time: an hour's cohort should not take a
  // minute of wall clock, and not all at once either, which would open a
  // hundred HTTP/2 connections to Apple in the same breath.
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(batch.slice(i, i + CONCURRENCY).map(handle));
  }

  console.log(
    `[streak-reminder] candidates=${rows.length} sent=${sent} already=${alreadySent} failed=${failed}`,
  );

  return NextResponse.json({
    ok: true,
    onlyUserId,
    candidates: rows.length,
    capped,
    sent,
    alreadySent,
    failed,
  });
}
