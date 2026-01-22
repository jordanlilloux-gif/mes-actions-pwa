/* sw.js — Mes Actions PWA shell (SAFE)
   - Ne cache JAMAIS index.html
   - Ne touche PAS aux requêtes Apps Script
   - Offline uniquement pour navigation
*/

const SW_VERSION = "v1.0.4";
const CACHE_NAME = `mes-actions-shell-${SW_VERSION}`;

const STATIC_ASSETS = [
  "./manifest.json",
  "./offline.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith("mes-actions-shell-") && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne jamais intercepter hors GitHub Pages
  if (url.origin !== self.location.origin) return;

  // NAVIGATION : network-first + fallback offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./offline.html"))
    );
    return;
  }

  // ASSETS STATIQUES : cache-first strict
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (e) {
      // ⚠️ IMPORTANT : pas de fallback HTML pour JS/CSS
      throw e;
    }
  })());
});
