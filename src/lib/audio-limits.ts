import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Text-to-speech (audio playback) settings and allowance.
 *
 * Deliberately separate from PLAN_LIMITS in plans.ts, which drives
 * billing-adjacent behaviour and is hands-off. Nothing here reads or writes
 * correction_count / translation_count.
 *
 * ⚠️ This was a LIFETIME total of three and is now a DAILY one. The old
 * counter was fine while audio was a garnish; it stops working the moment the
 * day has a shape — listen, read aloud, write down, and the same sentence
 * again tomorrow. Three for a lifetime means that runs for three days and then
 * says "no" every morning after. A learner should be able to go round once a
 * day for free and pay only to go round again.
 *
 * Stored in public.audio_usage_daily (supabase/add-audio-daily.sql), keyed by
 * (user_id, usage_date). The old public.audio_usage and its two functions are
 * deliberately still there, untouched: pointing this file and /api/tts back at
 * them is the whole rollback.
 *
 * Do not route it through usage_limits — that table has insert and update
 * policies, so a client can write its own counts back.
 *
 * ⚠️ One a day is only enough because a cache hit costs nothing. The flow
 * plays the same sentence four times across two days (listen, read aloud,
 * dictate, dictate again), and all but the first resolve to the cached clip
 * without reaching the counter — /api/tts looks the cache up ABOVE the claim,
 * and that ordering is now load-bearing rather than merely thrifty.
 *
 * The limit is passed to try_use_audio_daily() by the caller, same as the
 * correction / translation / recheck / shadowing functions, so changing this
 * number is an app-side change with no migration.
 */
export const AUDIO_DAILY_LIMIT = 1;

/**
 * How many new clips a day each plan gets. null = unlimited.
 *
 * Lives here rather than as another field on PLAN_LIMITS because plans.ts
 * drives billing-adjacent behaviour and is hands-off; this file was split out
 * for exactly that reason. normalizePlan is imported and CALLED but never
 * modified — plan determination stays the one function it has always been.
 *
 * Only the Free row is a number, so only Free ever reaches
 * try_use_audio_daily. A paid learner's plays are not counted at all: the RPC
 * is skipped, no row accumulates in audio_usage_daily, and nothing has to be
 * reset when they upgrade. Same shape as translationsPerDay in plans.ts, and
 * /api/tts branches on it the same way /api/translate does.
 */
export const AUDIO_DAILY_LIMITS: Record<Plan, number | null> = {
  free: AUDIO_DAILY_LIMIT,
  plus: null,
  pro: null,
  teacher_feedback: null,
};

/**
 * Daily audio allowance for a raw profiles.plan value, or null for unlimited.
 * An unreadable / unknown plan resolves to Free through normalizePlan, which
 * is the safe direction: the worst case is a paid learner being metered, never
 * an unmetered free one.
 */
export function audioLimitFor(plan: string | null | undefined): number | null {
  return AUDIO_DAILY_LIMITS[normalizePlan(plan)];
}

/**
 * Voice and speed, fixed for every request.
 *
 * ja-JP-Wavenet-A at 0.9 was chosen from a listening comparison against
 * Neural2-B and the Chirp3-HD voices. Wavenet also fully supports SSML,
 * which the <sub> reading substitution in ruby-ssml.ts depends on — the
 * Chirp3-HD voices handle markup differently and would need a different
 * request shape.
 *
 * ⚠️ These two values are part of the cache key. Changing either one makes
 * every previously cached clip unreachable (the hash changes), so old objects
 * become dead weight in the bucket rather than being overwritten.
 */
export const TTS_VOICE = "ja-JP-Wavenet-A";
export const TTS_SPEAKING_RATE = 0.9;
export const TTS_LANGUAGE_CODE = "ja-JP";

/**
 * The two size guards /api/tts rejects a request with, in that order.
 *
 * Google rejects SSML documents over 5000 bytes. The character cap is the
 * first guard; the byte check after building the SSML is the real one, since
 * <sub alias="…"> roughly doubles a heavily-ruby'd string.
 *
 * Exported rather than kept private to the route because the client now has to
 * predict the answer: naturalAudioChoice() offers the whole natural version to
 * a paid learner only when it would actually synthesise, and falls back to the
 * one sentence when it would not. A second copy of these numbers that drifted
 * from the route's would turn that fallback into a button that does nothing.
 */
export const MAX_INPUT_CHARS = 1000;
export const MAX_SSML_BYTES = 4800;
