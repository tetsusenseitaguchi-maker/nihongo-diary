/**
 * "Has this browser closed the Web Push banner?"
 *
 * Same shape and the same trade as @/lib/tour/seen, @/lib/discovery/seen and
 * @/lib/plans-intro/seen: localStorage, because the flag has to outlive the
 * tab, and per browser rather than per account.
 *
 * Here per-browser is not the cheap compromise it is for those three — it is
 * the correct scope. A Web Push subscription belongs to one browser: someone
 * who subscribes on their laptop is still unsubscribed on the desktop at
 * work, and that second browser has to be asked separately. An account-wide
 * flag would silence the question on browsers it was never asked in.
 *
 * Every access is wrapped. Safari in private mode throws on storage access
 * rather than returning null, and a storage failure must never take the
 * dashboard down. Failing to read degrades to "not dismissed" — the banner
 * may appear again, which costs one tap on a control that is one tap to
 * close.
 */

export const WEBPUSH_BANNER_DISMISSED_KEY = "nihongo-diary-webpush-banner-dismissed";

export function hasDismissedWebPushBanner(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEBPUSH_BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWebPushBannerDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEBPUSH_BANNER_DISMISSED_KEY, "1");
  } catch {
    // Storage unavailable — the banner may appear again on a later visit.
    // Harmless: it is one line with a close button, and the setting it points
    // at is idempotent and also reachable from /profile.
  }
}
