// Tyga Financials — service worker.
// Injects the Telegram and Deriv fix modules into the app shell without rewriting
// the large index.html file. Live APIs/WebSockets continue to use the network.
const CACHE = 'tyga-shell-v3';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './telegram.js', './deriv-fix.js'];
const INJECT_TAGS = '<script src="./deriv-fix.js"></script><script src="./telegram.js" defer></script>';

async function shellResponse(request) {
  const upstream = await fetch(request, { cache: 'no-store' });
  if (!upstream.ok) return upstream;
  const type = upstream.headers.get('content-type') || '';
  if (!type.includes('text/html')) return upstream;
  let html = await upstream.text();
  if (!html.includes('deriv-fix.js')) html = html.replace(/<\/head>/i, `${INJECT_TAGS}</head>`);
  html = html.replace(/<a\b[^>]*(?:whatsapp|wa\.me)[^>]*>[\s\S]*?<\/a>/gi, '');
  html = html.replace(/<button\b[^>]*(?:whatsapp|wa\.me)[^>]*>[\s\S]*?<\/button>/gi, '');
  return new Response(html, { status: upstream.status, statusText: upstream.statusText, headers: new Headers(upstream.headers) });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL_FILES.filter(f => f !== './index.html'));
    try { await cache.put('./index.html', await shellResponse(new Request('./index.html'))); } catch (_) {}
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(clientList => {
    for (const client of clientList) if ('focus' in client) return client.focus();
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(shellResponse(req).then(async response => {
      const cache = await caches.open(CACHE);
      await cache.put(req, response.clone()).catch(() => {});
      return response;
    }).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(fetch(req).then(response => {
    if (SHELL_FILES.some(f => req.url.endsWith(f.replace('./','')))) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match(req)));
});
