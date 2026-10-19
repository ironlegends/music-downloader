> **Status: Historical v2.0.0 design record — inactive.**

> Historical plan for the published v2.0.0 baseline. Current support and unreleased artifact names are documented in the README and browser support guide.

# Design specification: Music Converter v2.0.0, extension-first architecture

**Date:** 2026-08-27
**Status:** Design approved; ready for implementation planning
**Product principle:** at the time of v2.0.0, Chrome/Edge extensions and script_complet.txt were the only officially documented, tested, and supported methods. Edge support has since been retired; see the current browser support guide.

## Context and problem

Music Converter had several historical surfaces with different support levels: browser scripts, an extension, a local launcher, a loopback bridge, and Windows packaging. This created execution paths that were difficult to test, conflicting guides, and ambiguity about the official method.

The v2.0.0 design established one product boundary. Users had two documented and supported ways to work on the authorized SpotMate page: a Chrome or Edge extension and script_complet.txt. Both used the same browser core. Other surfaces were removed from the active product; code, tests, builders, and operational documentation were removed or archived as appropriate.

This distribution change did not authorize bypassing SpotMate or Turnstile. User consent, manual Turnstile completion, explicit clicks, and voluntary downloads remained functional invariants.

## Objectives

- Make the Chrome/Edge extension and script_complet.txt the only officially documented, tested, and supported use surfaces at the time.
- Keep a shared browser core as the single source of truth (SSOT) for parsing, sessions, selection, conversion, progress, and voluntary downloads.
- Remove launcher, local server, bridge, pairing, USB, PowerShell, userscript, and fragmented-script paths so they could neither execute nor appear active.
- Produce two installable extensions and one complete script from reproducible inputs, with hashes, an SBOM, and a release manifest.
- Make security, support, and migration constraints verifiable through tests and CI gates.

## Out of scope

- Automating or concealing Turnstile, CAPTCHA, consent, or user submission.
- Automatic or silent downloads, downloads triggered on installation, or downloads without voluntary user action.
- Conversion through a local process, launcher API, Node.js server, loopback bridge, Native Messaging, or a remotely selected USB destination.
- Retaining tokens, cookies, headers, audio URLs, pairing nonces, or keys in logs, persistent storage, or test artifacts.
- Reactivating old surfaces under a new name or retaining a compatibility alias that makes them operational.
- Automatic merge, tag, release publication, or deployment. These remain separate, explicitly triggered gates.

## Target architecture and flow

~~~text
User
    | installs Chrome/Edge extension OR loads script_complet.txt
    v
Shared browser core (SSOT)
    | validates origin/page, observes DOM, and creates a bounded session
    v
Exact SpotMate page: https://spotmate.online/en1 or /en1/
    | user enters the URL and completes Turnstile manually
    v
DOM-produced tracks -> explicit selection -> voluntary conversion
    | one track at a time, with visible state and progress
    v
Validated final HTTPS URL -> voluntary browser download
~~~

The extension contains an isolated content script, its CSS, and the shared core. At the time, Chrome and Edge manifests had a strict top-level contract limited to manifest_version, name, version, description, content_scripts, and content_security_policy. The content_scripts array had exactly one SpotMate entry with these properties:

~~~json
{
  "matches": [
    "https://spotmate.online/en1",
    "https://spotmate.online/en1/"
  ],
  "js": ["content-script.js"],
  "css": ["assets/playlist-panel.css"],
  "run_at": "document_idle",
  "world": "ISOLATED"
}
~~~

The extension CSP is explicit and allows only packaged resources. The manifests contain no permissions, optional_permissions, host_permissions, background, action, commands, scripting, tabs, downloads, nativeMessaging, web_accessible_resources, externally_connectable, or broad origin. There is no service worker, background script, storage permission, or access to http://127.0.0.1/*. The allowlist is verified as a contract, not only by manual inspection.

script_complet.txt follows one official procedure: the user navigates to the exact SpotMate page, opens that page's DevTools Console, and manually pastes and runs the complete script. This procedure was documented, tested, and supported at the time. Tampermonkey, other userscripts, bookmarklets, and remote injection are prohibited and unsupported variants. The file is generated from the same core as the extension; it must not become a second hand-maintained logic implementation.

The flow is strictly voluntary. Installation, page load, refresh, or a programmatic event starts no conversion. Every privileged action requires visible user interaction and event.isTrusted. A terminal error is shown and is never retried automatically.

The core's existing functional bounds remain: at most 100 tracks per session, 2 seconds between starts, wait 4.5 seconds before each poll and no more than 40 polls, one POST /convert per track, and accept a final URL only when its scheme is https:.

## Exact inventory

### Retained and supported at the time

- extension/chrome/manifest.json: minimal Chrome MV3 manifest.
- extension/edge/manifest.json: minimal Edge MV3 manifest.
- extension/content-script.js and the CSS needed for the extension UI, including extension/assets/playlist-panel.css.
- The core under src/browser/ and adapters strictly required by the two final surfaces.
- script_complet.txt, generated from the shared core and shipped as an official method.
- Browser-artifact build tools and relevant core, parity, manifest, and release tests.
- Active Chrome/Edge installation documentation and the complete-script guide, rewritten to describe only v2.0.0 scope.

