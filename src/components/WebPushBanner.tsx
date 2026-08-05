"use client";

import { useEffect, useState } from "react";
import { isWebPushSupported, getWebPushState, subscribeToWebPush } from "@/lib/web-push-client";
import {
  hasDismissedWebPushBanner,
  markWebPushBannerDismissed,
} from "@/lib/web-push/banner-dismissed";
import { hasSeenTour } from "@/lib/tour/seen";

/**
 * One line on the dashboard offering to turn browser notifications on.
 *
 * The toggle this duplicates lives at the bottom of /profile, where nobody
 * finds it. This subscribes in place rather than linking there, because the
 * tap that gets skipped is the one that would have been lost.
 *
 * ── Four conditions, and why each is a condition ────────────────────────────
 * 1. Not dismissed. Closing it is final; see banner-dismissed.ts.
 * 2. Written a diary, OR finished the tour. A first-time learner already has
 *    a seven-step tour running, and asking for notifications on top of it is
 *    two demands at once. It is also the wrong moment: permission refused is
 *    permission that cannot be requested again from here, and someone who has
 *    not yet written anything has no reason to say yes. The cost of asking
 *    too early is not a missed banner, it is a browser that can never be
 *    subscribed.
 * 3. Supported — not the iOS shell, has the Push API, has a VAPID key.
 * 4. Currently "unsubscribed". Never on "denied": that browser cannot be
 *    recovered from here, and a banner offering something impossible is worse
 *    than no banner. /profile carries the sentence explaining the way back.
 *
 * ── The prompt ──────────────────────────────────────────────────────────────
 * Rendering this shows no dialog. getWebPushState() reads
 * Notification.permission and never asks. The permission dialog is reachable
 * only through the button, i.e. only from a deliberate tap.
 *
 * hasWritten arrives as a prop because the dashboard already has it —
 * entries.length, off a query it was making anyway. Nothing here widens a
 * select, and the profiles read on that page is not touched.
 */
export function WebPushBanner({ hasWritten }: { hasWritten: boolean }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (hasDismissedWebPushBanner()) return;
      // Established enough to be asked. hasSeenTour is read here rather than
      // on the server because it is a localStorage flag like the dismissal.
      if (!hasWritten && !hasSeenTour()) return;
      if (!isWebPushSupported()) return;

      const state = await getWebPushState();
      if (!cancelled && state === "unsubscribed") setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasWritten]);

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await subscribeToWebPush();

    if (result.ok) {
      // Subscribed, or refused — either way this banner has had its say. On
      // "denied" it must not linger offering something it can no longer do.
      if (result.state === "subscribed" || result.state === "denied") {
        setVisible(false);
        return;
      }
      // Still "unsubscribed": the dialog was dismissed rather than answered.
      // Permission is untouched, so the offer stays open.
    } else {
      setError(result.error);
    }

    setBusy(false);
  }

  function close() {
    markWebPushBannerDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-mint/40 px-4 py-3">
      <span aria-hidden className="mt-0.5 text-base leading-none">
        🔔
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-ink">
          Get a nudge in this browser when someone replies, and when it&apos;s time to write.
        </p>
        {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
      </div>

      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        className="shrink-0 rounded-full bg-pine px-4 py-2 text-xs font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Turning on…" : "Turn on"}
      </button>

      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded-full px-2 py-1 text-lg leading-none text-muted transition-colors hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
