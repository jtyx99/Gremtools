# Architecture

This document explains how Gremtools is built, how to extend it, and what to watch out for.
It describes the code as of version 0.3.0 (platform shell, the PDF module, and the first image tool).

## The idea in one paragraph

Gremtools is a static website. There is no server-side code and no database. When a user picks a
file, the browser reads it into memory, a Web Worker processes it with JavaScript or WebAssembly,
and the result is offered as a download. Nothing is uploaded. A service worker caches the whole
site so it also works offline and can be installed as an app (PWA).

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 8, TypeScript (strict) |
| UI | React 19, React Router 7, Tailwind CSS 4 |
| Offline / install | `vite-plugin-pwa` (Workbox, `generateSW`) |
| PDF writing | `pdf-lib` (MIT) |
| PDF compression and rendering | `mupdf` (MuPDF.js, WASM, AGPL-3.0) |
| PDF thumbnails | `pdfjs-dist` (PDF.js, Apache-2.0) |
| Background removal | `@imgly/background-removal` 1.4.5 (ISNet model on `onnxruntime-web`, AGPL-3.0) |
| Zip | `fflate` |
| Drag to reorder | `@dnd-kit` |
| Tests | Vitest (unit), Playwright (end to end) |

## Folder structure

```
src/
  main.tsx              entry: registers the service worker, mounts <App>
  index.css             Tailwind import, colour tokens (light/dark), shared classes
  app/
    App.tsx             routes, generated from the module list
    Layout.tsx          header, theme toggle, footer (with the AGPL source link)
    Home.tsx            home page and per-module page (tool grid, search), 404
    config.ts           MODULES list and SOURCE_URL
  shared/               used by every module
    registry.ts         ToolDef and ModuleDef types
    ToolShell.tsx       frame for every tool page: title, working/done/error views, downloads
    Dropzone.tsx        file picker with drag and drop and type filtering
    Sortable.tsx        drag-to-reorder list/grid
    PageThumb.tsx       one lazily rendered PDF page thumbnail
    pdfPreview.ts       PDF.js setup: open a PDF, render a thumbnail
    usePdfFile.ts       hook: one chosen PDF opened for previews
    useRun.ts           hook: state of one tool run (idle, working, done, error)
    files.ts            read bytes, download, zip, size formatting, image conversion
    Icon.tsx            inline SVG icons
    Mascot.tsx          Ling, in four poses, and the head-only logo mark
    CompareSlider.tsx   before/after slider
    errors.ts           ToolError, for messages meant for the user
  modules/
    pdf/
      meta.ts           tool ids, names, descriptions, icons, search keywords
      registry.ts       pdfModule: meta plus one lazy component per tool
      worker.ts         Web Worker: table of operations
      client.ts         runPdf(op, args, onProgress): typed call into the worker
      lib/              pure functions, bytes in, bytes out (pdf-lib)
      engines/mupdf.ts  MuPDF operations (compress, render)
      tools/            one React page per tool, plus tools/shared.tsx
    image/
      meta.ts, registry.ts   tool text and lazy components (same pattern as pdf)
      worker.ts, client.ts   Web Worker (picks graphic or photo method) and cutOut()
      engines/backgroundRemoval.ts   wrapper around the background-removal library
      lib/compose.ts    pure sizing and naming helpers
      lib/flatBackground.ts   flat-colour removal, magic eraser, graphic-or-photo test
      lib/maskCleanup.ts      tidies the AI mask
      tools/RemoveBackground.tsx   page: file list, options, batch grid
      tools/removeBackground/      Editor.tsx (toolbar editor), canvas.ts (drawing, Item type)
    colour/registry.ts  placeholder module (no tools yet)
tests/
  unit/                 Vitest tests of lib/ and engines/ (run in Node)
  e2e/run.mjs           Playwright script against the built site
build/bgRemovalAssets.ts  Vite plugin: serves and copies the background-removal model files
public/                 favicon, app icons, _redirects (single-page fallback)
scripts/make-icons.mjs  regenerates the PNG app icons from favicon.svg
scripts/spa-fallback.mjs  copies index.html to 404.html after each build (GitHub Pages)
.github/workflows/deploy.yml  tests, builds and publishes to GitHub Pages
```

