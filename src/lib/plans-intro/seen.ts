/**
 * "Has this browser been shown the paid-plan intro yet?"
 *
 * Same shape and the same reasoning as @/lib/tour/seen: localStorage, because
 * the flag has to outlive the tab, and per browser rather than per account,
 * because the alternative is a column on profiles. That trade was worth taking
 * for the tour and is worth taking again here — the cost of losing the flag is
 * that a new user sees an optional, dismissible screen a second time, against
 * a schema change on the table plan and billing live on.
 *
 * Every access is wrapped: Safari private mode throws on storage access rather
 * than returning null, and a storage failure must never take the app down.
 * Failing to read degrades to "not seen", as it does for the tour. That
 * direction is safe here because it is not the only gate — profile-setup also
 * requires the account to be younger than NEW_ACCOUNT_WINDOW_MS, and that
 * check is what keeps existing users, subscribers included, away from this
 * screen no matter what localStorage does.
 */

export const PLANS_INTRO_SEEN_KEY = "nihongo-diary-plans-intro-seen";

/**
 * How recently the account must have been created for the intro to show.
 *
 * Lives here rather than in either caller because both of them need it and
 * they have to agree: /profile-setup decides whether to route to
 * /welcome-plans, and /welcome-plans decides whether to stay. If the two ever
 * disagreed the user would be sent there and bounced straight back.
 *
 * Seven days rather than hours: with email confirmation on, signup can leave a
 * real gap between the profile row appearing and the user finishing setup.
 */
export const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function hasSeenPlansIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PLANS_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPlansIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLANS_INTRO_SEEN_KEY, "1");
  } catch {
    // Storage unavailable — the intro may appear again on a later visit,
    // within the new-account window and never beyond it.
  }
}

/**
 * True when `createdAt` is a parseable timestamp inside the window.
 *
 * Fails closed on anything it cannot read — a missing or malformed
 * created_at gives false, so an account that cannot be proven new is treated
 * as established. The wrong failure here is showing a plan pitch to a paying
 * user, so uncertainty has to resolve the other way.
 */
export function isNewAccount(createdAt: string | null | undefined): boolean {
  const ms = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(ms) && Date.now() - ms <= NEW_ACCOUNT_WINDOW_MS;
}
