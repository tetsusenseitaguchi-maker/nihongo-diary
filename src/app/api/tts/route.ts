import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rubyToSsml } from "@/lib/ruby-ssml";
import { refundAudio } from "@/lib/audio-refund";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import {
  audioLimitFor,
  TTS_VOICE,
  TTS_SPEAKING_RATE,
  TTS_LANGUAGE_CODE,
} from "@/lib/audio-limits";

export const runtime = "nodejs";

// POST { text: string, kind: "word" | "expression" | "diary" }
// → 200 audio/mpeg (the MP3 bytes), or JSON { error } on failure.
//
// Called by <PlayButton/> from the saved-word row, the vocabulary list and the
// correction result.
//
// ── Allowance ───────────────────────────────────────────────────────────────
// Free only. audioLimitFor() resolves profiles.plan to a number of plays per
// DAY or to null for the paid plans, and try_use_audio_daily()
// (supabase/add-audio-daily.sql) is called only in the first case. Paid
// learners are not counted at all. It never reads or writes correction_count /
// translation_count and never calls try_use_correction / try_use_translation /
// try_use_recheck / try_use_shadowing.
//
// This used to be three plays for a lifetime, against public.audio_usage. That
// table and its two functions are still there and still untouched — switching
// the three call sites below back to them is the entire rollback.
//
// ── Cache ───────────────────────────────────────────────────────────────────
// Keyed by a hash of the exact SSML plus voice and rate, so identical text
// always resolves to the same object and a changed reading never returns stale
// audio. A cache hit costs NO credit — the counter is only claimed on the miss
// path, below the lookup. (The translation API once billed users on cache hits;
// the ordering here is what prevents a repeat.)
//
// ⚠️ That ordering is now load-bearing, not just thrifty. One play a day only
// works because the day's flow plays ONE sentence four times across two days —
// listen, read aloud, dictate, dictate again tomorrow — and only the first of
// those reaches the counter. Move the claim above the lookup and a Free
// learner is locked out before they have read anything aloud.
//
// Two buckets, split by whether the text is personal:
//   tts-shared … words and expressions. Content-addressed only, no user id in
//                the path, so every learner reuses one clip of 「公園」. This
//                bucket must NEVER be added to STORAGE_BUCKETS in
//                /api/account/delete — one user's deletion would take away
//                audio that other users' cache entries still point at.
//   tts-diary  … the learner's own diary text, which is personal data. Stored
//                under ${user.id}/ and listed in STORAGE_BUCKETS so account
//                deletion removes it.

const SHARED_BUCKET = "tts-shared";
const DIARY_BUCKET = "tts-diary";

const KINDS = ["word", "expression", "diary"] as const;
type Kind = (typeof KINDS)[number];

// Google rejects SSML documents over 5000 bytes. The character cap is the
// first guard; the byte check after building the SSML is the real one, since
// <sub alias="…"> roughly doubles a heavily-ruby'd string.
const MAX_INPUT_CHARS = 1000;
const MAX_SSML_BYTES = 4800;

const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

function audioResponse(body: BodyInit, cache: "hit" | "miss"): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      // Content-addressed, so a given response body can never change.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-TTS-Cache": cache,
    },
  });
}

/**
 * Call Google Cloud TTS. Throws on any non-2xx or empty result so the caller
 * can refund in one place.
 *
 * The API key travels as a query parameter, so the request URL must never be
 * logged — only res.status and the response body, neither of which contain it.
 */