## How a tool run works

Using Compress as the example:

1. `tools/Compress.tsx` shows a `Dropzone`. The user picks a file; it is held as a `File` in React state.
2. The user presses the action button. The page calls `run(...)` from `useRun`, which switches
   `ToolShell` to the "working" view.
3. Inside the job, the page reads the file into a `Uint8Array` and calls
   `runPdf('compress', { bytes, level })` from `client.ts`.
4. `client.ts` posts the message to the single PDF worker (created on first use).
5. `worker.ts` looks up `compress` in its `ops` table. That entry dynamically imports
   `engines/mupdf.ts`, so the 10 MB WASM file is fetched only now.
6. The result bytes are posted back. The page wraps them in a `Blob` and returns
   `{ outputs, note }`; `ToolShell` shows the "done" view with download buttons.
7. If the operation throws a `PdfToolError`, its message is shown to the user. Any other error
   shows a generic message and is logged to the console.

Thumbnails are separate: `usePdfFile` opens the PDF with PDF.js on the main thread (PDF.js runs
its own worker internally) and `PageThumb` renders each page when it scrolls into view.

## How background removal works

There are two methods, because one cannot do both jobs well. The worker (`image/worker.ts`) picks
one per picture, or the user chooses with "Kind of picture".

| Method | For | How | Code |
|---|---|---|---|
| `graphic` | Logos, illustrations, screenshots: a flat-colour background | Reads the background colour from the border, flood-fills it away from the edges, opens small enclosed pockets of the same colour, and gives anti-aliased edge pixels the right partial transparency with the background colour removed from them | `lib/flatBackground.ts` |
| `photo` | People, products, animals | ISNet AI model, then mask clean-up (haze, stray patches, pinholes) | `engines/backgroundRemoval.ts`, `lib/maskCleanup.ts` |

**Auto** (`looksLikeGraphic`): a picture is a graphic when at least 97% of its border is one
colour *and* 48 or fewer colours (at 4 bits per channel) cover 98% of it. Photos fail the second
test even on a plain backdrop, so a product photo on white still goes to the model. The AI model is
trained to find the "main subject" of a photograph; on a logo it guesses, which is why graphics
must not be sent to it.

Flow:

1. `tools/RemoveBackground.tsx` sends each chosen image to the worker through `cutOut`
   (`client.ts`), one after another.
2. The worker draws the image at output size (capped at 16 megapixels).
   - Graphic: runs `removeFlatBackground` on the pixels. No downloads, typically under a second.
   - Photo: shrinks a copy to at most 1024 px (the model's working size; the library's own
     resizing is very slow on large photos), runs the model, cleans the mask with `cleanMask`,
     and applies the mask to the full-size picture.
3. The worker returns a full-size PNG with a transparent background. That PNG is the item's
   state: `Item` in `tools/removeBackground/canvas.ts` holds the source file, the cut-out PNG and
   the background settings, nothing decoded, so a batch stays small in memory.
4. A single picture opens straight in the editor; several show a grid first.

**Editor** (`tools/removeBackground/Editor.tsx`). It decodes the original and the cut-out, and
keeps the cut-out in a full-size canvas. Every tool edits that canvas, and the preview is redrawn
from it:

- Erase: strokes with `destination-out`.
- Restore: strokes whose "ink" is a pattern of the original picture, so original pixels return in
  place.
- Magic eraser: `eraseRegion` (the same function the graphic method uses) from the clicked pixel.
- Undo/redo: copies of the canvas, at most 12.
- Background and download: `paintResult` in `canvas.ts` draws the chosen background and then the
  cut-out; the preview, the download and the batch zip all use it.

In batch mode, "Done" encodes the canvas back to PNG and stores it on the item.

**Model files.** They come from the `@imgly/background-removal-data` npm package and are not
committed. `build/bgRemovalAssets.ts` serves them from `node_modules` in development and copies
them into `dist/bg-removal/` on build (two models and the CPU engine builds, about 165 MB). They
are excluded from the service worker precache and cached on first use by a `CacheFirst` runtime
rule in `vite.config.ts`, so the tool works offline after one run. If the library is upgraded,
change the cache name in that rule. Keep `@imgly/background-removal` and
`@imgly/background-removal-data` on the same version: newer library versions (1.5 and later) do
not publish their model data to npm, only to the vendor's server, which is why 1.4.5 is used.

