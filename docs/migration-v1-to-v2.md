# Migration from v1 to v2

Music Converter 2.0.0 changed the architecture from a locally hosted server and launcher to browser-based tools. The v1 components below are retired and are not migrated into the active product.

## Retired v1 components

- **Local server and launcher:** the Node.js backend (server.js, /api/queue/start) and related npm start scripts.
- **USB bridge:** communication with local USB drives and its cryptographic pairing checks.
- **Windows executables:** windows-launcher.zip and standalone installers.
- **Userscript:** no longer active. Current browser use is through the Chrome extension or the manually run console helper.
- **Environment variables:** the following v1 variables have no v2 replacement:
  - PORT (there is no local server in v2)
  - NO_OPEN (there is no server that opens a browser automatically)
  - MUSIC_CONVERTER_EXTENSION_ORIGINS (there is no bridge; the extension runs in Chrome's isolated world)
  - MUSIC_CONVERTER_USB_VOLUME_ID (there is no USB bridge)
  - MUSIC_CONVERTER_USB_MOVE_SOURCE (there is no USB file move)
  - MUSIC_CONVERTER_USB_MOVE_DESTINATION (there is no USB file move)

## Current workflow

The active extension runs in Chrome and interacts with the supported SpotMate page. No local server installation is required. Users complete Turnstile manually, start conversion through the visible interface, and trigger each download themselves. A manual console helper is also available; see [its guide](guides/console-script.md).

The published v2.0.0 release included Edge assets, but Edge support has since been retired. See [current browser support](guides/browser-support.md).

## Upgrading from v1

1. Remove any v1 launcher files and userscripts you no longer need.
2. Install the current Chrome extension by following [the Chrome installation guide](guides/chrome-install.md).
3. The local destination-folder settings from the v1 launcher no longer apply. Downloads are triggered by the user through the browser and use the browser's normal download handling.
