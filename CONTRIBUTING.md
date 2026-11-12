# Contributing to NoxaPlus Meet

Thank you for helping improve NoxaPlus Meet. Contributions can include bug reports, extraction-rule fixes, tests, accessibility improvements, documentation, and focused UI enhancements.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Use **NoxaPlus** consistently in documentation and branding.

## Before you start

- Read the [README](README.md), especially the extraction limitations, privacy boundaries, and standalone/PWA distinction.
- Search [existing issues](https://github.com/noxaplus-star/noxaplus-meet/issues) before opening a new one.
- For a substantial feature or architectural change, open an issue describing the problem and proposed approach before implementing it.
- Report security vulnerabilities privately using [SECURITY.md](SECURITY.md), not a public issue.

The project is a local-first Persian meeting workspace with a deterministic rule-based engine. Do not describe rule matching as semantic AI, imply guaranteed extraction, or introduce unnecessary accounts, API keys, analytics, remote processing, or network dependencies into the local workflow.

## Reporting a bug

Include:

1. A clear description of the problem and expected behavior.
2. Reproduction steps and whether you opened the root standalone HTML, hosted app, development server, or production preview.
3. Browser, operating system, application version or commit, and relevant settings.
4. Whether the problem affects a new workspace, a built-in sample, or a restored backup.
5. A small synthetic transcript or other non-sensitive fixture when needed.
6. Relevant error messages, with personal information removed.

Never post private meeting transcripts, participant details, credentials, full workspaces, or unredacted browser-storage contents. A screenshot can also reveal sensitive meeting data; use a sample workspace or redact it first. Do not rely on changing names alone if the meeting's content remains identifiable.

For extraction problems, include the meeting's Jalali date and participant list alongside the synthetic text, because both can affect owners and deadlines. Distinguish missed items from false positives and from incorrect owner/date resolution.

## Development setup

Use Node.js compatible with the installed Vite version. Node.js **22.12 or newer is recommended**; the Node.js 20 line requires at least 20.19. npm is also required.

```sh
git clone https://github.com/noxaplus-star/noxaplus-meet.git
cd noxaplus-meet
npm install
npm run dev
```

Open the URL printed by Vite. Use your fork's clone URL if contributing from a fork.

Useful commands:

```sh
npm test
npm run test:watch
npm run typecheck
npm run build
npm run preview
npm run icons
```

`npm run preview` serves an existing production build; run `npm run build` first. `npm run icons` regenerates application/PWA icons and is needed only when changing their inputs or generation logic.

## Source and build boundaries

- `src/core/` contains the typed model, extraction rules, transcript parsing, Jalali/deadline utilities, storage validation, sample data, and exporters.
- `src/components/` contains the Persian RTL UI, panels, editable rows, and dialogs.
- `src/hooks/` connects workspace state, persistence, notifications, and installation prompts.
- `app/index.html` is the Vite source entry.
- The root `index.html` is generated for end users. Edit source files rather than the generated HTML.
- The production build checks TypeScript, runs Vite, embeds application JavaScript/CSS/fonts, and synchronizes the standalone root HTML.
- Hosted PWA resources belong with the web build. A local `file://` document is not a service-worker deployment.

Keep changes focused. Avoid unrelated formatting, dependency upgrades, generated-file churn, or configuration changes. If a dependency is necessary, explain its purpose and check its license and effect on bundle size, standalone execution, and privacy. Keep the lockfile consistent with intentional dependency changes.

## Coding and testing guidance

### Core behavior

- Follow existing TypeScript types and local coding conventions; avoid weakening types to conceal invalid data.
- Keep extraction predictable and testable. Add a focused regression test for every rule or date-resolution fix.
- Use synthetic Persian examples. Cover variants such as Persian/Arabic digit forms, character normalization, punctuation, and spacing when relevant.
- Check false positives as well as successful matches, particularly for proposals versus commitments, owner names, and risk/question cues.
- Anchor relative dates to the meeting date. Test Jalali boundaries and ambiguous or unsupported expressions rather than guessing missing information.
- Preserve source references, manually edited fields, manually added items, and action statuses as appropriate when changing reanalysis behavior.

### Persistence and exports

- Treat imported backups as untrusted input and validate their structure and supported version.
- Test backup round trips, including manually added and edited minutes, invalid dates, malformed JSON, and unsupported versions.
- Do not silently change persisted schemas or backup formats without an explicit compatibility plan.
- Handle unavailable browser storage without assuming that an in-memory change has been saved.
- Escape user text in HTML exports. Test markup-like strings, quotes, and Markdown table separators where relevant.
- Preserve the distinction between a full JSON workspace backup and a single-meeting minutes export.

### Interface and packaging

- Preserve Persian RTL behavior, readable Persian typography, and both light and dark themes.
- Check narrow layouts, keyboard navigation, modal focus behavior, labels, and contrast.
- Avoid requiring a network fetch for standalone application code, styles, or fonts.
- Keep browser-dependent APIs graceful: copy, install, preview, and print may be unavailable or restricted.
- Do not add tracking or send transcript content outside the browser.
- Keep repository documentation in English while respecting the Persian application interface and fixtures.

## Verification before a pull request

Run:

```sh
npm test
npm run typecheck
npm run build
```

Report the actual results, including failures or checks you could not run. Do not claim verification from a fixed test count.

For UI, build, or persistence changes, also check the relevant scenarios manually:

- Open the generated **root** `index.html` from an extracted folder, including with networking disabled.
- Create a meeting, paste synthetic text, analyze, edit minutes, toggle action status, and reanalyze.
- Change an analyzed transcript and verify the optional 1,400 ms automatic-analysis behavior.
- Reload in the same browser and location to check autosave.
- Download a JSON backup and restore it in a disposable workspace; confirm that restore replaces rather than merges state.
- Download Markdown and HTML, preview HTML, and check browser print/PDF where available.
- Check light/dark themes, narrow layouts, and keyboard shortcuts.
- Use production preview or HTTPS to check hosted PWA behavior when relevant. Do not use `file://` to test service-worker installation.

Never use production meeting data for these checks. Back up any existing workspace before testing destructive operations or restore.

## Submitting a pull request

1. Create a focused branch in your fork or working copy.
2. Make the smallest coherent change that solves the problem.
3. Add or update appropriate tests and documentation.
4. Run the checks above and review your diff for unrelated changes, secrets, and private data.
5. Open a pull request against the repository's default branch.

Describe the problem, why the solution is appropriate, the affected behavior, and your verification results. Link related issues and call out browser-specific limitations, storage-format changes, or compatibility concerns. For visual changes, use screenshots of synthetic/sample content rather than real transcripts.

## Licensing and contact

NoxaPlus Meet is licensed under the [MIT License](LICENSE). By submitting a contribution, you agree that your contribution may be distributed under the project's MIT License and confirm that you have the right to submit it. Preserve applicable third-party license notices; dependencies and fonts retain their own licenses.

For general questions, open a non-sensitive [GitHub issue](https://github.com/noxaplus-star/noxaplus-meet/issues) or contact [NoxaPlus2025@gmail.com](mailto:NoxaPlus2025@gmail.com). Security and conduct reports should use the private channels documented in the corresponding policies.
