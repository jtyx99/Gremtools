# Gremtools

In-browser productivity tools: PDF module, image module (background removal so far), colour module planned. Static React PWA.
Files must never leave the user's device.

## Commands

- `npm run dev` / `npm run build` / `npm run typecheck`
- `npm test`: unit tests (Vitest, Node)
- `npm run build && npm run e2e`: end-to-end tests (Playwright script, `tests/e2e/run.mjs`).
  `SHOTS=<dir> npm run e2e` also saves screenshots; `BG_MODEL=best` tests the larger model.

## Where things are

- `src/app/`: routes, layout, home page, `config.ts` (module list, source URL)
- `src/shared/`: components and hooks used by every module
- `src/modules/<module>/`: one folder per module. Modules import from `shared/`, never from each other.
- `src/modules/pdf/lib/`: pure functions, one per operation, bytes in and bytes out, no UI
- `src/modules/pdf/engines/mupdf.ts`: MuPDF (WASM) operations
- `src/modules/pdf/worker.ts` + `client.ts`: all processing runs in a Web Worker via `runPdf(op, args)`
- `src/modules/pdf/meta.ts` + `registry.ts`: tool list (text) and lazy components
- `src/modules/pdf/tools/`: one page component per tool
- `src/modules/image/`: same layout (`meta.ts`, `registry.ts`, `worker.ts`, `client.ts`, `engines/`, `lib/`, `tools/`)
- `build/bgRemovalAssets.ts`: Vite plugin that serves and copies the background-removal model files

Read `docs/ARCHITECTURE.md` before structural changes; it has the step-by-step for adding a tool.

## Rules

- No network requests with user data. No CDN assets, analytics or remote fonts without the owner's
  say-so; the e2e suite fails on any request that leaves the site.
- UI code must not import `pdf-lib`, `mupdf` or `@imgly/background-removal` directly (it bloats the page and blocks the main
  thread). Go through `runPdf` / the module's `client.ts`.
- Errors the user should read are thrown as `ToolError` (`src/shared/errors.ts`) or, in PDF code,
  `PdfToolError`; anything else shows a generic message.
- Licence is AGPL-3.0-or-later. New dependencies must be AGPL-compatible and listed in
  `THIRD_PARTY_LICENSES.md`.
- The site may be served under a sub-path (GitHub Pages). Never hard-code a leading `/` in asset
  URLs or links; see "Hosting and the base path" in `docs/ARCHITECTURE.md`.
- British spelling in user-facing text (organise, colour, centre).
- Every new operation gets a unit test in `tests/unit/` and an end-to-end check in `tests/e2e/run.mjs`.
- Keep `docs/ROADMAP.md` up to date when a tool ships.
- Record every user-visible change in `CHANGELOG.md` (newest first) and bump `version` in
  `package.json` in the same commit.
- Brand rules (mascot, palette, voice) are in `docs/BRAND.md`.
