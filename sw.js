/* Invoice Free del Obrero — offline support. Bump VERSION when you change files. */
const VERSION = 'obrero-v92';
const SHELL = ['./', './index.html', './menu.html', './recibo.html', './pay.html', './sello.html', './firma.html', './fotos.html', './manifest.webmanifest', './roofer.png', './cloud.js', './config.js', './icon-192.png', './icon-512.png', './lib-jspdf.js', './lib-autotable.js', './lib-qrcode.js', './lib-supabase.js', './lib-bip39-en.json'];
const CDN = []; // libraries are now self-hosted in SHELL
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))) /* skip the browser's 10-min copy so updates arrive right away */.then(() => Promise.all(CDN.map(u => c.add(u).catch(() => {}))))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname === 'api.coingecko.com' || url.hostname.endsWith('supabase.co')) return; // live prices: never cache
  // App files: network first (get updates), fall back to cache when offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Libraries and fonts: cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })));
});

/* Phone alerts (Web Push) from the "push" Edge Function */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {} } catch (x) { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Invoice Free del Obrero', { body: d.body || '', tag: d.tag || undefined, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return clients.openWindow(url);
  }));
});
