> **Status: Historical v1.x record — inactive and unsupported.**

# Music Converter v1.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task with a validation checkpoint after every task. Use small Conventional Commits; do not publish a tag or release until the release gates at the end pass.

**Goal:** Deliver v1.2.0 as a reproducible, tested browser core with an installable userscript and generated legacy scripts, while preserving the voluntary SpotMate workflow and the launcher's fail-closed conversion boundary.

**Architecture:** `src/browser/index.js` is the canonical barrel and `src/browser/` is the single source of truth for page policy, payload parsing, SpotMate DOM/API adaptation, sequential conversion, download actions, and the visible panel. Four thin entries expose that core as an isolated userscript or as compatibility-preserving legacy conversion, download, and complete surfaces. `tools/build-browser-artifacts.mjs` deterministically generates `dist/spotmate.user.js`, `script2.txt`, `script3.txt`, and `script_complet.txt`; `script1.txt` is a frozen historical input and is never generated or edited.

**Tech Stack:** Node.js ESM with built-in `node:test`, `assert`, `fs`, `path`, `crypto`, and `child_process` APIs only; browser-native DOM, `fetch`, `AbortController`, `MutationObserver`, and CSS; GitHub Actions on Node 22 and Node 24. No runtime dependencies are added. The repository-owned build and SemVer tools are development-only and accept only the locked Node 22.x/24.x toolchain.

## Global Constraints

