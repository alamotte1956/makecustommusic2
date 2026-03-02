// ─── Service Worker: Cache-first for static assets, network-first for API ───
const CACHE_NAME = "mcm-cache-v1";

// Static assets to pre-cache on install (shell resources)
const PRECACHE_URLS = ["/", "/robots.txt"];

// ─── Install: pre-cache shell resources ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: routing strategy ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip non-http(s) requests (e.g. chrome-extension://)
  if (!url.protocol.startsWith("http")) return;

  // ── API / tRPC calls → network-first with no caching ──
  if (url.pathname.startsWith("/api/")) {
    return; // Let the browser handle API requests normally
  }

  // ── Analytics / third-party scripts → skip caching ──
  if (
    url.pathname.includes("/umami") ||
    url.pathname.startsWith("/__manus__")
  ) {
    return;
  }

  // ── Google Fonts CSS → stale-while-revalidate ──
  if (url.hostname === "fonts.googleapis.com") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Google Fonts files (woff2) → cache-first (immutable) ──
  if (url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── CDN assets (images, media) → cache-first ──
  if (url.hostname.includes("cloudfront.net")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Hashed static assets (JS, CSS with content hash) → cache-first ──
  if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── HTML navigation requests → network-first (always get fresh HTML) ──
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Everything else (unhashed CSS, images, etc.) → stale-while-revalidate ──
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Caching strategies ───

/** Cache-first: return cached version, fall back to network */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/** Network-first: try network, fall back to cache */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/** Stale-while-revalidate: return cache immediately, update in background */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ─── Helpers ───

/** Check if a URL path looks like a Vite hashed asset (e.g. /assets/index-abc123.js) */
function isHashedAsset(pathname) {
  return /\/assets\/.*-[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|avif|gif|ico)$/i.test(
    pathname
  );
}

// ─── Message handling for cache management ───
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data === "clearCache") {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
});
