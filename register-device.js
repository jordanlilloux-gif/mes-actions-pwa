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


// -------------------------------------------------------------
// Notifications polling (Mes Actions / TeamActions)
// -------------------------------------------------------------

(function () {
  "use strict";

  function get(k){
    try { return localStorage.getItem(k) || ""; }
    catch(e){ return ""; }
  }

  function set(k,v){
    try { localStorage.setItem(k,String(v||"")); }
    catch(e){}
  }

  var exec = (get("acr.exec") || "").trim();
  var st   = (get("acr.st")   || "").trim();

  if (!exec || !st) return;

  async function checkNotifState(){

    var url =
      exec +
      "?mode=notifstate" +
      "&st=" + encodeURIComponent(st) +
      "&_=" + Date.now();

    try{

      var res  = await fetch(url,{cache:"no-store"});
      var data = await res.json();

      if (!data || !data.ok) return;

      var oldMy   = get("acr.notif.fp.myactions");
      var oldTeam = get("acr.notif.fp.teamactions");

      var newMy   = ((data.myactions||{}).fingerprint||"");
      var newTeam = ((data.teamactions||{}).fingerprint||"");

      if (newMy !== oldMy){
        console.log("[ACR] nouveautés Mes actions");
        set("acr.notif.fp.myactions", newMy);
      }

      if (newTeam !== oldTeam){
        console.log("[ACR] nouveautés TeamActions");
        set("acr.notif.fp.teamactions", newTeam);
      }

      try{
        localStorage.setItem("acr.notif.last", JSON.stringify({
          at: new Date().toISOString(),
          myactions: data.myactions || {},
          teamactions: data.teamactions || {}
        }));
      }catch(e){}

    }catch(e){
      console.warn("[ACR] notifstate error", e);
    }

  }

  // premier check
  checkNotifState();

  // polling toutes les 60s
  setInterval(function(){
    if (document.visibilityState === "visible"){
      checkNotifState();
    }
  }, 60000);

  // check quand l'app redevient visible
  document.addEventListener("visibilitychange",function(){
    if (document.visibilityState === "visible"){
      checkNotifState();
    }
  });

})();
