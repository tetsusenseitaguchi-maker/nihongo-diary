import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Send one notification to the caller's own browsers, and nobody else's.
 *
 * The confinement is structural rather than a check: the subscriptions are
 * read through the learner's own session, so the RLS policy
 * `using (auth.uid() = user_id)` is what decides which rows exist to send to.
 * There is no user id in the request body to get wrong, and no service role
 * in this file to bypass the policy.
 *
 * ── Expired subscriptions ───────────────────────────────────────────────────
 * A push service answers 404 or 410 for an endpoint that no longer exists —
 * browser reinstalled, permission revoked, subscription rotated. That row can
 * never succeed again, so it is deleted here rather than left to fail on
 * every future send. The delete runs as the learner too, which is enough:
 * these are their rows by construction.
 *
 * last_used_at is left alone. Updating it would need an RLS update policy
 * that deliberately does not exist; the sender in step 1 runs as the service
 * role and can set it there.
 *
 * Touches only push_subscriptions. Nothing here reads or writes push_token,
 * push_notify_enabled, or anything on profiles.
 */

const TEST_PAYLOAD = {
  title: "Nihongo Diary",
  body: "Web Push is working on this browser.",
  url: "/dashboard",
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

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!configureVapid()) {
    console.error("[push/web/test] VAPID environment variables are not configured");
    return NextResponse.json({ error: "Push is not configured on the server." }, { status: 500 });
  }

  // RLS confines this to the caller's own rows — that is the whole access check.
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("[push/web/test] select failed:", error.message);
    return NextResponse.json({ error: "Could not read your subscriptions." }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ error: "No subscription on this account yet." }, { status: 404 });
  }

  const payload = JSON.stringify(TEST_PAYLOAD);
  const expired: string[] = [];
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        payload,
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number } | null)?.statusCode;
      if (status === 404 || status === 410) {
        expired.push(sub.endpoint as string);
      } else {
        console.error("[push/web/test] send failed:", status ?? "", describe(e));
      }
    }
  }

  if (expired.length > 0) {
    // Own rows, so the session client is enough. A failure to clean up is not
    // a failure of the send — log it and report what actually happened.
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired);
    if (cleanupError) {
      console.error("[push/web/test] cleanup failed:", cleanupError.message);
    }
  }

  if (sent === 0) {
    return NextResponse.json(
      {
        error:
          expired.length > 0
            ? "That subscription had expired, so it was removed. Turn notifications off and on again."
            : "The notification could not be sent.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, sent, removed: expired.length });
}

function describe(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
