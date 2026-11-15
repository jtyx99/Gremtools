# Changelog

All notable changes to Gremtools are recorded here, newest first.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow
[Semantic Versioning](https://semver.org/): while the project is below 1.0, a new tool or module
raises the middle number and fixes raise the last. The version is set in `package.json`.

Sections used: **Added** (new features), **Changed** (changes to existing behaviour),
**Fixed** (bug fixes), **Removed**.

## [0.3.0] - 2026-11-15

### Added

- Remove background: a second, non-AI method for logos, illustrations and screenshots. It reads
  the flat background colour from the border and removes exactly that, with smooth edges and no
  colour halo. Small enclosed pockets of the background colour (the holes in letters) are removed
  too; larger enclosed areas are kept as part of the design.
- Remove background: a "Kind of picture" choice (Auto, Photo, Logo or graphic). Auto inspects
  each picture and picks the method.
- Remove background: toolbar editor with Compare, Background, Erase, Restore and Magic eraser
  tools, plus undo, redo and reset.
- Erase and Restore brushes with adjustable size, for fixing edges by hand.
- Magic eraser: click an area to remove everything of that colour connected to it, with an
  adjustable colour range.
- Batch mode: choose several images, get a grid of results, edit any of them, and download all
  as a zip.
- This changelog.

### Changed

- Photo results are cleaned after the AI model runs: faint haze is removed, small stray patches
  of leftover background are dropped, and pinholes in the subject are filled.
- Photo quality now defaults to Best (was Fast).
- The background options moved from a side panel into the toolbar.

### Fixed

- Logos and flat graphics were damaged by the AI model (parts of the design removed, specks left
  behind). They are now handled by the graphic method.

## [0.2.0] - 2026-11-15

### Added

- Image module, with its first tool: Remove background. On-device AI cut-out (Fast and Best
  models), before/after slider, transparent, colour, blurred or image backgrounds, and
  full-resolution PNG or JPG download. The model is fetched on first use and then works offline.

## [0.1.1] - 2026-11-14

### Added

- Automatic deployment to GitHub Pages on every push to `main`.

### Changed

- The site can be served under a sub-path (for example `/Gremtools/`), set with `BASE_PATH`.

### Fixed

- Reloading a tool page on GitHub Pages now loads the app (a `404.html` copy of the app shell).

## [0.1.0] - 2026-11-14

### Added

- Platform shell: home page with tool grid and search, light and dark themes, phone layout,
  installable app that works offline, Ling the gremling mascot.
- PDF module with eight tools: Merge PDFs, Split PDF, Organise pages, Compress PDF, Images to
  PDF, PDF to images, Watermark, Page numbers.
- Unit and end-to-end tests, AGPL-3.0 licence, architecture, roadmap and brand documents.
