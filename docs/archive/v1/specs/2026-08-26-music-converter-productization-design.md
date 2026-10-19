> **Status: Historical v1.x record — inactive and unsupported.**

# Design specification: Music Converter productization

**Date:** 2026-08-26
**Status:** Productization proposal; no implementation in this step
**Functional baseline:** existing version 1.1.0

## Objective

Turn the current SpotMate scripts into a versioned, tested, and incrementally distributable browser product while strictly preserving the existing vision: voluntary automation stays on the SpotMate side, Turnstile is always completed manually, the local launcher stays fail-closed until a secure bridge exists, and no bypass or hidden download is introduced.

Productization must provide one browser core as the functional source of truth, an installable userscript, then a Chrome/Edge Manifest V3 extension sharing that core. Local delivery and distribution must be reproducible, audited, and separate from the launcher's conversion gates.

## Non-goals

- Reactivate CONVERSION_CAPABILITY.enabled, which remains false until a dedicated decision and evidence exist.
- Change the POST /api/queue/start contract, which remains HTTP 503 with launcher-local-conversion-disabled.
- Automate, bypass, or conceal Turnstile, CAPTCHA, consent, submission, or download.
- Send an extension or the launcher a token, cookie, header, path, or destination, or any audio URL other than finalAudioUrl validated by the core and transported only in the signed message planned for v1.5.
- Add a hidden iframe, automated browser, token relay, or download triggered on installation.
- Introduce Native Messaging in the planned versions. This remains a future option and will be considered only if the threat model includes a malicious local process.
- Modify script1.txt without evidence that a strictly necessary change requires it.
- Publish a package, tag, release, or installer in this design step.

## Current state

The repository is private, and package.json has name: "music-converter",
version: "1.1.0", private: true, and the historical test script. The launcher
Node.js provides metadata analysis and local configuration, but its
conversion capability is frozen at enabled: false; /api/queue/start
returns 503 and does not start the queue.

The existing browser surfaces are script1.txt, script2.txt,
script3.txt, and script_complet.txt. They are separate from the launcher. The
only allowed page is exactly https://spotmate.online/en1 or
https://spotmate.online/en1/. The user enters the URL on the page, completes
Turnstile manually, waits for DOM-produced tracks, voluntarily starts
conversion, then voluntarily starts each download.

The functional contract to preserve is:

- At most 100 tracks per session.
- 2 seconds between track starts.
- Poll after 4.5 seconds, at most 40 times.
- HTTPS-only final URL.
- One POST /convert per track.
- No automatic retry of a terminal error.
- Voluntary clicks and event.isTrusted for privileged actions.
- No token, cookie, or audio URL in logs, public results, or panels.
- script3 rejects any page outside the authorized SpotMate page.

The current npm test command does not run
tests/test_script2.cjs, tests/test_script3.cjs, or
tests/test_script_complet.cjs. Closing this gap is the first
productization delivery, in v1.2.0.

## Documentation precedence rule

If there is a conflict, this specification and 2026-08-25-music-converter-safety-versioning-design.md and 2026-08-25-music-converter-voluntary-download-design.md take precedence over 2026-08-25-spotmate-launcher-design.md on capability, retry, destination, and downloads. The older launcher design remains historical and does not authorize reactivating those behaviors.

## Target architecture

```text
                         Exact SpotMate page
               https://spotmate.online/en1 or /en1/
                         │ Manual Turnstile
                         ▼
        Browser SSOT core: DOM, session, conversions, states
             │ reproducible build           │ MV3 adapter
             ▼                              ▼
      Installable userscript       Chrome/Edge MV3 extension
                                           │ v1.5 only
                                           ▼
                         Authenticated and signed loopback bridge
                                           │
                              Local Node.js launcher
                         capability conversion = false
                         /api/queue/start = 503
                                           │
                         Separate volatile download queue
                                           │
                       USB selected and revalidated locally
```

The browser core is the SSOT for SpotMate behavior. Legacy artifacts and the userscript are generated or assembled from this source through a deterministic procedure; they must not diverge through manual copies. Starting in v1.4, the MV3 content script uses the same core with an isolated adapter. The content script is initially limited to the exact SpotMate origin and minimum permissions. The service worker and storage.session appear only in v1.5 for the bridge session.

