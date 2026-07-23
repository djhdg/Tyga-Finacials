// Tyga Financials — minimal service worker.
// Purpose: satisfy PWA installability requirements + let the app shell
// (index.html) open offline. Live data (Deriv WebSocket, news, Firebase)
// always goes straight to the network — never served from cache.
const CACHE = 'tyga-shell-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests for our own app shell — everything else (APIs, WS) passes straight through.
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // keep the shell cache fresh
        if (SHELL_FILES.some((f) => req.url.endsWith(f.replace('./', '')))) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
