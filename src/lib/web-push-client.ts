/**
 * Browser-side subscribe / unsubscribe for Web Push.
 *
 * ── The rule this file exists to enforce ────────────────────────────────────
 * Nothing here runs on its own. The permission prompt is shown in exactly one
 * place — inside subscribeToWebPush(), which is only ever reached from a
 * toggle the learner has just switched on — because a denied Notification
 * permission cannot be asked for again. A prompt that appears unbidden on
 * page load spends that one chance on someone who was not asking for
 * notifications, and there is no way back from it.
 *
 * ── Why the native check is a function, not a module-scope const ────────────
 * NativeGate.tsx and PlanPrice.tsx read window.Capacitor once at module
 * evaluation, which is right for them: they answer "what should this render"
 * during the first paint. This file answers "may this device subscribe", and
 * the honest moment to ask is when someone taps. Same shape as
 * PushRegistrar.tsx:23 — read inside the callback, not at import.
 *
 * That check is load-bearing. Whether the iOS WKWebView even exposes
 * PushManager has not actually been confirmed on a device, so this guard is
 * the only thing known to keep the app from holding an APNs token and a Web
 * Push subscription at once. Do not weaken it on the theory that the API is
 * absent anyway.
 *
 * ── What it does not touch ──────────────────────────────────────────────────
 * profiles.push_token, push_notify_enabled, apns.ts, the four existing APNs
 * paths, and every RPC and trigger behind them. Web Push subscriptions live
 * in their own table (supabase/add-push-subscriptions.sql) and this file
 * talks to it only through /api/push/web/*.
 */

type CapWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };

export type WebPushState =
  /** Native shell, a browser missing the APIs, or no VAPID key in this build. */
  | "unsupported"
  /** The learner said no, and the browser will not ask again. */
  | "denied"
  | "subscribed"
  | "unsubscribed";

export type WebPushResult =
  | { ok: true; state: WebPushState }
  | { ok: false; error: string };

/** Read at call time, never at import. See the note above. */
function isNativeApp(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as CapWindow).Capacitor?.isNativePlatform?.()
  );
}

/**
 * Can this device subscribe at all?
 *
 * The VAPID public key is part of the answer: without it applicationServerKey
 * has nothing to send, so a build that lacks the variable should present no
 * toggle rather than a toggle that fails on tap. It is absent locally by
 * design — the value lives in Vercel.
 */
export function isWebPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/** Current state, read only — this never prompts and never registers. */
export async function getWebPushState(): Promise<WebPushState> {
  if (!isWebPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? "subscribed" : "unsubscribed";
  } catch {
    // A worker that never becomes ready is indistinguishable from one that
    // cannot: either way there is nothing to subscribe through.
    return "unsupported";
  }
}

/**
 * Subscribe, and tell the server about it.
 *
 * Call only from a user gesture. This is the sole caller of
 * requestPermission() in the codebase's web path.
 */
export async function subscribeToWebPush(): Promise<WebPushResult> {
  if (!isWebPushSupported()) return { ok: true, state: "unsupported" };
  if (Notification.permission === "denied") return { ok: true, state: "denied" };

  try {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { ok: true, state: permission === "denied" ? "denied" : "unsubscribed" };
      }
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await getOrCreateSubscription(registration);
    const json = subscription.toJSON();
    const keys = json.keys ?? {};

    if (!json.endpoint || !keys.p256dh || !keys.auth) {
      // Every one of the three is required to encrypt a message. A partial
      // subscription is not worth storing — it would sit in the table looking
      // deliverable and fail on every send.
      return { ok: false, error: "The browser returned an incomplete subscription." };
    }

    const res = await fetch("/api/push/web/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      // The browser is subscribed but the server does not know, which would
      // read as "on" while nothing could ever arrive. Undo it so the toggle
      // and the truth agree.
      await subscription.unsubscribe().catch(() => {});
      return { ok: false, error: await errorText(res) };
    }

    return { ok: true, state: "subscribed" };
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

/** Remove the subscription: server first, then the browser's own record. */
export async function unsubscribeFromWebPush(): Promise<WebPushResult> {
  if (!isWebPushSupported()) return { ok: true, state: "unsupported" };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true, state: "unsubscribed" };

    // Server first. If this half fails the browser stays subscribed and the
    // learner can try again; the other order would leave a row nobody can
    // reach, which only stops sending once a push comes back 410.
    const res = await fetch("/api/push/web/unregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    if (!res.ok) return { ok: false, error: await errorText(res) };

    await subscription.unsubscribe();
    return { ok: true, state: "unsubscribed" };
  } catch (e) {
    return { ok: false, error: describe(e) };
  }
}

/**
 * Reuse the existing subscription, or make one.
 *
 * The retry is for a rotated VAPID key: a subscription created under the old
 * key is still there, still valid-looking, and subscribe() rejects with
 * InvalidStateError rather than replacing it. Dropping it and asking again is
 * the only way through, and it costs nothing when the key has not changed
 * because that path is never reached.
 */
async function getOrCreateSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const applicationServerKey = urlBase64ToUint8Array(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  );

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "InvalidStateError") {
      const stale = await registration.pushManager.getSubscription();
      await stale?.unsubscribe();
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }
    throw e;
  }
}

/**
 * VAPID keys travel as base64url; applicationServerKey wants the bytes.
 *
 * Backed by an explicitly constructed ArrayBuffer so the result is
 * Uint8Array<ArrayBuffer> rather than Uint8Array<ArrayBufferLike>. Only the
 * former satisfies BufferSource under TypeScript 5.7's typed-array generics —
 * `new Uint8Array(length)` would not type-check here.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function errorText(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    /* not JSON — fall through to the status */
  }
  return `Request failed (${res.status}).`;
}

function describe(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
