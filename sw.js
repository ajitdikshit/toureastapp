const CACHE_NAME = "tourest-cache-v1";
const API_CACHE_NAME = "tourest-api-cache-v1";

// List of local files to cache
const FILES_TO_CACHE = [
  "/home.html",
  "/index.html",
 
  "/logo.png"
];

// Install service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching app shell");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate service worker and clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Network-first for API requests (OpenTripMap, Wikipedia, ORS)
  if (
    url.origin.includes("opentripmap.com") ||
    url.origin.includes("wikipedia.org") ||
    url.origin.includes("openrouteservice.org")
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(API_CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local app files
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Offline fallback
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});


