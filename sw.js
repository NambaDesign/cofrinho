// Cofrinho service worker: the app opens offline. Page = network first (to get updates), everything else = cache first.
const VERSION = 'cofrinho-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase data and login traffic never go through the cache
  if (/googleapis\.com$/.test(url.hostname) && !/fonts\.googleapis\.com$/.test(url.hostname)) return;
  if (/firebaseapp\.com$|accounts\.google\.com$/.test(url.hostname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  const cacheable = url.origin === location.origin || /gstatic\.com$|fonts\.googleapis\.com$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); } return r; });
    return hit || net;
  }));
});
