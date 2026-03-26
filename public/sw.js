// Tila Service Worker — offline-first caching
const CACHE_VERSION = 2;
const CACHE_NAME = `tila-v${CACHE_VERSION}`;

// Core app shell files cached on install
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Audio file patterns to cache on first fetch
const CACHEABLE_PATTERNS = [
  /^\/audio\/sounds\//,
  /^\/audio\/names\//,
  /^\/audio\/effects\//,
];

// Install: cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App shell: cache-first (fast loads)
// - Audio files: cache-first with network fallback (offline audio)
// - API calls (/api/*): network-only (TTS must be fresh)
// - Everything else: network-first with cache fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API calls: always go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Audio files: cache-first
  const isAudio = CACHEABLE_PATTERNS.some((re) => re.test(url.pathname));
  if (isAudio) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
