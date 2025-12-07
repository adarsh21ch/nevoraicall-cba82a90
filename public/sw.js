const CACHE_NAME = 'nevorai-cache-v3';
const URLS_TO_CACHE = ['/', '/index.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  // Don't wait for activation - skipWaiting immediately
  // This will be triggered by the app when user clicks "Refresh"
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for skip waiting message from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first strategy for HTML/JS/CSS to ensure fresh content
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For navigation requests (HTML pages), use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fall back to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Check for updates periodically when the app is open
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-check') {
    event.waitUntil(self.registration.update());
  }
});