import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Reading a corrected sentence aloud — how often, and where the recording goes.
 *
 * Deliberately separate from PLAN_LIMITS in plans.ts, which drives
 * billing-adjacent behaviour and is hands-off. Nothing here reads or writes
 * correction_count / translation_count / recheck_count.
 *
 * Both this and audio-limits.ts are daily now — audio was a lifetime total of
 * three when this file was written, and moved for the same reason this one
 * never was one: a cap measured in a lifetime cannot support a habit measured
 * in days.
 *
 * ⚠️ They remain separate tables and must stay that way — see the note at the
 * bottom of supabase/add-shadowing-limit.sql. Sharing one counter would spend
 * two credits on the single act of listening to a sentence and then reading it
 * back, which is precisely the loop the day is built around.
 *
 * Stored in public.shadowing_usage (supabase/add-shadowing-limit.sql), keyed by
 * (user_id, usage_date). Do not route it through usage_limits: that table has
 * insert and update policies, so a client can write its own counts back.
 *
 * The limit is passed to try_use_shadowing() by the caller, same as the
 * correction / translation / recheck / audio functions, so changing this number
 * is an app-side change with no migration.
 */
/**
 * The number Free used to get, kept for one reason: putting the cap back is
 * `free: SHADOWING_DAILY_LIMIT` below and nothing else. Nothing references it
 * while every plan is unlimited.
 */
export const SHADOWING_DAILY_LIMIT = 1;

/**
 * How many recordings a day each plan gets. null = unlimited.
 *
 * Lives here rather than as another field on PLAN_LIMITS because plans.ts
 * drives billing-adjacent behaviour and is hands-off. normalizePlan is imported
 * and CALLED but never modified.
 *
 * ── Free is unlimited too, as of this change ─────────────────────────────
 * Reading a sentence aloud costs nothing: the recording is made by the
 * browser's own microphone and goes straight to Storage, and no model, no
 * synthesis and no API call happens on the way. The expensive half of the
 * exercise is HEARING the model sentence, and that is already metered by the
 * audio allowance in audio-limits.ts — a Free learner cannot listen more than
 * that allows however many times they record. Metering the free half as well
 * only stopped people practising.
 *
 * So no row is a number now, and try_use_shadowing is unreachable from the
 * app: /api/shadowing/use returns { counted: false } before the RPC on every
 * plan. The function, the table and its policies stay exactly as they are —
 * the limit is passed in from here, so there is no migration in either
 * direction, and shadowing_usage keeps whatever rows it already has.
 *
 * Same shape as AUDIO_DAILY_LIMITS and translationsPerDay.
 */
export const SHADOWING_DAILY_LIMITS: Record<Plan, number | null> = {
  free: null,
  plus: null,
  pro: null,
  teacher_feedback: null,
};

/**
 * Daily recording allowance for a raw profiles.plan value, or null for
 * unlimited. An unreadable / unknown plan resolves to Free through
 * normalizePlan — which now returns null like every other row, so a failed
 * plan lookup can no longer meter anyone by accident either.
 */
export function shadowingLimitFor(plan: string | null | undefined): number | null {
  return SHADOWING_DAILY_LIMITS[normalizePlan(plan)];
}

/**
 * Where recordings live. Private (public = false) — unlike diary-audio, which
 * is world-readable by URL. Read back through a signed URL, never getPublicUrl.
 *
 * Path is `${user.id}/${entryId}.${ext}`, one recording per diary, overwritten
 * on a re-record. The first path segment has to be the user id or the storage
 * policies reject the write (supabase/add-shadowing-audio.sql).
 */
export const SHADOWING_BUCKET = "shadowing-audio";

/**
 * 10 MB, matching file_size_limit on the bucket.
 *
 * Both are needed and they guard different things: the bucket limit is the one
 * that actually holds, because the browser uploads straight to Storage with the
 * learner's own session and never passes through a route that could check. This
 * constant is so the UI can fail early with a sentence the learner understands,
 * rather than on a storage error.
 *
 * Nothing a microphone produces in two minutes comes close — a minute of Opus
 * is roughly 300 KB. The ceiling is for a stuck recorder, not for normal use.
 */
export const SHADOWING_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Hard stop for a recording, in seconds.
 *
 * A sentence from a diary takes ten to twenty seconds to read. Two minutes is
 * far past that on purpose: the cap exists to catch a learner who walked away
 * with the recorder running, not to hurry anyone. Without it a forgotten tab
 * records until the page closes and then uploads all of it.
 */
export const SHADOWING_MAX_SECONDS = 120;
