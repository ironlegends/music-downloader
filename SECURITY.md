# Security policy

The current source targets Chrome on Windows and macOS. Historical releases and retired browser targets are not maintained. Real-browser release validation is tracked separately from automated tests.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature if it is enabled for this repository. If it is unavailable, open an issue requesting a private contact channel without including exploit details, credentials, cookies, tokens, audio URLs or private files. Do not publish sensitive evidence in public issues.

Provide the affected revision, browser and operating system versions, a minimal reproduction using synthetic data, expected behavior and observed impact. Do not probe Spotify, SpotMate or other third-party systems without their authorization.

## Security boundaries

- Run only on the explicitly supported SpotMate page.
- Complete Turnstile manually and require a trusted user action for privileged operations.
- Keep requests to the service on the same origin and never persist credentials or final audio URLs.
- Treat page content and API responses as untrusted. HTTPS alone does not establish the trustworthiness of a download destination.
- Review source, workflow changes and release provenance before distribution.

## Publication status

The MIT license covers the rights granted by the software's copyright holders. It does not grant rights to third-party music, services or trademarks. The public repository starts from a reviewed source snapshot with a new Git history; the legacy history remains private. See the release-readiness report in `docs/security/open-source-readiness.md` for audit coverage, residual risks and stable-release gates.
