# Gremtools

Free tools for your files that run entirely in your browser. No uploads, no sign-up, no limits.
Ling the gremling does the tinkering.

Gremtools is one platform with separate modules. The PDF module is the first; image and colour
modules are planned.

## PDF tools

| Tool | What it does |
|---|---|
| Merge PDFs | Combine several PDFs in the order you choose |
| Split PDF | Split by page ranges, every N pages, or pick pages |
| Organise pages | Reorder, rotate and delete pages |
| Compress PDF | Shrink a PDF, mainly by re-encoding its images |
| Images to PDF | Turn JPG, PNG, WebP and other images into a PDF |
| PDF to images | Save each page as PNG or JPG |
| Watermark | Stamp text or an image on every page |
| Page numbers | Add page numbers in a chosen position and style |

Files are processed on the user's device with WebAssembly and JavaScript. The site makes no
network requests with file data, and works offline after the first visit (it is an installable PWA).

## Getting started

Requires Node.js 22 or later.

```bash
npm install
```

```bash
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm test` | Unit tests for the PDF functions (Vitest) |
| `npm run e2e` | End-to-end tests in Chromium against the built site (run `npm run build` first; needs a Playwright Chromium, `npx playwright install chromium`) |
| `npm run typecheck` | Type-check only |

## Deploying

The site deploys to GitHub Pages automatically. `.github/workflows/deploy.yml` runs on every push
to `main` (or from the "Run workflow" button in the Actions tab): it runs the unit tests, builds
the site and publishes `dist/`.

One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub
Actions**.

The site is then served at `https://<owner>.github.io/<repository>/`. To use a custom domain, add
it under Settings → Pages; the next deploy moves the site to the root of that domain with no code
change.

To build for a sub-path by hand, set `BASE_PATH`:

```bash
BASE_PATH=/Gremtools/ npm run build
```

Other static hosts (Cloudflare Pages, Netlify) also work: build with the default base and make the
host serve `index.html` for unknown paths. `public/_redirects` does this on those two.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how it works, how to add a tool or module, what to be aware of
- [`docs/ROADMAP.md`](docs/ROADMAP.md): what is done and what comes next
- [`docs/BRAND.md`](docs/BRAND.md): name, mascot, design and voice
- [`CLAUDE.md`](CLAUDE.md): short orientation for AI coding assistants

## Licence

Code: [AGPL-3.0-or-later](LICENSE). You may use, modify and host Gremtools, including with ads or
donations, as long as you publish the complete source of your version under the same licence.
Third-party components are listed in [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

The Gremtools name, the Ling character and the logo are not covered by the AGPL. Please use your
own name and mascot for a modified or rehosted version. See [`docs/BRAND.md`](docs/BRAND.md).
