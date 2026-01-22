/**
 * Auto-register device (push placeholder) in Google Sheet via GAS:
 *   .../exec?mode=registerdevice&me=...&sig=...&deviceId=...&token=...&platform=...&appVersion=...&ua=...
 *
 * Prérequis (localStorage, écrits par la WebApp Apps Script) :
 *   acr.email, acr.sig
 *   + idéalement acr.exec (URL /exec)
 *   + sinon acr.entry (URL ?mode=entry... pour déduire /exec)
 *
 * Ne bloque jamais l’UI (silencieux).
 */
(function () {
  "use strict";

  function get(k) {
    try { return localStorage.getItem(k) || ""; }
    catch (e) { return ""; }
  }

  function set(k, v) {
    try { localStorage.setItem(k, v); }
    catch (e) {}
  }

  // Throttle : une fois toutes les 6h max
  var now = Date.now();
  var last = parseInt(get("acr.push.lastRegisterAt") || "0", 10);
  if (last && (now - last) < 6 * 60 * 60 * 1000) return;

  var me = (get("acr.email") || "").trim().toLowerCase();
  var sig = (get("acr.sig") || "").trim();

  // URL /exec (idéalement injectée par la WebApp)
  var exec = (get("acr.exec") || "").trim();

  // Fallback: dérive de acr.entry si disponible
  if (!exec) {
    var entry = (get("acr.entry") || "").trim();
    if (entry) {
      try {
        var u = new URL(entry);
        exec = u.origin + u.pathname; // .../exec
      } catch (e) {}
    }
  }

  // Sans identité signée, on ne fait rien
  if (!me || !sig || !exec) return;

  // deviceId stable
  var deviceId = (get("acr.pushDeviceId") || "").trim();
  if (!deviceId) {
    deviceId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : ("dev-" + Date.now() + "-" + Math.random().toString(16).slice(2));
    set("acr.pushDeviceId", deviceId);
  }

  // Platform simple
  var ua = navigator.userAgent || "";
  var platform =
    /iphone|ipad|ipod/i.test(ua) ? "ios" :
    /android/i.test(ua) ? "android" :
    "desktop";

  // Token placeholder (FCM plus tard)
  var token = "pending";

  // Version PWA
  var appVersion = "1.0.4";

  var url =
    exec
    + "?mode=registerdevice"
    + "&me=" + encodeURIComponent(me)
    + "&sig=" + encodeURIComponent(sig)
    + "&deviceId=" + encodeURIComponent(deviceId)
    + "&token=" + encodeURIComponent(token)
    + "&platform=" + encodeURIComponent(platform)
    + "&appVersion=" + encodeURIComponent(appVersion)
    + "&ua=" + encodeURIComponent(ua.slice(0, 180))
    + "&ts=" + now;

  try {
    (new Image()).src = url;
    set("acr.push.lastRegisterAt", String(now));
  } catch (e) {}
})();
