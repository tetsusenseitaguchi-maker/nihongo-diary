import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rubyToSsml } from "@/lib/ruby-ssml";
import { refundAudio } from "@/lib/audio-refund";
import {
  AUDIO_LIFETIME_LIMIT,
  TTS_VOICE,
  TTS_SPEAKING_RATE,
  TTS_LANGUAGE_CODE,
} from "@/lib/audio-limits";

export const runtime = "nodejs";

// POST { text: string, kind: "word" | "expression" | "diary" }
// → 200 audio/mpeg (the MP3 bytes), or JSON { error } on failure.
//
// Nothing calls this yet — the UI lands in steps 3–5.
//
// Consumes the LIFETIME audio allowance via try_use_audio()
// (supabase/add-audio-limit.sql). It never reads or writes correction_count /
// translation_count and never calls try_use_correction / try_use_translation /
// try_use_recheck.
//
// ── Cache ───────────────────────────────────────────────────────────────────
// Keyed by a hash of the exact SSML plus voice and rate, so identical text
// always resolves to the same object and a changed reading never returns stale
// audio. A cache hit costs NO credit — the counter is only claimed on the miss
// path, below the lookup. (The translation API once billed users on cache hits;
// the ordering here is what prevents a repeat.)
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

  // ── Claim one lifetime credit ────────────────────────────────────────────
  const { data: allowed, error: rpcError } = await supabase.rpc("try_use_audio", {
    p_user_id: user.id,
    p_limit: AUDIO_LIFETIME_LIMIT,
  });

  if (rpcError) {
    // Fail CLOSED, unlike /api/recheck. Every miss here spends real money at
    // Google, and the allowance is a lifetime one, so a broken RPC must not
    // hand out uncounted synthesis.
    console.error("[tts] try_use_audio error:", rpcError.message, "code:", rpcError.code);
    return NextResponse.json({ error: "Audio service unavailable." }, { status: 500 });
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "audio_limit_reached", upgrade: true, limit: AUDIO_LIFETIME_LIMIT },
      { status: 429 },
    );
  }

  // ── Synthesise ───────────────────────────────────────────────────────────
  let audio: Buffer;
  try {
    audio = await synthesize(ssml, apiKey);
  } catch (err) {
    console.error("[tts] synthesis failed:", err instanceof Error ? err.message : err);
    await refundAudio(supabase, user.id);
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
