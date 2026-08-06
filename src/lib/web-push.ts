import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send one Web Push notification to every browser a learner has subscribed.
 *
 * The counterpart to lib/apns.ts, and deliberately the same shape: it takes a
 * recipient and finished copy, and it NEVER throws. Every caller of sendPush
 * depends on that — a push that fails must not take down the diary save or
 * the webhook that triggered it — and this side is held to the same contract
 * so the two can sit in the branches of one if/else without the callers
 * learning anything new.
 *
 * ── Several subscriptions is not several notifications ──────────────────────
 * A learner can hold one per browser: the laptop and the tablet. Sending to
 * all of them is one notification arriving on that person's devices, which is
 * what every push system does. It is NOT the double-delivery the caller
 * guards against — that one is APNs and Web Push both firing for the same
 * person, and it is prevented at the call site in api/push/send.
 *
 * ── Service role, and why it is unavoidable here ────────────────────────────
 * This runs from a webhook: there is no session, so RLS has no auth.uid() to
 * match and the learner's own policies cannot be used. Two of the three
 * writes could not be done from a session anyway — push_subscriptions has no
 * UPDATE policy at all, on purpose, so last_used_at is only writable from
 * here.
 *
 * Touches push_subscriptions and nothing else. Not profiles, not push_token,
 * not push_notify_enabled, not apns.ts.
 */

type WebPushPayload = {
  title: string;
  body: string;
  /** Same-origin path. public/sw.js rewrites anything else to /dashboard. */
  url: string;
};

/** True once the three VAPID variables are present and handed to web-push. */
function configureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendWebPush(userId: string, payload: WebPushPayload): Promise<void> {
  try {
    if (!configureVapid()) {
      console.error("[web-push] VAPID environment variables are not configured");
      return;
    }

    const admin = createAdminClient();

    const { data: subscriptions, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      console.error("[web-push] select failed:", error.message);
      return;
    }
    if (!subscriptions || subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    const expired: string[] = [];
    const delivered: string[] = [];

    // allSettled, not all: one browser's dead endpoint must not cancel the
    // send to the others.
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const endpoint = sub.endpoint as string;
        try {
          await webpush.sendNotification(
            {
              endpoint,
              keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
            },
            body,
          );
          delivered.push(endpoint);
        } catch (e) {
          const status = (e as { statusCode?: number } | null)?.statusCode;
          // 404/410 is the push service saying this endpoint is gone for good
          // — uninstalled, permission revoked, subscription rotated. No later
          // send can succeed, so the row goes rather than failing forever.
          if (status === 404 || status === 410) {
            expired.push(endpoint);
          } else {
            console.error(`[web-push] send failed (${status ?? "?"}):`, describe(e));
          }
        }
      }),
    );

    if (expired.length > 0) {
      const { error: cleanupError } = await admin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expired);
      if (cleanupError) console.error("[web-push] cleanup failed:", cleanupError.message);
    }

    if (delivered.length > 0) {
      const { error: touchError } = await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("endpoint", delivered);
      if (touchError) console.error("[web-push] last_used_at failed:", touchError.message);
    }

    console.log(
      `[web-push] ok → user ${userId.slice(0, 8)}… sent=${delivered.length} removed=${expired.length}`,
    );
  } catch (err) {
    // Never re-throw. Same contract as sendPush in lib/apns.ts.
    console.error("[web-push] failed:", describe(err));
  }
}

function describe(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
