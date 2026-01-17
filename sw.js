/* sw.js — Mes Actions PWA shell (GitHub Pages)
   Cache uniquement les fichiers du repo (pas script.google.com).
*/
const SW_VERSION = "v1.0.1";
const CACHE_NAME = `mes-actions-shell-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./?from=pwa",
  "./index.html",
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
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("mes-actions-shell-") && k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Stratégie: cache-first pour les assets GitHub Pages, et fallback offline pour les navigations
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas intercepter les requêtes hors de l'origine GitHub Pages
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first avec fallback offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match("./offline.html");
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (e) {
      return caches.match("./offline.html");
    }
  })());
});
