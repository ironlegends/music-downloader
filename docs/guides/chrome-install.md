# Install the Chrome extension

This guide covers loading the Chrome extension from a locally built or downloaded ZIP. The extension is not presented here as a Chrome Web Store release.

## Requirements

- Google Chrome 120 or later.
- A Chrome extension ZIP built from this repository or obtained from the published v2.0.0 baseline.

## Install from a ZIP

1. Extract the ZIP into a stable local folder.
2. In Chrome, open chrome://extensions.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder containing manifest.json.
5. Open https://spotmate.online/en1 and confirm that the Music Converter panel appears. On other pages, the extension remains inactive.

Do not select the ZIP itself in **Load unpacked**; extract it first.

## Build from source

The repository supports building the Chrome extension on Windows and macOS with Node.js 22 or 24 and npm. macOS runtime QA is pending.

~~~sh
npm run build:browser
npm run build:extension
npm run verify:extension
~~~

The build writes a ZIP beneath dist/chrome/. Extract that ZIP, then load its directory using the steps above.
