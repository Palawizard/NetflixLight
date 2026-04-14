const CACHE_NAME = "netflixlight-shell-v3";
const IS_LOCAL_HOST = ["localhost", "127.0.0.1"].includes(
  self.location.hostname
);

// base URL of the scope (e.g. "https://palawi.fr/netflix-light/" or "https://localhost:3000/")
const BASE = self.registration.scope;

const SHELL_ASSETS = [
  BASE,
  `${BASE}css/app.css`,
  `${BASE}js/app.js`,
  `${BASE}js/api.js`,
  `${BASE}js/animations.js`,
  `${BASE}js/router.js`,
  `${BASE}js/state.js`,
  `${BASE}js/views.js`,
  `${BASE}js/tmdb-images.js`,
  `${BASE}js/components/carousel.js`,
  `${BASE}js/components/poster-card.js`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon.svg`,
];

// on install: unregister immediately on localhost, otherwise pre-cache shell assets
self.addEventListener("install", (event) => {
  if (IS_LOCAL_HOST) {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith("netflixlight-"))
              .map((cacheName) => caches.delete(cacheName))
          )
        )
        .then(() => self.registration.unregister())
    );
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// on activate: delete stale caches from previous versions
self.addEventListener("activate", (event) => {
  if (IS_LOCAL_HOST) {
    event.waitUntil(self.registration.unregister());
    self.clients.claim();
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
  self.clients.claim();
});

// on fetch: serve same-origin GET requests from cache first, falling back to the shell root on network failure
// API requests and non-GET methods bypass the cache entirely
self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_HOST) {
    return;
  }

  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  const basePath = new URL(BASE).pathname;
  if (requestUrl.pathname.startsWith(`${basePath}api/`)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).catch(() => caches.match(BASE));
    })
  );
});
