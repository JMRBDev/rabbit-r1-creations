# rabbit-r1-creations

A minimal **Hello World** [R1 Creation](https://rabbit.tech/creations) for the Rabbit R1, plus a self-hosted QR generator to install it onto a personal device.

## What's here

```
.
├── hello-world/      # the Creation: a 240x282 static page + Creations SDK demo
└── qr-generator/     # self-host tool that builds the install QR (from rabbit-hmi-oss)
```

The Creation is a single static HTML file sized exactly to the R1 screen (240x282). It demonstrates the [Creations SDK](https://github.com/rabbit-hmi-oss/creations-sdk/blob/main/plugin-demo/reference/creation-triggers.md):

- **Scroll wheel** → live counter (`scrollUp` / `scrollDown` window events)
- **Side button (PTT)** → asks the on-device LLM to speak via `PluginMessageHandler` + `wantsR1Response: true`
- **`window.onPluginMessage`** → receives the server reply
- Gracefully degrades to a static page when opened in a normal browser (SDK not present)

## How R1 Creations install works

The R1 camera scans a **QR code that encodes a JSON object**, not a plain URL:

```json
{ "title": "Hello World", "url": "<your hosted index.html>", "description": "...", "iconUrl": "", "themeColor": "#FE5000" }
```

The device reads that JSON and loads `url` as a 240x282 WebView. So you need (1) the page hosted at a public HTTPS URL, and (2) a QR encoding that JSON pointing at it.

## Step 1 — Host the Creation publicly (free via GitHub Pages)

1. Push this folder to a GitHub repo (e.g. `rabbit-r1-creations`).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / `/root`.
3. Wait ~1 min. Your Creation URL will be:

   `https://<your-username>.github.io/rabbit-r1-creations/hello-world/`

> Any static host with HTTPS works (Netlify, Vercel, Cloudflare Pages). The R1 must reach the URL from the internet. localhost won't do.

## Step 2 — Generate the install QR

Open `qr-generator/index.html` in any browser (just double-click it; it's fully client-side), then fill in:

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| Title        | `Hello World`                                           |
| URL          | `https://<your-username>.github.io/.../hello-world/`    |
| Description  | `my first r1 creation`                                  |
| Icon URL     | (leave blank)                                           |
| Theme Color  | `#FE5000`                                               |

Click **Generate QR Code**, then **Download**. The PNG encodes the JSON payload above.

## Step 3 — Install on your R1

1. On the R1, open the **camera / creation scanner** (from the creations flow at `rabbit.tech/creations`: *"scan the QR code with your r1 to install it"*).
2. Point it at the generated QR.
3. The Creation installs and opens. Scroll the wheel → counter moves; press the side button → the R1 speaks.

## Run locally for development

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/hello-world/`. In a desktop browser you'll see the static page (counter/voice are inert since `PluginMessageHandler` only exists inside the R1 WebView).

## Notes / caveats

- The SDK README still says *"Soon"* — full docs aren't published. This demo uses only the documented JS channels (`PluginMessageHandler`, `window.onPluginMessage`, `scrollUp/Down`, `sideClick`).
- Sideloading via self-hosted QR is supported by the bundled `qr` tool; whether your device firmware accepts arbitrary URLs without gallery listing is best confirmed by the scan itself (Step 3).
