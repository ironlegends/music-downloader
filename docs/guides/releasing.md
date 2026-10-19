# Preparing a release

The current source changes are unreleased. Version 2.0.0 is the already-published baseline; its assets and release notes are historical records. Do not replace its tag or attach new files to it. Choose the next appropriate version before releasing these breaking browser-target and artifact-name changes, and update all version metadata together.

## Current artifact inventory

A build for version X.Y.Z produces exactly six files:

- `music-converter-vX.Y.Z-chrome-extension.zip`
- `console-script.js`
- `LICENSE`
- `SHA256SUMS`
- `sbom.spdx.json`
- `release-manifest.json`

The Chrome ZIP contains `manifest.json`, `content-script.js`, `assets/playlist-panel.css` and `LICENSE`. Edge and Safari artifacts are not produced. The software package declares MIT; the SPDX document's CC0-1.0 data license applies to the SBOM metadata.

## Validation

Use a reviewed, clean source commit. Run `npm test`, `node tools/build-browser-artifacts.mjs --check` and `npm run check:release`. Build into a new empty directory outside the checkout:

~~~sh
node tools/release/build.mjs --out-dir <empty-directory>
node tools/release/check-artifacts.mjs <empty-directory>
~~~

Record real Chrome QA on Windows and macOS in `qa/vX.Y.Z-extension-checklist.md`. Change its overall and both platform statuses to `**Status: PASS**` only after completing every named check and recording each platform's `OS version`, `Chrome version` and `Evidence` fields. An empty platform section or placeholder evidence is rejected. Automated tests and local interface fixtures are not substitutes for this check.

## Draft publication

The manual GitHub Release workflow requires explicit QA confirmation and an annotated `vX.Y.Z` tag from main history. It validates the tag, checks out that exact commit, checks the package version and QA evidence, then builds and verifies a draft release. Release notes must exist at `docs/releases/vX.Y.Z.md` in the tagged commit.

Public repository visibility remains a separate decision. Resolve the history and rights gates in [the readiness report](../security/open-source-readiness.md) before opening the existing private repository. Never rewrite history, delete old releases or change visibility without the owner's authorization.
