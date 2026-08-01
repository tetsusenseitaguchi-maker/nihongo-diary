/**
 * Text-to-speech (audio playback) settings and allowance.
 *
 * Deliberately separate from PLAN_LIMITS in plans.ts, which drives
 * billing-adjacent behaviour and is hands-off. Nothing here reads or writes
 * correction_count / translation_count.
 *
 * ⚠️ Unit difference from every other counter in this app: this allowance is
 * a LIFETIME total, not a daily one. It is stored in public.audio_usage
 * (supabase/add-audio-limit.sql), a table keyed by user_id alone, with no
 * usage_date column and no daily reset. Do not route it through
 * usage_limits — that table is unique(user_id, usage_date).
 *
 * The limit is passed to try_use_audio() by the caller, same as the
 * correction / translation / recheck functions, so changing this number is an
 * app-side change with no migration.
 */
export const AUDIO_LIFETIME_LIMIT = 3;

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
