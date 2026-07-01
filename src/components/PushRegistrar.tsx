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
  console.log("[Push] registerPush() started");

  // Only run inside Capacitor native shell
  type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  const isNative = (window as CapWindow).Capacitor?.isNativePlatform?.();
  console.log("[Push] isNativePlatform:", isNative);
  if (!isNative) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    console.log("[Push] plugin imported");

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
      return;
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
}
