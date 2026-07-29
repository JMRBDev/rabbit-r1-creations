(function () {
  "use strict";

  var hasSDK = typeof PluginMessageHandler !== "undefined";
  var storage = (function () {
    if (window.creationStorage && window.creationStorage.plain) return window.creationStorage.plain;
    var ls = { _: {} };
    ls.getItem = function (k) { return Object.prototype.hasOwnProperty.call(ls._, k) ? ls._[k] : null; };
    ls.setItem = function (k, v) { ls._[k] = v; };
    ls.removeItem = function (k) { delete ls._[k]; };
    return ls;
  })();

  var INDEX_KEY = "cam_photos_index";
  var MAX_PHOTOS = 12;

  var cam = document.getElementById("cam");
  var grid = document.getElementById("grid");
  var banner = document.getElementById("banner");
  var flash = document.getElementById("flash");
  var switchPulse = document.getElementById("switch-pulse");
  var camErr = document.getElementById("cam-err");

  var cameras = [];
  var camIndex = 0;
  var stream = null;
  var mode = "capture";

  var photos = [];
  var sel = 0;
  var fullIdx = 0;

  var lastWheel = 0;

  /* ---------- helpers ---------- */
  function b64(s) { try { return btoa(s); } catch (e) { return btoa(unescape(encodeURIComponent(s))); } }
  function unb64(s) { try { return atob(s); } catch (e) { return decodeURIComponent(escape(atob(s))); } }

  function toast(msg, ms) {
    banner.textContent = msg;
    banner.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { banner.classList.remove("show"); }, ms || 1200);
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var id = m === "capture" ? "screen-capture" : m === "grid" ? "screen-grid" : "screen-full";
    document.getElementById(id).classList.add("active");
    document.getElementById("full-meta").textContent = (photos.length ? (fullIdx + 1) : 0) + "/" + photos.length;
    if (m !== "capture") stopCamera();
  }

  /* ---------- camera device discovery ---------- */
  function discover() {
    return navigator.mediaDevices.enumerateDevices().then(function (devs) {
      var vids = devs.filter(function (d) { return d.kind === "videoinput"; });
      if (vids.length === 0) vids = [{ deviceId: "", label: "default" }];
      cams = vids.map(function (d, i) {
        var lab = (d.label || "").toLowerCase();
        var face = lab.indexOf("back") >= 0 || lab.indexOf("rear") >= 0 || lab.indexOf("environ") >= 0 ? "env"
                 : lab.indexOf("front") >= 0 || lab.indexOf("user") >= 0 ? "user" : "";
        return { deviceId: d.deviceId, label: d.label || ("cam " + (i + 1)), face: face };
      });
    }).catch(function () { cams = [{ deviceId: "", label: "default", face: "" }]; });
  }

  function isFront(c) { return c.face === "user" || /front|user/.test(c.label.toLowerCase()); }

  function startCamera(i) {
    camIndex = (i + cams.length) % cams.length;
    var c = cams[camIndex];
    document.getElementById("cam-meta").textContent = (cams.length > 1 ? (camIndex + 1) + "/" + cams.length + " " : "") + c.label;
    camErr.style.display = "none";

    var constraints = { video: c.deviceId ? { deviceId: { exact: c.deviceId } } : { facingMode: "environment" }, audio: false };
    stopCamera();
    return navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
      stream = s;
      cam.srcObject = s;
      cam.classList.toggle("flip", isFront(c));
    }).catch(function (e) {
      cam.srcObject = null;
      camErr.innerHTML = "<b>camera unavailable</b><br>" + (e && e.name ? e.name : "denied");
      camErr.style.display = "flex";
    });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; cam.srcObject = null; }
  }

  function switchCamera(dir) {
    if (cams.length <= 1) { toast("1 camera only"); return; }
    var ni = (camIndex + dir + cams.length) % cams.length;
    var label = cams[ni].label;
    switchPulse.textContent = dir > 0 ? "»" : "«";
    switchPulse.classList.add("show");
    setTimeout(function () { switchPulse.classList.remove("show"); }, 220);
    startCamera(ni).then(function () { toast(label); });
  }

  /* ---------- capture + storage ---------- */
  function capture() {
    if (!stream || cam.readyState < 2) { toast("no camera"); return; }
    var vw = cam.videoWidth || 320, vh = cam.videoHeight || 240;
    var cap = 640, scale = Math.min(1, cap / Math.max(vw, vh));
    var cw = Math.round(vw * scale), ch = Math.round(vh * scale);
    var cnv = document.createElement("canvas");
    cnv.width = cw; cnv.height = ch;
    var ctx = cnv.getContext("2d");
    if (cam.classList.contains("flip")) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(cam, 0, 0, cw, ch);
    var url = cnv.toDataURL("image/jpeg", 0.7);

    flash.classList.add("fire");
    requestAnimationFrame(function () {
      flash.classList.remove("fire");
    });
    document.getElementById("shutter").classList.add("fire");
    setTimeout(function () { document.getElementById("shutter").classList.remove("fire"); }, 90);

    savePhoto(url);
    toast("saved (" + photos.length + ")", 900);
  }

  function loadPhotos() {
    return Promise.resolve().then(function () {
      var raw = storage.getItem(INDEX_KEY);
      var ids = raw ? JSON.parse(unb64(raw)) : [];
      photos = ids.map(function (id) {
        var v = storage.getItem("cam_photo_" + id);
        return v ? { id: id, url: unb64(v) } : null;
      }).filter(Boolean);
    }).catch(function () { photos = []; });
  }

  function persistIndex() {
    var ids = photos.map(function (p) { return p.id; });
    storage.setItem(INDEX_KEY, b64(JSON.stringify(ids)));
  }

  function savePhoto(url) {
    var id = "p" + Date.now().toString(36);
    try {
      storage.setItem("cam_photo_" + id, b64(url));
      photos.unshift({ id: id, url: url });
      if (photos.length > MAX_PHOTOS) {
        var dropped = photos.splice(MAX_PHOTOS);
        dropped.forEach(function (p) { storage.removeItem("cam_photo_" + p.id); });
      }
      persistIndex();
    } catch (e) {
      photos = photos.filter(function (p) { return p.id !== id; });
      toast("storage full");
    }
  }

  function deletePhoto(idx) {
    if (idx < 0 || idx >= photos.length) return;
    storage.removeItem("cam_photo_" + photos[idx].id);
    photos.splice(idx, 1);
    persistIndex();
  }

  /* ---------- gallery rendering ---------- */
  function renderGrid() {
    document.getElementById("gal-meta").textContent = photos.length;
    if (!photos.length) {
      grid.innerHTML = '<div class="empty">no photos yet<br>PTT to capture<br>in camera mode</div>';
      return;
    }
    if (sel >= photos.length) sel = photos.length - 1;
    grid.innerHTML = "";
    photos.forEach(function (p, i) {
      var d = document.createElement("div");
      d.className = "thumb" + (i === sel ? " sel" : "");
      var img = document.createElement("img");
      img.src = p.url;
      d.appendChild(img);
      grid.appendChild(d);
    });
  }

  function showFull(i) {
    fullIdx = (i + photos.length) % photos.length;
    document.getElementById("full-img").src = photos[fullIdx].url;
    document.getElementById("full-meta").textContent = (fullIdx + 1) + "/" + photos.length;
    setMode("full");
  }

  /* ---------- wheel debounce: one notch = one action ---------- */
  function wheel(dir) {
    var now = Date.now();
    var cooldown = mode === "capture" ? 180 : 110;
    if (now - lastWheel < cooldown) return;
    lastWheel = now;

    if (mode === "capture") {
      switchCamera(dir);
    } else if (mode === "grid") {
      sel = (sel + dir + photos.length) % photos.length;
      renderGrid();
    } else if (mode === "full") {
      showFull(fullIdx + dir);
    }
  }

  function ptt() {
    if (mode === "capture") capture();
    else if (mode === "grid") { if (photos.length) showFull(sel); }
    else if (mode === "full") { renderGrid(); setMode("grid"); }
  }

  function longPress() {
    if (mode === "capture") { renderGrid(); setMode("grid"); }
    else if (mode === "grid") { setMode("capture"); startCamera(camIndex); }
    else if (mode === "full") {
      deletePhoto(fullIdx);
      toast("deleted");
      if (photos.length) showFull(Math.min(fullIdx, photos.length - 1));
      else { renderGrid(); setMode("grid"); }
    }
  }

  /* ---------- hardware bindings ---------- */
  window.addEventListener("scrollUp", function () { wheel(1); });
  window.addEventListener("scrollDown", function () { wheel(-1); });
  window.addEventListener("sideClick", ptt);
  window.addEventListener("longPressEnd", longPress);

  /* ---------- desktop test harness ---------- */
  if (!hasSDK) {
    document.body.classList.add("dev");
    document.getElementById("shutter").addEventListener("click", ptt);
    document.getElementById("devbar").addEventListener("click", function (e) {
      var d = e.target.getAttribute("data-d");
      if (d === "up") wheel(1);
      else if (d === "down") wheel(-1);
      else if (d === "ptt") ptt();
      else if (d === "long") longPress();
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") wheel(1);
      else if (e.key === "ArrowDown") wheel(-1);
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); ptt(); }
      else if (e.key.toLowerCase() === "g") longPress();
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    loadPhotos().then(function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        camErr.innerHTML = "<b>no camera api</b><br>this webview has no<br>getUserMedia";
        camErr.style.display = "flex";
        return;
      }
      discover().then(function () { return startCamera(0); }).then(function () {
        toast(cams.length + " camera" + (cams.length === 1 ? "" : "s"));
      });
    });
  }
  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})();
