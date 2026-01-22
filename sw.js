/* sw.js — Mes Actions PWA shell (GitHub Pages) — SAFE
   - Cache uniquement des assets statiques du repo
   - Ne cache JAMAIS index.html (évite pages blanches "fantômes")
   - N'intercepte PAS script.google.com (origine différente)
   - Offline uniquement pour la navigation (pages)
*/

const SW_VERSION = "v1.0.5";
const CACHE_NAME = `mes-actions-shell-${SW_VERSION}`;

const ASSETS = [
  "./manifest.json",
  "./offline.html",
  "./register-device.js",

  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
  "./icons/icon-182.png"
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas intercepter hors de l'origine GitHub Pages
  if (url.origin !== self.location.origin) return;

  // NAVIGATION: network-first + fallback offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (e) {
        return await caches.match("./offline.html");
      }
    })());
    return;
  }

  // ASSETS: cache-first (sans fallback HTML pour JS/CSS)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);

    if (req.method === "GET") {
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(req, fresh.clone()).catch(() => {});
      });
    }
    return fresh;
  })());
});
