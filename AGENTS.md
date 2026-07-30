# AGENTS.md

Instructions for AI agents (and humans) working in this repo. **Read this before creating or modifying anything.** It encodes the hard constraints of the Rabbit R1 platform and the conventions this repo follows. Following it is how you avoid breaking things.

This file is also included by `CLAUDE.md` via `@AGENTS.md`.

## TL;DR rules (read these first)

1. A Creation lives in `creations/<name>/` as **three files**: `index.html` (markup + references), `styles.css`, `app.js` (split for legibility — never inline `<style>`/`<script>`). Sized **exactly 240×282 px**.
2. Every Creation **must work without the SDK** (graceful degradation) so it can be tested in a desktop browser.
3. Use **only** the Creations SDK bridges listed below + standard web APIs. **No WebSockets.** **No** channel exists for the motorized camera — don't try to spin it.
4. Always load Power Grotesk via `<link rel="stylesheet" href="../../lib/fonts/fonts.css">` and set `font-family: "Power Grotesk", -apple-system, sans-serif`. Never CDN fonts, never absolute URLs.
5. All `creationStorage` values must be **base64-encoded** (`btoa`/`atob`).
6. Hardware buttons are the primary input (no reliable touchscreen). Map them deliberately and **debounce the scroll wheel** (one notch = one action).
7. Optimize for limited hardware: CSS transitions over JS animation, minimize DOM writes, use `transform`/`opacity`.
8. Don't add comments that restate code. Don't add files unless needed. Don't commit unless asked.
9. **All UI copy is lowercase** — buttons, labels, topbar tags, toasts, hints, headers, empty states. The R1's own interface is lowercase; match it. No title case, no ALL CAPS in visible text.
10. **Dark mode only.** Every Creation uses the R1 brand palette (`#FE5000` accent on `#0a0a0a`/`#000`) — see [Brand colors](#brand-colors). No light theme, no toggle.
11. Every Creation loads the shared base: `<link href="../../lib/fonts/fonts.css">` → `<link href="../../lib/shared/reset.css">` → its own `styles.css`, in that order. `reset.css` provides the box-model reset, 240×282 dark viewport, font stack, and palette tokens — don't duplicate them.

## Repo layout

```
creations/<name>/              one Creation per folder, split into three files:
├── index.html                   markup + <link>/<script> references
├── styles.css                   all CSS
└── app.js                       all JS
lib/fonts/                      shared Power Grotesk WOFF2 + fonts.css (3 weights)
lib/shared/                     shared reset.css (CSS base + tokens) + core.js / store.js (window.R1 helpers)
qr-generator/                   self-host QR generator tool — NOT a Creation, leave at root
README.md                       human-facing overview
AGENTS.md                       this file (source of truth)
CLAUDE.md                       contains `@AGENTS.md`
CNAME                           optional GitHub Pages custom domain
```

- **Shared assets go in `lib/`** (e.g. `lib/fonts/`, `lib/shared/`). Don't copy fonts or shared CSS into a Creation.
- **A new Creation is the only thing that goes in `creations/`.** If you're tempted to add a tool or generator, ask first.
- A Creation's public URL is `<base>/creations/<name>/`, where `<base>` is whatever static host serves the repo root.

## File structure of a Creation

Every Creation is **three files in one folder** — keep markup, styles, and logic separate so it's legible and reviewable:

```
creations/<name>/
├── index.html    # structure only: <link>/<script> references + DOM. No inline <style>/<script>.
├── styles.css    # all CSS
└── app.js        # all JS
```

- `index.html` references its siblings with relative paths: `<link rel="stylesheet" href="styles.css">` and `<script src="app.js"></script>`.
- Reference shared `lib/` assets with the deeper relative path (`../../lib/...`) — the Creation is two levels deep: `../../lib/fonts/fonts.css` and `../../lib/shared/reset.css`.
- Stylesheet load order matters: **fonts.css → reset.css → the Creation's styles.css** (so the Creation always wins and can override freely).
- Scripts go at the end of `<body>`, in dependency order: `core.js` (+ `store.js` if you persist data) → your `app.js`. `core.js` exposes `window.R1` (`hasSDK`, `$`, `toast`, `bindControls`) — use `bindControls()` instead of hand-wiring the hardware events + dev harness.

## Creating a new Creation

1. `mkdir creations/<name>` and create three files: `index.html`, `styles.css`, `app.js`.
2. Start from the boilerplate below (correct viewport, font link, 240×282 sizing, SDK-detection, on-screen dev controls, and the 3-file split).
3. Implement features using only the SDK bridges + standard web APIs.
4. Wire hardware input (see [Hardware UX conventions](#hardware-ux-conventions)).
5. Test locally (see [Testing](#testing)).
6. Run the [Verification checklist](#verification-checklist) before considering it done.

### Boilerplate

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=240, initial-scale=1.0, user-scalable=no">
  <title><Name></title>
  <link rel="stylesheet" href="../../lib/fonts/fonts.css">
  <link rel="stylesheet" href="../../lib/shared/reset.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"><!-- your UI --></div>

  <!-- on-screen controls for desktop testing; auto-hidden on device -->
  <div class="devbar" id="devbar"></div>

  <script src="../../lib/shared/core.js"></script>
  <script src="../../lib/shared/store.js"></script> <!-- only if you persist data -->
  <script src="app.js"></script>
</body>
</html>
```

`styles.css` (component styles only — the reset, viewport sizing, dark base, font stack, palette tokens, and `.devbar` show/hide all come from `reset.css`):
```css
#app {
  width: 240px; height: 282px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; gap: 10px;
}
/* palette tokens (--accent, --bg, --surface, --text, …) are defined in reset.css;
   override an individual value here only if this Creation needs to deviate. */
```

`app.js`:
```js
(function () {
  "use strict";

  // hardware → handler wiring (also called by the dev controls)
  function onWheel(dir) {}      // dir = +1 (up) or -1 (down)
  function onPTT() {}           // side button click = primary action
  function onLongPress() {}     // long press = mode switch / destructive

  // lib/shared/core.js exposes window.R1 — bindControls() wires the 4 hardware
  // events AND, when there's no SDK, the desktop dev harness (devbar + arrow/space/g keys).
  R1.bindControls({ wheel: onWheel, ptt: onPTT, longPress: onLongPress, devbar: "devbar" });

  // other R1 helpers: R1.hasSDK, R1.$(id), R1.toast(el, msg, ms). load store.js for R1.store.

  window.onPluginMessage = function (data) {
    // data.data is a JSON string when useLLM was true
  };
})();
```

## Creations SDK reference

The complete documented API. `pluginId` is injected/overridden by the system — never set it yourself.

### PluginMessageHandler — send to server / LLM
```js
PluginMessageHandler.postMessage(JSON.stringify({
  message: "text",
  useLLM: true,            // optional: get an LLM reply (arrives via window.onPluginMessage)
  wantsR1Response: true,   // optional (default false): speak the reply through the R1 speaker
  wantsJournalEntry: true  // optional (default false): log to the journal
}));
```

### closeWebView — quit the Creation
```js
closeWebView.postMessage("");
```

### TouchEventHandler — synthesize touch
```js
TouchEventHandler.postMessage(JSON.stringify({ type: "tap"|"down"|"up"|"move"|"cancel", x: 100, y: 200 }));
```

### window.creationStorage — persistent storage (per-plugin isolated)
All values **must be base64**. Returns `null` if missing.
```js
await window.creationStorage.plain.setItem('k', btoa(val));      // unencrypted
const v = atob(await window.creationStorage.plain.getItem('k')); // throws if null → guard it
await window.creationStorage.plain.removeItem('k');
await window.creationStorage.plain.clear();
// .secure.* has the same API (hardware-encrypted, Android M+)
```

### window.creationSensors.accelerometer
```js
const ok = await window.creationSensors.accelerometer.isAvailable();
window.creationSensors.accelerometer.start((d) => {
  // d = { x, y, z } normalized -1..1
}, { frequency: 60 });
window.creationSensors.accelerometer.stop();
```

### window.onPluginMessage — receive replies
```js
window.onPluginMessage = function (data) {
  // data.message (string), data.pluginId, data.data (JSON string when useLLM)
  if (data.data) { const parsed = JSON.parse(data.data); /* use it */ }
};
```

### Hardware events (`window.addEventListener`)
`scrollUp`, `scrollDown`, `sideClick`, `longPressStart`, `longPressEnd`.
> A double side-button press fires two `sideClick` events ~50 ms apart.

### Standard web APIs (camera, mic, speaker)
Available via `getUserMedia` etc. in the WebView. **The motorized rotating camera has no SDK control** — to change framing, switch the active `videoinput` device / `facingMode`.

## Hardware UX conventions

The R1's reliable inputs are the **scroll wheel** and the **side button (PTT)**. Design for those, not touch.

- **Scroll wheel** → discrete navigation / cycling (cameras, list items, values). Debounce: ~150 ms in capture-like modes, ~110 ms for list navigation. One notch must equal exactly one action — never let a flick skip or repeat.
- **sideClick (PTT)** → the primary affirmative action (capture, open, confirm).
- **longPressEnd** → mode switching or destructive actions (enter/leave gallery, delete). Commit on `longPressEnd`, not `longPressStart`.
- Always give immediate visual feedback for every input (flash, border pulse, toast) — the screen is tiny and the user needs to know the input registered.
- Distinguish the two "back" gestures per screen and document them in the UI (`hold: gallery`, etc.).
- Stay on-brand: R1 orange (`#FE5000`) accent on a dark field reads best on the small display — see [Brand colors](#brand-colors).

## Brand colors

Every Creation ships **dark mode only** — no light theme, no toggle. The R1's small, dim-friendly screen reads best on a dark field, and one shared palette keeps creations recognizably on-brand.

- **Accent — R1 orange `#FE5000`.** The signature color. Use it sparingly: the primary action, the active/selected item, focus rings, capture flash, and toasts. Never as a large fill or full background — on a 240×282 screen it fatigues the eye.
- **Background — base `#0a0a0a`; media/camera surfaces `#000`.**
- **Surface / panels — `#141414`–`#161616`** (cards, top/shutter/dev bars, thumbnails).
- **Text — primary `#ffffff`; meta `#b8b8b8`; hints/empty states `#9a9a9a`–`#6a6a6a`.**
- **Borders/dividers — `#161616` or a low-alpha white (e.g. `rgba(255,255,255,.06)`).**
- **Errors/danger — stay on-palette:** reuse the orange accent for error banners; reach for a muted red only if a second severity level is unavoidable.

These live in `lib/shared/reset.css` as CSS custom properties (so every Creation shares them). Reference `var(--…)` everywhere; override an individual value in your `styles.css` only if a Creation needs to deviate:

```css
:root {
  --accent: #FE5000;      /* R1 orange — primary action, selection, brand */
  --bg: #0a0a0a;          /* app background */
  --bg-media: #000;       /* camera / image surfaces */
  --surface: #141414;     /* cards, bars, thumbs */
  --text: #ffffff;
  --text-muted: #b8b8b8;
  --text-dim: #6a6a6a;
  --border: #161616;
}
```

### UI copy is always lowercase

The R1's own interface is lowercase end to end — match it. **All user-facing copy is lowercase:** buttons, labels, topbar tags, toasts, hints, section headers, and empty-state text. No title case, no ALL CAPS.

- Good: `hold: gallery`, `wheel▲`, `saved (3)`, `1 camera only`, `deleted`, `no photos yet`.
- Avoid: `Hold: Gallery`, `Saved (3)`, `CAM`, `GALLERY`.
- The only exception is a proper-noun brand/product name shown in running text; otherwise everything the user reads is lowercase.

## Typography

- Load once: `<link rel="stylesheet" href="../../lib/fonts/fonts.css">` (note the `../../` — creations live two levels deep).
- Set `font-family: "Power Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`.
- Shipped weights: **400 Regular, 700 Bold, 800 Heavy** (WOFF2 only). Weight 600 renders via the nearest available weight (700) — that's expected.
- To add a weight: drop the WOFF2 into `lib/fonts/`, add an `@font-face` block to `lib/fonts/fonts.css` with the correct `font-weight`, and only do so if a Creation actually uses it. Never bundle unused weights.

## Performance (the hardware is limited)

- CSS transitions/animations over JS-driven animation loops.
- Animate `transform` and `opacity`; avoid animating layout properties.
- Minimize DOM writes (batch updates; avoid per-frame `innerHTML` rebuilds).
- Stop streams/sensors (`track.stop()`, `accelerometer.stop()`) when leaving a screen.
- `font-display: swap` is already set — don't change it.

## Testing

A desktop browser has **no SDK bridges** and (in most dev setups) **cannot grant camera/mic permission** (`NotAllowedError`). Design for this.

1. `python3 -m http.server 8000` from the repo root.
2. Open the Creation at `http://localhost:8000/creations/<name>/` in a browser resized to **240×282**.
3. Confirm the SDK-absent path works: on-screen dev controls + keyboard (↑/↓ = wheel, Space/Enter = PTT, `g` = long press) drive the same handlers as the hardware events.
4. Verify camera-dependent features fail gracefully (clear message), since the preview denies `getUserMedia`.
5. Re-run the [Verification checklist](#verification-checklist).

For storage testing without the device, fall back to `localStorage` when `window.creationStorage` is absent (see `creations/camera/app.js` for the pattern).

## Verification checklist (run before "done")

- [ ] `npm run check` passes clean (Biome lint + format). Stage and it auto-fixes via lint-staged; never commit with outstanding errors.
- [ ] The Creation is three files: `index.html`, `styles.css`, `app.js` — no inline `<style>`/`<script>`.
- [ ] Loads `../../lib/fonts/fonts.css` and `../../lib/shared/reset.css` (in that order) before its own `styles.css`.
- [ ] Loads `../../lib/shared/core.js` before `app.js` and wires input via `R1.bindControls()` (not hand-rolled `addEventListener`).
- [ ] Body is exactly **240×282**, `user-scalable=no`, no scrollbars.
- [ ] Loads `../../lib/fonts/fonts.css`; computed `font-family` starts with `"Power Grotesk"`.
- [ ] **Dark mode only**; all colors come from the R1 palette (`#FE5000` accent on `#0a0a0a`/`#000`).
- [ ] **All visible UI copy is lowercase** (buttons, tags, toasts, hints, empty states).
- [ ] Works in a plain browser with no SDK present (no thrown errors, dev controls appear).
- [ ] No WebSockets; no absolute/CDN font URLs; no call to a non-existent camera-rotation API.
- [ ] All `creationStorage` reads guard against `null`; all writes are base64.
- [ ] Scroll wheel is debounced (one notch = one action); every input has visual feedback.
- [ ] Streams/sensors are stopped on screen exit.
- [ ] HTTP 200 for the page and every asset; relative paths resolve from `creations/<name>/`.
- [ ] README tree/URLs updated if you added/renamed a Creation.

## Common mistakes (don't do these)

- **Inlining `<style>`/`<script>`.** Split into `styles.css` and `app.js` — see [File structure](#file-structure-of-a-creation).
- **Wrong font path.** `../fonts/fonts.css` or `/fonts/...` is wrong from `creations/<name>/`. It must be `../../lib/fonts/fonts.css`.
- **Absolute asset URLs.** Break when GitHub Pages serves from a subpath or a custom domain. Always use paths relative to the Creation's own folder.
- **Forgetting graceful degradation.** If you call `PluginMessageHandler.postMessage` unconditionally, the page throws in every desktop test. Guard with `typeof PluginMessageHandler !== 'undefined'`.
- **Raw strings in storage.** `creationStorage` values must be `btoa`'d, and reads must handle `null`.
- **Trying to rotate the camera motor.** There is no API for it. Switch `deviceId`/`facingMode` instead.
- **Unbounded growth.** Persisting large blobs (e.g. photos) without eviction fills storage. Cap collections and evict oldest.
- **Re-declaring the reset/palette in each Creation.** `reset.css` already sets the box model, the 240×282 dark viewport, the font stack, and the `--accent`/`--bg`/… tokens. Reference `var(--…)`; don't copy the `:root` block or `*{}` reset into a Creation's `styles.css`.

## License / assets

- Code in this repo: MIT.
- **Power Grotesk ships under its trial license** (upright cuts only). Don't redistribute the font outside its license terms.
- `qr-generator/` is vendored from [rabbit-hmi-oss/creations-sdk](https://github.com/rabbit-hmi-oss/creations-sdk) (MIT).
