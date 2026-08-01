/**
 * "Has this browser been shown the audio announcement yet?"
 *
 * Same shape and the same trade as @/lib/discovery/seen, @/lib/tour/seen and
 * @/lib/plans-intro/seen: localStorage, because the flag has to outlive the
 * tab, and per browser rather than per account, because the alternative is a
 * column on profiles. The cost of losing it is that someone sees a dismissible
 * one-screen notice a second time, which is not worth a schema change on the
 * table plan and billing live on.
 *
 * Every access is wrapped: Safari in private mode THROWS on storage access
 * rather than returning null, and a storage failure must never take the
 * dashboard down. Failing to read degrades to "not seen", as it does for the
 * other three.
 *
 * No account-age gate, for the same reason discovery/seen has none: this
 * announcement exists precisely for people who already have an account and
 * have been getting corrections without audio. Gating it on newness would hide
 * it from everyone it is for.
 */

export const AUDIO_INTRO_SEEN_KEY = "nihongo-diary-audio-intro-seen";

export function hasSeenAudioIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUDIO_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAudioIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIO_INTRO_SEEN_KEY, "1");
  } catch {
    // Storage unavailable — the notice may appear again on a later visit.
    // Harmless: it is one screen with a dismiss button and no side effects.
  }
}
