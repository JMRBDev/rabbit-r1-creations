# rabbit-r1-creations

A collection of [Rabbit R1 Creations](https://rabbit.tech/creations) — small static web apps built for the R1's 240×282 screen. Anyone can fork this and host their own.

> Building a new Creation, or modifying one? Read **[AGENTS.md](./AGENTS.md)** first — it's the source of truth for conventions, the full Creations SDK reference, and the gotchas that will bite you.

## What's in this repo

```
creations/<name>/   each Creation is a folder with three files:
├── index.html         markup + <link>/<script> references
├── styles.css         all CSS
└── app.js             all JS
lib/fonts/          shared Power Grotesk (WOFF2) — the R1's native typeface, used by every Creation
lib/shared/         shared reset.css — box-model reset, 240×282 dark viewport, palette tokens
qr-generator/       self-host tool that builds the install QR codes (not a Creation itself)
```

Current creations: `hello-world` (SDK demo: scroll counter + PTT-to-speak) and `camera` (live preview, wheel-driven camera switching, persistent gallery).

## Quick start (local dev)

```bash
python3 -m http.server 8000
```

Then open a Creation, e.g. <http://localhost:8000/creations/hello-world/>.

R1 Creations run inside the device WebView. In a desktop browser the hardware/voice bridges don't exist, so creations detect `typeof PluginMessageHandler === 'undefined'` and surface on-screen test controls instead. See [Testing](./AGENTS.md#testing).

## How an R1 Creation works

A Creation is just a static web page sized to **240×282 px**. It talks to the device through a small set of JavaScript bridges (the Creations SDK): `PluginMessageHandler`, `window.creationStorage`, `window.creationSensors`, plus hardware events (`scrollUp` / `scrollDown` / `sideClick` / `longPressStart` / `longPressEnd`). Full API: [Creations SDK reference](./AGENTS.md#creations-sdk-reference).

There is **no** SDK channel for the R1's motorized camera rotation, for WebSockets, or for arbitrary native calls — only the bridges above plus standard web APIs (`getUserMedia`, etc.).

## Install a Creation on your R1

The R1 installs a Creation by scanning a QR that encodes a **JSON object** (not a bare URL):

```json
{ "title": "Hello World", "url": "https://<your-domain>/creations/hello-world/",
  "description": "my first r1 creation", "iconUrl": "", "themeColor": "#FE5000" }
```

1. Host the repo at a **public HTTPS URL**. On GitHub Pages you can use the default `https://<user>.github.io/<repo>/`, or set a custom domain via a `CNAME` file.
2. Open `qr-generator/index.html` locally, enter title + URL (+ description, themeColor), **Generate**, **Download**.
3. Scan the QR with the R1's creation scanner. Done.

## Typography

Every Creation renders in **Power Grotesk** on a shared dark base. Load the font, then the shared reset, then the Creation's own styles (in that order):

```html
<link rel="stylesheet" href="../../lib/fonts/fonts.css">
<link rel="stylesheet" href="../../lib/shared/reset.css">
<link rel="stylesheet" href="styles.css">
```

`reset.css` provides the box-model reset, the 240×282 dark viewport, the font stack, and the R1 palette tokens (`--accent`, `--bg`, `--text`, …) — so each Creation's `styles.css` only holds its own component styles.

Only WOFF2 is shipped (smallest payload for limited hardware; supported by the R1's Chromium WebView), and only the weights actually used: **400 Regular, 700 Bold, 800 Heavy**. The browser fetches weights on demand.

## Known limitations

- The Creations SDK README is still marked *"Soon"*; the API surface used here is the documented set only.
- Sideloading via a self-hosted QR is supported by the bundled `qr-generator`; whether a given firmware accepts arbitrary non-gallery URLs is confirmed by the scan itself.
- Power Grotesk ships under its **trial license** (upright cuts only — no italics bundled).
