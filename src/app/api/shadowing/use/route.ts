import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { shadowingLimitFor } from "@/lib/shadowing-limits";

// POST (no body) → JSON { counted: boolean }, or 429 once the day is used up.
//
// Claims one shadowing slot for today. Called by the write page AFTER the
// recording has been made and uploaded — see the ordering note below.
//
// ── What this route deliberately does NOT do ────────────────────────────────
// It never touches audio. The recording goes straight from the browser to
// Storage with the learner's own session, the same way diary-audio uploads work
// (write/page.tsx:500). Routing several MB of Opus through a Vercel function to
// count to one would be paying for bandwidth to learn nothing.
//
// It never reads or writes correction_count / translation_count /
// recheck_count, and never calls try_use_correction / try_use_translation /
// try_use_recheck / try_use_audio. The shadowing counter is its own table.
//
// ── Ordering: record → upload → count ──────────────────────────────────────
// The claim happens last, so there is no window where a slot is spent on a
// recording the learner never got. A denied microphone, an abandoned take or a
// failed upload all stop before this route is reached, which is why
// add-shadowing-limit.sql ships no refund_shadowing to match refund_audio.
// Reversing the order means adding one.
//
// ── Allowance ───────────────────────────────────────────────────────────────
// Free only. shadowingLimitFor() resolves profiles.plan to a number of
// recordings per DAY or to null for the paid plans, and try_use_shadowing() is
// called only in the first case. Paid learners are not counted at all.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Wider than the select in /api/tts, which takes `plan` alone, because a
  // daily limit needs to know when the learner's day rolls over. `timezone` is
  // the same column /api/correct reads for the same reason (route.ts:312), so
  // this is not new exposure to the missing-column failure that once turned
  // every user Free. If the read does fail, plan resolves to free and the
  // timezone falls back to the cookie — metered and roughly right, which is the
  // safe direction on both counts.
  const { data: profile, error: planError } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  if (planError) {
    console.error("[shadowing] plan lookup failed:", planError.message);
  }

  const limit = shadowingLimitFor(profile?.plan);

  // null = unlimited. The RPC is skipped entirely rather than called with a
  // large number, so a paid learner accumulates no shadowing_usage row at all.
  if (limit === null) {
    return NextResponse.json({ counted: false });
  }

  // Cookie first (TimezoneSyncer sets it on the client), then the profile
  // column. Both are validated — an unparseable value falls back to UTC rather
  // than throwing. Same precedence as /api/correct, via the shared helpers
  // rather than a second copy of the resolution block.
  //
  // The date is computed HERE and passed to the RPC. try_use_shadowing must
  // never call current_date: that is the database's timezone, and a learner in
  // Japan would find their day rolling over at 9am.
  let tz = await getTimezoneFromCookie();
  const dbTz = profile?.timezone as string | null | undefined;
  if (tz === "UTC" && dbTz) tz = validateTZ(dbTz);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

  const { data: allowed, error: rpcError } = await supabase.rpc("try_use_shadowing", {
    p_user_id: user.id,
    p_date: today,
    p_limit: limit,
  });

  if (rpcError) {
    // Fail OPEN, unlike /api/tts.
    //
    // There, a broken RPC must not hand out uncounted synthesis, because every
    // miss spends real money at Google against a lifetime allowance. Nothing
    // here costs anything: the recording already exists and is already stored,
    // and this call only decides whether today's slot is marked used. Refusing
    // a learner who has done the exercise, because of a database blip, is a
    // worse outcome than an occasional uncounted recording.
    console.error("[shadowing] try_use_shadowing error:", rpcError.message, "code:", rpcError.code);
    return NextResponse.json({ counted: false });
  }

  if (!allowed) {
    // `upgrade` matches the shape /api/tts returns; the client is what decides
    // whether an upgrade link is appropriate, and NativeGate drops it inside
    // the iOS shell (App Store Guideline 3.1.1).
    return NextResponse.json(
      { error: "shadowing_limit_reached", upgrade: true, limit },
      { status: 429 },
    );
  }

  return NextResponse.json({ counted: true });
}
