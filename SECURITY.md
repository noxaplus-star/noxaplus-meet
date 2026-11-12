# Security Policy

NoxaPlus Meet is a local-first browser application for potentially sensitive meeting content. This policy describes vulnerability reporting and the limits of its security model.

## Supported versions

Security fixes target the latest published version of NoxaPlus Meet. The current release line is **1.0.x**. Older copies, forks, and locally modified builds are not guaranteed to receive fixes; use the latest available version and back up your workspace before updating.

There is no automatic-update guarantee for a downloaded standalone HTML file. Download or build an updated copy when a fix is published. Hosted service-worker caches may retain an older application until the browser updates the cache.

## Report a vulnerability privately

Email **[NoxaPlus2025@gmail.com](mailto:NoxaPlus2025@gmail.com)** with a subject such as `NoxaPlus Meet security report`.

Do not publish exploit details, sensitive transcripts, backups, credentials, or identifying meeting information in a public GitHub issue or pull request before maintainers have had an opportunity to investigate.

A useful report includes:

- A description of the vulnerability and its potential impact.
- Affected version or commit and whether the issue occurs in standalone `file://`, hosted HTTPS, localhost, or a modified build.
- Browser and operating-system details.
- Minimal reproduction steps using synthetic, non-sensitive data.
- A proof of concept or relevant code path, if available.
- Any known workaround or proposed mitigation.

Only test systems and data you own or are authorized to assess. Do not access other users' meeting content, disrupt hosted services, or use social engineering. Send the minimum information needed to reproduce the issue; do not send a real workspace as a default attachment.

Maintainers will assess the report, coordinate clarification and a fix when appropriate, and discuss public disclosure with the reporter. Response and resolution times depend on maintainer availability and issue complexity; no response-time SLA or bug-bounty reward is promised.

## Relevant security issues

Examples include:

- Script execution or unsafe rendering through transcript, metadata, minutes, or backup input.
- HTML export escaping failures.
- Backup-validation weaknesses with a demonstrated security impact.
- Unexpected transmission or exposure of locally stored meeting content.
- Dependency or service-worker behavior that compromises application integrity or privacy.

Incorrect extraction, an ambiguous owner, or a missed deadline is ordinarily a product bug rather than a vulnerability unless it creates a concrete security impact. Report non-sensitive product bugs through [GitHub Issues](https://github.com/noxaplus-star/noxaplus-meet/issues).

## Security model and limitations

### Local processing is not encryption

Transcript parsing, rule-based analysis, browser autosave, and export generation take place on the device. The app does not need an account, API key, remote model, or transcript-upload endpoint, and it does not include analytics or tracking tools.

However:

- Workspace data in browser `localStorage` is **not encrypted by the app**.
- JSON backups, Markdown, and HTML exports are **not encrypted by the app**.
- Device users, browser-profile access, extensions, malware, clipboard consumers, synchronized download folders, and browser/OS services can expose content outside the app's control.
- Local storage may be blocked, cleared, or unavailable. A local-save label is not a guarantee of durable storage.
- There is no cloud recovery or server-side backup.

### Input and export boundaries

Backup restore validates the NoxaPlus Meet backup identity, version, and workspace structure. The UI rejects files larger than **10 × 1024 × 1024 bytes (10 MiB)**. Validation and a file-size limit do not make arbitrary third-party files trustworthy.

HTML export escapes user-supplied text. Do not assume that a separate Markdown renderer, modified export, browser extension, or external hosting system provides the same protections. Review untrusted content before publishing it.

### Hosting and offline use

The root standalone `index.html` embeds application JavaScript, CSS, and fonts and can run without internet access. Browser storage for `file://` documents varies by browser and file path; moving a file can make a previous workspace inaccessible.

The hosted app loads application resources from its host. PWA installation and service workers require HTTPS or localhost and a compatible browser; they do not work from `file://`. Service-worker caching enables an offline hosted workflow but does not encrypt content, synchronize meetings, or replace backups.

Opening external links and installing development dependencies can generate network traffic outside the extraction workflow. Obtain builds and source from trusted locations, and review third-party dependencies when modifying the application.

## Safer everyday use

1. Use an updated browser and a trusted application copy.
2. Protect your device and browser profile; avoid shared or untrusted devices for confidential meetings.
3. Limit browser extensions and other software with access to meeting content.
4. Keep JSON backups in an appropriately protected location separate from the application folder.
5. Back up before updates, restore, deletion, browser cleanup, or relocating local files.
6. Use encrypted storage or other external protection if your data policy requires it; the app does not supply encryption.
7. Remove sensitive exports from shared folders and clear clipboard contents when appropriate.
8. Review extracted minutes before using them as an official record. Confidence labels are heuristic, not assurances of correctness.

For general privacy and backup guidance, see the [README](README.md). For private security contact, use [NoxaPlus2025@gmail.com](mailto:NoxaPlus2025@gmail.com).