### Removed from the active product

- script1.txt, script2.txt, and script3.txt, plus their tests and build entries.
- All separate userscript surfaces, including entry point, metadata, and tests.
- server.js, public/, and server/launcher endpoints and tests.
- extension/service-worker.js and extension/message-adapter.js, plus extension tests that covered only the bridge or worker.
- Bridge and pairing modules: src/bridge-auth.js, src/bridge-config.js, src/bridge-downloader.js, src/bridge-queue-manager.js, src/bridge-validator.js, src/browser/bridge-client.js, and src/browser/bridge-panel.js.
- USB components (src/windows-usb.js), local destination validation, and PowerShell install, uninstall, or portable-run scripts.
- packaging/windows/ and installer or portable-bundle tests/builds.
- Server, bridge, pairing, local queue, USB, and packaging tests, including test/server.test.js, test/bridge-*.test.js, test/windows-usb.test.js, and test/release/windows-packaging.test.js, where present after the split.
- Tests, fixtures, smoke tests, and workflows that check only a deleted surface.

Automated inventory verification fails when a forbidden name or symbol appears in active code, manifests, npm scripts, CI, or active docs. Authorized historical references are isolated in an archive and marked inactive; they are not copied into builds or linked from the Quickstart.

## Security model

The model is fail-closed. The only allowed origin is https://spotmate.online and the only paths are /en1 and /en1/. Any other page, origin, DOM response, or URL is rejected without fallback.

Remote inputs and the DOM are untrusted. The core validates response shapes, identifiers, and the final HTTPS URL before exposing them. It does not read, export, persist, or log cookies. It accepts neither arbitrary application tokens nor arbitrary headers, and it logs no sensitive data. The only possible token is CSRF from the meta tag, bound to the same origin as described below. Fixtures and reports use synthetic values.

Core network requests explicitly use same-origin and fetch(..., { credentials: 'same-origin' }). The browser attaches ambient cookies to same-origin requests without the code reading them. If the page contract requires it, the CSRF token may be read from the page's meta tag and sent only to the same origin in the X-CSRF-TOKEN header. It is never exported to another origin or process, persisted, or logged. credentials: 'include' is rejected for cross-origin requests; no Cookies API is used.

The manifests expose no localhost access, storage permission, or persistent worker. The extension does not give the page a file path or force a destination. The user triggers the browser download after the final URL is validated; installation or a reloaded session is never sufficient.

The v2.0.0 reduction in product surface means launcher, loopback, pairing, and USB risks are no longer production capabilities. Older threat notes may remain available as history, but they are not requirements of the v2 architecture.

## Build and release

The deterministic build runs on Node.js 22 and 24 under Ubuntu and Windows. It starts from a known core revision, generates the Chrome extension, Edge extension, and script_complet.txt, then verifies provenance and behavioral parity. Artifacts are not modified after generation.

Each v2.0.0 release contains exactly these six files, with no launcher, installer, or additional archive:

1. Chrome extension ZIP.
2. Edge extension ZIP.
3. script_complet.txt.
4. SHA256SUMS.
5. sbom.spdx.json.
6. release-manifest.json.

release-manifest.json describes the version, six names, hashes, and source revision. The content gate rejects extra files and missing hashes. The SBOM covers dependencies actually included, without packaging deleted code.

After generation, each ZIP is extracted to an isolated temporary directory and scanned; script_complet.txt is scanned the same way. The post-build gate rejects any worker, bridge, public/, server.js, localhost, USB, PowerShell, userscript, script1, script2, script3, or file absent from the inventory permitted for that artifact. Extraction and scanning are mandatory for both ZIPs, even after manifest validation.

CI runs tests for all four required Node/OS combinations (Node 22 and 24, Ubuntu and Windows), then secret scans, forbidden inventory, reproducibility, and artifact integrity. Real manual Chrome and Edge QA is required before tagging and release publication; it does not block merge when CI and automated review pass. Merge may follow those automated gates, while the annotated tag and release creation remain two separately triggered authorizations.

## Documentation, migration, and history

The README, Quickstart, and active guides describe only:

- Installing and using the Chrome or Edge extension.
- Using script_complet.txt.
- Voluntary-use limits, manual Turnstile, manual downloads, and the supported SpotMate page.
- v2.0.0 support and release-hash verification.

Launcher, pairing, USB, bridge, local server, userscript, and fragmented-script guides are removed from active paths and moved to the v1.x historical archive when traceability is useful. They are clearly marked historical, unsupported, and inactive; they are not linked from the Quickstart or included in artifacts.

Migration from v1.x to v2.0.0 is explicit: uninstall or ignore old surfaces, install a Chrome/Edge extension or load the complete script, then resume from the SpotMate page. No launcher, pairing, USB, or userscript state is migrated because those capabilities are not part of the v2 contract. Release notes call out this break and list the two supported methods of that time.

