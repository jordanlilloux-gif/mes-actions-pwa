/* sw.js — Mes Actions PWA shell (GitHub Pages) — BULLETPROOF */

const SW_VERSION = "v1.0.12";
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

function normalizeNotifPayload_(raw) {
  const p = raw || {};
  const type = String(p.type || "generic").trim();
  const title =
    String(p.title || "").trim() ||
    (type === "myactions"
      ? "Nouveau commentaire admin"
      : type === "teamactions"
        ? "Nouveau commentaire TeamActions"
        : "Nouvelle notification");

  const body =
    String(p.body || "").trim() ||
    (type === "myactions"
      ? "Un administrateur a répondu à une de vos actions."
      : type === "teamactions"
        ? "Un utilisateur a ajouté un commentaire visible par les administrateurs."
        : "Vous avez une nouvelle notification.");

  const url = String(p.url || "./index.html").trim() || "./index.html";

  return {
    type,
    title,
    body,
    url,
    tag: String(p.tag || ("acr-" + type)).trim(),
    icon: String(p.icon || "./icons/icon-512.png").trim(),
    badge: String(p.badge || "./icons/favicon-32.png").trim(),
    data: {
      type,
      url
    }
  };
}

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let raw = {};
    try {
      raw = event.data ? event.data.json() : {};
    } catch (e) {
      try {
        raw = { body: event.data ? String(event.data.text() || "") : "" };
      } catch (_) {
        raw = {};
      }
    }

    const n = normalizeNotifPayload_(raw);

    await self.registration.showNotification(n.title, {
      body: n.body,
      icon: n.icon,
      badge: n.badge,
      tag: n.tag,
      renotify: true,
      data: n.data
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const data = event.notification && event.notification.data
      ? event.notification.data
      : {};

    const targetUrl = String((data && data.url) || "./index.html").trim() || "./index.html";
    const absoluteUrl = new URL(targetUrl, self.location.origin).href;

    const clientsList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clientsList) {
      try {
        if ("focus" in client) {
          await client.focus();
        }
        if ("navigate" in client) {
          await client.navigate(absoluteUrl);
        }
        return;
      } catch (e) {}
    }

    await self.clients.openWindow(absoluteUrl);
  })());
});