To swap in a different model or library, replace `engines/backgroundRemoval.ts` and keep its
shape: image in, same-size PNG with a transparent background out. The worker's clean-up and
full-size masking stay as they are.

## The registry

`src/app/config.ts` exports `MODULES`, an array of `ModuleDef`. Each module has a list of
`ToolDef` (id, name, description, icon, keywords, lazy component). That one list drives:

- the routes (`/<module>/<tool>`), generated in `App.tsx`
- the home page grid and the module page (`/<module>`)
- search
- the header navigation

A module with an empty tool list is shown as "Coming soon".

In the PDF module the text lives in `meta.ts` and the components are attached in `registry.ts`.
They are split so a tool page can read its own title from `meta.ts` without importing the registry
(which would import every tool).

## Adding a PDF tool

1. **Function.** Add `src/modules/pdf/lib/<name>.ts` exporting a function that takes and returns
   `Uint8Array`s. Throw `PdfToolError` for problems the user can act on. For MuPDF-based work, add
   the function to `engines/mupdf.ts` instead.
2. **Unit test.** Add cases to `tests/unit/pdf.test.ts`.
3. **Worker.** Add an entry to `ops` in `worker.ts`. For MuPDF functions use the dynamic
   `await import('./engines/mupdf')` form.
4. **Page.** Add `tools/<Name>.tsx` with a default export. Copy `Compress.tsx` (single file, simple
   options) or `Organise.tsx` (thumbnails) as a starting point. Use `PdfToolShell`, `Dropzone`,
   `OptionsCard`, `useRun` and `runPdf`.
5. **Register.** Add the text to `PDF_TOOLS` in `meta.ts` and the lazy import to `COMPONENTS` in
   `registry.ts`. Add an icon path to `shared/Icon.tsx` if needed.
6. **End-to-end test.** Add a `test(...)` block to `tests/e2e/run.mjs`.
7. Update `docs/ROADMAP.md` and the table in `README.md`.

## Adding a module

1. Create `src/modules/<id>/` with its own `registry.ts` exporting a `ModuleDef` (the colour
   placeholder already exists; the image module is a small worked example), plus `lib/`, `tools/` and, if it does heavy work, its own
   `worker.ts` and `client.ts` following the PDF module.
2. It is already listed in `MODULES` in `app/config.ts`; new ones are added there.
3. Modules may import from `src/shared/` only. If two modules need the same thing, move it to
   `shared/`. This keeps each module separable (for example onto its own subdomain) later.

## Offline and installation

`vite-plugin-pwa` generates a service worker that precaches every built file except the
background-removal models, including the MuPDF WASM, about 13 MB in total. This is what makes every tool work offline, at the cost of a
background download on the first visit. `registerType: 'autoUpdate'` means a new deployment
replaces the cache the next time the site is opened.

If the precache grows too large as modules are added, switch the big engine files from precache
to runtime caching (cache on first use) in `vite.config.ts`, and tell users which tools need to be
opened once before going offline.

## Theming

Colours are CSS variables in `src/index.css`, mapped to Tailwind colour names (`bg-surface`,
`text-muted`, `bg-primary`, ...). Dark is the default; light applies from the system preference or
when the user toggles (stored in `localStorage` as `gremtools-theme`, applied before first paint
by the inline script in `index.html`). Use the token classes, not raw colours.

## Testing

- `npm test` runs the unit tests in Node. MuPDF and pdf-lib both run in Node, so every operation
  is tested without a browser. Fixtures are generated in code (`tests/unit/fixtures.ts`).
- `npm run e2e` starts `vite preview`, drives each tool in Chromium, downloads the result and
  inspects it. It also asserts that no request leaves the site or carries a body, and that a tool
  works with the network switched off.

## Things to be aware of

**Licence obligations.** Gremtools is AGPL-3.0-or-later because it includes MuPDF. The full source
must stay public, and the running site must link to it (the footer does; `SOURCE_URL` in
`app/config.ts` must point at the real repository). Ads, donations and sponsorship are allowed.
Taking the project closed-source would require removing MuPDF or buying a licence from Artifex.
If outside contributions are accepted and a commercial licence might ever be sold, a contributor
licence agreement is needed first.

