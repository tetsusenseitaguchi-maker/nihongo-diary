import { NextResponse } from "next/server";
import { sendPush } from "@/lib/apns";
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
  if (!pushToken) {
    // No device registered — nothing to send, and that's fine.
    return NextResponse.json({ ok: true, skipped: "no push_token" });
  }

  const locale = normaliseLocale(
    (recipient?.preferred_language as string | null) ?? undefined,
  );
  const t = await getServerT(locale);

  // Actor display name for the {name} slot, mirroring the bell UI's fallback.
  let actorName = t("notification.someone");
  if (record?.actor_id) {
    const { data: actor } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", record.actor_id)
      .maybeSingle();
    actorName =
      (actor?.display_name as string | null)?.trim() ||
      (actor?.username as string | null)?.trim() ||
      actorName;
  }

  const title = "Nihongo Diary";
  const body = t(copyKey, { name: actorName });

  // sendPush never throws — a push failure must not fail the webhook.
  await sendPush(pushToken, title, body);

  return NextResponse.json({ ok: true });
}