Selection, progress, and cancellation are initially browser-core responsibilities. In v1.3, each track uses exactly one of these states: queued, converting, polling, success, failed, or cancelled. An interrupted session can be explicitly resumed; retry always remains manual.

In v1.5, the bridge does not reactivate launcher conversion. After pairing and authentication, it transports only finalAudioUrl, validated in advance by the core, to a separate volatile download queue. The value remains in volatile memory end to end and never appears in logs, UI, persistent state, or a durable queue. The user chooses and revalidates the USB destination locally; the extension never supplies it.

## Trust boundaries

1. **Public Spotify and SpotMate.** URLs, HTTP responses, DOM, task IDs, and final URLs are untrusted inputs. Only the exact SpotMate page is allowed; the final URL must be HTTPS and pass strict validation.
2. **User and page.** The browser remains where the user submits the URL, completes Turnstile, and triggers actions. Every privileged action requires a visible click and event.isTrusted; installation does not convert or download.
3. **Core and artifacts.** The core is the behavioral reference. The build verifies that the userscript, legacy scripts, and extension come from the same revision and produces reproducible artifacts.
4. **Extension.** The exact SpotMate content script is isolated. The service worker receives no file destination, page cookie, or arbitrary header. The only audio value it may send is finalAudioUrl validated by the core. The pairing session uses only an in-memory key or storage.session.
5. **Local bridge and remote network.** The bridge listener uses HTTP exclusively on 127.0.0.1:<fixed port>. Each Chrome or Edge build allows one exact CORS origin, chrome-extension://<ID>; wildcards and origin reflection are prohibited. The canonical signed protocol contains sessionId, a request nonce, timestamp, and finalAudioUrl. The nonce is consumed atomically and the session is invalidated when the launcher restarts. Remote download is a separate HTTPS connection to finalAudioUrl on effective port 443. DNS and public-IP checks are repeated on every connection and after every redirect. Authenticated loopback is not presented as a defense against a malicious local process.
6. **File system.** The user chooses USB locally. The path is revalidated at write time; files pass through .part, then an atomic rename, and an existing file is never overwritten.

## Invariant SpotMate contract

The core rejects any execution outside HTTPS origin https://spotmate.online and paths /en1 or /en1/. It collects at most 100 non-empty tracks produced by the page DOM. It does not construct Turnstile proof, read secrets outside the allowed context, or log tokens, cookies, or audio URLs.

Conversion is sequential: one POST /convert per track, then, if a task is returned, wait 4.5 seconds before each poll and poll no more than 40 times. Non-conforming responses, HTTP errors, and network errors are terminal with no automatic retry. A final URL is accepted only if its protocol is https:. Wait 2 seconds between track starts. Polling cannot bypass a stop, cancellation, or terminal error.

script3 also checks the allowed SpotMate page before offering actions. Exposed results contain only the necessary functional fields and trigger no action without a voluntary click.

## Decisions and alternatives

### Selected decisions

- Shared browser SSOT core: reduces the risk of divergence among legacy scripts, userscript, and extension.
- Reproducible build: inputs, tools, version, and artifact hashes are verifiable in CI.
- Progressive extension: exact content script and minimum permissions in v1.4; service worker, session, and localhost only in v1.5.
- Separate volatile queue in v1.5: the authenticated bridge does not turn the existing local conversion queue into an active capability and creates no durable queue containing finalAudioUrl.
- Local USB and atomic writes: the page or extension never chooses a file-system path.

### Rejected alternatives

- **Reactivate the launcher directly.** Rejected: the launcher lacks Turnstile context and its fail-closed contract must remain observable.
- **Duplicate logic in each surface.** Rejected: drift among legacy scripts, userscript, and extension would make behavioral gates fragile.
- **Iframe or hidden browser.** Rejected: this would hide consent and could become a Turnstile bypass.
- **Native Messaging in v1.5.** Deferred: it expands the trust boundary and will be reconsidered only if a malicious local process enters the threat model.

## Product phases

### v1.2.0 — browser core and baseline governance

