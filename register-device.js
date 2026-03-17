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

  function pushDebugLog_(msg) {
    try {
      var prev = localStorage.getItem("acr.push.debugLog") || "";
      var line = "[" + new Date().toISOString() + "] " + String(msg || "");
      var next = prev ? (prev + "\n" + line) : line;
      localStorage.setItem("acr.push.debugLog", next);
      console.log("[ACRDBG]", msg);
    } catch (e) {}
  }

  function clearPushDebugLog_() {
    try { localStorage.removeItem("acr.push.debugLog"); } catch (e) {}
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

  function arrayBufferToBase64_(buffer) {
    try {
      if (!buffer) return "";
      var bytes = new Uint8Array(buffer);
      var binary = "";
      for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (e) {
      return "";
    }
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
      "pushAuth=" + encodeURIComponent(payload.auth || ""),
      "ts=" + Date.now()
    ];

    var url = exec + "?" + qs.join("&");

    return new Promise(function(resolve){
      try {
        var img = new Image();
        var done = false;

        function finish(ok, info){
          if (done) return;
          done = true;
          try {
            set("acr.push.lastRegisterAt", String(Date.now()));
            localStorage.setItem("acr.push.lastRegisterResult", JSON.stringify({
              ok: !!ok,
              via: "img",
              at: new Date().toISOString(),
              info: info || "",
              url: url
            }));
          } catch (e) {}
          resolve(!!ok);
        }

        img.onload = function(){ finish(true, "load"); };
        img.onerror = function(){ finish(true, "error-event"); };

        setTimeout(function(){
          finish(true, "timeout");
        }, 2500);

        img.src = url;
      } catch (err) {
        try {
          console.warn("[ACR] registerdevice beacon failed", err);
        } catch(_) {}
        resolve(false);
      }
    });
  }

async function registerPushIfPossible_(force) {
  clearPushDebugLog_();
  pushDebugLog_("registerPushIfPossible start");

  var st = (get("acr.st") || "").trim();
  var exec = getExec_();

  pushDebugLog_("has st? " + (!!st));
  pushDebugLog_("has exec? " + (!!exec));
  pushDebugLog_("Notification.permission = " + (("Notification" in window) ? Notification.permission : "unsupported"));
  pushDebugLog_("has serviceWorker? " + (("serviceWorker" in navigator)));
  pushDebugLog_("has PushManager? " + (("PushManager" in window)));

  if (!st || !exec) {
    pushDebugLog_("st ou exec manquant");
    return;
  }

  var now = Date.now();
  var last = parseInt(get("acr.push.lastRegisterAt") || "0", 10);
  if (!force && last && (now - last) < 6 * 60 * 60 * 1000) {
    pushDebugLog_("throttle actif");
    return;
  }

  var deviceId = getOrCreateDeviceId_();
  var ua = navigator.userAgent || "";
  var platform = getPlatform_();
  var appVersion = "1.0.4";

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
      pushDebugLog_("support push incomplet");
      await sendRegister_(basePayload);
      return;
    }

    if (Notification.permission !== "granted") {
      pushDebugLog_("permission non granted");
      await sendRegister_(basePayload);
      return;
    }

    var vapidPublicKey = (get("acr.push.vapidPublicKey") || "").trim();
    if (!vapidPublicKey) {
      pushDebugLog_("vapid key missing");
      await sendRegister_(basePayload);
      return;
    }

    pushDebugLog_("waiting for serviceWorker.ready");
    var reg = await navigator.serviceWorker.ready;
    pushDebugLog_("serviceWorker.ready OK = " + (!!reg));

    var sub = await reg.pushManager.getSubscription();
    pushDebugLog_("existing subscription? " + (!!sub));

    if (!sub) {
      pushDebugLog_("calling pushManager.subscribe");
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array_(vapidPublicKey)
      });
      pushDebugLog_("subscribe returned " + (!!sub));
    }

    var json = (sub && sub.toJSON) ? sub.toJSON() : {};
    var endpoint = (json && json.endpoint) ? json.endpoint : (sub && sub.endpoint ? sub.endpoint : "");
    var p256dh = "";
    var auth = "";

    try {
      p256dh = arrayBufferToBase64_(sub.getKey("p256dh"));
    } catch (e) {
      pushDebugLog_("getKey p256dh failed");
    }

    try {
      auth = arrayBufferToBase64_(sub.getKey("auth"));
    } catch (e) {
      pushDebugLog_("getKey auth failed");
    }

    pushDebugLog_("push endpoint? " + (!!endpoint));
    pushDebugLog_("push p256dh? " + (!!p256dh));
    pushDebugLog_("push auth? " + (!!auth));
    pushDebugLog_("endpoint sample = " + (endpoint ? endpoint.slice(0, 60) : ""));

    pushDebugLog_("sending registerdevice");
    await sendRegister_({
      deviceId: deviceId,
      token: "webpush",
      platform: platform,
      appVersion: appVersion,
      ua: ua,
      endpoint: endpoint || "",
      p256dh: p256dh || "",
      auth: auth || ""
    });
    pushDebugLog_("sendRegister done");

  } catch (e) {
    pushDebugLog_("register push failed");
    pushDebugLog_("error name = " + (e && e.name ? e.name : ""));
    pushDebugLog_("error message = " + (e && e.message ? e.message : String(e)));
    try {
      localStorage.setItem("acr.push.lastRegisterError", String(e && e.message ? e.message : e));
    } catch (_) {}
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
