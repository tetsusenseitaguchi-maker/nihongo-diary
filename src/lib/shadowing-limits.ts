import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Reading a corrected sentence aloud — how often, and where the recording goes.
 *
 * Deliberately separate from PLAN_LIMITS in plans.ts, which drives
 * billing-adjacent behaviour and is hands-off. Nothing here reads or writes
 * correction_count / translation_count / recheck_count.
 *
 * ⚠️ Unit difference from audio-limits.ts, which is the file this one is
 * modelled on: that allowance is a LIFETIME total, this one is DAILY. The
 * counters are separate tables and must stay that way — see the note at the
 * bottom of supabase/add-shadowing-limit.sql. Playing a sentence costs real
 * money at Google, so capping it for a lifetime makes sense; reading one aloud
 * costs nothing, and the point of the feature is the habit, which a lifetime
 * cap actively works against.
 *
 * Stored in public.shadowing_usage (supabase/add-shadowing-limit.sql), keyed by
 * (user_id, usage_date). Do not route it through usage_limits: that table has
 * insert and update policies, so a client can write its own counts back.
 *
 * The limit is passed to try_use_shadowing() by the caller, same as the
 * correction / translation / recheck / audio functions, so changing this number
 * is an app-side change with no migration.
 */
export const SHADOWING_DAILY_LIMIT = 1;

/**
 * How many recordings a day each plan gets. null = unlimited.
 *
 * Lives here rather than as another field on PLAN_LIMITS because plans.ts
 * drives billing-adjacent behaviour and is hands-off. normalizePlan is imported
 * and CALLED but never modified.
 *
 * Only the Free row is a number, so only Free ever reaches try_use_shadowing.
 * A paid learner's recordings are not counted at all: the RPC is skipped, no
 * row accumulates in shadowing_usage, and nothing has to be reset when they
 * upgrade. Same shape as AUDIO_LIFETIME_LIMITS and translationsPerDay.
 */
export const SHADOWING_DAILY_LIMITS: Record<Plan, number | null> = {
  free: SHADOWING_DAILY_LIMIT,
  plus: null,
  pro: null,
  teacher_feedback: null,
};

/**
 * Daily recording allowance for a raw profiles.plan value, or null for
 * unlimited. An unreadable / unknown plan resolves to Free through
 * normalizePlan, which is the safe direction: the worst case is a paid learner
 * being metered, never an unmetered free one.
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
