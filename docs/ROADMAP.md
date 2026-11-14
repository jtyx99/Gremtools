# Roadmap

What has been built, what should come next, and ideas for later. Update this file when a tool ships.

## Done (version 0.1.0)

- Platform shell: home page with tool grid and search, module pages, light and dark themes,
  responsive layout, installable PWA with full offline support.
- Shared tool flow: choose or drop files, options, working / done / error states, single download
  or zip of several outputs.
- Ling mascot (placeholder art) in four poses, logo mark and app icons.
- PDF module with eight tools: merge, split (ranges, every N pages, pick pages), organise
  (reorder, rotate, delete), compress (three levels), images to PDF, PDF to images, watermark
  (text or image), page numbers.
- Unit tests for every operation; end-to-end tests for every tool, plus privacy (no outside
  requests) and offline checks.
- AGPL-3.0 licence, third-party licence list, source link in the footer.
- Deployment to GitHub Pages on every push to `main`, with a configurable base path.

## Next (recommended order)

1. **Custom domain and pull-request checks.** Register a domain and add it under Settings →
   Pages. Add a workflow that runs `npm test`, `npm run build` and `npm run e2e` on every pull
   request (the deploy workflow runs only the unit tests).
2. **Protect and unlock PDF.** MuPDF can open with a password and save with encryption
   (`saveToBuffer` options `encrypt=aes-256,user-password=...,owner-password=...`; `decrypt=yes`).
   Also lets every other tool offer "enter password" instead of rejecting protected files.
3. **Live preview for watermark and page numbers.** Render page 1 with PDF.js and draw the stamp
   on top so users see the result before running.
4. **Hand-off between tools.** A "Continue with another tool" button on the done screen that
   passes the output straight to another tool (compress after merge, and so on). Needs a small
   shared in-memory store for the pending file.
5. **Batch mode** for compress, watermark and page numbers: accept several PDFs and zip the results.
6. **Final mascot art.** Commission an illustrator using `docs/BRAND.md`, then replace
   `shared/Mascot.tsx`, `public/favicon.svg` and the icons.

## PDF backlog

| Tool | Feasibility in the browser | Suggested approach |
|---|---|---|
| Sign PDF (draw, type or upload a signature) | Good | Canvas for drawing; place as an image with pdf-lib |
| Crop pages | Good | Set CropBox with pdf-lib; drag handles over a PDF.js preview |
| Edit metadata / remove metadata | Good | pdf-lib setters; MuPDF `garbage` clean |
| Flatten forms and annotations | Good | MuPDF `bake()` |
| Fill forms | Good | pdf-lib form API |
| OCR (make scans searchable) | Good but heavy | `tesseract.js` (Apache-2.0); language files of 10 MB or more each, cache at run time |
| Redact | Good | MuPDF redaction annotations, then apply; must truly remove the text, test carefully |
| Extract text / PDF to Markdown | Good | MuPDF structured text |
| Extract embedded images | Good | Walk image objects with MuPDF (the compress code already does) |
| Repair PDF | Fair | MuPDF re-save repairs many files |
| Greyscale PDF | Fair | Re-render or rewrite images with MuPDF |
| N-up / booklet | Good | pdf-lib `embedPage` |
| Compare two PDFs | Fair | Render both, pixel diff, plus text diff |
| PDF/A conversion | Poor | Needs Ghostscript WASM (AGPL, about 15 MB); validate before promising |
| Stronger compression | Fair | Ghostscript WASM as an optional "maximum" level; DPI-aware downsampling using on-page image size |
| HTML or web page to PDF | Poor | Browsers block cross-site fetching; leave out |
| PDF to Word / Excel / PowerPoint | Poor | No good in-browser engine. LibreOffice WASM exists but is over 100 MB. Leave out unless a server option is ever added |
| Word / Excel / PowerPoint to PDF | Poor | Same as above |
| Unicode text for watermark and page numbers | Good | Embed a font with `@pdf-lib/fontkit` (ship Noto subsets, loaded on demand) |

## Image module (planned)

Reference sites: iLoveIMG, Squoosh, Photopea, TinyPNG, remove.bg.

| Tool | Suggested approach |
|---|---|
| Compress | `@jsquash/*` codecs (MozJPEG, OxiPNG, WebP, AVIF; Apache-2.0) in a worker; before/after slider like Squoosh |
| Resize | Canvas / `createImageBitmap` with high-quality resampling; by pixels or percent, batch |
| Crop | Crop box over a preview; aspect-ratio presets |
| Convert (JPG, PNG, WebP, AVIF, HEIC in) | Canvas and jSquash; `heic-to` or libheif WASM for HEIC input |
| Rotate / flip | Canvas |
| Watermark | Canvas; share options UI with the PDF watermark |
| Remove metadata (EXIF) | Re-encode, or strip segments directly for JPEG |
| Remove background | `@imgly/background-removal` (ONNX model, AGPL-compatible; 40 MB or more, run-time cached) |
| Blur faces / pixelate area | MediaPipe face detection, or manual selection |
| Upscale | Small ESRGAN-style ONNX model via WebGPU; quality and speed vary by device, mark as experimental |
| Meme / simple editor (text, shapes) | Canvas editor; lower priority |
| Colour picker from image | Bridges to the colour module |

## Colour module (planned)

Reference sites: Coolors, Huemint, Colormind, ColorDesigner, Adobe Color, Realtime Colors,
Grabient, cssgradient.io, uicolors.app.

| Tool | Suggested approach |
|---|---|
| Palette generator | Harmony rules in OKLCH (`culori`, MIT); spacebar to regenerate, lock colours, like Coolors |
| Palette preview on mockups | Apply the palette to sample layouts (landing page, dashboard, poster), like Huemint and Realtime Colors |
| Gradient designer | Multi-stop linear, radial and conic gradients; interpolation in OKLCH; export CSS, SVG, PNG |
| Contrast checker | WCAG 2 ratios and APCA; suggest the nearest passing colour |
| Tints, shades and scales | Generate 50 to 950 scales, export as CSS variables or Tailwind config |
| Palette from image | Colour quantisation (median cut or k-means) on canvas |
| Converter | HEX, RGB, HSL, OKLCH, CMYK (approximate) |
| Colour-blindness simulator | Matrix simulation on palette and uploaded image |
| Saved palettes | `localStorage` or IndexedDB; export and import as JSON, no accounts |

Huemint and Colormind use server-side machine-learning models. A rule-based generator is the
starting point; a small in-browser model could be explored later.

## Platform ideas

- Recently used tools and favourites on the home page (stored locally).
- Keyboard shortcuts and a command palette (search is already there).
- Languages other than English; text is currently inline in components and would first need
  moving into message files.
- A `/privacy` page explaining plainly that nothing is uploaded, and an `/about` page for Ling.
- Search-friendly pages: a static description and FAQ per tool, pre-rendered at build time
  (for example with `vite-react-ssg`), since a client-rendered app is weak for search visibility.
- Optional desktop wrapper (Tauri) if file-association and drag-from-desktop become wanted.
- Large-file handling: stream or transfer buffers instead of copying; show a warning above a size
  threshold on phones.
- Support links (Ko-fi) and sponsor slots. Before adding ads or analytics, update the privacy
  wording and the end-to-end privacy test; prefer privacy-respecting options that do not load
  third-party scripts on tool pages.

## Open decisions

- Domain name.
- Whether to accept outside contributions, and if so whether to require a contributor agreement.
- Whether to add Ghostscript for stronger compression, given its size.
- Final mascot illustration and whether Ling gets more poses or animation.
