/* Invoice Free del Obrero — offline support. Bump VERSION when you change files. */
const VERSION = 'obrero-v84';
const SHELL = ['./', './index.html', './menu.html', './recibo.html', './pay.html', './sello.html', './firma.html', './fotos.html', './manifest.webmanifest', './roofer.png', './cloud.js', './config.js', './icon-192.png', './icon-512.png', './lib-jspdf.js', './lib-autotable.js', './lib-qrcode.js', './lib-supabase.js', './lib-bip39-en.json'];
const CDN = []; // libraries are now self-hosted in SHELL
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() => Promise.all(CDN.map(u => c.add(u).catch(() => {}))))));
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
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Libraries and fonts: cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })));
});