async function synthesize(ssml: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: TTS_LANGUAGE_CODE, name: TTS_VOICE },
      audioConfig: { audioEncoding: "MP3", speakingRate: TTS_SPEAKING_RATE },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google TTS ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { audioContent?: unknown };
  if (typeof json.audioContent !== "string" || !json.audioContent) {
    throw new Error("Google TTS returned no audioContent");
  }

  const audio = Buffer.from(json.audioContent, "base64");
  if (audio.length === 0) {
    throw new Error("Google TTS returned empty audio");
  }
  return audio;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text: unknown;
  let kind: unknown;
  try {
    ({ text, kind } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (raw.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }
  if (typeof kind !== "string" || !KINDS.includes(kind as Kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // Server-only. Never NEXT_PUBLIC_ — the key is unrestricted and billable.
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.error("[tts] GOOGLE_TTS_API_KEY is not set");
    return NextResponse.json({ error: "Audio service unavailable." }, { status: 503 });
  }

  const ssml = rubyToSsml(raw);
  if (Buffer.byteLength(ssml, "utf8") > MAX_SSML_BYTES) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }

  // Voice and rate are in the key so a future settings change cannot serve
  // audio recorded with the old ones.
  const hash = createHash("sha256")
    .update(`${TTS_VOICE}|${TTS_SPEAKING_RATE}|${ssml}`)
    .digest("hex");

  const isPersonal = kind === "diary";
  const bucket = isPersonal ? DIARY_BUCKET : SHARED_BUCKET;
  const path = isPersonal ? `${user.id}/${hash}.mp3` : `${hash}.mp3`;

  // Admin client: the shared bucket is by design not owned by any user, and
  // the personal path is scoped to user.id explicitly on the line above.
  const admin = createAdminClient();

  // ── Cache lookup — must stay ABOVE try_use_audio ──────────────────────────
  const { data: cached, error: downloadErr } = await admin.storage.from(bucket).download(path);
  if (cached) {
    return audioResponse(cached, "hit");
  }
  if (downloadErr) {
    // Expected on a genuine miss ("Object not found"). Logged because a
    // storage outage looks identical here and would quietly burn credits
    // regenerating audio that already exists.
    console.warn(`[tts] cache miss on ${bucket}: ${downloadErr.message}`);
  }

  // ── Claim one lifetime credit, but only on a metered plan ────────────────
  // Read AFTER the cache lookup so a hit still costs no round trip.
  //
  // Only `plan` is selected. Widening this select is how the timezone
  // incident happened: one absent column makes the whole query error, prof
  // comes back null, and normalizePlan(undefined) silently reads every paid
  // learner as Free.
  // `timezone` joins `plan` here because the allowance is daily now and the
  // day has to be the learner's, not the database's. It is the same column
  // /api/correct reads for the same reason (route.ts:312), so this is not new
  // exposure to the missing-column failure that once turned every user Free —
  // and if the read does fail, plan resolves to free and the timezone falls
  // back to the cookie, which is the safe direction on both counts.
  const { data: prof, error: planError } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  if (planError) {
    // Metered below (normalizePlan turns undefined into "free"), which is the
    // safe direction, but it is worth knowing about: a broken profiles read
    // shows up as paid learners suddenly capped at the Free allowance.
    console.error("[tts] plan lookup failed:", planError.message);
  }

  const limit = audioLimitFor(prof?.plan);
  // null = unlimited. The RPC is skipped entirely rather than called with a
  // large number, so a paid learner accumulates no audio_usage_daily row at
  // all — the same shape as translationsPerDay === null in /api/translate.
  const metered = limit !== null;

  // Read the clock ONCE, and only on the metered path. Both the claim and the
  // refund below use this exact string: the counter is one row per day, so a
  // request that claims a slot at 23:59:59 and fails at 00:00:01 must put the
  // credit back into yesterday's row, not open tomorrow's. Cookie first
  // (TimezoneSyncer sets it), then the profile column, both validated.
  let today = "";
  if (metered) {
    let tz = await getTimezoneFromCookie();
    const dbTz = prof?.timezone as string | null | undefined;
    if (tz === "UTC" && dbTz) tz = validateTZ(dbTz);
    today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const { data: allowed, error: rpcError } = await supabase.rpc("try_use_audio_daily", {
      p_user_id: user.id,
      p_date: today,
      p_limit: limit,
    });

    if (rpcError) {
      // Fail CLOSED, unlike /api/recheck. Every miss here spends real money at
      // Google, so a broken RPC must not hand out uncounted synthesis. Less
      // brutal than it was — the learner is now locked out for the rest of the
      // day rather than for good — but still the right direction.
      console.error("[tts] try_use_audio_daily error:", rpcError.message, "code:", rpcError.code);
      return NextResponse.json({ error: "Audio service unavailable." }, { status: 500 });
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "audio_limit_reached", upgrade: true, limit },
        { status: 429 },
      );
    }
  }

  // ── Synthesise ───────────────────────────────────────────────────────────
  let audio: Buffer;
  try {
    audio = await synthesize(ssml, apiKey);
  } catch (err) {
    console.error("[tts] synthesis failed:", err instanceof Error ? err.message : err);
    // Only when something was actually claimed. refund_audio_daily floors at
    // 0, but an unmetered request never took a credit, and an upgraded learner
    // may still carry rows from their Free days — refunding here would hand one
    // of those a discount for a failure that cost them nothing.
    //
    // `today` is the string the claim used, not a fresh reading of the clock.
    if (metered) await refundAudio(supabase, user.id, today);
    return NextResponse.json({ error: "Could not generate audio." }, { status: 502 });
  }

  // ── Populate the cache ───────────────────────────────────────────────────
  // No refund if this fails: the credit did buy audio and that audio is being
  // returned below. The only cost is that the next identical request misses
  // again. upsert covers the race where two requests generate the same clip.
  const { error: uploadErr } = await admin.storage.from(bucket).upload(path, audio, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (uploadErr) {
    console.error(`[tts] cache write to ${bucket} failed:`, uploadErr.message);
  }

  return audioResponse(new Uint8Array(audio), "miss");
}
