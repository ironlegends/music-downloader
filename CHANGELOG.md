# Changelog

Notable changes to Music Converter are recorded here. Version 2.0.0 is the published baseline; work after that release belongs under Unreleased until a release is made.

## [Unreleased]

- Translated interface text, errors, comments, tests and documentation into English.
- Renamed the active manual console helper to console-script.js and its source entry point to src/browser/entries/console-script.js.
- Added the MIT license, distributable license notices, contribution guidance, a security policy and a source-release readiness assessment.
- Removed the active Edge manifest, build target, release artifact and installation guide. Unsupported browser targets fail before filesystem changes.
- Documented Chrome on Windows and macOS, added macOS to the Node 22/24 CI matrix and recorded pending real-browser QA. Native Safari packaging is deferred.
- Hardened release inputs, checked out the exact validated annotated tag and required independent QA evidence for each platform before draft release preparation.
- Replaced tests that depended on sensitive historical Git objects with synthetic fixtures, allowing tests to run from an exported source snapshot.
- Fixed CLI entry-point detection through linked directories, including macOS temporary paths, so build and release-validation commands execute correctly.

## [2.0.0] - 2026-08-27

This is the published v2.0.0 baseline. At that time the release included Chrome and Edge extension assets and the manual console helper script_complet.txt. Edge is a retired historical target; see [Browser and platform support](docs/guides/browser-support.md) for current support.

- **Major extension-first redesign:** Reworked the architecture to run in the user's browser (SSOT core, isolated content script).
- **Removed v1 surfaces:** Removed the local Node.js server (Launcher), USB bridge, pairing, userscript, and Windows executables from the active v2 product.
- **Supported methods at the v2.0.0 release:** The published distribution included the Chrome extension (Manifest V3), the Edge extension (Manifest V3), and the manually run script_complet.txt fallback in the DevTools console.
- Fixed onSuccess in the extension entry point to call setVolatileUrl (the panel's actual method) instead of the nonexistent registerDownload; applied the same correction in content-script.js.
- Fixed the MV3 service worker by removing request bodies from GET and HEAD requests to comply with the Fetch API and prevent TypeError: Request with GET/HEAD method cannot have body.
- Fixed USB writes after a drive-letter change by using copy plus atomic deletion instead of cross-volume rename (ENOENT), with per-error handling.
- Updated release.yml to fail explicitly (exit 1) when a version notes file is missing instead of silently falling back to v1.6.0.md.
- Updated check-artifacts.mjs to show a readable usage message and exit with 1 when no target directory is supplied, instead of raising ERR_INVALID_ARG_TYPE.

## [1.6.1] - 2026-08-26

- Corrected the Unix OS code (0x0314) in the ZIP central directory header to preserve POSIX 0644 permissions.
- Made the tool version dynamic in the SPDX 2.3 JSON SBOM and GitHub Actions workflows.
- Added WebCrypto HMAC signing in the MV3 service worker to authenticate requests to the local bridge.
- Added active cleanup of expired failed origins (originFailures) in the authentication module.
- Filtered non-public CG-NAT (100.64.0.0/10) and benchmarking (198.18.0.0/15) ranges in the anti-SSRF checks.
- Allowed the polling -> polling transition in the session model to represent progress accurately.
- Integrated reactive onChange, onSuccess, and AbortSignal cancellation in the extension entry point.
- Improved ARIA accessibility by aggregating multi-track announcements and preserving contextual focus.
- Fixed Windows USB root containment (E:\), added reservation-set collision protection, and dynamically reassigned the mount point.
- Hardened the artifact verifier (check-artifacts.mjs) to reject non-regular files and directories.

## [1.6.0] - 2026-08-26

- Added a reproducible, deterministic release and packaging pipeline (tools/release/).
- Generated installable (packaging/windows/install.ps1) and portable (packaging/windows/run-portable.ps1) Windows bundles without elevation or risk of deleting user data.
- Generated an SPDX 2.3 JSON SBOM (sbom.spdx.json) and published cryptographic hashes (SHA256SUMS).
- Added installation guides for Google Chrome and Microsoft Edge, pairing the bridge, and writing to USB drives.
- Added CI/CD workflows with least-privilege permissions and SHA-pinned actions.
- Resolved issues #23, #24, #25, and #26.

## [1.5.0] - 2026-08-26

- Added an HMAC-SHA256-authenticated USB bridge listening only on http://127.0.0.1:3210.
- Added ephemeral pairing with a unique 128-bit nonce and 256-bit session keys stored in chrome.storage.session.
- Added local USB volume detection and selection (FAT32, exFAT, NTFS), with strict identity revalidation before every write.
- Added exclusive atomic .part writes and collision-free renaming without overwriting existing files.
- Added a secure HTTPS client with mandatory public DNS resolution, anti-SSRF checks, audio magic-byte detection, and a 256 MiB limit.
- Added a separate volatile queue (1 active, up to 2 waiting) with clean cancellation and complete redaction of URLs and secrets.
- Resolved issues #17, #18, #19, #20, #21, and #22.

## [1.4.0] - 2026-08-26

- Added a Manifest V3 browser extension for Google Chrome and Microsoft Edge with minimal permissions (permissions: [], host_permissions: []).
- Added an isolated content script (extension/content-script.js) reusing the v1.3 SSOT core without duplicating logic.
- Added reproducible deterministic ZIP packaging (tools/build-extension.mjs) and an integrity verifier (tools/verify-extension.mjs).
- Restricted the scope to https://spotmate.online/en1* with a strict content security policy (script-src 'self'; object-src 'self';).
- Required event.isTrusted === true for all user actions; included no service worker, remote storage, or localhost access.
- Resolved issues #13, #14, #15, and #16.

## [1.3.0] - 2026-08-26

- Added a pure, immutable playlist session model with six states (queued, converting, polling, success, failed, cancelled).
- Added per-track selection (select one, select all, clear all) and versioned persistence in sessionStorage.
- Added a sequential conversion runner with immediate cancellation, explicit resumption, and manual retry of failed tracks only.
- Added an accessible panel with progress, an ARIA live region, restored focus, touch targets of at least 44 px, and responsive mobile/desktop layout.
- Restricted privileged actions to event.isTrusted === true; audio URLs are excluded from the DOM, logs, and storage.
- Regenerated browser artifacts with the v1.3 modules included in the deterministic build.
- Resolved issues #9, #10, #11, and #12.

## [1.2.0] - 2026-08-26

- Added a unified browser core (src/browser/) with a strict https://spotmate.online/en1 access policy and fail-closed payload parsing.
- Added an isolated installable userscript (dist/spotmate.user.js) that does not pollute global variables.
- Added deterministic, reproducible generation of legacy scripts (script2.txt, script3.txt, script_complet.txt) and preserved frozen script1.txt.
- Restricted privileged actions to trusted user events (event.isTrusted === true).
- Added the SemVer check and guard (tools/check-release-metadata.mjs).
- Added CI coverage and contract tests for all browser surfaces.
- Resolved issues #4, #5, #6, #7, and #8.

## [1.1.0] - 2026-08-25

- Documented the voluntary browser helper for downloading from SpotMate, with manual Turnstile completion and explicit conversion and download clicks.
- Kept the local launcher fail-closed: conversion capability set to false and /api/queue/start returning HTTP 503.
- Documented local guardrails and responsibility boundaries without adding a dependency or bypass.

## [1.0.0] - 2026-08-25

- Initial release of the local launcher and historical DevTools scripts.
