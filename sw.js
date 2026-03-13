// ─── Service Worker ────────────────────────────────────────────────────────────
const CACHE = 'silent-words-v3';

const ASSETS = [
  '/SilentWords/',
  '/SilentWords/index.html',
  '/SilentWords/style.css',
  '/SilentWords/app.js',
  '/SilentWords/constants.js',
  '/SilentWords/db.js',
  '/SilentWords/quotes.js',
  '/SilentWords/utils.js',
  '/SilentWords/data/dhammapada.json',
  '/SilentWords/data/koans.json',
  '/SilentWords/data/taoteching.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
}