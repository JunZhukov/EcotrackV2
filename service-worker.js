const CACHE_VERSION = "ecotrack-v75";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./login.html",
  "./signup.html",
  "./signup-step-2.html",
  "./signup-step-3.html",
  "./signup-step-4.html",
  "./signup-step-5.html",
  "./signup-final.html",
  "./home.html",
  "./dashboard.html",
  "./overview.html",
  "./analytics.html",
  "./settings.html",
  "./log-activity.html",
  "./about.html",
  "./styles.css",
  "./login.css",
  "./signup.css",
  "./alerts.css",
  "./app.css",
  "./home.css",
  "./dashboard.css",
  "./dashboard-gamified.css",
  "./activity-log.css",
  "./about.css",
  "./settings.css",
  "./script.js",
  "./alerts.js",
  "./dashboard.js",
  "./dashboard-gamified.js",
  "./activity-log.js",
  "./gamification.js",
  "./home.js",
  "./ai-suggestions.js",
  "./analytics.js",
  "./settings.js",
  "./theme.js",
  "./auth-page-transitions.js",
  "./api-client.js",
  "./pwa-register.js",
  "./Logo.png",
  "./Logo Intro.png",
  "./LOGIN PAGE.png",
  "./denise.png",
  "./ron.png",
  "./sam.jpg",
  "./charles.jpg",
  "./Pop-Logo.mp3",
  "./Pop-Card.mp3",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) =>
          cache.add(asset).catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  const url = new URL(request.url);

  // Never cache or intercept calls to the backend API (Gemini proxy etc.).
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return; // let the browser handle it directly
  }

  if (request.method !== "GET") return;

  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  const isHtmlRequest =
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHtmlRequest) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseClone = networkResponse.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
