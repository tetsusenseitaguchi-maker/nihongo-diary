import { normalizePlan, type Plan } from "@/lib/plans";

/**
 * Daily "revise & recheck" allowance per plan.
 *
 * Kept out of plans.ts on purpose: PLAN_LIMITS drives billing-adjacent
 * behaviour (corrections, translations, character caps) and is hands-off, so
 * this counter lives on its own. normalizePlan is imported read-only.
 *
 * ⚠️ Only `free` is enforced today. /api/recheck calls try_use_recheck() for
 * Free users and skips the RPC entirely for paid plans, whose client-side
 * allowance is still RECHECK_LIMIT in write/page.tsx — 3 rechecks *per
 * correction*, not per day. The plus / pro / teacher_feedback numbers below
 * are the intended per-day allowances for if paid enforcement is added later;
 * they are not in effect. Do not read them as a description of current
 * behaviour.
 *
 * Note the unit difference: the Free limit is per calendar day (resolved in
 * the user's timezone, server-side), while the paid limit is per correction
 * and resets whenever a new correction runs.
 */
export const RECHECK_LIMITS: Record<Plan, number> = {
  free: 1,
  plus: 3,
  pro: 5,
  teacher_feedback: 5,
};

/** Daily recheck allowance for a raw plan string. Unknown values read as Free. */
export function recheckLimitFor(plan: string | null | undefined): number {
  return RECHECK_LIMITS[normalizePlan(plan)];
}
