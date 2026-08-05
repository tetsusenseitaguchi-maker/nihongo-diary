import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Save a Web Push subscription for the signed-in learner.
 *
 * ── Why there is a service-role delete in here ──────────────────────────────
 * An endpoint identifies a browser, not a person. Two accounts used in the
 * same browser get the same endpoint back from the push service, and the
 * table holds it unique — so the second learner's insert would collide with a
 * row they cannot see, let alone delete, and their subscription would fail
 * for reasons neither they nor the logs could explain.
 *
 * The delete below runs as the service role for exactly that case, and its
 * scope is deliberately the smallest thing that solves it:
 *
 *   - one statement, `delete where endpoint = $1`
 *   - no user_id in the filter, because widening it is what would let this
 *     clear rows belonging to endpoints other than the one being claimed
 *   - the insert that follows runs as the learner, so RLS — not this file —
 *     is what guarantees user_id is their own
 *
 * The effect is that a browser belongs to whoever most recently subscribed on
 * it, which is also what stops one device receiving two people's
 * notifications.
 *
 * unregister and test use no service role at all; the session client and RLS
 * are enough there.
 *
 * Touches only push_subscriptions. profiles.push_token, push_notify_enabled,
 * apns.ts and the four existing APNs paths are not involved.
 */

/** Long enough for real endpoints (FCM's run ~200 chars), short enough to reject junk. */
const MAX_ENDPOINT = 2000;
const MAX_KEY = 500;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: unknown; p256dh?: unknown; auth?: unknown; userAgent?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body.p256dh === "string" ? body.p256dh.trim() : "";
  const auth = typeof body.auth === "string" ? body.auth.trim() : "";
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null;

  // All three are required to encrypt a message. A row missing any of them
  // would sit in the table looking deliverable and fail on every send.
  if (!endpoint || !p256dh || !auth) {
    return badRequest("endpoint, p256dh and auth are all required");
  }
  if (endpoint.length > MAX_ENDPOINT || p256dh.length > MAX_KEY || auth.length > MAX_KEY) {
    return badRequest("Subscription fields are too long");
  }
  // Push services all issue https endpoints. Anything else is not one.
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return badRequest("endpoint is not a valid URL");
  }
  if (parsed.protocol !== "https:") {
    return badRequest("endpoint must be https");
  }

  // ── The one service-role statement. See the note above. ───────────────────
  const { error: deleteError } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (deleteError) {
    console.error("[push/web/register] delete failed:", deleteError.message);
    return NextResponse.json({ error: "Could not save the subscription." }, { status: 500 });
  }

  // ── Back to the learner's own session. RLS checks auth.uid() = user_id. ───
  const { error: insertError } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: userAgent,
  });

  if (insertError) {
    // 23505 means another request claimed this endpoint between the delete and
    // the insert. Rare, and self-correcting — the learner can toggle again.
    const conflict = insertError.code === "23505";
    console.error("[push/web/register] insert failed:", insertError.message);
    return NextResponse.json(
      {
        error: conflict
          ? "This browser was registered by another request. Please try again."
          : "Could not save the subscription.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
