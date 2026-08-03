import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The audit trail for the two payment webhooks —段階0：観測のみ.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 * /api/stripe/webhook and /api/revenuecat/webhook update profiles.plan and
 * throw the result away. Three failures all end the same way, with a 200 and
 * nobody any the wiser:
 *
 *   1. the DB returns an error        — swallowed
 *   2. .eq() matches zero rows        — not even an error
 *   3. an exception is thrown         — caught, logged, 200
 *
 * The second is the dangerous one. Stripe's customer.subscription.updated can
 * arrive before checkout.session.completed has written stripe_customer_id, and
 * then it matches nobody: the learner has paid and stays on free, silently.
 *
 * This module changes none of that. It only writes down what happened, so the
 * question "how often does it actually happen" can be answered with data
 * before anyone changes what the webhooks return (段階2).
 *
 * ── The one rule ─────────────────────────────────────────────────────────
 * Recording must never be able to break a payment. Every failure in here is
 * caught and logged, including the table not existing yet: the SQL is run by
 * hand in the dashboard, so the deploy can land first, and when it does the
 * only symptom is a console line. Nothing in here is awaited for its value —
 * the caller awaits it only to keep the serverless function alive long enough
 * for the insert to land.
 *
 * ── What it deliberately does not record ─────────────────────────────────
 * Event types the webhooks ignore. Stripe delivers a great many of them and a
 * row per invoice.* would bury the four types that matter. Whether Stripe is
 * delivering at all is a question its own dashboard already answers.
 */

/** What became of the profiles update this event was supposed to make. */
export type BillingOutcome =
  /** One row updated, as intended. */
  | "applied"
  /**
   * Zero rows. Three different things at this stage, deliberately not told
   * apart yet — the race (no profile carries this customer id yet), the
   * guard (.neq on the other billing rail did its job), and a deleted
   * account. Telling them apart needs a SELECT before the UPDATE, which is
   * 段階1; doing it here would change the queries this stage is meant to
   * observe unchanged.
   */
  | "no_match"
  /** The DB returned an error. */
  | "db_error"
  /** Something threw before or during the update. */
  | "exception";

export type BillingEvent = {
  provider: "stripe" | "revenuecat";
  /** Stripe's evt_… or RevenueCat's event id. Null when the payload has none. */
  eventId?: string | null;
  eventType: string;
  /** Stripe's cus_… or RevenueCat's app_user_id — the only handle left when no row matched. */
  customerId?: string | null;
  /** The learner the update landed on. Null is the interesting case. */
  userId?: string | null;
  outcome: BillingOutcome;
  rowsAffected?: number | null;
  /** The plan as written. Not read back from the DB — this is what we asked for. */
  planAfter?: string | null;
  /** Error message, guard name, anything that explains the outcome. */
  detail?: string | null;
  /** When the provider says the event happened (Stripe's event.created). */
  eventCreatedAt?: string | null;
};

export async function recordBillingEvent(
  admin: SupabaseClient,
  ev: BillingEvent,
): Promise<void> {
  try {
    const { error } = await admin.from("billing_events").insert({
      provider: ev.provider,
      event_id: ev.eventId ?? null,
      event_type: ev.eventType,
      customer_id: ev.customerId ?? null,
      user_id: ev.userId ?? null,
      outcome: ev.outcome,
      rows_affected: ev.rowsAffected ?? null,
      plan_after: ev.planAfter ?? null,
      detail: ev.detail ? ev.detail.slice(0, 500) : null,
      event_created_at: ev.eventCreatedAt ?? null,
    });
    if (error) {
      // The table may not exist yet — supabase/add-billing-events.sql is run by
      // hand. Log and carry on; the payment path must not care.
      console.error("[billing-events] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[billing-events] insert threw:", err);
  }
}

/** Seconds-since-epoch (Stripe's event.created) → ISO, for event_created_at. */
export function epochToIso(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}
