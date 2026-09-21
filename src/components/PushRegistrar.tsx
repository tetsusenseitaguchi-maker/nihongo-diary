"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";
import { pushTapHref, isDraftInProgress } from "@/lib/push-tap";

// Runs only inside the Capacitor iOS native app.
// On mount:
//   0. Subscribe to notification taps, so a tapped push opens its page.
//   1. If permission is already granted → register token silently.
//   2. If not yet determined (first visit) → request permission once,
//      then register on grant. Never re-prompts after the first attempt.
//
// "iOS" here is enforced, not assumed — see the platform check in
// registerPush() for why Android must not reach this code.
export function PushRegistrar() {
  const router = useRouter();

  useEffect(() => {
    let tapListener: PluginListenerHandle | undefined;
    let unmounted = false;
    void registerPush((url) => router.push(url)).then((handle) => {
      // The listener is what makes a cold-start tap land (see registerPush),
      // so it is only removed when this layout actually goes away — which,
      // for the (app) layout, is logout.
      if (unmounted) void handle?.remove();
      else tapListener = handle;
    });
    return () => {
      unmounted = true;
      void tapListener?.remove();
    };
  }, [router]);

  return null;
}

/**
 * Resolves to the tap listener's handle once it is attached, undefined
 * when this is not the iOS shell (or the plugin failed to load).
 */
async function registerPush(navigate: (url: string) => void): Promise<PluginListenerHandle | undefined> {
  console.log("[Push] registerPush() started");

  // Only run inside Capacitor native shell
  type CapWindow = Window & {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  };
  const cap = (window as CapWindow).Capacitor;
  const isNative = cap?.isNativePlatform?.();
  console.log("[Push] isNativePlatform:", isNative);
  if (!isNative) return;

  /**
   * ⚠️ iOS only, and this check is load-bearing — it is not a placeholder for
   * "Android isn't built yet".
   *
   * The token this function registers goes to /api/push/register, which writes
   * it to profiles.push_token — one column, no platform discriminator. Two
   * things downstream read that column and both assume APNs:
   *
   *   1. /api/push/send sends any non-null push_token via sendPush() (apns.ts),
   *      and that `if (pushToken)` is the ONLY thing stopping the same person
   *      from also getting a web push. An FCM token landing there means the
   *      APNs send fails AND the web-push rail is closed — that learner gets
   *      nothing at all, which is strictly worse than getting nothing new.
   *   2. The streak-reminder and daily-review crons split "app" from "web" on
   *      push_token IS NOT NULL in SQL, so an Android token silently moves
   *      someone into the APNs-only set there too.
   *
   * Until push_token carries a platform (or Android gets its own FCM rail),
   * an Android shell must never reach register(). Registering here would also
   * put a POST_NOTIFICATIONS prompt in front of a learner whose notifications
   * provably cannot be delivered.
   *
   * getPlatform() comes from the same injected Capacitor global as
   * isNativePlatform() above, so it is no more optional than that check is.
   */
  const platform = cap?.getPlatform?.();
  if (platform !== "ios") {
    console.log("[Push] platform is", platform, "— iOS only, stopping");
    return;
  }

  let tapListener: PluginListenerHandle | undefined;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    console.log("[Push] plugin imported");

    /**
     * Where a tapped notification goes. Attached BEFORE the permission
     * checks below, on purpose: everything after this point can return
     * early, and a listener placed past an early return is a listener that
     * is sometimes not there.
     *
     * Works from a cold start too. The native side raises this event with
     * retainUntilConsumed, so a tap that launched the app is held by the
     * plugin until the first subscriber appears — which, with the WebView
     * loading from nihongodiary.app, is this call, seconds later. The event
     * is then delivered exactly once.
     *
     * notification.data is the APNs userInfo: `aps` plus whatever the sender
     * added beside it. sendPush() (lib/apns.ts) puts the destination in
     * `url`. A push without one — every push sent before that key existed,
     * or a type with no page — resolves to /dashboard through pushTapHref,
     * which also refuses anything that is not a path on this origin.
     *
     * router.push, never with router.refresh (CLAUDE.md). Skipped while
     * /write holds text: a banner tapped mid-sentence must not take the
     * sentence with it.
     */
    tapListener = await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data as Record<string, unknown> | undefined;
      const url = pushTapHref(data?.url, window.location.origin);
      if (isDraftInProgress()) {
        console.log("[Push] tap ignored — a diary is being written; destination was", url);
        return;
      }
      console.log("[Push] tap →", url);
      navigate(url);
    });

    // Check current permission status
    let { receive: status } = await PushNotifications.checkPermissions();
    console.log("[Push] permission status:", status);

    if (status === "prompt" || status === "prompt-with-rationale") {
      const result = await PushNotifications.requestPermissions();
      status = result.receive;
      console.log("[Push] after requestPermissions:", status);
    }

    if (status !== "granted") {
      console.log("[Push] not granted — stopping");
      return tapListener;
    }

    // ★ Add listeners BEFORE calling register() to avoid missing the event
    PushNotifications.addListener("registration", async ({ value: token }) => {
      console.log("[Push] token received:", token.slice(0, 12) + "...");
      try {
        const res = await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        console.log("[Push] register API response:", res.status, data);
      } catch (e) {
        console.error("[Push] fetch error:", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] registrationError:", err);
    });

    console.log("[Push] calling register()");
    await PushNotifications.register();
    console.log("[Push] register() resolved");

  } catch (e) {
    console.error("[Push] outer catch:", e);
  }
  return tapListener;
}