**Memory.** Files are held fully in memory, and are copied when sent to the worker. A 200 MB PDF
can need several times that. Very large files may crash the worker on phones; the user then sees
the generic error. Possible improvements are in the roadmap.

**Background removal limits.** The photo method runs on the CPU in a single thread, because GitHub
Pages cannot send the headers that multi-threading needs (cross-origin isolation); on the
development machine a run took 13 to 18 seconds. It is good on clear subjects and weaker on fine
hair, glass and busy backgrounds. The graphic method assumes one flat background colour: gradients,
shadows and textured backdrops defeat it, and a subject the same colour as the background will be
eaten into where it touches the background (the Restore brush fixes that). Auto can misjudge
unusual pictures; the user can force either method. Mask clean-up drops separate pieces smaller
than 2% of the largest one, which can remove a genuine small detached part. The brush has a hard
edge and there is no zoom yet. Magic eraser and the graphic method read the whole picture's pixels,
which takes noticeable time and memory near the 16-megapixel cap. Output is capped at 16 megapixels (the canvas limit on iOS). The blurred
background uses canvas `filter`, which older Safari versions ignore (the background then appears
unblurred). The deployed site is about 180 MB because of the model files.

**Encrypted PDFs.** Password-protected PDFs are rejected with a clear message. There is no unlock
tool yet.

**Compression.** `compressPdf` re-encodes images as JPEG (capped size per level) and rewrites the
file structure. It skips 1-bit images, image masks and images under 64x64. It does not look at how
large an image is drawn on the page, so the cap is in pixels, not DPI. Images that use transparency
keep their mask but the colour data becomes JPEG. PDFs that are mostly text shrink little; the UI
returns the original if the result is not smaller.

**Text in watermarks and page numbers.** These use the built-in Helvetica font, which only covers
Latin characters. Other scripts are rejected for watermarks with a message suggesting an image
watermark. Supporting them means embedding a Unicode font (see roadmap).

**Rotated pages.** `visualFrame` in `lib/common.ts` handles the page `/Rotate` flag so stamps
appear where the reader expects. Pages whose CropBox differs from the MediaBox are not specially
handled; stamps are positioned against the MediaBox.

**pdf-lib is unmaintained upstream** (last release 2021). It is stable for what is used here. If a
bug blocks a feature, the maintained fork `@cantoo/pdf-lib` is a drop-in candidate, or move the
operation to MuPDF.

**Error names across the worker.** Errors cross the worker boundary as `{ name, message }`.
`PdfToolError` sets `name` explicitly because class names are minified in production builds.

**Hosting and the base path.** The site is deployed to GitHub Pages by
`.github/workflows/deploy.yml`. A Pages project site lives under `/<repository>/`, so the address
the app is served under is configurable: `BASE_PATH` (default `/`) is read in `vite.config.ts` and
feeds Vite's `base`, the PWA manifest `start_url` and `scope`, and the router `basename` (through
`import.meta.env.BASE_URL` in `App.tsx`). The workflow takes the value from
`actions/configure-pages`, so a custom domain needs no code change. Never hard-code a leading `/`
in an asset URL or link; use router links, imports, or `import.meta.env.BASE_URL`.

Tool pages have their own URLs, and Pages cannot be told to serve the app for unknown paths.
`scripts/spa-fallback.mjs` (run by `npm run build`) copies `index.html` to `404.html`, which Pages
serves for any path without a file, so reloading `/pdf/merge` loads the app. The first such
response has a 404 status; after that the service worker answers. `public/.nojekyll` stops Pages
from filtering files. If the repository is renamed, the site address changes and installed copies
of the app must be reinstalled.

GitHub identifies a Pages deployment by its commit. If a commit was already published once (for
example while Pages was still set to "Deploy from a branch"), re-running the workflow on that same
commit reports success but leaves the old content live. Push a new commit to redeploy.

**No analytics, no remote assets.** The end-to-end suite fails on any request to another origin.
If ads or analytics are added later, that test and the privacy wording in the UI must be changed
deliberately at the same time.

**The mascot art is a placeholder** drawn as SVG in `shared/Mascot.tsx`. See `docs/BRAND.md`.
