# Music Downloader

Convert Spotify links and download music through SpotMate, with controls for each track or the whole playlist.

## Install in Chrome

1. [Download the extension source ZIP](https://github.com/ironlegends/music-downloader/archive/refs/heads/main.zip).
2. Extract the ZIP and keep the extracted folder on your computer.
3. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
4. Click **Load unpacked** and choose the **extension** folder inside the extracted project. It contains `manifest.json`.

No terminal, Node.js or build step is needed. Keep the folder in place while the extension is installed.

## Download music

1. Open [SpotMate](https://spotmate.online/en1) and paste a Spotify track or playlist link into the site's URL field.
2. Complete the site's verification (Turnstile) manually if asked, then click **Load Spotify URL** in the extension panel.
3. Wait for the track list, then click **Start conversions**.
4. When conversion finishes, use each track's download button or **Download all**.

Keep the SpotMate tab open while conversions run. Chrome may ask you to allow multiple downloads for this site.

## Help

- **The panel does not appear:** check that the extension is enabled in `chrome://extensions`, then reload the SpotMate page.
- **Chrome says the manifest is missing:** select the extracted **extension** folder, not the ZIP or the project folder above it.
- **Installation or browser questions:** see [Chrome installation](docs/guides/chrome-install.md) and [browser support](docs/guides/browser-support.md).
- **Something else went wrong:** [report a problem](https://github.com/ironlegends/music-downloader/issues/new/choose).

## Development

<details>
<summary>Build, tests and technical documentation</summary>

[![CI](https://github.com/ironlegends/music-downloader/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square)](https://github.com/ironlegends/music-downloader/actions/workflows/ci.yml?query=branch%3Amain)
[![Version 2.0.0](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](https://github.com/ironlegends/music-downloader/releases)
[![Node 22 | 24](https://img.shields.io/badge/node-22%20%7C%2024-339933?style=flat-square)](https://nodejs.org/)

Use Node.js 22 or 24 and npm for development. There are no npm dependencies to install.

~~~sh
npm test
npm run build:browser
~~~

The generated browser files are committed so users can load the extension directly. Keep `extension/manifest.json` identical to `extension/chrome/manifest.json`; tests verify their parity and referenced files.

Conversion and downloads require a trusted user click (`event.isTrusted`). Turnstile remains manual, and the extension starts no hidden or background downloads. SpotMate performs the conversions; this project runs no conversion server.

See [contributing](CONTRIBUTING.md), [architecture](docs/architecture.md), [the release guide](docs/guides/releasing.md), [the manual console alternative](docs/guides/console-script.md) and [the security policy](SECURITY.md).

</details>

## License

[MIT](LICENSE). Use only music you are authorized to convert and download. The software license does not grant rights to third-party music or services.
