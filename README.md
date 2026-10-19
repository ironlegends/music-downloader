# Music Converter

[![CI](https://github.com/ironlegends/music-converter-open-source/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square)](https://github.com/ironlegends/music-converter-open-source/actions/workflows/ci.yml?query=branch%3Amain)
[![Version 2.0.0](https://img.shields.io/badge/version-2.0.0-blue?style=flat-square)](https://github.com/ironlegends/music-converter-open-source/releases)
[![Node 22 | 24](https://img.shields.io/badge/node-22%20%7C%2024-339933?style=flat-square)](https://nodejs.org/)

Music Converter provides a Chrome extension for using SpotMate's conversion workflow on its supported page. SpotMate performs the conversion and supplies the resulting download links; Music Converter does not run a conversion server.

This is the [public MIT source repository](https://github.com/ironlegends/music-converter-open-source). It starts with a reviewed source snapshot and a new Git history. Earlier private commits, tags, issues and release assets are not imported.

Version 2.0.0 is the legacy published baseline. No binary release has been published from this new public repository. Current source changes are documented under Unreleased in the changelog.

## Supported setup

The active browser integration is Chrome on Windows and macOS. The macOS source-build path is documented, but runtime QA on macOS is still pending. Safari support is deferred because native packaging and validation require Apple tooling and Mac testing.

- [Install the Chrome extension](docs/guides/chrome-install.md)
- [Browser and platform support](docs/guides/browser-support.md)
- [Use the manual console helper](docs/guides/console-script.md)
- [Security policy](SECURITY.md)

## User-controlled workflow

Open https://spotmate.online/en1 or https://spotmate.online/en1/, complete Turnstile manually, and enter the SpotMate page information. Start conversion from the visible interface, then start downloads using visible individual controls or **Download all**. Privileged controls require a trusted user click (`event.isTrusted === true`). The extension is limited to the supported SpotMate page and requests no broad browser permissions. It does not use a server, start hidden or background downloads, or bypass Turnstile or other access controls.

The manual console helper is an alternative when you choose not to use the extension. Run it only by following the [console helper guide](docs/guides/console-script.md). Automatic injection tools and remote code injection are unsupported.

## Build from source

Requirements: Node.js 22 or 24, npm, Git, and Google Chrome. There are no npm dependencies to install. The steps below describe building the Chrome extension from this repository on Windows or macOS. macOS runtime behavior has not yet completed manual QA.

~~~sh
npm run build:browser
npm run build:extension
npm run verify:extension
~~~

The build writes the Chrome extension bundle under dist/chrome/. Extract the ZIP, open chrome://extensions, enable Developer mode, and choose Load unpacked for the extracted directory containing manifest.json.

For development checks, run `npm test`. See the [release guide](docs/guides/releasing.md) for the current artifact inventory and publication gates.

## Project layout

~~~text
├── CHANGELOG.md
├── docs/                           # Guides, architecture, release notes, and history
│   ├── archive/v1/                 # Inactive historical records for v1.x
│   └── guides/
├── extension/                      # Browser extension files
├── src/browser/                    # Shared browser logic and entry points
└── test/                            # Automated tests
~~~

## License and third-party rights

The project code is licensed under the MIT License; see [LICENSE](LICENSE). That license does not grant rights to music, SpotMate, Spotify, or other third-party services or content. Users are responsible for confirming that their use complies with applicable rights, service terms, and law.
