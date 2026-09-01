const CACHE_NAME = "talk-a-tive-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
];

// Install Event - Pre-cache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching app shell & static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[Service Worker] Pre-cache failed:", err))
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log("[Service Worker] Removing old cache:", name);
              return caches.delete(name);
            }
            return null;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate for static assets, Network-First for others
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do not intercept or cache WebSocket, Socket.io, or API requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Media uploads caching strategy (cache-first for images/videos in /uploads/)
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return new Response("Media unavailable offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        }
      })
    );
    return;
  }

  // App navigation & static resources
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for a web page, return cached index.html
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
