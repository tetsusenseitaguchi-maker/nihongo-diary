import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Looking up an English word while writing — how many new ones a day.
 *
 * Deliberately separate from PLAN_LIMITS in plans.ts, which drives
 * billing-adjacent behaviour and is hands-off. Nothing here reads or writes
 * correction_count / translation_count, and try_use_translation is neither
 * called nor duplicated — the tap-to-translate allowance is a different
 * feature with a different counter, and mixing them would mean a learner who
 * read a friend's diary could no longer look up a word to write their own.
 *
 * ── Why twenty ──────────────────────────────────────────────────────────
 * Measured against production rather than guessed. A Free diary is capped at
 * 300 characters (PLAN_LIMITS.free.maxChars) and the median one is 67 — about
 * 39 words. Twenty lookups is half the words in a typical diary, and one in
 * five at the 90th percentile (169 characters). Nobody looks up half the words
 * they write.
 *
 * The stronger argument is the neighbouring feature. Tap-to-translate has been
 * capped at 10 a day since it shipped: across 212 days where at least one
 * learner used it, the median day is ONE translation, the 90th percentile is
 * five, and the cap was reached on 4% of days. A limit of twenty on a similar
 * one-tap action is a ceiling on abuse, not a gate on use — which is the whole
 * point, since this exists to stop beginners giving up mid-sentence.
 *
 * ── What makes twenty go further than it looks ──────────────────────────
 * A cache hit does not count. word_lookup_cache is content-addressed by
 * (query, lang) and shared across learners, so "tired" is synthesised once for
 * everybody. The route looks the cache up ABOVE the claim, the same ordering
 * /api/tts depends on — twenty means twenty NEW words, not twenty taps.
 *
 * Stored in public.word_lookup_usage (supabase/add-word-lookup.sql), keyed by
 * (user_id, usage_date). Not usage_limits: that table has insert and update
 * policies, so a client can write its own counts back.
 *
 * The limit is passed to try_use_word_lookup() by the caller, so changing this
 * number is an app-side change with no migration.
 */
export const WORD_LOOKUP_DAILY_LIMIT = 20;

/**
 * How many new lookups a day each plan gets. null = unlimited.
 *
 * Only the Free row is a number, so only Free ever reaches
 * try_use_word_lookup. A paid learner's lookups are not counted at all: the
 * RPC is skipped, no row accumulates in word_lookup_usage, and nothing has to
 * be reset when they upgrade. Same shape as AUDIO_DAILY_LIMITS and
 * translationsPerDay.
 */
export const WORD_LOOKUP_DAILY_LIMITS: Record<Plan, number | null> = {
  free: WORD_LOOKUP_DAILY_LIMIT,
  plus: null,
  pro: null,
  teacher_feedback: null,
};

/**
 * Daily lookup allowance for a raw profiles.plan value, or null for unlimited.
 * An unreadable / unknown plan resolves to Free through normalizePlan, which
 * is the safe direction: the worst case is a paid learner being metered at
 * twenty, never an unmetered free one.
 */
export function wordLookupLimitFor(plan: string | null | undefined): number | null {
  return WORD_LOOKUP_DAILY_LIMITS[normalizePlan(plan)];
}

/** Longest query accepted. A word or a short phrase, not a sentence. */
export const MAX_QUERY_CHARS = 24;

/**
 * Is this a query the shared cache may keep?
 *
 * The same line tts-shared draws, for the same reason. word_lookup_cache is
 * content-addressed with no user id and is never cleared per account, so what
 * goes in has to be the kind of thing a dictionary holds: an English word or
 * a two-word phrase. "cat", "to be tired", "next week" — nothing that could
 * carry who wrote it.
 *
 * Letters, spaces, hyphens and apostrophes only, at most three words. A
 * learner who types a whole sentence still gets an answer; it just is not
 * stored, and it still costs them one of the twenty.
 */
export function isCacheableQuery(query: string): boolean {
  const q = query.trim();
  if (!q || q.length > MAX_QUERY_CHARS) return false;
  if (!/^[a-zA-Z][a-zA-Z\s'-]*$/.test(q)) return false;
  return q.split(/\s+/).length <= 3;
}

/** The cache key: case and spacing folded, so "Cat" and "cat " are one entry. */
export function cacheKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}
