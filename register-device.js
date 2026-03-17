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

  function getExec_() {
    var exec = (get("acr.exec") || "").trim();
    if (exec) return exec;

    var entry = (get("acr.entry") || "").trim();
    if (entry) {
      try {
        var u = new URL(entry);
        return u.origin + u.pathname;
      } catch (e) {}
    }
    return "";
  }

  function getOrCreateDeviceId_() {
    var deviceId = (get("acr.pushDeviceId") || "").trim();
    if (!deviceId) {
      deviceId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ("dev-" + Date.now() + "-" + Math.random().toString(16).slice(2));
      set("acr.pushDeviceId", deviceId);
    }
    return deviceId;
  }

  function getPlatform_() {
    var ua = navigator.userAgent || "";
    return /iphone|ipad|ipod/i.test(ua) ? "ios"
      : /android/i.test(ua) ? "android"
      : "desktop";
  }

  function urlBase64ToUint8Array_(base64String) {
    var padding = "=".repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function sendRegister_(payload) {
    var st = (get("acr.st") || "").trim();
    var exec = getExec_();
    if (!st || !exec) return Promise.resolve(false);

    var qs = [
      "mode=registerdevice",
      "st=" + encodeURIComponent(st),
      "deviceId=" + encodeURIComponent(payload.deviceId || ""),
      "token=" + encodeURIComponent(payload.token || "pending"),
      "platform=" + encodeURIComponent(payload.platform || ""),
      "appVersion=" + encodeURIComponent(payload.appVersion || ""),
      "ua=" + encodeURIComponent(String(payload.ua || "").slice(0, 180)),
      "endpoint=" + encodeURIComponent(payload.endpoint || ""),
      "p256dh=" + encodeURIComponent(payload.p256dh || ""),
      "auth=" + encodeURIComponent(payload.auth || ""),
      "ts=" + Date.now()
    ];

    var url = exec + "?" + qs.join("&");

    return fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit"
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
      try {
        set("acr.push.lastRegisterAt", String(Date.now()));
        localStorage.setItem("acr.push.lastRegisterResult", JSON.stringify(data || {}));
        console.log("[ACR] registerdevice result =", data);
      } catch (e) {}
      return !!(data && data.ok);
    })
    .catch(function(err){
      try { console.warn("[ACR] registerdevice fetch failed", err); } catch(_){}
      return false;
    });
  }

  async function registerPushIfPossible_(force) {
    var st = (get("acr.st") || "").trim();
    var exec = getExec_();
    if (!st || !exec) return;

    var now = Date.now();
    var last = parseInt(get("acr.push.lastRegisterAt") || "0", 10);
    if (!force && last && (now - last) < 6 * 60 * 60 * 1000) return;

    var deviceId = getOrCreateDeviceId_();
    var ua = navigator.userAgent || "";
    var platform = getPlatform_();
    var appVersion = "1.0.4";

    // Fallback sûr : on garde le comportement actuel tant que le vrai push n'est pas prêt
    var basePayload = {
      deviceId: deviceId,
      token: "pending",
      platform: platform,
      appVersion: appVersion,
      ua: ua,
      endpoint: "",
      p256dh: "",
      auth: ""
    };

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        await sendRegister_(basePayload);
        return;
      }

      // On ne force pas encore la popup ici.
      // Si la permission n'est pas déjà accordée, on reste en pending.
      if (Notification.permission !== "granted") {
        await sendRegister_(basePayload);
        return;
      }

      var vapidPublicKey = (get("acr.push.vapidPublicKey") || "").trim();
      if (!vapidPublicKey) {
        await sendRegister_(basePayload);
        return;
      }

      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array_(vapidPublicKey)
        });
      }

      var json = (sub && sub.toJSON) ? sub.toJSON() : {};
      var keys = (json && json.keys) ? json.keys : {};

      await sendRegister_({
        deviceId: deviceId,
        token: "webpush",
        platform: platform,
        appVersion: appVersion,
        ua: ua,
        endpoint: json.endpoint || "",
        p256dh: keys.p256dh || "",
        auth: keys.auth || ""
      });
    } catch (e) {
      try { console.warn("[ACR] register push failed", e); } catch(_){}
      await sendRegister_(basePayload);
    }
  }

  window.acrRegisterPushNow = function(force){
    return registerPushIfPossible_(!!force);
  };

  registerPushIfPossible_(false);
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
