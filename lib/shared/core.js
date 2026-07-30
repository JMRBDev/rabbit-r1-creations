/*
  shared core for R1 creations — load via <script src="../../lib/shared/core.js">
  before app.js. exposes window.R1: SDK detection, a $ shorthand, a transient
  toast(), and bindControls() which wires the hardware events (scrollUp / down /
  sideClick / longPressEnd) and, when the SDK is absent, the desktop dev harness
  (devbar buttons + arrow/space/g keys). see AGENTS.md.
*/
window.R1 = window.R1 || {};
var R1 = window.R1;

R1.hasSDK = typeof PluginMessageHandler !== "undefined";

R1.$ = (id) => document.getElementById(id);

R1.toast = (el, msg, ms) => {
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms || 1200);
};

R1.bindControls = ({ wheel, ptt, longPress, devbar } = {}) => {
  if (wheel) {
    window.addEventListener("scrollUp", () => wheel(1));
    window.addEventListener("scrollDown", () => wheel(-1));
  }
  if (ptt) window.addEventListener("sideClick", ptt);
  if (longPress) window.addEventListener("longPressEnd", longPress);
  if (R1.hasSDK) return;

  document.body.classList.add("dev");
  var bar = typeof devbar === "string" ? R1.$(devbar) : devbar;
  if (bar) {
    bar.addEventListener("click", (e) => {
      var d = e.target.getAttribute("data-d");
      if (d === "up" && wheel) wheel(1);
      else if (d === "down" && wheel) wheel(-1);
      else if (d === "ptt" && ptt) ptt();
      else if (d === "long" && longPress) longPress();
    });
  }
  window.addEventListener("keydown", (e) => {
    var k = e.key;
    if (k === "ArrowUp" && wheel) wheel(1);
    else if (k === "ArrowDown" && wheel) wheel(-1);
    else if ((k === " " || k === "Enter") && ptt) {
      e.preventDefault();
      ptt();
    } else if (longPress && k.toLowerCase() === "g") longPress();
  });
};
