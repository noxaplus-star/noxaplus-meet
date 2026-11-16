# Changelog

Notable changes to NoxaPlus Meet are documented here. Dates use the Gregorian calendar. Application meeting dates and deadlines use the Jalali calendar.

## 1.0.1 - 2026-11-16

Brand update.

- The meeting library sidebar now shows the original NoxaPlus logo instead of
  the product letter mark.
- The README uses the official NoxaPlus brand banner.
- Version labels now read 1.0.1.

## [1.0.0] - 2026-11-12

### Added

- Persian right-to-left meeting workspace with a searchable local library, meeting creation, duplication, deletion, and editable metadata.
- Transcript editor with speaker and metadata parsing, sentence references, and transcript statistics.
- Deterministic Persian rule-based extraction of summary lines, decisions, actions, owners, Jalali deadlines, questions, risks, and topics.
- Confidence indicators and source-sentence jumping to support human review.
- Editable minutes items, manual additions and removals, and open/done action statuses.
- Explicitly confirmed reanalysis replacing the previous draft, plus optional automatic reanalysis after a 1,400 ms pause on changes to an analyzed transcript (disabled by default).
- Browser-local autosave with Web Locks serialization, cross-tab conflict protection, persistent storage warnings, unreadable-data recovery, and validated full-workspace JSON backup and confirmed restore, with a 10 MiB restore-file limit.
- Markdown and escaped, printable HTML export with download, copy, HTML preview, and browser print/PDF support.
- Light and dark themes, built-in product/incident/campaign samples, in-app help, and keyboard shortcuts.
- Standalone root `index.html` with embedded JavaScript, CSS, and Vazirmatn fonts, runnable after extracting the repository ZIP without Node.js, a server, or internet access.
- Hosted PWA resources and service-worker offline support for compatible browsers over HTTPS or localhost.
- TypeScript checks, Vitest tests for core behavior, Vite build tooling, and icon-generation tooling.
- English repository documentation, contribution and security guidance, community standards, and the MIT License with copyright attributed to NoxaPlus.

### Usage notes

- This is a text-processing tool, not an AI system, recording tool, or speech-recognition service. No API key or account is required.
- Extraction is a starting draft and must be reviewed; owners, deadlines, questions, and summaries are not guaranteed to be complete or correct.
- Browser storage and exported files are not encrypted by the app. Back up before clearing data, restoring a workspace, or relocating a local copy.
- `app/index.html` is the Vite source entry; the root `index.html` is the standalone application.
- Service workers require HTTPS or localhost; `file://` standalone use does not require or support a service worker.
- Clipboard, installation, preview, and print behavior depend on the browser. File downloads remain available when copying is unavailable.

[1.0.0]: https://github.com/noxaplus-star/noxaplus-meet