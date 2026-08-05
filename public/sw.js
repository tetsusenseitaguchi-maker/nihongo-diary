const CACHE = "nihongo-diary-v1";
const OFFLINE_URL = "/offline";

// Pre-cache only the offline fallback page on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Delete old cache versions on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API routes and auth callbacks — always go to network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // Cache-first for Next.js static assets (hashed filenames — safe to cache forever)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // Network-first for pages — fall back to offline page on failure
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Web Push ──────────────────────────────────────────────────────────────
// Only ever reached in a browser. The iOS app is a WKWebView, which runs this
// service worker but exposes no PushManager, so nothing there can subscribe
// and nothing here can fire. APNs remains the only path inside the app.

const FALLBACK_TITLE = "Nihongo Diary";
const FALLBACK_BODY = "You have a new notification.";
const FALLBACK_URL = "/dashboard";

// Where a notification is allowed to send someone. A payload is not a trusted
// input — it arrives over the network — and openWindow will happily open any
// origin it is handed. Anything that is not this site collapses to the
// dashboard rather than being followed.
function safeUrl(raw) {
  if (typeof raw !== "string" || raw === "") return FALLBACK_URL;
  try {
    const url = new URL(raw, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : FALLBACK_URL;
  } catch {
    return FALLBACK_URL;
  }
}

self.addEventListener("push", (event) => {
  // Every one of these can be absent. A push with no data at all is legal,
  // and a body that is not JSON is what a misconfigured sender produces —
  // neither should cost the user their notification, so both fall through to
  // copy that says something true rather than nothing.
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch {
      const text = event.data.text();
      payload = text ? { body: text } : {};
    }
  }

  const title = typeof payload.title === "string" && payload.title ? payload.title : FALLBACK_TITLE;
  const body = typeof payload.body === "string" && payload.body ? payload.body : FALLBACK_BODY;
  const url = safeUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Read back by notificationclick — the only place the destination
      // survives to, since the notification itself carries no other state.
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = safeUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reuse a tab the site already has open rather than piling up new
        // ones. includeUncontrolled matters here: a tab loaded before this
        // worker took over is still the user's tab.
        for (const client of clientList) {
          if (new URL(client.url).origin !== self.location.origin) continue;
          if ("focus" in client) {
            const focused = client.focus();
            // navigate() is absent in some browsers; focusing alone at least
            // brings the app forward, which beats doing nothing.
            if ("navigate" in client) {
              return Promise.resolve(focused).then(() => client.navigate(url)).catch(() => focused);
            }
            return focused;
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
