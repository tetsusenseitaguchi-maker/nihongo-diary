/**
 * "Has this browser been shown the Discovery announcement yet?"
 *
 * Same shape and the same trade as @/lib/tour/seen and @/lib/plans-intro/seen:
 * localStorage, because the flag has to outlive the tab, and per browser rather
 * than per account, because the alternative is a column on profiles. The cost
 * of losing it is that someone sees a dismissible one-screen notice a second
 * time, which is not worth a schema change on the table plan and billing live
 * on.
 *
 * Every access is wrapped: Safari in private mode throws on storage access
 * rather than returning null, and a storage failure must never take the feed
 * down. Failing to read degrades to "not seen", as it does for the other two.
 *
 * One deliberate difference from plans-intro: there is no account-age gate.
 * That one pairs its flag with isNewAccount() because /profile-setup doubles as
 * "Edit profile", so without it an established subscriber would meet a plan
 * pitch every time they changed their bio. This announcement is the opposite
 * case — it exists precisely for people who already have an account and have
 * public diaries, and telling them that those diaries can now be found is the
 * whole point. Gating it on newness would hide it from everyone who needs it.
 */

export const DISCOVERY_INTRO_SEEN_KEY = "nihongo-diary-discovery-intro-seen";

export function hasSeenDiscoveryIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISCOVERY_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDiscoveryIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISCOVERY_INTRO_SEEN_KEY, "1");
  } catch {
    // Storage unavailable — the notice may appear again on a later visit.
    // Harmless: it is one screen with a dismiss button, and the setting it
    // points at is idempotent.
  }
}
