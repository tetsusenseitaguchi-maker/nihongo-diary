"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORARY diagnostic page — /push-test
 *
 * The one question it exists to answer: inside the Capacitor iOS shell
 * (a WKWebView pointed at the live site), is the browser Push API reachable
 * at all? Nothing in this repo can answer that, and the Web Push design
 * depends on it.
 *
 * Everything is reported on screen rather than in console.log, because the
 * console is exactly what is not available on the device this runs on.
 *
 * Adds no imports from the app, changes no existing file, registers no
 * service worker of its own (the root layout already registers /sw.js), and
 * deliberately does NOT call pushManager.subscribe — reading capabilities is
 * the whole scope. Delete the folder when the answer is known.
 */

type ReadyState =
  | { kind: "pending" }
  | { kind: "resolved"; hasPushManager: boolean; scope: string }
  | { kind: "timeout" }
  | { kind: "error"; message: string }
  | { kind: "unsupported" };

type Facts = {
  capacitor: string;
  userAgent: string;
  serviceWorkerInNavigator: boolean;
  pushManagerInWindow: boolean;
  notificationInWindow: boolean;
  notificationPermission: string;
};

/** How long to wait on navigator.serviceWorker.ready before calling it stuck. */
const READY_TIMEOUT_MS = 8000;

export default function PushTestPage() {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [ready, setReady] = useState<ReadyState>({ kind: "pending" });
  const [permissionResult, setPermissionResult] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    // ── The six synchronous facts ──────────────────────────────────────────
    type CapWindow = Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    };
    const cap = (window as CapWindow).Capacitor;

    let capacitor: string;
    if (!cap) {
      capacitor = "not native (window.Capacitor is undefined)";
    } else if (typeof cap.isNativePlatform !== "function") {
      capacitor = "window.Capacitor exists, but isNativePlatform is not a function";
    } else {
      const platform =
        typeof cap.getPlatform === "function" ? cap.getPlatform() : "unknown";
      capacitor = `isNativePlatform() = ${String(cap.isNativePlatform())}  ·  platform = ${platform}`;
    }

    setFacts({
      capacitor,
      userAgent: navigator.userAgent,
      serviceWorkerInNavigator: "serviceWorker" in navigator,
      pushManagerInWindow: "PushManager" in window,
      notificationInWindow: "Notification" in window,
      notificationPermission:
        "Notification" in window ? Notification.permission : "(Notification does not exist)",
    });

    // ── The asynchronous one: does serviceWorker.ready ever settle? ────────
    if (!("serviceWorker" in navigator)) {
      setReady({ kind: "unsupported" });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) setReady({ kind: "timeout" });
    }, READY_TIMEOUT_MS);

    navigator.serviceWorker.ready
      .then((registration) => {
        settled = true;
        clearTimeout(timer);
        setReady({
          kind: "resolved",
          // The actual point of this page: a registration can exist while
          // pushManager is absent, which is the shape to expect if WKWebView
          // gives service workers but not Push.
          hasPushManager: "pushManager" in registration,
          scope: registration.scope,
        });
      })
      .catch((e: unknown) => {
        settled = true;
        clearTimeout(timer);
        setReady({ kind: "error", message: describe(e) });
      });

    return () => clearTimeout(timer);
  }, []);

  async function askPermission() {
    setAsking(true);
    setPermissionResult(null);
    setPermissionError(null);
    try {
      if (!("Notification" in window)) {
        setPermissionError("Notification is not defined in this window — nothing to call.");
        return;
      }
      // Older implementations take a callback and return undefined instead of
      // a promise. Awaiting undefined is harmless; reading .permission after
      // is what actually reports the outcome either way.
      const result = await Notification.requestPermission();
      setPermissionResult(
        `requestPermission() returned: ${String(result)}  ·  Notification.permission is now: ${Notification.permission}`,
      );
    } catch (e: unknown) {
      setPermissionError(describe(e));
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 text-base leading-relaxed">
      <h1 className="text-2xl font-bold">Push capability test</h1>
      <p className="mt-1 text-sm text-gray-500">
        Temporary diagnostic page. Nothing here subscribes to anything.
      </p>

      {!facts ? (
        <p className="mt-6">Collecting…</p>
      ) : (
        <div className="mt-6 space-y-4">
          <Row n={1} label="Capacitor" value={facts.capacitor} />
          <Row n={2} label="User-Agent" value={facts.userAgent} mono />
          <Bool n={3} label='"serviceWorker" in navigator' value={facts.serviceWorkerInNavigator} />
          <Bool n={4} label='"PushManager" in window' value={facts.pushManagerInWindow} />
          <Bool n={5} label='"Notification" in window' value={facts.notificationInWindow} />
          <Row n={6} label="Notification.permission" value={facts.notificationPermission} />
          <Row n={7} label="navigator.serviceWorker.ready" value={readyText(ready)} />
        </div>
      )}

      <div className="mt-8 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={askPermission}
          disabled={asking}
          className="w-full rounded-xl bg-black px-4 py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {asking ? "Asking…" : "Ask for notification permission"}
        </button>

        {permissionResult && (
          <p className="mt-4 break-words rounded-lg bg-gray-100 p-3 text-sm">
            {permissionResult}
          </p>
        )}
        {permissionError && (
          <p className="mt-4 break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Error: {permissionError}
          </p>
        )}
      </div>
    </main>
  );
}

/** Errors here are read off a phone screen, so keep every scrap of them. */
function describe(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function readyText(r: ReadyState): string {
  switch (r.kind) {
    case "pending":
      return "pending… (waiting)";
    case "resolved":
      return `resolved  ·  "pushManager" in registration = ${String(r.hasPushManager)}  ·  scope = ${r.scope}`;
    case "timeout":
      return `never settled within ${READY_TIMEOUT_MS / 1000}s`;
    case "error":
      return `rejected — ${r.message}`;
    case "unsupported":
      return "n/a (navigator.serviceWorker does not exist)";
  }
}

function Row({
  n,
  label,
  value,
  mono = false,
}: {
  n: number;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-gray-500">
        {n}. {label}
      </div>
      <div className={`break-words ${mono ? "font-mono text-xs" : "text-base"}`}>{value}</div>
    </div>
  );
}

function Bool({ n, label, value }: { n: number; label: string; value: boolean }) {
  return (
    <div>
      <div className="text-sm font-semibold text-gray-500">
        {n}. {label}
      </div>
      <div className="text-base">
        {value ? "✅ true" : "❌ false"}
      </div>
    </div>
  );
}
