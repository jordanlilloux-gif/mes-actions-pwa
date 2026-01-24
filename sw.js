/* sw.js — Mes Actions PWA shell (GitHub Pages) — BULLETPROOF */

const SW_VERSION = "v1.0.10";
const CACHE_NAME = `mes-actions-shell-${SW_VERSION}`;
const OFFLINE_URL = "./offline.html";

const ASSETS = [
  "./manifest.json",
  "./offline.html",

  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const url of ASSETS) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          console.error("[SW] Asset failed:", url, res.status);
          continue; // on n'annule PAS l'installation
        }
        await cache.put(url, res.clone());
      } catch (err) {
        console.error("[SW] Fetch error:", url, err);
      }
    }

    await self.skipWaiting();
  })());
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

  // 🔒 Bulletproof offline for navigations (HTML documents)
if (req.mode === "navigate") {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const res = await fetch(req);

      // 🔑 CLÉ ABSOLUE : 404 / 500 doivent tomber en offline
      if (!res || !res.ok) {
        const offline = await cache.match(OFFLINE_URL);
        return offline || res;
      }

      return res;
    } catch (err) {
      const offline = await cache.match(OFFLINE_URL);
      return offline || new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" }
      });
    }
  })());
  return;
}

  // Assets : cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
