# Third-party licences

Gremtools is licensed under the GNU Affero General Public License v3.0 or later (see `LICENSE`).
It is built on the following open-source software, which ships as part of the site.

| Package | Used for | Licence |
|---|---|---|
| [MuPDF.js](https://www.npmjs.com/package/mupdf) (`mupdf`) | PDF compression, rendering pages to images | AGPL-3.0-or-later |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | Building and modifying PDFs | MIT |
| [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | Page thumbnails | Apache-2.0 |
| [fflate](https://github.com/101arrowz/fflate) | Zip downloads | MIT |
| [React](https://react.dev), React DOM | User interface | MIT |
| [React Router](https://reactrouter.com) | Page routing | MIT |
| [dnd kit](https://dndkit.com) | Drag to reorder | MIT |
| [Tailwind CSS](https://tailwindcss.com) | Styling | MIT |
| [Workbox](https://github.com/GoogleChrome/workbox) | Offline support | MIT |

Build tools (not shipped to users): Vite, vite-plugin-pwa, TypeScript, Vitest, Playwright.

MuPDF is copyright Artifex Software, Inc. Because Gremtools includes MuPDF under the AGPL, the
complete source of Gremtools must stay publicly available under the AGPL. See
`docs/ARCHITECTURE.md`, "Licence obligations".

When you add a dependency, add it to this table and check its licence is compatible with
AGPL-3.0 (MIT, BSD, Apache-2.0, MPL-2.0, LGPL and AGPL/GPL-3.0 are; proprietary and
"non-commercial only" licences are not).