- The exact allowed page is `https://spotmate.online/en1` or `https://spotmate.online/en1/`; every other origin or path is refused fail-closed.
- A session accepts at most 100 non-empty DOM-produced tracks.
- Track starts are sequential with a 2-second gap; polling waits 4.5 seconds before each request and stops after 40 polls.
- Each track gets exactly one `POST /convert`; HTTP, network, schema, and terminal-payload errors are terminal and never retried automatically.
- A final audio URL is accepted only when `new URL(value).protocol === 'https:'`; no redirect, alternate protocol, or malformed URL is accepted.
- Turnstile, Spotify form submission, conversion start, and download remain manual and visible; privileged actions require `event.isTrusted === true`.
- Installation, page refresh, playlist loading, and programmatic events never start conversion or download.
- No token, cookie, CSRF value, HMAC key, pairing nonce, or final audio URL is written to logs, visible UI, persistent storage, durable queues, fixtures, reports, or generated source. Legacy compatibility globals remain volatile runtime compatibility surfaces only; they are never rendered or persisted.
- The userscript creates no `window.fetchResults`, `window.downloadUrls`, or other legacy globals. Legacy entries preserve the current `window.fetchResults`, `window.downloadUrls`, and `script1.txt` `window.buttonIds` contracts where applicable.
- `CONVERSION_CAPABILITY.enabled` remains `false`, and `POST /api/queue/start` remains HTTP `503` with `launcher-local-conversion-disabled`; no launcher conversion code is enabled.
- The browser build has zero runtime dependencies, writes only its allowlisted generated outputs, uses stable LF text and stable ordering, and emits no timestamps or machine-specific paths.
- `script1.txt` is not an input to a rewrite and must remain byte-for-byte unchanged.
- This documentation PR (spec, roadmap, plans, and forthcoming governance/badge documentation) remains at `1.1.0`. The v1.2 implementation/release PR is created from a clean worktree based on up-to-date `main`, includes the `1.2.0` bump, and closes tickets #4–#8 only after all gates pass.
- SemVer checks use the existing canonical `test/guardrails/release-metadata.test.js` together with `tools/check-release-metadata.mjs`, comparing `package.json`, `CHANGELOG.md`, the README version badge, and userscript metadata; both extension manifests are checked from v1.4 onward.
- README badges use `flat-square` and are limited to CI for `ci.yml` on `main`, the current version, and `Node 22 | 24`; no license badge is introduced.
- Tickets for this version are real repository issues: [#4](https://github.com/ironlegends/music-converter/issues/4) npm/CI coverage, [#5](https://github.com/ironlegends/music-converter/issues/5) browser core, [#6](https://github.com/ironlegends/music-converter/issues/6) userscript, [#7](https://github.com/ironlegends/music-converter/issues/7) badges/governance, and [#8](https://github.com/ironlegends/music-converter/issues/8) SemVer guard.

## File Map

The implementation worker owns only the files listed by the current task. Generated files are changed only through the build tool.

| File | Responsibility in v1.2.0 |
| --- | --- |
| `src/browser/policy.js` | Exact page gate, limits, timing constants, trusted-event guard, and non-sensitive result policy. |
| `src/browser/index.js` | Canonical SSOT barrel exporting the flat browser modules and public factories. |
| `src/browser/payload-parser.js` | JSON/content-type validation, task ID extraction, terminal-state precedence, and HTTPS final-URL validation. |
| `src/browser/spotmate-page-adapter.js` | Existing SpotMate form, manual Turnstile boundary, hidden track inputs under `#tracks`, and mutation waiting. |
| `src/browser/spotmate-api-adapter.js` | Same-origin `/convert` and `/tasks/{id}` calls, request-local CSRF lookup, and terminal error mapping. |
| `src/browser/conversion-session.js` | One-track-at-a-time orchestration, abort handling, 2-second gaps, and legacy result projection. |
| `src/browser/download-adapter.js` | HTTPS-only anchor actions, 1.5-second bulk delay, no automatic click, and volatile legacy projection. |
| `src/browser/playlist-view.js` | Visible panel controls and event handlers that require trusted user input. |
| `src/browser/panel.css` | Shared panel presentation; URLs and sensitive values never appear in visible text. |
| `src/browser/entries/userscript.js` | Isolated userscript entry with no legacy globals. |
| `src/browser/entries/legacy-conversion.js` | Generated `script2.txt` compatibility entry. |
| `src/browser/entries/legacy-download.js` | Generated `script3.txt` compatibility entry. |
| `src/browser/entries/legacy-complete.js` | Generated `script_complet.txt` compatibility entry. |
| `tools/build-browser-artifacts.mjs` | Locked, dependency-free deterministic artifact builder and `--check` verifier. |
| `tools/check-release-metadata.mjs` | Fail-closed SemVer synchronization guard. |
| `dist/spotmate.user.js` | Generated installable userscript artifact. |
| `script2.txt`, `script3.txt`, `script_complet.txt` | Generated legacy artifacts; never hand-edited. |
| `script1.txt` | Frozen historical DOM-ID helper; no task may modify it. |

The test map is split by risk: `test/browser/` tests core contracts and generated parity, `tests/test_script*.cjs` preserves existing legacy fixture coverage, and `test/guardrails/` checks wiring, secrets, release metadata, and generated-source policy.

## Delivery Tasks

### Task 1: Wire the three historical suites into npm and CI first

**Files:**
- Create: `test/guardrails/browser-suite-wiring.test.js`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Test: `tests/test_script2.cjs`, `tests/test_script3.cjs`, `tests/test_script_complet.cjs`

**Interfaces:**
- Consumes: the existing `npm test` script, `.github/workflows/ci.yml`, and the three existing CommonJS Node test entrypoints.
- Produces: an npm command and an explicit CI step that execute `tests/test_script2.cjs`, `tests/test_script3.cjs`, and `tests/test_script_complet.cjs`, while retaining `tests/test_script1.cjs`, `tests/test_all_scripts.cjs`, and all existing `test/**/*.test.js` suites.

- [ ] **Step 1: Write the failing wiring guard.**

  Add a Node test that reads `package.json` and `.github/workflows/ci.yml`, asserts each of the three required paths appears in `scripts.test`, and asserts the workflow contains an explicit `node --test` command naming all three paths. The assertion must be structural and must not rely on test output text.

  ```js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { readFileSync } from 'node:fs';
  import { join } from 'node:path';
  import { fileURLToPath } from 'node:url';

  const rootDir = join(fileURLToPath(new URL('../..', import.meta.url)));
  const requiredSuites = [
    'tests/test_script2.cjs',
    'tests/test_script3.cjs',
    'tests/test_script_complet.cjs'
  ];

  test('npm and CI run the three historical browser suites', () => {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    const workflow = readFileSync(join(rootDir, '.github/workflows/ci.yml'), 'utf8');
    for (const file of requiredSuites) assert.match(packageJson.scripts.test, new RegExp(file.replaceAll('/', '[\\\\/]')));
    assert.match(workflow, /node --test[\s\S]*tests\/test_script2\.cjs[\s\S]*tests\/test_script3\.cjs[\s\S]*tests\/test_script_complet\.cjs/);
  });
  ```

- [ ] **Step 2: Run the guard to prove the pre-fix RED.**

  Run: `node --test test/guardrails/browser-suite-wiring.test.js`

  Expected: `FAIL`, because the current package script omits the three files and the current workflow has only `run: npm test`; this is the recorded proof of the original coverage gap.

- [ ] **Step 3: Implement the minimum wiring.**

  Keep the existing suites and append the four historical script tests to `package.json` in this order: `tests/test_script1.cjs`, `tests/test_script2.cjs`, `tests/test_script3.cjs`, `tests/test_script_complet.cjs`; keep `tests/test_all_scripts.cjs` after them. Add a CI step named `Browser contract suites` with `node --test tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs` after the existing `npm test` step. Keep the existing Ubuntu/Windows and Node 22/24 matrix unchanged.

- [ ] **Step 4: Run the wiring guard and the three suites.**

  Run: `node --test test/guardrails/browser-suite-wiring.test.js`

  Expected: `PASS`.

  Run: `node --test tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs`

  Expected: the current suites pass against the current generated legacy sources; no browser-core behavior is changed in this task.

- [ ] **Step 5: Refactor only the command formatting if needed and run the full existing suite.**

  Run: `npm test`

  Expected: `PASS`, with the three previously omitted suites visible in the test output and `tests/test_all_scripts.cjs` still executed.

- [ ] **Step 6: Commit the coverage gate.**

  ```bash
  git add test/guardrails/browser-suite-wiring.test.js package.json .github/workflows/ci.yml
  git commit -m "test: wire browser contract suites"
  ```

### Task 2: Establish the browser policy and payload parser as pure contracts

**Files:**
- Create: `src/browser/policy.js`
- Create: `src/browser/payload-parser.js`
- Create: `test/browser/policy.test.js`
- Create: `test/browser/payload-parser.test.js`

**Interfaces:**
- Consumes: location-like objects, DOM/API response metadata, and JSON payloads supplied by callers.
- Produces: `SPOTMATE_PAGE`, `BROWSER_LIMITS`, `isAllowedSpotmatePage(locationLike)`, `isTrustedUserEvent(event)`, `isFinalHttpsUrl(value)`, `parseConversionPayload(responseMeta, payload)`, and `parsePollingPayload(responseMeta, payload)`.
- `parseConversionPayload` and `parsePollingPayload` return frozen non-sensitive decisions of the form `{ kind: 'success', url }`, `{ kind: 'poll', taskId }`, or `{ kind: 'terminal', status, error }`; no parser result contains a token, cookie, header, or raw response body.

- [ ] **Step 1: Write RED tests for exact policy and parser precedence.**

  Cover both accepted locations, foreign origins, `/en1/extra`, HTTP SpotMate, the values `100`, `2000`, `4500`, `40`, `1500`, trusted versus untrusted events, valid/invalid HTTPS URLs, `task_id` and `taskId`, direct and nested URL shapes, terminal states taking precedence over an embedded URL, non-JSON content types, `payload.error`, and terminal HTTP/network/schema decisions. Build fixture token and URL values from fragments at runtime.

- [ ] **Step 2: Run the focused RED tests.**

  Run: `node --test test/browser/policy.test.js test/browser/payload-parser.test.js`

  Expected: `FAIL` because the two modules do not exist yet.

- [ ] **Step 3: Implement the minimum pure modules.**

  In `policy.js`, compare `location.origin` exactly with `https://spotmate.online` and `location.pathname` exactly with `/en1` or `/en1/`. Do not normalize foreign values into an allowed page. Return `false` for missing locations. Require `event && event.isTrusted === true` for privileged actions. Keep all constants frozen.

  In `payload-parser.js`, require an exact `application/json` media type after trimming parameters, reject non-OK responses before parsing, inspect documented payload layers in deterministic order, check terminal `status/state` before any URL, accept only a non-empty `task_id`/`taskId`, and accept only HTTPS final URLs. Map every other response to one terminal result without a retry field.

- [ ] **Step 4: Run the focused GREEN tests and existing policy tests.**

  Run: `node --test test/browser/policy.test.js test/browser/payload-parser.test.js test/policy/retry-policy.test.js`

  Expected: `PASS`; all returned objects that are part of the public contract are frozen and contain no secret fixture material.

- [ ] **Step 5: Refactor for one shared policy path and rerun.**

  Remove duplicate URL/page/terminal checks from the two modules, preserve the exact exported names, then run: `node --test test/browser/policy.test.js test/browser/payload-parser.test.js`

  Expected: `PASS` with no change to the contract results.

- [ ] **Step 6: Commit the pure browser contracts.**

  ```bash
  git add src/browser/policy.js src/browser/payload-parser.js test/browser/policy.test.js test/browser/payload-parser.test.js
  git commit -m "feat: add browser policy contracts"
  ```

### Task 3: Implement the SpotMate page/API adapters and sequential conversion session

**Files:**
- Create: `src/browser/spotmate-page-adapter.js`
- Create: `src/browser/spotmate-api-adapter.js`
- Create: `src/browser/conversion-session.js`
- Create: `test/browser/spotmate-page-adapter.test.js`
- Create: `test/browser/spotmate-api-adapter.test.js`
- Create: `test/browser/conversion-session.test.js`

**Interfaces:**
- Consumes: the policy/parser contracts from Task 2, the existing SpotMate form and `#tracks` DOM, and injected `fetch`, timer, and DOM dependencies in tests.
- Produces: `createSpotmatePageAdapter({ windowRef, documentRef, exposeLegacyGlobals })`, `createSpotmateApiAdapter({ fetchImpl, location, readCsrfToken })`, and `createConversionSession({ pageAdapter, apiAdapter, exposeLegacyGlobals })`.
- `pageAdapter.collectTrackInputs()` returns `{ id, value }[]`; `pageAdapter.submitExistingSpotifyForm(url)` calls the existing form only; `pageAdapter.waitForTrackInputs(signal)` resolves after DOM mutation or rejects on abort.
- `apiAdapter.convertTrack(track, signal)` performs one `/convert` call; `apiAdapter.pollTask(taskId, signal)` waits 4500 ms before each of at most 40 requests; neither method retries.
- `session.run(tracks, signal)` returns ordered terminal results and `session.cancel()` aborts the active operation before the next track. It never starts a track after cancellation.

- [ ] **Step 1: Write RED adapter/session tests.**

  Use injected synthetic DOM and fetch fixtures. Assert that only inputs under `#tracks` are collected, duplicate IDs are ignored, empty values fail, 101 tracks fail before fetch, the existing form is submitted once, mutation observation is cleaned up on abort, the CSRF token is request-local, the body has exactly `{ urls: track.value }`, and no `/api/queue/start` request is made.

  Assert one `/convert` per track, direct HTTPS success, `task_id` and `taskId` polling, 4.5 seconds before every poll, maximum 40 polls, 2 seconds between track starts, terminal HTTP/network/schema/payload errors without retry, and cancellation during polling or the inter-track gap.

- [ ] **Step 2: Run the focused RED tests.**

  Run: `node --test test/browser/spotmate-page-adapter.test.js test/browser/spotmate-api-adapter.test.js test/browser/conversion-session.test.js`

  Expected: `FAIL` because the adapters and session do not exist yet.

- [ ] **Step 3: Implement the page adapter.**

  Gate every public operation with `isAllowedSpotmatePage`. Read only hidden inputs inside `#tracks`; never use hidden inputs elsewhere as tracks. Validate the existing Spotify input as an HTTPS `open.spotify.com` URL, call `HTMLFormElement.prototype.requestSubmit.call(form)` so clobbered form properties cannot replace the native method, and let the page perform Turnstile manually. Use one `MutationObserver`, remove it on resolve/reject/abort, and never create an iframe or background request.

- [ ] **Step 4: Implement the API adapter and session.**

  Construct `/convert` and `/tasks/${encodeURIComponent(taskId)}` with `new URL(..., location.origin)`, use `credentials: 'same-origin'`, pass a request-local CSRF header only when the page provides one, and never expose it. Feed response metadata and parsed JSON to Task 2. Sequence `run()` with one active request at a time, preserve successful legacy result shape in volatile memory only, wait exactly 2000 ms before the next track, and stop on `AbortError` before creating another request.

- [ ] **Step 5: Run GREEN plus the existing server fail-closed suites.**

  Run: `node --test test/browser/spotmate-page-adapter.test.js test/browser/spotmate-api-adapter.test.js test/browser/conversion-session.test.js test/server.test.js test/frontend-static.test.js`

  Expected: `PASS`; existing `CONVERSION_CAPABILITY.enabled=false` and `/api/queue/start` 503 assertions remain unchanged.

- [ ] **Step 6: Refactor the adapters around injected dependencies and rerun.**

  Ensure production code uses browser globals only through the adapter factory arguments, keep timers and fetch injectable, and remove any duplicated terminal or page checks. Run the same focused command from Step 5.

  Expected: `PASS` with no new global, storage, log, or network surface.

- [ ] **Step 7: Commit the browser adapters and session.**

  ```bash
  git add src/browser/spotmate-page-adapter.js src/browser/spotmate-api-adapter.js src/browser/conversion-session.js test/browser/spotmate-page-adapter.test.js test/browser/spotmate-api-adapter.test.js test/browser/conversion-session.test.js
  git commit -m "feat: add SpotMate browser session core"
  ```

### Task 4: Add the visible panel, download adapter, and four thin entries

**Files:**
- Create: `src/browser/playlist-view.js`
- Create: `src/browser/download-adapter.js`
- Create: `src/browser/panel.css`
- Create: `src/browser/entries/userscript.js`
- Create: `src/browser/index.js`
- Create: `src/browser/entries/legacy-conversion.js`
- Create: `src/browser/entries/legacy-download.js`
- Create: `src/browser/entries/legacy-complete.js`
- Create: `test/browser/playlist-view.test.js`
- Create: `test/browser/download-adapter.test.js`
- Create: `test/browser/entries.test.js`

**Interfaces:**
- Consumes: page adapter, API adapter, conversion session, and policy from Task 3.
- Produces: `createPlaylistView({ documentRef, onLoad, onStart, onCancel, onDownloadTrack, onDownloadAll })`, `createDownloadAdapter({ documentRef, windowRef, exposeLegacyGlobals })`, and entry modules whose `mount()` function installs only the controls appropriate to the surface.
- `createDownloadAdapter` filters successful HTTPS results, creates one visible button per track, uses anchor clicks only from trusted handlers, waits 1500 ms between bulk triggers, and removes stale panels before a new run.
- The userscript entry passes `exposeLegacyGlobals: false`; legacy conversion/download/complete entries pass `true` only for the globals they historically expose. No entry writes a global during installation or creates an automatic click.

- [ ] **Step 1: Write RED view/download/entry tests.**

  Assert the exact labels `Load Spotify URL`, `Start conversions`, `Cancel`, and `Download all`; no visible URL; no automatic network request or anchor click on mount; no iframe; one individual download per trusted click; 1500 ms between bulk downloads; HTTPS-only filtering; stale-panel cleanup; and foreign-page refusal before controls are offered.

  Execute each entry in the same synthetic fixture and assert that the userscript leaves `window.fetchResults`, `window.downloadUrls`, and `window.buttonIds` absent, while the legacy conversion/download/complete entries preserve the expected legacy globals as volatile runtime values. Assert that a programmatic event with `isTrusted: false` cannot start conversion or download.

- [ ] **Step 2: Run the focused RED tests.**

  Run: `node --test test/browser/playlist-view.test.js test/browser/download-adapter.test.js test/browser/entries.test.js`

  Expected: `FAIL` because the view, download adapter, entries, and CSS do not exist yet.

- [ ] **Step 3: Implement the view and download adapter.**

  Render controls with semantic buttons and the shared stylesheet. Event handlers must return immediately unless `isTrustedUserEvent(event)` is true. Keep final URLs in closures used only by the anchor trigger; never put them in button text, status text, logs, `localStorage`, `sessionStorage`, or a serialized result. Disable the bulk button while its sequential loop is active and restore it in `finally`.

- [ ] **Step 4: Implement the four entries.**

  The userscript entry must be an isolated wrapper that imports the shared core through the build input and keeps all session/download data in closures. The three legacy entries must expose only their established volatile globals: conversion exposes `window.fetchResults`, download exposes `window.downloadUrls`, and complete composes both. `script1.txt` is not imported, copied, or changed.

- [ ] **Step 5: Run GREEN and the existing legacy behavior suites.**

  Run: `node --test test/browser/playlist-view.test.js test/browser/download-adapter.test.js test/browser/entries.test.js tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs`

  Expected: `PASS` for the new core fixture tests and the existing legacy suites after their event fixtures use explicit trusted events.

- [ ] **Step 6: Refactor the panel into one shared event path.**

  Remove entry-specific copies of page policy, URL validation, click checks, and timing constants. Keep the entry differences limited to mounting and the legacy-global projection. Run the same command from Step 5.

  Expected: `PASS`; userscript globals remain absent and legacy globals remain compatible.

- [ ] **Step 7: Commit the panel and entry layer.**

  ```bash
  git add src/browser/playlist-view.js src/browser/download-adapter.js src/browser/panel.css src/browser/entries/userscript.js src/browser/entries/legacy-conversion.js src/browser/entries/legacy-download.js src/browser/entries/legacy-complete.js test/browser/playlist-view.test.js test/browser/download-adapter.test.js test/browser/entries.test.js
  git commit -m "feat: add browser entry surfaces"
  ```

### Task 5: Add the locked reproducible browser artifact builder

**Files:**
- Create: `tools/build-browser-artifacts.mjs`
- Create: `test/browser/build-tool.test.js`
- Modify: `package.json`
- Create: `dist/spotmate.user.js`
- Generate: `script2.txt`
- Generate: `script3.txt`
- Generate: `script_complet.txt`
- Preserve unchanged: `script1.txt`

**Interfaces:**
- Consumes: the allowlisted `src/browser/` entries, `src/browser/panel.css`, and `package.json.version`.
- Produces: `node tools/build-browser-artifacts.mjs --write`, `node tools/build-browser-artifacts.mjs --check`, and `node tools/build-browser-artifacts.mjs --write --out-dir <directory>`.
- `--write` is the only mode allowed to change generated outputs; `--check` is read-only and exits non-zero on missing, stale, extra, or byte-different artifacts. The default output set is exactly `dist/spotmate.user.js`, `script2.txt`, `script3.txt`, and `script_complet.txt`.

- [ ] **Step 1: Write RED builder tests.**

  Assert the exact output allowlist, the absence of `script1.txt` from the output set, the presence of userscript metadata derived from `package.json.version`, no third-party import, no timestamp, no absolute machine path, LF-only output, and deterministic bytes for two separate output directories. Assert that `--check` detects one modified generated byte and that a write attempt naming an unallowlisted output fails.

- [ ] **Step 2: Run the focused RED tests.**

  Run: `node --test test/browser/build-tool.test.js`

  Expected: `FAIL` because the builder and generated userscript do not exist.

- [ ] **Step 3: Implement the dependency-free locked builder.**

  Use only Node built-ins. Reject Node majors other than 22 and 24, resolve source paths relative to the repository root, normalize line endings, inject the package version into the userscript header, concatenate only the declared entry/core/CSS inputs in fixed order, and write through temporary files plus atomic rename. Refuse unknown flags and paths outside the exact output allowlist. Never read or rewrite `script1.txt`.

- [ ] **Step 4: Generate the four artifacts.**

  Run: `npm run build:browser -- --write`

  Expected: `dist/spotmate.user.js`, `script2.txt`, `script3.txt`, and `script_complet.txt` are present and generated from the shared core; `script1.txt` has no diff.

- [ ] **Step 5: Run GREEN, the no-diff check, and the frozen-script check.**

  Run: `node --test test/browser/build-tool.test.js`

  Expected: `PASS`.

  Run: `npm run build:browser -- --check`

  Expected: `PASS` without changing any file.

  Run: `git diff --exit-code -- script1.txt`

  Expected: exit code `0`.

- [ ] **Step 6: Refactor only deterministic assembly details and rerun the three commands above.**

  The two output directories must have identical SHA-256 hashes for every generated artifact, and a second `--write` must produce no diff. Keep the build tool dev-only and keep `package.json.dependencies` absent.

- [ ] **Step 7: Commit the builder and first generated artifacts.**

  ```bash
  git add tools/build-browser-artifacts.mjs test/browser/build-tool.test.js package.json dist/spotmate.user.js script2.txt script3.txt script_complet.txt
  git commit -m "build: add reproducible browser artifacts"
  ```

### Task 6: Prove parity, trusted actions, globals, and foreign-page refusal across generated surfaces

**Files:**
- Create: `test/fixtures/browser-parity-fixture.cjs`
- Create: `test/browser/artifact-parity.test.js`
- Modify: `tests/test_script2.cjs`
- Modify: `tests/test_script3.cjs`
- Modify: `tests/test_script_complet.cjs`
- Modify: `tests/test_all_scripts.cjs`

**Interfaces:**
- Consumes: generated artifacts from Task 5 and one shared synthetic DOM/fetch fixture factory.
- Produces: one cross-surface trace format containing only action names, request paths, request counts, HTTP statuses, track counts, poll counts, delays, result states, and global-key presence; it contains no URL, token, cookie, response body, or raw payload.

- [ ] **Step 1: Write RED cross-surface tests.**

  Add tests that execute the userscript artifact and the legacy complete artifact against the same fixture and compare normalized traces for direct success, task success, terminal error, cancellation, and no automatic action. Execute legacy conversion/download separately and compare their traces to the corresponding userscript paths.

  Add explicit assertions that:

  - `event.isTrusted: false` causes zero conversion requests and zero anchor clicks, while `event.isTrusted: true` performs the requested action;
  - the userscript leaves legacy globals absent;
  - legacy conversion, download, and complete entries preserve their established globals as volatile runtime compatibility values;
  - `script3.txt` refuses `{ origin: 'https://evil.invalid', pathname: '/en1' }` and also refuses a non-SpotMate path;
  - no trace, panel text, log capture, or storage stub contains the synthetic CSRF, cookie, or final URL;
  - all four generated artifacts contain no markdown fences, forbidden browser headers, retry queue symbols, iframe creation, or opaque secret literal;
  - `script1.txt` remains byte-identical to `git show HEAD:script1.txt`.

- [ ] **Step 2: Run the parity RED tests.**

  Run: `node --test test/browser/artifact-parity.test.js`

  Expected: `FAIL` until the generated userscript/legacy surfaces share the core and `script3` has the exact page gate.

- [ ] **Step 3: Implement only the fixture adapter changes required by the new contract.**

  Update the existing test click helpers to pass `{ isTrusted: true }` for simulated user clicks, add a direct untrusted-event path, and inject `window.location` into the script3 fixture. Build all synthetic values from fragments at runtime. Do not weaken the existing assertions that legacy results and download lists preserve their current volatile compatibility behavior.

- [ ] **Step 4: Run GREEN parity and all script suites.**

  Run: `node --test test/browser/artifact-parity.test.js tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs`

  Expected: `PASS`; the normalized userscript and legacy traces are equal for shared scenarios, the foreign page produces no panel or action, and trusted actions remain manual.

- [ ] **Step 5: Run the static and secret guardrails.**

  Run: `node tests/test_all_scripts.cjs`

  Expected: `PASS` with generated artifacts included in the scan and no token/cookie/final URL in logs, UI text, persistent stubs, or source literals.

- [ ] **Step 6: Refactor the fixture trace to remove accidental detail.**

  Keep only the allowlisted aggregate fields in the trace, then rerun the focused parity command and `node tests/test_all_scripts.cjs`.

  Expected: `PASS`; no raw URL or secret can enter a failure message or snapshot.

- [ ] **Step 7: Commit the parity and safety proof.**

  ```bash
  git add test/fixtures/browser-parity-fixture.cjs test/browser/artifact-parity.test.js tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs tests/test_all_scripts.cjs
  git commit -m "test: prove browser artifact parity"
  ```

### Task 7: Update README, architecture documentation, and GitHub templates without a release bump

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `CHANGELOG.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `test/guardrails/documentation-governance.test.js`

**Interfaces:**
- Consumes: generated artifact names, current package version `1.1.0` as the documentation baseline, current CI workflow, and the permanent constraints in this plan.
- Produces: documentation that distinguishes launcher and voluntary browser surfaces, links the userscript artifact, documents generated legacy scripts, and gives contributors fixed issue/PR intake and release-gate checklists.

- [ ] **Step 1: Write RED documentation/governance assertions.**

  Assert that README contains exactly the three `flat-square` badge categories: CI linked to `ci.yml` on `main`, version `1.1.0` for this documentation baseline PR, and `Node 22 | 24`; assert no license badge. Assert that README and `docs/architecture.md` mention the exact SpotMate page, manual Turnstile, trusted actions, no hidden download, launcher `false`/503, generated userscript, and `script1.txt` frozen status. Assert that each GitHub template requests reproducible steps, expected behavior, environment, sensitive-data redaction, tests, SemVer, and the launcher fail-closed gate.

- [ ] **Step 2: Run the focused RED test.**

  Run: `node --test test/guardrails/documentation-governance.test.js`

  Expected: `FAIL` because the current README has no badge set or generated-userscript governance and the templates do not exist.

- [ ] **Step 3: Implement the documentation and templates.**

  Put badges at the top of README with `style=flat-square`; use the repository URL `https://github.com/ironlegends/music-converter`, workflow `ci.yml`, and branch `main`. Keep the documentation baseline PR version badge at `1.1.0`. Document `npm run build:browser -- --check`, `npm test`, the exact legacy suite commands, and the generated-file rule. Add a changelog entry under `[Unreleased]` for the v1.2 browser core and governance work without adding a `[1.2.0]` heading in this baseline documentation PR.

  The bug template must collect a redacted reproduction, exact page/OS/Node/browser, expected versus actual behavior, test command, and confirmation that no token/cookie/audio URL was attached. The feature template must require scope, voluntary user action, exact acceptance evidence, and an issue number only when GitHub assigns one. The PR template must require tests, build `--check`, diff review, SemVer guard, security-sensitive-data review, and confirmation that `CONVERSION_CAPABILITY.enabled=false` and `/api/queue/start` 503 remain unchanged.

- [ ] **Step 4: Run GREEN and documentation scans.**

  Run: `node --test test/guardrails/documentation-governance.test.js test/guardrails/static-scan.test.js test/guardrails/secret-guard.test.js`

  Expected: `PASS`; the docs and templates contain no secret fixture or unassigned GitHub issue number.

- [ ] **Step 5: Refactor wording for one consistent contract vocabulary.**

  Keep `finalAudioUrl` out of visible examples and logs, keep future v1.3–v1.6 behavior explicitly out of the v1.2 implementation section, and rerun the command from Step 4.

  Expected: `PASS` with no version bump.

- [ ] **Step 6: Commit docs and governance.**

  ```bash
  git add README.md docs/architecture.md CHANGELOG.md .github/ISSUE_TEMPLATE/bug_report.md .github/ISSUE_TEMPLATE/feature_request.md .github/PULL_REQUEST_TEMPLATE.md test/guardrails/documentation-governance.test.js
  git commit -m "docs: define browser product governance"
  ```

### Task 8: Add and enforce the canonical SemVer surface guard

**Files:**
- Create: `tools/check-release-metadata.mjs`
- Modify: `test/guardrails/release-metadata.test.js`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Generated: `dist/spotmate.user.js`

**Interfaces:**
- Consumes: `package.json`, the first matching release heading in `CHANGELOG.md`, the README version badge, userscript `@version`, and both extension manifests from v1.4 onward.
- Produces: `node tools/check-release-metadata.mjs --version <expected-version>` and npm alias `npm run check:release -- --version <expected-version>`; exit `0` only when every required surface matches and exit non-zero with a field-specific message otherwise.

- [ ] **Step 1: Write RED guard tests.**

  Use temporary copies to prove that a mismatch in package version, changelog heading, README badge, or userscript metadata fails independently. Prove that no extension manifest is required for v1.2 and v1.3, but an existing manifest is checked from v1.4. Use this task as the pre-alignment baseline check and prove that `1.2.0` is only validated in Task 9. In this step, verify that baseline documentation metadata remains `1.1.0`; the release target `1.2.0` is checked only through an explicit expected-version invocation.

- [ ] **Step 2: Run the focused RED tests.**

  Run: `node --test test/guardrails/release-metadata.test.js`

  Expected: `FAIL` because the new tool and the updated canonical guard are not yet wired for this release contract.

- [ ] **Step 3: Implement the fail-closed guard.**

  Read the package version as the default expected version, require a changelog heading `## [X.Y.Z] - YYYY-MM-DD` for a release check, match the README badge version and generated `dist/spotmate.user.js` `@version`, and inspect `extension/chrome/manifest.json` and `extension/edge/manifest.json` from v1.4. Reject a missing required surface, duplicate version headings, invalid SemVer, or any mismatch. Never edit files from the guard.

- [ ] **Step 4: Wire the guard and run GREEN.**

  Add `check:release` to `package.json`, then run:

  ```bash
  node --test test/guardrails/release-metadata.test.js
  npm run check:release -- --version 1.1.0
  ```

  Expected: both commands `PASS` on the baseline state; no file is changed.

- [ ] **Step 5: Refactor the CLI output to be safe and actionable.**

  Print only field names, expected versions, and observed versions; never print source lines containing URLs, tokens, cookies, or final audio values. Rerun the focused test and guard command.

  Expected: `PASS`.

- [ ] **Step 6: Commit the SemVer guard.**

  ```bash
    git add tools/check-release-metadata.mjs test/guardrails/release-metadata.test.js package.json
  git commit -m "chore: enforce release metadata parity"
  ```

### Task 9: Align v1.2.0 in its implementation/release PR and run final gates

**This task is the only one that applies the v1.2.0 bump and PR/release alignment; Tasks 7 and 8 remain on the separated documentation baseline at 1.1.0.**

**Files in the v1.2 implementation/release PR, created from a clean worktree based on up-to-date `main`:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Generate: `dist/spotmate.user.js`
- Generate: `script2.txt`, `script3.txt`, `script_complet.txt`
- Verify unchanged: `script1.txt`

**Interfaces:**
- Consumes: the v1.2 implementation, generated artifact builder, canonical SemVer guard, CI workflow, and review evidence.
- Produces: the v1.2 PR, which includes the corresponding `1.2.0` bump and closes #4–#8, followed by an annotated tag `v1.2.0` only after merge and gates and a GitHub Release only after the tag and artifact publication. These are separate states and must be recorded separately.

- [ ] **Step 1: Write the release-PR RED check before editing versions.**

  Run: `npm run check:release -- --version 1.2.0`

  Expected: `FAIL` before the v1.2 release alignment because package, changelog release heading, README badge, and userscript metadata are still at `1.1.0`.

- [ ] **Step 2: Apply the only v1.2 version bump.**

  In the v1.2 implementation/release PR, set `package.json.version` to `1.2.0`, add `## [1.2.0] - 2026-08-26` immediately below `[Unreleased]`, update only the README version badge to `1.2.0`, and regenerate `dist/spotmate.user.js` and the legacy artifacts so their metadata derives from package.json. Close #4–#8 in that PR. Do not change the launcher capability or `/api/queue/start` contract.

- [ ] **Step 3: Run the release-PR GREEN gates.**

  Run:

  ```bash
  npm run build:browser -- --write
  npm run build:browser -- --check
  npm run check:release -- --version 1.2.0
  npm test
  git diff --check
  git diff --exit-code -- script1.txt
  ```

  Expected: every command succeeds; generated artifacts are reproducible; all tests include the three historical suites; `script1.txt` is unchanged; and no sensitive data is present.

- [ ] **Step 4: Complete review and merge gates.**

  Require the CI matrix green on Ubuntu and Windows for Node 22 and Node 24, one focused review of the generated-source/security boundary, the canonical SemVer guard green, the artifact `--check` green, the README/PR checklist complete, and #4–#8 closed. Merge the v1.2 PR into `main`. Do not create the tag before this merge.

- [ ] **Step 5: Create the annotated tag as a separate gate.**

  After merge, verify the merged `main` SHA and run:

  ```bash
  git tag -a v1.2.0 -m "Release v1.2.0"
  git push origin v1.2.0
  ```

  Expected: the annotated tag points to the merged release commit. Record tag SHA separately from PR merge SHA; a passing build is not evidence that a tag exists.

- [ ] **Step 6: Create the GitHub Release as the final separate gate.**

  Publish the GitHub Release only after the annotated tag is verified and attach the exact artifacts rebuilt from the tagged commit. Record the release URL and artifact checksums separately. No deployment or launcher capability activation is part of v1.2.0.

### Task 10: Final implementation validation and handoff

**Files:**
- Verify only the task-owned files listed above.
- Never modify `script1.txt`, historical specs/plans, launcher capability code, or `/api/queue/start` behavior.

**Interfaces:**
- Consumes: all task commits and their targeted test evidence.
- Produces: a bounded validation record with exact commands, exit status, changed-file list, and explicit separation of local commit, PR, merge, tag, release, and any future deployment state.

- [ ] **Step 1: Run the complete local validation set.**

  ```bash
  npm run build:browser -- --check
  npm run check:release -- --version 1.2.0
  npm test
  node --test test/browser/policy.test.js test/browser/payload-parser.test.js test/browser/spotmate-page-adapter.test.js test/browser/spotmate-api-adapter.test.js test/browser/conversion-session.test.js test/browser/playlist-view.test.js test/browser/download-adapter.test.js test/browser/entries.test.js test/browser/build-tool.test.js test/browser/artifact-parity.test.js
  node tests/test_all_scripts.cjs
  git diff --check
  git diff --exit-code -- script1.txt
  ```

  Expected: all commands pass on Node 22.x and Node 24.x; no secret, cookie, token, or final URL appears in output; `script1.txt` has no diff.

- [ ] **Step 2: Verify the repository boundary.**

  Run: `git status --short`, `git diff --name-only`, and `git log --oneline --decorate -3`.

  Expected after implementation: the dedicated implementation worktree is clean at its task boundary and only task-owned implementation/release files are changed; no historical safety/voluntary spec is edited. During this planning phase, the expected documentation set is the five version plans plus the pre-existing `docs/roadmap.md` link change; this plan must not claim that it is the only modified file.

- [ ] **Step 3: Record the handoff without overclaiming.**

  Report exact test commands and results, implementation commit SHAs, PR number only if GitHub has assigned one, merged SHA only after merge, tag SHA only after tag creation, and release URL only after release creation. State explicitly when no tag, release, deployment, physical Chrome/Edge QA, or USB QA exists. v1.4 real Chrome/Edge QA, v1.5 physical USB QA, and v1.5 signed loopback/SSRF work are future gates, not v1.2 evidence.

## Explicitly Deferred Product Boundaries

- v1.3 owns playlist selection, exact per-track states `queued`, `converting`, `polling`, `success`, `failed`, `cancelled`, explicit resume, manual retry only, and accessibility QA. v1.2 exposes only the core sequential operation needed by the existing voluntary workflow.
- v1.4 owns the isolated Chrome/Edge MV3 content script, minimal permissions, reproducible ZIP, and real Chrome/Edge QA. No service worker, `storage.session`, localhost, or extension bridge is added in v1.2.
- v1.5 owns pairing, HMAC-SHA-256 signed loopback messages, one-use request nonces, exact extension CORS, `127.0.0.1:<port fixe>`, SSRF/DNS/public-IP checks on every connection and redirect, volatile `finalAudioUrl`, and local USB `.part`/atomic-rename/no-overwrite behavior. It still keeps the launcher conversion capability false and `/api/queue/start` at 503.
- v1.6 owns installers, signed/verifiable packages, checksums, user guides, and release automation beyond the v1.2 tag/release gate.
- Native Messaging, hidden iframes, browser automation, token relays, hidden downloads, arbitrary headers/paths/destinations, and any launcher conversion activation are outside every task in this plan.

## Plan Completion Gate

  Before declaring this plan complete, the author must read the productization spec again against the finished plan, scan for placeholder markers and unresolved alternatives, verify that every architecture file and invariant has a task or an explicit deferred boundary, run `git diff --check`, and confirm that future implementation starts in a clean dedicated worktree based on up-to-date `main`. The current planning phase may contain the five plans and the existing roadmap link change.
