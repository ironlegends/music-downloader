# Product roadmap

The current release baseline is 2.0.0. Work after that release remains unreleased until a new version is published.

## Delivered milestones

| Version | Result | Status |
| --- | --- | --- |
| v1.x | Historical local Node.js launcher, USB bridge, and userscript architecture. These versions are retired from the active product. | Archived |
| v2.0.0 | Browser extension architecture, shared browser core, manual DevTools helper, and removal of the local server, launcher, and USB bridge. | Published baseline |

## Current product boundaries

- The active extension target is Google Chrome on Windows and macOS.
- The extension is limited to https://spotmate.online/en1 and https://spotmate.online/en1/.
- The extension requests no broad browser permissions and does not run a local server.
- Conversion and downloads require visible, user-triggered actions. Turnstile is completed manually.
- Hidden or background downloads, Turnstile bypass, and automatic script injection are out of scope.
- Safari support is deferred pending native packaging and Mac validation.
- macOS runtime QA is still pending.
