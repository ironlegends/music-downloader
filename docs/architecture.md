# Repository architecture

## Current product

Version 2.0.0 is the published baseline. The current product uses a Chrome extension and a manual console helper. Browser integration runs in the user's browser; the project does not provide a local conversion server or launcher.

### Chrome extension

The extension is built from the shared browser modules under src/browser/ and the extension entry point. Its content script runs in Chrome's isolated world and is limited to https://spotmate.online/en1 and https://spotmate.online/en1/. The manifest requests no broad browser permissions.

### Manual console helper

The optional manual helper is built from src/browser/entries/console-script.js as console-script.js. Follow [the console helper guide](guides/console-script.md) to run it by hand in Chrome DevTools. It does not install itself or inject automatically.

### User-controlled conversion and download

Users complete Turnstile themselves, start conversion from a visible control, and click to start each download. The project does not provide hidden or background downloads and does not bypass Turnstile or other access controls. SpotMate provides the conversion service and final download links.

The v1 launcher, USB bridge, and local HTTP server are historical components only; see [the v1 archive](archive/v1/).

Privileged controls require a trusted user click (`event.isTrusted === true`). Complete Turnstile manually before using the supported workflow.
