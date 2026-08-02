import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/apns";
import { getServerT } from "@/lib/i18n-server";
import { normaliseLocale } from "@/lib/i18n";
import { hasDictation } from "@/lib/dictation";

export const runtime = "nodejs";
// APNs is one HTTP/2 round trip per learner and this runs for a whole hour's
// cohort. The default ten seconds is not enough for a bad minute.
export const maxDuration = 60;

/**
 * "Yesterday's sentence" — the morning half of the two-day loop.
 *
 * Called once an hour by pg_cron (supabase/add-daily-review-cron.sql), which
 * carries no logic of its own: it POSTs here and that is all. Everything about
 * who gets a notification is decided in this file and in
 * daily_review_candidates, both of which live in version control.
 *
 * ── What reaches whom ───────────────────────────────────────────────────────
 * Only learners inside the iOS app. push_token is written by PushRegistrar,
 * which returns early in a browser, so a web-only learner can never be a
 * candidate. That is why the dashboard card was built first: for most people it
 * is not a fallback, it is the only surface this feature has.
 *
 * ── Order of operations ─────────────────────────────────────────────────────
 * Claim the day, THEN send. The insert into daily_review_sends either takes the
 * (user_id, sent_date) primary key or fails on conflict, which makes "have we
 * already sent today" a decision the database makes once, atomically. Two
 * overlapping runs cannot both get past it. Sending first and recording after
 * would leave the window where a retry duplicates a notification that already
 * woke someone up.
 *
 * A failed push after a successful claim is not retried, and that is
 * deliberate: by the next hourly run the learner's local time is no longer the
 * target hour, so the cohort has moved on. A notification that arrives an hour
 * late is worth less than the risk of sending two.
 *
 * ── What it never touches ───────────────────────────────────────────────────
 * No rows in notifications, so the bell and the Database Webhook that mirrors
 * notifications to /api/push/send are both unaffected. No counters, no plan
 * lookups, no correction / translation / audio / shadowing allowance.
 */

/** Local hour the reminder is aimed at, in the learner's own timezone. */
const DEFAULT_HOUR = 8;

/**
 * How many learners one invocation will handle.
 *
 * A ceiling rather than a target — the cohort is everyone whose local clock has
 * just struck eight, which is a slice of one timezone band, not the whole user
 * base. If it is ever reached the run says so in the response and the log
 * rather than trimming quietly, because a cap you cannot see is
 * indistinguishable from having reached everybody.
 */
const MAX_PER_RUN = 500;

/** Concurrent APNs sends. Enough to be quick, small enough to stay polite. */
const CONCURRENCY = 8;

interface Candidate {
  user_id: string;
  push_token: string;
  preferred_language: string | null;
  diary_entry_id: string;
  natural_japanese: string;
  local_date: string;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Mandatory. Without it this endpoint would let anyone on the internet
  // trigger a push to every learner whose morning it happens to be.
  if (!secret) {
    console.error("[daily-review] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // pg_cron sends "{}". The three fields below exist so this can be exercised
  // by hand without waiting for morning and without waking anybody up.
  let dryRun = false;
  let hour = DEFAULT_HOUR;
  let onlyUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = body?.dryRun === true;
    if (typeof body?.hour === "number" && Number.isInteger(body.hour) && body.hour >= 0 && body.hour <= 23) {
      hour = body.hour;
    }
    if (typeof body?.onlyUserId === "string" && body.onlyUserId) {
      onlyUserId = body.onlyUserId;
    }
  } catch {
    /* no body is the normal case */
  }

  const admin = createAdminClient();

  // p_user_id is passed explicitly, never omitted: the function has no DEFAULT
  // on it (the Supabase SQL editor would not accept one), so a missing second
  // argument is a "function does not exist" error rather than a null.
  //
  // Passing a user id also drops the hour test inside the function, which is
  // what makes onlyUserId usable at any time of day.
  const { data, error } = await admin.rpc("daily_review_candidates", {
    p_hour: hour,
    p_user_id: onlyUserId,
  });

  if (error) {
    console.error("[daily-review] candidate query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Candidate[];

  // The one filter SQL cannot do. isGradable needs the ruby markup parsed
  // (lib/dictation.ts), and writing a second definition of "markable sentence"
  // in SQL would guarantee the two drift. A diary whose sentence cannot be
  // marked has no exercise to come back to, so there is nothing to send about.
  const eligible = rows.filter((r) => hasDictation(r.natural_japanese));

  const capped = eligible.length > MAX_PER_RUN;
  if (capped) {
    console.warn(
      `[daily-review] ${eligible.length} eligible at hour ${hour}; handling ${MAX_PER_RUN} this run`,
    );
  }
  const batch = eligible.slice(0, MAX_PER_RUN);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      hour,
      onlyUserId,
      candidates: rows.length,
      eligible: eligible.length,
      capped,
      // Deliberately no push_token — a dry run is for reading, and this
      // response goes wherever the person running it is looking.
      recipients: batch.map((r) => ({
        userId: r.user_id,
        diaryEntryId: r.diary_entry_id,
        localDate: r.local_date,
        language: normaliseLocale(r.preferred_language ?? undefined),
      })),
    });
  }

  let sent = 0;
  let alreadySent = 0;
  let failed = 0;

  async function handle(row: Candidate) {
    // ── Claim the day ────────────────────────────────────────────────────
    // Primary key (user_id, sent_date). A duplicate raises 23505 and means
    // someone — an overlapping run, a pg_net retry — already has this one.
    const { error: claimErr } = await admin
      .from("daily_review_sends")
      .insert({ user_id: row.user_id, sent_date: row.local_date });

    if (claimErr) {
      if (claimErr.code === "23505") {
        alreadySent++;
      } else {
        console.error("[daily-review] claim failed:", claimErr.message);
        failed++;
      }
      return;
    }

    // ── Then send ────────────────────────────────────────────────────────
    // The learner's own language, the same way /api/push/send resolves it.
    const t = await getServerT(normaliseLocale(row.preferred_language ?? undefined));

    // The sentence itself is NOT in the message. Notifications are read on a
    // lock screen, often in front of other people, and a learner's diary is
    // theirs to show. The copy also does not scold: someone who skipped
    // yesterday is being invited, not chased.
    await sendPush(row.push_token, t("notification.dailyReview.title"), t("notification.dailyReview.body"));
    sent++;
  }

  // Small pool rather than one at a time: an hour's cohort should not take a
  // minute of wall clock, and rather than all at once, which would open a
  // hundred HTTP/2 connections to Apple in the same breath.
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    await Promise.all(batch.slice(i, i + CONCURRENCY).map(handle));
  }

  console.log(
    `[daily-review] hour=${hour} candidates=${rows.length} eligible=${eligible.length} sent=${sent} already=${alreadySent} failed=${failed}`,
  );

  return NextResponse.json({
    ok: true,
    hour,
    onlyUserId,
    candidates: rows.length,
    eligible: eligible.length,
    capped,
    sent,
    alreadySent,
    failed,
  });
}
