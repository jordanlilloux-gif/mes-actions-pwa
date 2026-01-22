/**
 * Auto-register (push) device in Google Sheet via Google Apps Script
 *
 * Appelle :
 *   .../exec?mode=registerdevice
 *     &me=...
 *     &sig=...
 *     &deviceId=...
 *     &token=...
 *     &platform=...
 *     &appVersion=...
 *     &ua=...
 *
 * Prérequis (dans localStorage, définis par la Web App Apps Script) :
 *   - acr.email
 *   - acr.sig
 *   - (optionnel) acr.exec   → URL /exec complète
 *   - (optionnel) acr.entry  → URL d’entrée (?mode=entry…) pour déduire /exec
 *
 * Sécurité :
 *   - silencieux (aucune exception bloquante)
 *   - throttlé (1 appel max / 6h)
 *   - n’impacte jamais l’UI
 */

(function () {
  "use strict";

  // --- Helpers safe localStorage ---
  function get(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (e) {
      return "";
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  // --- Throttle : max 1 appel toutes les 6h ---
  var now = Date.now();
  var last = parseInt(get("acr.push.lastRegisterAt") || "0", 10);
  if (last && now - last < 6 * 60 * 60 * 1000) return;

  // --- Identité signée ---
  var me = (get("acr.email") || "").trim().toLowerCase();
  var sig = (get("acr.sig") || "").trim();

  // --- URL /exec ---
  var exec = (get("acr.exec") || "").trim();

  // Fallback : dériver /exec depuis une URL d’entrée stockée
  if (!exec) {
    var entry = (get("acr.entry") || "").trim();
    if (entry) {
      try {
        var u = new URL(entry);
        exec = u.origin + u.pathname; // .../exec
      } catch (e) {}
    }
  }

  // Sans identité ou URL valide → on sort proprement
  if (!me || !sig || !exec) return;

  // --- deviceId stable ---
  var deviceId = (get("acr.pushDeviceId") || "").trim();
  if (!deviceId) {
    deviceId =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : "dev-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    set("acr.pushDeviceId", deviceId);
  }

  // --- Platform ---
  var ua = navigator.userAgent || "";
  var platform =
    /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : /android/i.test(ua)
      ? "android"
      : "desktop";

  // --- Token (placeholder pour futur FCM) ---
  var token = "pending";

  // --- Version app (alignée avec SW_VERSION si besoin) ---
  var appVersion = "1.0.3";

  // --- Construction URL ---
  var url =
    exec +
    "?mode=registerdevice" +
    "&me=" +
    encodeURIComponent(me) +
    "&sig=" +
    encodeURIComponent(sig) +
    "&deviceId=" +
    encodeURIComponent(deviceId) +
    "&token=" +
    encodeURIComponent(token) +
    "&platform=" +
    encodeURIComponent(platform) +
    "&appVersion=" +
    encodeURIComponent(appVersion) +
    "&ua=" +
    encodeURIComponent(ua.slice(0, 180)) +
    "&ts=" +
    now;

  // --- Envoi silencieux ---
  try {
    new Image().src = url;
    set("acr.push.lastRegisterAt", String(now));
  } catch (e) {}
})();
