# Architecture

This document explains how Gremtools is built, how to extend it, and what to watch out for.
It describes the code as of version 0.1.0 (platform shell plus the PDF module).

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
  modules/
    pdf/
      meta.ts           tool ids, names, descriptions, icons, search keywords
      registry.ts       pdfModule: meta plus one lazy component per tool
      worker.ts         Web Worker: table of operations
      client.ts         runPdf(op, args, onProgress): typed call into the worker
      lib/              pure functions, bytes in, bytes out (pdf-lib)
      engines/mupdf.ts  MuPDF operations (compress, render)
      tools/            one React page per tool, plus tools/shared.tsx
    image/registry.ts   placeholder module (no tools yet)
    colour/registry.ts  placeholder module (no tools yet)
tests/
  unit/                 Vitest tests of lib/ and engines/ (run in Node)
  e2e/run.mjs           Playwright script against the built site
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

1. Create `src/modules/<id>/` with its own `registry.ts` exporting a `ModuleDef` (the image and
   colour placeholders already exist), plus `lib/`, `tools/` and, if it does heavy work, its own
   `worker.ts` and `client.ts` following the PDF module.
2. It is already listed in `MODULES` in `app/config.ts`; new ones are added there.
3. Modules may import from `src/shared/` only. If two modules need the same thing, move it to
   `shared/`. This keeps each module separable (for example onto its own subdomain) later.

## Offline and installation

`vite-plugin-pwa` generates a service worker that precaches every built file, including the MuPDF
WASM, about 13 MB in total. This is what makes every tool work offline, at the cost of a
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
