# Browser and platform support

## Active support

- **Google Chrome on Windows:** active target. Manual runtime QA status is tracked in [the v2.0.0 extension checklist](../../qa/v2.0.0-extension-checklist.md).
- **Google Chrome on macOS:** the source-build and installation path is documented and authorized. Runtime QA is still pending; this is not yet a verified runtime claim.
- **Manual console helper:** available in Chrome DevTools when run manually according to [the helper guide](console-script.md).

The extension is limited to https://spotmate.online/en1 and https://spotmate.online/en1/. It requests no broad browser permissions. Users complete Turnstile and trigger conversion and downloads themselves.

## Retired and deferred targets

- **Microsoft Edge:** retired. The published v2.0.0 baseline included Edge assets, but Edge is not a current installation or support target.
- **Safari:** deferred. Native packaging requires Apple tooling and Mac validation.

Historical Edge installation records may appear in the changelog and v1 archive to accurately describe earlier releases. They do not describe current support.