Create the SSOT core, reproducible builds for legacy scripts, and the installable userscript. Make npm and CI run every behavioral suite, explicitly adding the three currently omitted suites. Add README badges and GitHub governance with a multi-surface SemVer guard.

The guard compares package.json, CHANGELOG, the README version badge, and userscript metadata. The extension manifest joins the SemVer guard only when it exists, starting in v1.4. Every release must reject unsynchronized versions. This phase does not change the launcher capability.

### v1.3.0 — track selection and sessions

Add playlist selection, per-track state, and progress using the exact states queued, converting, polling, success, failed, and cancelled. Add explicit session cancellation and resumption. Retry may be requested manually only. The interface and userscript must remain accessible by keyboard and assistive technology, including state announcements.

### v1.4.0 — Chrome/Edge MV3 extension

Deliver a Manifest V3 extension with the shared core, a reproducible ZIP, and real Chrome and Edge QA. The first increment consists only of the isolated content script on the exact SpotMate origin, with minimum permissions. This version includes no bridge service worker, session storage, or localhost access.

### v1.5.0 — secure bridge and voluntary local downloads

Add an authenticated, signed loopback bridge from extension to launcher, then voluntary download to a USB destination approved locally. Keep CONVERSION_CAPABILITY.enabled=false and POST /api/queue/start=503.

Pairing uses a single-use in-memory nonce; the session key remains in memory or storage.session and is invalidated when the launcher restarts. The HTTP listener uses 127.0.0.1:<fixed port> exclusively. Each Chrome or Edge build declares its exact CORS origin, chrome-extension://<ID>, with no wildcard or reflection. The canonical signed protocol contains sessionId, a request nonce, timestamp, and only finalAudioUrl validated by the core. Messages are authenticated with HMAC SHA-256, bounded by a time window, and protected against replay; the request nonce is consumed atomically. The bridge strictly validates schemas, payload sizes, and queue length.

finalAudioUrl remains in volatile memory end to end and never appears in logs, the UI, persistent state, or a durable queue. Remote download uses only this URL over HTTPS on effective port 443. SSRF, DNS, and public-IP checks run on every connection and after every redirect. The extension supplies no token, cookie, header, path, or destination. USB is selected and revalidated locally; files use .part, atomic rename, and a never-overwrite policy.

The download queue is separate from any existing conversion queue. Native Messaging remains a future option conditional on a threat model that includes a malicious local process.

### v1.6.0 — distribution and releases

Add packaging, installers, signed or verifiable artifacts according to the distribution decision, checksums, user guides, and release automation. Published artifacts must be rebuilt by CI, compared with expected hashes, and accompanied by documentation of their scope and limits.

## SemVer and releases

package.json is the single source of truth for SemVer. The initial documentation and governance PR does not change version 1.1.0. Versions above are release targets; the version bump occurs in the PR for the corresponding phase, after behavior and artifacts pass their gates.

For each release, synchronize:

- package.json;
- CHANGELOG.md entry;
- version badge in README.md;
- userscript metadata;
- extension manifest, only if it exists, starting in v1.4.

The vX.Y.Z tag is annotated. Create it only after green CI, review, SemVer check, artifact verification, phase-required QA, and merge to main. GitHub Release is a separate gate, created only after the annotated tag and publication of its artifacts. Code or CI results alone do not prove a tag, release, or deployment.

Each future phase is delivered through one or more explicit issues, a dedicated branch, PR, CI and review, merge, then tag and release. Issues may be split by surface, but no phase bypasses this sequence.

## Badges and GitHub governance

README should use a style consistent with MemPalace, AdBlocker, and Superpowers, with flat-square badges limited to:

- CI, linking to the ci.yml workflow on the main branch;
- static version 1.1.0 only in the initial documentation PR;
- Node `22 | 24`.

Do not add a license badge without an explicit decision and corresponding license. Governance must protect main, require CI and review, and enforce the multi-surface SemVer guard before tag/release. In every release PR, update the badge to the package.json version before running the guard and before tagging. The initial documentation and governance PR therefore remains documentation-only and does not bump 1.1.0.

## Security

