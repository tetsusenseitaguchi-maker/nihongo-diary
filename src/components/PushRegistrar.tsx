"use client";

import { useEffect } from "react";

// Runs only inside the Capacitor iOS native app.
// On mount:
//   1. If permission is already granted → register token silently.
//   2. If not yet determined (first visit) → request permission once,
//      then register on grant. Never re-prompts after the first attempt.
export function PushRegistrar() {
  useEffect(() => {
    void registerPush();
  }, []);

  return null;
}

async function registerPush() {
  // Only run inside Capacitor native shell
  type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!(window as CapWindow).Capacitor?.isNativePlatform?.()) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Check current permission status
    let { receive: status } = await PushNotifications.checkPermissions();

    if (status === "prompt" || status === "prompt-with-rationale") {
      // Only ask once — if the user has already been asked and denied,
      // checkPermissions returns "denied" and we skip silently.
      const result = await PushNotifications.requestPermissions();
      status = result.receive;
    }

    if (status !== "granted") return;

    // Register with APNs — triggers the "registration" event with the token
    await PushNotifications.register();

    PushNotifications.addListener("registration", async ({ value: token }) => {
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Non-critical — token will be refreshed on next app launch
      }
    });

    PushNotifications.addListener("registrationError", () => {
      // Silent failure — push is a best-effort feature
    });
  } catch {
    // @capacitor/push-notifications not available in browser/dev — ignore
  }
}
