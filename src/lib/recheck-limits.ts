import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Daily "revise & recheck" allowance per plan.
 *
 * Kept out of plans.ts on purpose: PLAN_LIMITS drives billing-adjacent
 * behaviour (corrections, translations, character caps) and is hands-off, so
 * this counter lives on its own. normalizePlan is imported read-only.
 *
 * ⚠️ Only `free` is enforced server-side. /api/recheck calls try_use_recheck()
 * for Free users and skips the RPC entirely for paid plans, which are capped
 * client-side by RECHECK_LIMIT in write/page.tsx. The paid numbers here are
 * set to that same value so this table never disagrees with what actually
 * runs — raising one of them alone would change nothing.
 *
 * Note the unit difference: the Free limit is per calendar day (resolved in
 * the user's timezone, server-side), while the paid limit is per correction
 * and resets whenever a new correction runs.
 */
export const RECHECK_LIMITS: Record<Plan, number> = {
  free: 1,
  plus: 3,
  pro: 3,
  teacher_feedback: 3,
};

/** Daily recheck allowance for a raw plan string. Unknown values read as Free. */
export function recheckLimitFor(plan: string | null | undefined): number {
  return RECHECK_LIMITS[normalizePlan(plan)];
}
