# Contributing

Thanks for helping improve Music Converter. Keep contributions within the active product scope described in [Browser and platform support](docs/guides/browser-support.md).

## Before opening a change

- Keep the Chrome extension limited to the supported SpotMate page.
- Preserve manual Turnstile completion and visible, user-triggered conversion and download actions.
- Do not add hidden or background downloads, access-control bypasses, automatic injection, broad browser permissions, or a local conversion server.
- Do not include tokens, cookies, CSRF values, audio URLs, account data, or other secrets in changes, logs, fixtures, or reports.
- Treat Edge as a retired historical target. Do not update the v2.0.0 archive to imply current support.

## Local development

Use Node.js 22 or 24 and npm. Build and verify the Chrome extension with:

~~~sh
npm run build:browser
npm run build:extension
npm run verify:extension
~~~

Run the automated suite with npm test. Describe any checks you did not run and keep manual runtime QA status accurate. Windows Chrome QA and macOS Chrome QA are tracked separately; macOS runtime QA is currently pending.

## Documentation and security reports

Write documentation in English and keep active instructions separate from historical v1 records. Do not claim a build, browser run, or release was verified unless it was observed. For security concerns, follow [SECURITY.md](SECURITY.md) and avoid publishing sensitive data in an issue.
