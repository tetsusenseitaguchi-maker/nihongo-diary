"use client";

import { useEffect, useState } from "react";
import {
  getWebPushState,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  type WebPushState,
} from "@/lib/web-push-client";

/**
 * "Notify me in this browser."
 *
 * Renders its own heading and divider, and returns null when the device
 * cannot subscribe — so the section is absent rather than empty inside the
 * iOS app, where APNs already handles notifications, and in browsers with no
 * Push API. The profile page adds one line and needs to know none of that.
 *
 * ── Why the state line is not decoration ────────────────────────────────────
 * A browser that has been told "no" once will not ask again, and there is no
 * API that lets a page undo it. Without something on screen saying so, the
 * toggle becomes a control that visibly does nothing: tapped, nothing
 * happens, no error, no notification, ever. The denied line is the only place
 * the way out — the browser's own site settings — can be said.
 *
 * Per-device by nature, unlike DailyReviewPushToggle next to it. That one is
 * a column on profiles and follows the account everywhere; this is one
 * browser's subscription, and the copy says "this browser" for that reason.
 *
 * English only, no i18n keys — the same allowance the plans and flashcards
 * namespaces have.
 *
 * Touches nothing on profiles. Subscriptions live in push_subscriptions and
 * are reached only through /api/push/web/*.
 */
export function WebPushToggle() {
  const [state, setState] = useState<WebPushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Reads only. getWebPushState never prompts, which is what makes it safe to
  // run on mount — the permission dialog belongs to the tap below and nowhere
  // else.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = await getWebPushState();
      if (!cancelled) setState(current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribed = state === "subscribed";
  const denied = state === "denied";

  async function toggle() {
    if (busy || denied) return;
    setBusy(true);
    setError(null);
    setTestResult(null);

    const result = subscribed ? await unsubscribeFromWebPush() : await subscribeToWebPush();

    if (result.ok) {
      setState(result.state);
      // Dismissing the browser prompt leaves permission at "default" and the
      // state unchanged, which is not an error — nothing is said about it.
    } else {
      setError(result.error);
      // The switch has not moved, so re-read rather than assume: the browser
      // may have subscribed before the server refused.
      setState(await getWebPushState());
    }

    setBusy(false);
  }

  async function sendTest() {
    if (busy || !subscribed) return;
    setBusy(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/push/web/test", { method: "POST" });
      const data: { error?: string; sent?: number } = await res.json().catch(() => ({}));

      if (res.ok) {
        setTestResult("Sent. It should arrive in a moment.");
      } else {
        setError(data.error ?? `Could not send (${res.status}).`);
        // A 404 means the row is gone — the subscription may have been cleaned
        // up as expired, so what is on screen is no longer true.
        if (res.status === 404 || res.status === 502) setState(await getWebPushState());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }

    setBusy(false);
  }

  // Nothing to offer, or not known yet. Rendering the heading now and hiding
  // it a moment later is worse than starting with it absent.
  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="font-serif font-bold text-pine">Browser notifications</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/75">
        Get the same notifications in this browser. This is per-browser — turning it on here
        does not affect your other devices.
      </p>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <span id="web-push-label" className="text-sm font-medium text-ink">
            Notify me in this browser
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={subscribed}
            aria-labelledby="web-push-label"
            onClick={toggle}
            disabled={busy || denied}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
              subscribed ? "border-moss/50 bg-moss-600" : "border-line bg-mint/60"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-paper shadow transition-transform ${
                subscribed ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* The state, in words. Without this the denied case is a dead switch. */}
        <p
          className={`mt-2 text-xs leading-relaxed ${
            denied ? "font-semibold text-red-600" : subscribed ? "font-semibold text-moss-600" : "text-muted"
          }`}
        >
          {denied
            ? "Blocked. This browser refused notifications, and the app cannot ask again — allow them for this site in your browser settings, then reload this page."
            : subscribed
              ? "✓ On — this browser is subscribed."
              : busy
                ? "Working…"
                : "Off — this browser will not receive notifications."}
        </p>

        <div className="mt-3">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy || !subscribed}
            className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-pine transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Send a test notification
          </button>
          {!subscribed && !denied && (
            <span className="ml-2 text-xs text-muted">Turn it on first.</span>
          )}
        </div>

        {testResult && <p className="mt-2 text-xs font-semibold text-moss-600">{testResult}</p>}
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
