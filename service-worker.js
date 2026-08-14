const CACHE_NAME = 'iron-shell-v1';
const RUNTIME_CACHE = 'iron-runtime-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Cache successful same-origin responses and opaque cross-origin assets
        // (fonts, icons and exercise images) for later offline use.
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Navigation fallback when the network is unavailable.
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
