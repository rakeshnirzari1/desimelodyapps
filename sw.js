self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Basic offline fallback (optional)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('desimelody-cache').then(cache => {
      return fetch(event.request)
        .then(response => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cache.match(event.request));
    })
  );
});
