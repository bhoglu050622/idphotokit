# PhotoJhat

Indian passport, visa, PAN, Aadhaar and OCI photos, plus government exam photograph and
signature files. Free, private, and entirely in the browser. The catalogue still covers
other countries.

**Live site: https://photojhat.pages.dev/**

What it does:
- Upload an image (no server upload)
- Open on India’s passport. Indian visa, PAN, Aadhaar and OCI are linked first on the homepage.
  The rest of the catalogue is still searchable by country, document or size.
- Check the result against that document's rule, with the measurements drawn on the preview
- Crop with manual controls + automatic head framing
- Optional Auto Enhance (brightness/contrast/saturation baseline)
- Background removal (MODNet, kept from the upstream project) + choose background color
- Download a single photo or a print sheet
- **Exam resizer** at `/exam`: pick SSC CGL, SSC CHSL, UPSC CSE, IBPS PO, IBPS Clerk, SBI PO,
  NEET UG, JEE Main or RRB NTPC, upload a photograph and a signature, and download JPEGs in
  the kilobyte range that exam’s notice prints. Pixel sizes the notice does not state are
  marked unverified. Specs live in [`src/data/exams.ts`](src/data/exams.ts), one source URL
  and date per exam. JPEG quality is chosen by binary search (adapted from the MIT project
  [jeswintesting-spec/ImEditor](https://github.com/jeswintesting-spec/ImEditor)). A very flat
  scan that is still under the minimum at the highest quality gets a JPEG comment so the
  file reaches that minimum; the picture itself is not changed, and the page says so.

Every document has its own page: a country's primary document at `/photo/<country>` and the
rest at `/photo/<country>/<document>`, for example
[/photo/india](https://photojhat.pages.dev/photo/india),
[/photo/india/pan-card](https://photojhat.pages.dev/photo/india/pan-card),
[/photo/india/aadhaar](https://photojhat.pages.dev/photo/india/aadhaar) and
[/photo/india/oci-card-2x2-in](https://photojhat.pages.dev/photo/india/oci-card-2x2-in).
Each exam has its own page too, for example
[/exam/ibps-po](https://photojhat.pages.dev/exam/ibps-po).
The old `/passport-photo/<country>` paths redirect to `/photo/<country>`.

This is a fork of [vijayanandraj/idphotokit](https://github.com/vijayanandraj/idphotokit) (MIT).
The original project name and domain are not used here.

---

## Tech Stack

- React + TypeScript
- Vite
- Zustand (state management)
- react-easy-crop (crop UI)
- MediaPipe Tasks Vision (face detection)
- MODNet portrait matting (Apache-2.0), run locally via ONNX Runtime Web

Everything is client-side. The matting model is served from this site rather than a
third-party CDN, so no request describing your photo is made to anyone.

The matting model and its runtime are fetched the first time you remove a background —
about 16MB, then cached by the browser. Nothing is downloaded for the crop-only path.


---

## Features

### Step 1: Upload + Size
- 966 documents across 166 countries, searchable by country, document or size, with each country's documents grouped by category (passport, visa, residence, ID card, licence…). They live in two spreadsheets, [`specs/countries.csv`](specs/countries.csv) and [`specs/documents.csv`](specs/documents.csv). Add or correct one without touching code; see [`specs/README.md`](specs/README.md)
- Each preset carries two things, not one:
  - the **print size** (35×45mm across most of the world, 2×2in in the US, 50×70mm in
    Canada, 33×48mm in China, 26×32mm in Spain)
  - the **head height** the authority asks for, as a fraction of the photo. This is the part
    most tools skip: Canada wants the face to fill under half the frame, Australia and Japan
    want about three quarters. Cropping every country to the same proportions gives you a
    photo that is the right size and still gets rejected.
- Where a country publishes no chin-to-crown figure, a neutral ICAO proportion is used and
  the UI says so rather than inventing a number
- Custom size: width / height, units (mm, cm, inch, px), DPI
- Size, preset and DPI live in the URL, so a setup can be bookmarked or shared

### Step 2: Crop
- Manual crop (pan/zoom/rotate)
- Auto-frame head — runs automatically when a photo is loaded:
  - the crown is measured from the segmentation mask (which includes hair), not guessed from
    the face box, so tall or voluminous hair isn't cropped off
  - the chin comes from the face detector, and the frame is laid out to passport proportions:
    head ≈ 62% of the photo height with ~10% clear above the crown
- Auto Enhance:
  - estimates good brightness/contrast/saturation defaults


### Step 3: Background
- Keep original vs background removed
- Background color picker
- Soften edge (extra blur on the finished edge; usually not needed)
- Trim edge (pulls the cut-out edge in to kill a colour fringe; raising it thins fine hair)

The cut-out comes from **MODNet** (`utils/modnet.ts`), a portrait matting model that predicts
alpha directly. It runs locally through ONNX Runtime Web at 512px on the short edge.

This replaced a selfie-segmentation mask plus a lot of colour reasoning, which failed in two
opposite ways that no amount of tuning could fix, because colour alone cannot tell them
apart:

- a blue hair ribbon in front of a blue wall *is* the backdrop colour, so it was deleted
- a cluttered room has no single backdrop colour, so lumps of wall were kept

A model that understands people has no such trouble. `utils/matting.ts` is now only a
finishing pass over the predicted alpha — it resamples onto the output grid, sharpens the
edge along real image edges with a guided filter, and unmixes the old background colour out
of semi-transparent pixels so pale hair keeps no rim of the room it was shot in. None of
those steps can add or remove a region.

Notes:

- the **fp16** weights are used deliberately. MODNet does not survive uint8 quantisation —
  the 6.6MB build produces noise — and fp16 is indistinguishable from fp32 at half the size
- the matte is cached per crop, so changing the background colour or the edge sliders is
  instant rather than re-running inference
- the model download starts as soon as a photo is chosen, overlapping with the crop step
- if the runtime cannot load at all, the old selfie segmentation is used as a fallback and
  the UI says so

### Step 4: Download
- **Requirements check** — the finished photo is measured against the selected country and
  the result is shown before you print: head height in mm against the published range,
  space above the crown, horizontal centring, eye line, print size, background colour, and
  whether the crop is being upscaled. The app was already framing to each country's rule
  and never saying so, which left you to guess at the moment you were about to pay for
  prints. Geometry only — expression, glasses and lighting are judged by a person.
- Single image export (PNG/JPEG)
- Print sheet export (PNG/JPEG):
  - A4, A3, 4x6 inch, Custom
  - auto-pack with user-requested count
  - cut lines + outer crop marks


---

## Privacy

This tool is **browser-only**:
- Images never leave your device.
- No backend and no storage.
- Models are downloaded by the browser at runtime (MediaPipe model assets).

If you want “offline / self-hosted models” later, see the notes in the “MediaPipe models” section below.


---

## Setup

### Prerequisites
- Node.js 18+ (recommended)
- npm (or pnpm/yarn)

### Install
```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

`build` runs `vite build` and then `scripts/prerender.mjs`, which writes one static page per
document under `dist/photo/` plus `dist/sitemap.xml`. Each page carries its
own title, description, canonical URL, JSON-LD and a visible requirements table, generated
from `specs/documents.csv` — a query parameter on a single client-rendered page cannot be
indexed as separate pages, and the per-document specs are the most searched-for thing
here. Set `SITE_URL` to override the absolute URLs:

```bash
SITE_URL=https://photojhat.pages.dev npm run build
```

`SITE_URL` defaults to `https://photojhat.pages.dev` when it is unset. Set it if you attach
a custom domain, so canonical URLs and `sitemap.xml` match that domain.

## Cloudflare Pages

PhotoJhat is a static site. `npm run build` writes `dist/`. There is no Worker, no Durable
Object, and no paid service in the deploy. The old `wrangler.jsonc` (custom domains, feedback
API, like counter) is not part of this fork’s deploy.

In the Cloudflare Pages project:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repository root) |
| Node.js version | 20 or newer (22 works) |
| Environment variable | `SITE_URL` = `https://photojhat.pages.dev` (optional; this is already the default) |

Pages reads `dist/_redirects` and `dist/_headers` (copied from `public/` by Vite). Hashed
assets and the MODNet file are cached for a year. Unknown paths fall back to `index.html`.
Pretty URLs work because each document and exam is written both as `path/index.html` and
`path.html`.

`public/robots.txt` points at `https://photojhat.pages.dev/sitemap.xml`. The sitemap is
generated into `dist/sitemap.xml` by the prerender step and lists `/`, `/exam`, every exam
page, and the Indian document pages. Other document pages stay reachable and carry
`noindex, follow`. Every built page has one canonical URL on `https://photojhat.pages.dev`.

### IndexNow

Bing, Yandex and Seznam can be told about the sitemap without an account.
[IndexNow](https://www.indexnow.org/documentation) checks that this site hosts the key
file, then accepts the URL list:

https://photojhat.pages.dev/3bed6b749652d2f5712f87a90cc57725.txt

The file is `public/3bed6b749652d2f5712f87a90cc57725.txt`, so Cloudflare Pages serves it
at the site root. Submit only after that deploy is live, or the API rejects the key:

```bash
npm run build && npm run indexnow
```

`npm run indexnow` reads `dist/sitemap.xml` and POSTs those URLs to
`https://api.indexnow.org/indexnow` with host `photojhat.pages.dev`. HTTP 200 or 202
means the batch was accepted. It does not submit the `noindex` international pages,
because those are not in the sitemap.

### The link-preview image

`public/og.png` is the 1200×630 card that WhatsApp, Slack, Twitter, Reddit and iMessage show
when someone shares a link; without it a shared link renders as a bare grey URL. To
regenerate it, open `scripts/og-card.html` in a browser, press **Download og.png**, and move
the file to `public/og.png`. The card is drawn in canvas rather than kept as a binary, so it
can be re-cut when the wording changes.


---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, ship it, charge for it; just keep the
copyright notice.

That covers the code in this repository. The things it depends on carry their own terms,
and two are worth knowing about before you build a product on this:

- **MODNet** (`public/models/modnet.onnx`) — the matting network, by Zhanghan Ke et al.
  ([ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet)). The MODNet source is Apache-2.0,
  but the officially published pretrained weights are released under
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), which is
  **non-commercial**. The file here is those weights converted to fp16, so it carries the
  same licence, and the site credits it in its footer as the licence requires. Ads, paid
  prints or a paid tier would be commercial use: retrain or substitute the model first.
- **MediaPipe Tasks Vision** — Apache-2.0.
- **ONNX Runtime Web**, **React**, **Vite**, **Zustand**, **react-easy-crop** — MIT or
  Apache-2.0.

The name **PhotoJhat** is this fork’s. The upstream name is not used.
JPEG quality search in `src/utils/fitRange.ts` is adapted from
[jeswintesting-spec/ImEditor](https://github.com/jeswintesting-spec/ImEditor)
(MIT, copyright 2026 Jeswin Sunny). The licence notice is in that file.

The specifications in `specs/documents.csv` are transcriptions of published
government requirements. They are provided as a convenience and are not legal advice —
rules change, and the authority's own guidance is always the authority.