## TDD strategy and gates

Each batch starts with a red contract test, receives the minimum implementation, then returns green with the full suite. Tests cover the core, generated artifacts, manifests, documentation, inventory, and release.

The first RED tests must demonstrate:

1. Inventory still contains prohibited surfaces and fails until those surfaces are removed.
2. Manifests accept only the six defined top-level keys, one SpotMate content script with content-script.js, allowed CSS, document_idle, and ISOLATED; they reject any background/service worker, storage, localhost, or broad origin.
3. Both extensions and script_complet.txt come from the same core and expose the same contract behavior.
4. Release creation fails unless it contains exactly six assets.
5. Post-build scanning fails if an extracted ZIP or the complete script contains a worker, bridge, public/, server.js, localhost, USB, PowerShell, userscript, scripts 1/2/3, or an out-of-inventory file.
6. DevTools Console is the only documented procedure; Tampermonkey, userscripts, bookmarklets, and remote injection are rejected.
7. Calls use credentials: 'same-origin', any CSRF stays in a same-origin header, and no cookie is read or exported.
8. Active docs fail if they present a v1.x surface as supported.
9. SpotMate invariants remain verifiable: exact origin, 100-track bound, delays, polling, one POST, HTTPS URL, terminal errors, cancellation, voluntary clicks, and absence of secrets.

Final gates also require git diff --check, secret scanning, Node 22/24 on Ubuntu/Windows, extraction and scanning of ZIPs and script, reproducible ZIPs, and matching hashes between manifest and files. Real Chrome and Edge QA observes installation, the allowed page, manual Turnstile, selection, conversion, and voluntary download. This gate blocks tagging and release publication, but not merge when CI and automated review pass; static tests or simulation cannot replace it.

## Proposed batches

### Batch 1 — Documentation contract and inventory

Establish RED tests for prohibited surfaces, define the v1.x archive/v2.0.0 active split, and update README, Quickstart, guides, and changelog.

### Batch 2 — Core and final artifacts

Stabilize the shared browser core, generate both extensions and script_complet.txt, then remove obsolete entry points and adapters. Prove parity and behavioral bounds.

### Batch 3 — Manifests, tests, and CI

Reduce manifests to the top-level allowlist and exact content script, remove workers and localhost references, adjust suites, add post-build scans of both ZIPs and the complete script, and run Node 22/24 Ubuntu/Windows matrices.

### Batch 4 — v2.0.0 packaging and QA

Produce exactly six assets, hashes, SBOM, and manifest; run scans; then complete Chrome/Edge QA before tag and release. Merge remains conditional only on automated gates and review.

## Risks and rollback

| Risk | Response | Blocking decision |
| --- | --- | --- |
| A legacy reference remains active | Automated inventory and search across docs/code/CI | Block the batch until it is deleted or explicitly archived |
| Surfaces diverge from the core | Single build and parity test | Do not publish until parity is proven |
| A permission appears necessary | Targeted justification and security review | Do not add it implicitly; escalate before changing the manifest |
| SpotMate DOM contract changes | Strict rejection and targeted QA | Suspend the release; do not bypass the change |
| CI or QA gate is unavailable | Keep release unpublished | No tag or supported artifact; merge depends only on automated gates and review |
| User migration is ambiguous | Document both v2 paths and v1.x break | Fix guides before publication |

Rollback of an unpublished implementation means abandoning the v2.0.0 branch or PR; no tag or release is created before the gates. A merge may have occurred after automated CI and review, but that still does not authorize a tag or release. If v2.0.0 has been published, operational rollback is a corrective release or explicit withdrawal of v2 artifacts, without reactivating launcher, bridge, USB, or userscript. The v1.x archives remain available but do not become supported again.

## Acceptance criteria

The design is satisfied when:

1. At the time of v2.0.0, Chrome, Edge, and script_complet.txt were the only active, officially documented, tested, and supported methods.
2. The shared browser core is the SSOT and build/tests prove parity across all three artifacts.
3. Launcher, server, bridge, pairing, USB, PowerShell, userscript, and scripts 1/2/3 are no longer in the active product.
4. Manifests follow the top-level allowlist and exact SpotMate content script, document_idle, and ISOLATED; they declare no background, storage, localhost, or broad origin.
5. The release contains exactly the six specified assets and consistent metadata.
6. Each ZIP and script_complet.txt passes the post-build scan for prohibited surfaces and files.
7. CI covers Node 22/24 on Ubuntu and Windows with reproducible scans and gates.
8. Real Chrome and Edge QA is completed manually before tag and release; it does not block merge approved by automated CI and review.
9. script_complet.txt is run only through DevTools Console after user navigation, without userscript, bookmarklet, or remote injection; the cookie/CSRF contract remains same-origin.
10. Active guides do not present historical functionality as supported, and v1.x history is clearly inactive.
11. Merge, tag, and release remain separate and non-automatic.
