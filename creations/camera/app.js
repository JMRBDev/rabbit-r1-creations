(() => {
  var INDEX_KEY = "cam_photos_index";
  var $ = R1.$;
  var store = R1.store;
  var cam = $("cam");
  var grid = $("grid");
  var banner = $("banner");
  var flash = $("flash");
  var shutter = $("shutter");
  var screenFlash = $("screen-flash");
  var flashToggle = $("flash-toggle");
  var switchPulse = $("switch-pulse");
  var camErr = $("cam-err");
  var fullImg = $("full-img");
  var fullStage = document.querySelector("#screen-full .stage");

  var cams = [];
  var camIndex = 0;
  var stream = null;
  var starting = false;
  var mode = "capture";
  var isSelfie = false;
  var flashOn = false;

  var photos = [];
  var sel = 0;
  var fullIdx = 0;
  var selected = new Set();
  var lastWheel = 0;

  var zoom = false;
  var panX = 0;
  var panY = 0;
  var pd = null;
  var panned = false;

  var toast = (msg, ms) => R1.toast(banner, msg, ms);
  var clamp = (v) => Math.max(-1, Math.min(1, v));

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.remove("active");
    });
    $(
      m === "capture" ? "screen-capture" : m === "grid" ? "screen-grid" : "screen-full",
    ).classList.add("active");
    if (m !== "capture") stopCamera();
  }

  function exitToCapture() {
    selected.clear();
    setMode("capture");
    startCamera(camIndex);
  }

  function discover() {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devs) => {
        var vids = devs.filter((d) => d.kind === "videoinput");
        if (!vids.length) vids = [{ deviceId: "", label: "default" }];
        cams = vids.map((d, i) => {
          var lab = (d.label || "").toLowerCase();
          var face = /back|rear|environ/.test(lab)
            ? "env"
            : /front|user|inner|selfie/.test(lab)
              ? "user"
              : "";
          return { deviceId: d.deviceId, label: d.label || `cam ${i + 1}`, face };
        });
      })
      .catch(() => (cams = [{ deviceId: "", label: "default", face: "" }]));
  }

  function applySelfie(front) {
    isSelfie = front;
    cam.classList.toggle("flip", front);
    flashToggle.style.display = front ? "" : "none";
    if (!front) {
      flashOn = false;
      flashToggle.classList.remove("on");
    }
  }

  function startCamera(i) {
    if (starting) return Promise.resolve();
    starting = true;
    var c = cams.length
      ? cams[(i + cams.length) % cams.length]
      : { deviceId: "", face: "", label: "default" };
    camIndex = cams.length ? (i + cams.length) % cams.length : 0;
    camErr.style.display = "none";
    stopCamera();
    return navigator.mediaDevices
      .getUserMedia({
        video: c.deviceId
          ? { deviceId: { exact: c.deviceId } }
          : { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((s) => {
        stream = s;
        cam.srcObject = s;
        cam.play().catch(() => {});
        var fm = s.getVideoTracks()[0]?.getSettings?.().facingMode || "";
        if (fm === "user" || fm === "environment") c.face = fm === "user" ? "user" : "env";
        applySelfie(c.face === "user");
      })
      .catch((e) => {
        stream = null;
        cam.srcObject = null;
        applySelfie(false);
        camErr.innerHTML = `<b>camera unavailable</b><br>${e?.name || "denied"}`;
        camErr.style.display = "flex";
      })
      .finally(() => {
        starting = false;
      });
  }

  function stopCamera() {
    if (!stream) return;
    stream.getTracks().forEach((t) => {
      t.stop();
    });
    stream = null;
    cam.srcObject = null;
  }

  function switchCamera(dir) {
    if (cams.length <= 1) return toast("1 camera only");
    var ni = (camIndex + dir + cams.length) % cams.length;
    var label = cams[ni].label;
    switchPulse.textContent = dir > 0 ? "»" : "«";
    switchPulse.classList.add("show");
    setTimeout(() => switchPulse.classList.remove("show"), 220);
    startCamera(ni).then(() => toast(label));
  }

  var capturing = false;

  function capture() {
    if (!stream) return toast("no camera");
    if (capturing) return;
    capturing = true;
    if (isSelfie && flashOn) {
      screenFlash.classList.add("on");
      setTimeout(() => {
        runCapture(true);
        setTimeout(() => screenFlash.classList.remove("on"), 60);
      }, 180);
    } else runCapture(false);
  }

  function whenFrame(cb) {
    if (cam.videoWidth) return cb();
    var done = false;
    var finish = () => {
      if (done) return;
      done = true;
      cb();
    };
    if (cam.requestVideoFrameCallback) cam.requestVideoFrameCallback(finish);
    var n = 0;
    var t = setInterval(() => {
      if (cam.videoWidth || ++n > 16) {
        clearInterval(t);
        finish();
      }
    }, 50);
  }

  function drawFrame() {
    var vw = cam.videoWidth;
    var vh = cam.videoHeight;
    if (!vw || !vh) return null;
    var scale = Math.min(1, 640 / Math.max(vw, vh));
    var cnv = document.createElement("canvas");
    cnv.width = Math.round(vw * scale);
    cnv.height = Math.round(vh * scale);
    var ctx = cnv.getContext("2d");
    if (cam.classList.contains("flip")) {
      ctx.translate(cnv.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(cam, 0, 0, cnv.width, cnv.height);
    return cnv.toDataURL("image/jpeg", 0.7);
  }

  function runCapture(skipFlashAnim) {
    whenFrame(() => {
      var dataUrl;
      try {
        dataUrl = drawFrame();
      } catch (e) {
        capturing = false;
        return toast(`capture failed: ${e?.name || "error"}`, 2000);
      }
      capturing = false;
      if (!dataUrl) return toast("no camera", 1200);
      if (!skipFlashAnim) {
        flash.classList.add("fire");
        requestAnimationFrame(() => flash.classList.remove("fire"));
      }
      shutter.classList.add("fire");
      setTimeout(() => shutter.classList.remove("fire"), 90);
      savePhoto(dataUrl);
    });
  }

  function loadPhotos() {
    return store
      .getItem(INDEX_KEY)
      .then((raw) => {
        var ids = raw ? JSON.parse(atob(raw)) : [];
        return Promise.all(
          ids.map((id) =>
            store
              .getItem(`cam_photo_${id}`)
              .then((v) => (v ? { id, url: `data:image/jpeg;base64,${v}` } : null)),
          ),
        );
      })
      .then((arr) => (photos = arr.filter(Boolean)))
      .catch(() => (photos = []));
  }

  function persistIndex() {
    return store.setItem(INDEX_KEY, btoa(JSON.stringify(photos.map((p) => p.id))));
  }

  function savePhoto(dataUrl) {
    var id = `p${Date.now().toString(36)}`;
    var b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    function attempt(retries) {
      return store.setItem(`cam_photo_${id}`, b64).then(
        () => {
          photos.unshift({ id, url: dataUrl });
          return persistIndex();
        },
        (e) => {
          if (
            retries > 0 &&
            photos.length &&
            /quota|exceed|space/i.test(`${e?.name || ""} ${e?.message || ""}`)
          ) {
            var oldest = photos.pop();
            store.removeItem(`cam_photo_${oldest.id}`);
            return attempt(retries - 1);
          }
          throw e;
        },
      );
    }
    attempt(3).catch((e) => toast(`save failed: ${e?.name || "error"}`, 2000));
  }

  function updateSelBar() {
    var has = selected.size > 0;
    $("screen-grid").classList.toggle("has-sel", has);
    $("gal-meta").textContent = has ? `${selected.size}/${photos.length}` : `${photos.length}`;
  }

  function setCursor(idx) {
    if (idx === sel) return;
    grid.children[sel]?.classList.remove("cur");
    sel = idx;
    grid.children[sel]?.classList.add("cur");
  }

  function moveCursor(dir) {
    if (!photos.length) return;
    var next = (sel + dir + photos.length) % photos.length;
    setCursor(next);
    grid.children[sel]?.scrollIntoView({ block: "nearest" });
  }

  function toggleSelectIdx(idx) {
    var p = photos[idx];
    if (!p) return;
    var card = grid.children[idx];
    if (selected.has(p.id)) {
      selected.delete(p.id);
      card?.classList.remove("sel");
    } else {
      selected.add(p.id);
      card?.classList.add("sel");
    }
    updateSelBar();
  }

  function deleteSelected() {
    if (!selected.size) return toast("select photos first");
    var n = selected.size;
    photos.forEach((p) => {
      if (selected.has(p.id)) store.removeItem(`cam_photo_${p.id}`);
    });
    photos = photos.filter((p) => !selected.has(p.id));
    selected.clear();
    sel = Math.min(sel, Math.max(0, photos.length - 1));
    persistIndex();
    toast(`deleted ${n}`);
    renderGrid();
  }

  function bindCard(el, idx) {
    var t = null;
    var fired = false;
    var sx = 0;
    var sy = 0;
    var cancel = () => {
      if (t) {
        clearTimeout(t);
        t = null;
      }
    };
    el.onpointerdown = (e) => {
      if (e.button && e.button !== 0) return;
      fired = false;
      sx = e.clientX;
      sy = e.clientY;
      t = setTimeout(() => {
        t = null;
        fired = true;
        onCardLong(idx);
      }, 380);
    };
    el.onpointermove = (e) => {
      if (t && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) cancel();
    };
    el.onpointerup = cancel;
    el.onpointercancel = cancel;
    el.onpointerleave = cancel;
    el.onclick = () => {
      if (fired) {
        fired = false;
        return;
      }
      onCardTap(idx);
    };
  }

  function onCardTap(idx) {
    setCursor(idx);
    if (selected.size) toggleSelectIdx(idx);
    else showFull(idx);
  }

  function onCardLong(idx) {
    setCursor(idx);
    toggleSelectIdx(idx);
  }

  function renderGrid() {
    updateSelBar();
    if (!photos.length) {
      grid.innerHTML = '<div class="empty">no photos yet</div>';
      return;
    }
    sel = Math.min(Math.max(0, sel), photos.length - 1);
    grid.innerHTML = "";
    photos.forEach((p, i) => {
      var d = grid.appendChild(document.createElement("div"));
      d.className = `card${selected.has(p.id) ? " sel" : ""}${i === sel ? " cur" : ""}`;
      var img = d.appendChild(document.createElement("img"));
      img.src = p.url;
      bindCard(d, i);
    });
    grid.children[sel]?.scrollIntoView({ block: "nearest" });
  }

  function applyZoom() {
    fullImg.style.transform = zoom ? "scale(2.2)" : "";
    fullImg.style.transformOrigin = zoom ? `${50 + panX * 50}% ${50 + panY * 50}%` : "";
    fullImg.classList.toggle("zoomed", zoom);
    $("full-tag").textContent = zoom ? "2× zoom" : "photo";
    $("full-hint").textContent = zoom ? "ptt: fit · wheel: pan" : "ptt: zoom · hold: grid";
  }

  function toggleZoom() {
    zoom = !zoom;
    if (!zoom) {
      panX = 0;
      panY = 0;
    }
    applyZoom();
  }

  function showFull(i) {
    fullIdx = ((i % photos.length) + photos.length) % photos.length;
    zoom = false;
    panX = 0;
    panY = 0;
    fullImg.src = photos[fullIdx].url;
    $("full-meta").textContent = `${fullIdx + 1}/${photos.length}`;
    applyZoom();
    setMode("full");
  }

  function wheel(dir) {
    var now = Date.now();
    var gap = mode === "capture" ? 180 : mode === "full" && zoom ? 70 : 110;
    if (now - lastWheel < gap) return;
    lastWheel = now;
    if (mode === "capture") switchCamera(dir);
    else if (mode === "grid") moveCursor(dir);
    else if (mode === "full") {
      if (zoom) {
        panY = clamp(panY - dir * 0.16);
        applyZoom();
      } else {
        showFull(fullIdx + dir);
      }
    }
  }

  function ptt() {
    if (mode === "capture") return capture();
    if (mode === "grid") {
      if (!photos.length) return;
      if (selected.size) toggleSelectIdx(sel);
      else showFull(sel);
      return;
    }
    if (mode === "full") return toggleZoom();
  }

  function longPress() {
    if (mode === "capture") {
      renderGrid();
      setMode("grid");
      return;
    }
    if (mode === "grid") {
      if (!photos.length) return exitToCapture();
      if (selected.size) return deleteSelected();
      toggleSelectIdx(sel);
      return;
    }
    if (mode === "full") {
      renderGrid();
      setMode("grid");
    }
  }

  fullImg.addEventListener("pointerdown", (e) => {
    if (!zoom) return;
    panned = false;
    pd = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    fullImg.setPointerCapture(e.pointerId);
    fullImg.classList.add("panning");
  });
  fullImg.addEventListener("pointermove", (e) => {
    if (!pd) return;
    var dx = e.clientX - pd.x;
    var dy = e.clientY - pd.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panned = true;
    var ox = fullStage.clientWidth || 1;
    var oy = fullStage.clientHeight || 1;
    panX = clamp(pd.px + dx / ox);
    panY = clamp(pd.py + dy / oy);
    fullImg.style.transformOrigin = `${50 + panX * 50}% ${50 + panY * 50}%`;
  });
  var endPan = () => {
    pd = null;
    fullImg.classList.remove("panning");
  };
  fullImg.addEventListener("pointerup", endPan);
  fullImg.addEventListener("pointercancel", endPan);
  fullImg.addEventListener("click", () => {
    if (panned) {
      panned = false;
      return;
    }
    toggleZoom();
  });

  R1.bindControls({ wheel, ptt, longPress, devbar: "devbar" });
  if (!R1.hasSDK) shutter.addEventListener("click", ptt);

  $("to-gallery").addEventListener("click", () => {
    renderGrid();
    setMode("grid");
  });
  $("to-camera").addEventListener("click", exitToCapture);
  flashToggle.addEventListener("click", () => {
    flashOn = !flashOn;
    flashToggle.classList.toggle("on", flashOn);
  });
  $("sel-all").addEventListener("click", () => {
    if (!photos.length) return;
    photos.forEach((p) => {
      selected.add(p.id);
    });
    renderGrid();
  });
  $("clear-sel").addEventListener("click", () => {
    if (!selected.size) return;
    selected.clear();
    renderGrid();
    toast("cancelled");
  });
  $("del-sel").addEventListener("click", deleteSelected);

  function ensureCamera() {
    if (!stream && !starting && navigator.mediaDevices?.getUserMedia) startCamera(camIndex);
  }
  ["sideClick", "scrollUp", "scrollDown", "longPressEnd"].forEach((t) => {
    window.addEventListener(t, ensureCamera, { once: true });
  });
  document.addEventListener("pointerdown", ensureCamera, { once: true });
  document.addEventListener("keydown", ensureCamera, { once: true });

  function boot() {
    if (!navigator.mediaDevices?.getUserMedia) {
      camErr.innerHTML = "<b>no camera api</b><br>this webview has no<br>getUserMedia";
      camErr.style.display = "flex";
      return;
    }
    startCamera(0);
    discover();
    loadPhotos();
  }
  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})();