The guiding principle is fail-closed: any non-conforming origin, page, payload, state, URL, permission, key, or destination is rejected without a silent fallback. Privileged actions require visible user intent. Installing a script, loading a playlist, refreshing a page, or a programmatic event never starts conversion or download.

Secrets and sensitive data remain confined to the specific request or session context. Logs, UI, persisted state, durable queues, test artifacts, and reports contain no token, cookie, finalAudioUrl, HMAC key, or usable pairing nonce. Fixtures use synthetic values assembled at runtime.

The bridge bounds each message and queue, rejects out-of-window or previously seen messages, compares MACs safely, and refuses redirects or resolutions that violate destination policy. It accepts no arbitrary headers or paths from the extension. USB may disappear between validation and write; this must fail cleanly and never overwrite or write outside the destination.

## Tests and QA

Every phase follows TDD: a contract or behavioral test goes red, the minimum implementation makes it green, then guardrails and the full suite stay green. Tests separately cover the core, legacy artifacts, userscript, extension, bridge, and download queue.

The v1.2 gate must prove that npm test runs tests/test_script2.cjs, tests/test_script3.cjs, and tests/test_script_complet.cjs in addition to the suites already run. It must prove build reproducibility and behavioral parity among generated surfaces.

Behavioral tests preserve SpotMate invariants: exact origin and path, 100-track limit, 2-second delay, polling every 4.5 seconds up to 40 times, one POST per track, final HTTPS URL, terminal errors without automatic retry, cancellation before the next track, voluntary clicks, and no sensitive data in logs.

Real Chrome and Edge QA is required for v1.4 and later phases. Physical USB QA is required for v1.5 and cannot be replaced by a fixture, fake mount, or code inspection alone. It must observe local selection, revalidation, .part, atomic rename, overwrite refusal, and clean stop on device removal. Retain only counts, states, codes, and
non-sensitive hashes.

## Risks and escalation

| Risk | Response | Escalation |
| --- | --- | --- |
| SpotMate DOM or contract changes | Strict rejection, targeted tests, and live QA | Suspend the affected phase; do not add a bypass |
| A surface diverges from the SSOT core | Deterministic build and artifact comparison | Block release until they converge |
| An MV3 permission becomes necessary | Scope review and issue-based justification | Product/security decision before changing the manifest |
| Bridge receives an invalid or replayed payload | HMAC, unique nonce, time window, and fail-closed limits | Block the endpoint and start a security review |
| USB disappears or already contains a file | .part, revalidation, atomic rename, never overwrite | Explicit failure; do not try another destination |
| Real QA or CI is unavailable | Keep the phase unpublished | Do not simulate evidence or tag |

Any discovery that expands scope to include a bypass, secret collection, arbitrary destination, hidden download, or launcher reactivation requires immediate escalation for a product and security decision. It cannot be resolved through an implicit worker adaptation.

## Global acceptance criteria

The design is satisfied when:

1. The two requested surfaces describe only the v1.2.0 through v1.6.0 phases and no out-of-scope functionality.
2. The browser core is the SSOT; legacy scripts, userscript, and extension are derived and verifiable artifacts.
3. package.json remains the SemVer source; the badge follows its version in every release PR before the guard and tag, and the manifest is checked only if present, starting in v1.4.
4. The documentation/governance PR retains 1.1.0. Badges are limited to CI on ci.yml/main, static version 1.1.0 only in that PR, and Node 22 | 24, with no undecided license badge.
5. SpotMate invariants, manual Turnstile, voluntary clicks, event.isTrusted, absence of secrets in logs, and rejection of foreign pages are specified as testable contracts.
6. v1.2 first fixes npm/CI coverage of the three missing historical suites.
7. v1.4 requires the isolated content script and minimum permissions before any bridge; only then does v1.5 add the service worker, session, and localhost.
8. v1.5 keeps CONVERSION_CAPABILITY.enabled=false, /api/queue/start=503, a separate volatile download queue, the canonical signed protocol, HTTP loopback listener, exact CORS, remote network checks, USB controls, and specified atomic-write behavior.
9. TDD tests, real Chrome/Edge QA, and physical USB QA are explicit gates and cannot be simulated when required.
10. Every future phase follows issues -> dedicated branch -> PR -> CI/review -> merge -> tag/release.
