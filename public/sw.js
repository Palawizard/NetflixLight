const CACHE_NAME = "netflixlight-shell-v3";
const IS_LOCAL_HOST = ["localhost", "127.0.0.1"].includes(
  self.location.hostname
);
const SHELL_ASSETS = [
  "/",
  "/css/app.css",
  "/js/app.js",
  "/js/api.js",
  "/js/animations.js",
  "/js/router.js",
  "/js/state.js",
  "/js/views.js",
  "/js/tmdb-images.js",
  "/js/components/carousel.js",
  "/js/components/poster-card.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

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

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_HOST) {
    return;
  }

  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).catch(() => caches.match("/"));
    })
  );
});
