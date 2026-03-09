const CACHE = 'silent-words-v1';

const ASSETS = [
  '/SilentWords/',
  '/SilentWords/index.html',
  '/SilentWords/style.css',
  '/SilentWords/app.js',
  '/SilentWords/data/dhammapada.json',
  '/SilentWords/data/koans.json'
  '/SilentWords/data/taoteching.json',
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
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new successful requests dynamically
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('/SilentWords/'))
  );
});
