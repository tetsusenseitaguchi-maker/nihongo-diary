import { NextResponse } from "next/server";
import { sendPush } from "@/lib/apns";
import { sendWebPush } from "@/lib/web-push";
import { notificationHref } from "@/lib/notification-href";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerT } from "@/lib/i18n-server";
import { normaliseLocale } from "@/lib/i18n";

export const runtime = "nodejs";

/**
 * Social push notifications — triggered by a Supabase Database Webhook on
 * INSERT into public.notifications.
 *
 * The webhook posts the inserted row here; we resolve the recipient's device
 * token and preferred language, build a localized message, and send it via
 * APNs. In-app notification rows are still created by the existing
 * notify_on_* DB triggers — this endpoint only mirrors them to push.
 *
 * Auth: requires the x-push-secret header to equal PUSH_INTERNAL_SECRET.
 * Configure the same secret as a custom header on the Supabase webhook.
 *
 * Self-notification exclusion and dedup already happen inside the DB triggers
 * before the row is inserted, so any row that reaches this webhook is one we
 * genuinely want to push — no extra filtering needed here beyond skipping the
 * Obie types (those already send their own push inline in the obie route).
 */

// Notification types that map to a social push. Obie types are intentionally
// excluded so the webhook never double-sends what the obie route already pushed.
const PUSH_COPY: Record<string, string> = {
  follow: "notification.follow",
  new_diary: "notification.newDiary",
  reaction: "notification.reaction",
  comment: "notification.comment",
  reply: "notification.reply",
};

interface NotificationRecord {
  user_id?: string;
  actor_id?: string | null;
  type?: string;
  /** Both of these have always arrived — the Supabase webhook posts the whole
   *  row — and were simply not declared. diary_entry_id is what lets a tapped
   *  notification open the diary it is about. */
  diary_entry_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function POST(req: Request) {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  // Secret is mandatory — without it, this endpoint would be open to anyone.
  if (!secret) {
    console.error("[push/send] PUSH_INTERNAL_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (req.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Supabase webhook payload: { type, table, record, old_record, schema }
  let record: NotificationRecord | undefined;
  try {
    const parsed = await req.json();
    record = parsed?.record as NotificationRecord | undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = record?.type;
  const recipientId = record?.user_id;
  if (!type || !recipientId) {
    return NextResponse.json({ error: "Malformed record" }, { status: 400 });
  }

  // Only social types get a push. Obie / unknown types are a no-op success.
  const copyKey = PUSH_COPY[type];
  if (!copyKey) {
    return NextResponse.json({ ok: true, skipped: "non-social type" });
  }

  const admin = createAdminClient();

  // Recipient's device token + preferred language (service role bypasses RLS).
  const { data: recipient } = await admin
    .from("profiles")
    .select("push_token, preferred_language")
    .eq("id", recipientId)
    .maybeSingle();

  const pushToken = (recipient?.push_token as string | null) ?? null;

  const locale = normaliseLocale(
    (recipient?.preferred_language as string | null) ?? undefined,
  );
  const t = await getServerT(locale);

  // Actor display name for the {name} slot, mirroring the bell UI's fallback.
  // The username is kept as well: notificationHref needs it to point a follow
  // at the right profile, and this is the read that already has it.
  let actorName = t("notification.someone");
  let actorUsername: string | null = null;
  if (record?.actor_id) {
    const { data: actor } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", record.actor_id)
      .maybeSingle();
    actorUsername = (actor?.username as string | null) ?? null;
    actorName =
      (actor?.display_name as string | null)?.trim() ||
      actorUsername?.trim() ||
      actorName;
  }

  const title = "Nihongo Diary";
  const body = t(copyKey, { name: actorName });

  /**
   * ⚠️ ONE if/else, and it is the only thing preventing the same person from
   * being notified twice for the same event.
   *
   * Do not turn this into two independent `if`s, and do not "also send the
   * web push for reliability". Both of those mean one notification arriving
   * twice on the same person's phone.
   *
   * Why the check has to live here rather than being assumed away: the client
   * refuses to subscribe inside the Capacitor shell (web-push-client.ts), but
   * that is a decision made in the browser and proves nothing to this server.
   * Whether the iOS WKWebView even exposes PushManager was never confirmed on
   * a device. So the rule is enforced as a fact about what this route does —
   * a learner holding a push_token gets APNs and nothing else — instead of as
   * a belief about what could not have happened.
   *
   * Known consequence, accepted: someone who deleted the app still has a
   * push_token, so their web browsers hear nothing. That is exactly what
   * happens today (the APNs send fails silently), so it is not a regression,
   * and fixing it would mean reading a result out of sendPush — which lives
   * in apns.ts and is not to be touched.
   */
  if (pushToken) {
    // APNs — unchanged, and the only path for anyone with a registered device.
    // sendPush never throws; a push failure must not fail the webhook.
    await sendPush(pushToken, title, body);
    return NextResponse.json({ ok: true, rail: "apns" });
  }

  // No device registered. Browsers, if this learner subscribed any — a path
  // that reaches everybody the App Store never did. Same contract: no throw.
  const url = notificationHref({
    type,
    diaryEntryId: record?.diary_entry_id ?? null,
    actorUsername,
  });
  await sendWebPush(recipientId, { title, body, url });

  return NextResponse.json({ ok: true, rail: "web" });
}
