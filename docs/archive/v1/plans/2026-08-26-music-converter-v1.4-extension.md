> **Status: Historical v1.x — inactive and unsupported.**

# Music Converter v1.4.0 Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Music Converter Chrome/Edge Manifest V3 extension in v1.4.0, using the v1.3 browser core as the single source, an isolated content script limited to SpotMate /en1, reproducible ZIP packaging, and real QA in both browsers.

**Architecture:** The existing v1.3 core in `src/browser/index.js` remains the sole implementation of DOM detection, session, state, and voluntary actions. `src/browser/entries/extension.js` is a thin adapter that mounts this UI in the isolated content script; `tools/build-extension.mjs` reuses the deterministic assembly from `tools/build-browser-artifacts.mjs` to produce the artifact without manually copying business logic. The manifest sources are exactly `extension/chrome/manifest.json` and `extension/edge/manifest.json`; they have no service worker, extension page, local bridge, or storage, and target `https://spotmate.online/en1*`; the launcher remains fail-closed.

**Tech Stack:** Node.js ESM and native modules (node:fs, node:path, node:zlib, node:crypto), vanilla browser JavaScript, Chrome/Edge Manifest V3, node:test, deterministic ZIP with no new npm dependencies, and the existing GitHub Actions.

## Global Constraints

- This plan assumes v1.3.0 has shipped: `src/browser/index.js`, `src/browser/entries/userscript.js`, `tools/build-browser-artifacts.mjs`, and `dist/spotmate.user.js` exist and expose the v1.3 browser contract.
- `src/browser/index.js` remains the SSOT; no conversion, polling, selection, cancellation, resume, or download logic is copied into the MV3 adapter.
- The core allows exactly https://spotmate.online/en1 or https://spotmate.online/en1/; the MV3 pattern is exactly https://spotmate.online/en1*, and the core rejects paths that differ from /en1 and /en1/.
- The limit remains 100 tracks, with 2 seconds between track starts, polling after 4.5 seconds up to 40 times, one POST /convert per track, and HTTPS final URLs only.
- HTTP, network, schema, and terminal errors are never retried automatically; any retry remains a manual action exposed by the v1.3 core.
- Turnstile remains manual; loading the content script or DOM, refreshing, a programmatic event, or installing the extension starts neither conversion nor download.
- Buttons and actions remain voluntary and match the userscript surface; privileged actions require event.isTrusted === true.
- No token, cookie, sensitive header, pairing nonce, key, final audio URL, or equivalent value may appear in logs, the UI, persistence, fixtures, QA reports, or archives.
- `extension/chrome/manifest.json` and `extension/edge/manifest.json` declare no functional permissions, `host_permissions`, localhost, storage, service_worker, bridge API, or access to downloads, cookies, tabs, scripting, or webRequest.
- The manifest uses only local assets and a strict extension CSP; no remote script, style, image, or resource request is introduced.
- The Chrome and Edge ZIPs are produced from the same inputs, with deterministic file order, UTF-8 encoding, timestamps, compression, and ZIP metadata.
- The canonical SemVer guard `test/guardrails/release-metadata.test.js`, with `tools/check-release-metadata.mjs`, synchronizes `package.json`, `CHANGELOG.md`, the `README.md` version badge, `dist/spotmate.user.js` metadata, and both manifests to 1.4.0 before the release gate.
- Prepare the v1.4 PR in a dedicated clean worktree based on an up-to-date `main`; it carries the `1.4.0` bump, closes #13–#16, and creates neither an annotated tag nor a GitHub Release before merge and gates.
- This documentation PR (specification, roadmap, plans, and upcoming governance/badge documentation) remains at `1.1.0`; it is not the v1.4 release PR.
- CONVERSION_CAPABILITY.enabled remains false and POST /api/queue/start remains HTTP 503 with launcher-local-conversion-disabled; no launcher files are modified in this phase.
- v1.4 tickets: [#13](https://github.com/ironlegends/music-converter/issues/13) SpotMate content script, [#14](https://github.com/ironlegends/music-converter/issues/14) manifests/permissions, [#15](https://github.com/ironlegends/music-converter/issues/15) reproducible ZIP, [#16](https://github.com/ironlegends/music-converter/issues/16) Chrome/Edge QA. The v1.4 PR closes #13–#16.
- No tag, GitHub Release, archive publication, or push is performed during local implementation, before real QA and merge to main.

## File and responsibility map

| File | Responsibility | Task |
| --- | --- | --- |
| src/browser/index.js | v1.3 SSOT consumed without duplication; no functional changes planned | 2–4 |
| src/browser/entries/userscript.js | v1.3 userscript adapter used as the parity reference surface | 4 |
| dist/spotmate.user.js | Generated userscript artifact; @version 1.4.0 metadata | 5 |
| src/browser/entries/extension.js | Isolated MV3 adapter, mounted only after the page guard | 2 |
| extension/chrome/manifest.json | Chrome MV3 contract, required exact match, minimal permissions, CSP | 1, 5 |
| extension/edge/manifest.json | Edge MV3 contract, required exact match, minimal permissions, CSP | 1, 5 |
| extension/assets/playlist-panel.css | Deterministic shared local asset from src/browser/panel.css | 1, 2 |
| extension/content-script.js | Generated core + adapter artifact; no manual edits | 3 |
| tools/build-browser-artifacts.mjs | v1.3 SSOT assembly reused by the extension build | 3 |
| tools/build-extension.mjs | Deterministic assembly, generation of both ZIPs and SHA-256 hashes | 3 |
| tools/verify-extension.mjs | Verification of archive, contents, manifest, hash, and reproducibility | 3 |
| test/extension/manifest.test.js | RED/GREEN tests for the manifest, CSP, assets, and no bridge | 1 |
| test/extension/content-script.test.js | Tests for page guard, mounting, no auto-start, and trusted events | 2 |
| test/extension/parity.test.js | Comparison of core/userscript/extension across the v1.3 contracts | 4 |
| test/extension/build.test.js | Tests for build, ZIP, allowed files, and checksums | 3 |
| test/guardrails/release-metadata.test.js | Multi-surface SemVer guard including the manifest from v1.4 | 5 |
| tools/check-release-metadata.mjs | Reused SemVer guard extended to the manifest | 5 |
| test/extension/qa-checklist.test.js | Static validation of the QA checklist and its lack of sensitive data | 6 |
| qa/v1.4-extension-checklist.md | Checklist and nonsensitive evidence for Chrome and Edge QA | 6 |
| package.json | SemVer 1.4.0 source and build/verify commands | 5 |
| CHANGELOG.md | Dated v1.4.0 entry limited to extension scope | 5 |
| README.md | v1.4.0 badge and extension installation/limitations guide | 5 |
| .github/workflows/ci.yml | Runs the full test suite and deterministic build/verify | 5 |

## v1.3 contract consumed by the adapter

The v1.4 worker does not change the core signature shipped in v1.3. To
make the boundary verifiable, the adapter consumes exactly the following global object,
assembled from `src/browser/index.js` and also used by
`src/browser/entries/userscript.js` :

~~~js
globalThis.MusicConverterCore = Object.freeze({
  isAllowedSpotmatePage(locationLike),
  createSpotmatePageAdapter({ windowRef, documentRef, exposeLegacyGlobals }),
  createSpotmateApiAdapter({ fetchImpl, location, readCsrfToken }),
  createConversionSession({ pageAdapter, apiAdapter, exposeLegacyGlobals }),
  createConversionRunner({ session, convertTrack, sleep, onChange, onSuccess }),
  mountPlaylistPanel({ host, session, runner, documentRef, announce }),
  createDownloadAdapter({ documentRef, windowRef, exposeLegacyGlobals }),
});
~~~

createConversionSession and createConversionRunner preserve the queued,
converting, polling, success, failed, and cancelled states. mountPlaylistPanel installs
the panel and its visible handlers; actions can run only after
the corresponding user event and validation of event.isTrusted.
Persisted projections contain no token, cookie, or final audio URL.

The MV3 adapter exposes a local bootstrapExtensionContent function:

~~~js
bootstrapExtensionContent({ windowRef, documentRef, core })
  -> { status: 'mounted', session, runner, panel }
  -> { status: 'ignored', reason: 'unsupported-page' }
~~~

On an allowed page, it creates the adapters and v1.3 session, then
calls mountPlaylistPanel only. It cannot call
startSelected(), resumeQueued(), or retryFailedTracks() on load, reads no
cookie or header, does not contact localhost, and creates no service worker
listener.

---

### Task 1: Lock down the Manifest V3 contract and local assets

**Files:**
- Create: test/extension/manifest.test.js
- Create: extension/chrome/manifest.json
- Create: extension/edge/manifest.json
- Create: extension/assets/playlist-panel.css

**Interfaces:**
- Both manifests expose manifest_version: 3, version: "1.4.0",
  content_scripts[0].matches: ["https://spotmate.online/en1*"],
  content_scripts[0].world: "ISOLATED", permissions: [] et host_permissions: [].
- The exact CSP is script-src 'self'; object-src 'self';.
- The only extension asset is assets/playlist-panel.css, declared locally in
  content_scripts[0].css; no remote or inline asset is allowed.

- [ ] **Step 1: Write the manifest and CSP RED test**

Create test/extension/manifest.test.js with these executable assertions:

~~~js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifestPaths = [
  new URL('../../extension/chrome/manifest.json', import.meta.url),
  new URL('../../extension/edge/manifest.json', import.meta.url),
];
const assetPath = new URL('../../extension/assets/playlist-panel.css', import.meta.url);

test('MV3 manifests have exact matches and no permissions', () => {
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.version, '1.4.0');
    assert.deepEqual(manifest.permissions, []);
    assert.deepEqual(manifest.host_permissions, []);
    assert.deepEqual(manifest.content_scripts[0].matches, ['https://spotmate.online/en1*']);
    assert.equal(manifest.content_scripts[0].world, 'ISOLATED');
    assert.deepEqual(manifest.content_scripts[0].css, ['assets/playlist-panel.css']);
    assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self';");
    assert.equal('background' in manifest, false);
    assert.equal('service_worker' in manifest, false);
    assert.equal('action' in manifest, false);
  }
});

test('no local access, bridge permission, or remote URL', () => {
  const source = manifestPaths.map((manifestPath) => fs.readFileSync(manifestPath, 'utf8')).join('\n');
  for (const forbidden of ['localhost', '127.0.0.1', 'storage', 'downloads', 'cookies', 'webRequest', 'scripting']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.equal(source.includes('http://'), false);
  assert.equal(fs.existsSync(assetPath), true);
});

test('the stylesheet remains local', () => {
  const css = fs.readFileSync(assetPath, 'utf8');
  assert.equal(css.includes('@import'), false);
  assert.equal(css.includes('http://'), false);
  assert.equal(css.includes('https://'), false);
  assert.match(css, /#spotmate-voluntary-panel/);
});
~~~

Run: node --test test/extension/manifest.test.js

Expected: RED with a manifest or asset read failure because these
files do not exist yet.

- [ ] **Step 2: Implement the minimal manifest and local stylesheet**

Create `extension/chrome/manifest.json` and `extension/edge/manifest.json` with exactly this structure:

~~~json
{
  "manifest_version": 3,
  "name": "Music Converter",
  "version": "1.4.0",
  "description": "Run voluntary SpotMate actions on the authorized page.",
  "permissions": [],
  "host_permissions": [],
  "content_scripts": [
    {
      "matches": ["https://spotmate.online/en1*"],
      "js": ["content-script.js"],
      "css": ["assets/playlist-panel.css"],
      "run_at": "document_idle",
      "world": "ISOLATED"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
~~~

Create extension/assets/playlist-panel.css by having the build copy the normalized contents
of src/browser/panel.css. The builder rejects any stylesheet
that differs from this source, and the test checks the public selector
#spotmate-voluntary-panel. The stylesheet contains only local CSS rules
and references no URL.

Expected: Paths, CSP, the empty permissions list, and the absence of
background satisfy the static contract exactly without adding a
site or machine permissions.

- [ ] **Step 3: Rerun the GREEN test**

Run: node --test test/extension/manifest.test.js

Expected: PASS for all three tests; any difference in path, CSP, or
permissions or assets is blocking.

- [ ] **Step 4: REFACTOR — make the test strict about MV3 keys**

In test/extension/manifest.test.js, add a comparison of
the allowed functional keys:

~~~js
assert.deepEqual(
  Object.keys(manifest).sort(),
  ['content_scripts', 'content_security_policy', 'description', 'host_permissions', 'manifest_version', 'name', 'permissions', 'version']
);
~~~

Run: node --test test/extension/manifest.test.js

Expected: PASS; any future permission, extension page, action, or bridge
must first receive a scope and security decision outside v1.4.

- [ ] **Step 5: Atomic commit**

~~~bash
git add extension/chrome/manifest.json extension/edge/manifest.json extension/assets/playlist-panel.css test/extension/manifest.test.js
git commit -m "test: lock down mv3 manifest contract"
~~~

Result expected: The packaging contract goes red then green and proves that the
The first MV3 increment has no bridge, service worker, or permission
extra permission.

### Task 2: Add the isolated content script adapter without auto-start

**Files:**
- Create: src/browser/entries/extension.js
- Create: test/extension/content-script.test.js

**Interfaces:**
- bootstrapExtensionContent({ windowRef, documentRef, core }) checks
  core.isAllowedSpotmatePage(windowRef.location) before creating a session.
- On an allowed page, it calls the v1.3 factories once
  createSpotmatePageAdapter, createSpotmateApiAdapter et
  createConversionSession, then creates the runner and calls
  mountPlaylistPanel; it never calls startSelected() or resumeQueued().
- pageAdapter.readCsrfToken is the request-local callback provided by the core;
  the adapter never reads the token itself.
- On a disallowed page, it returns { status: 'ignored', reason:
  'unsupported-page' } without touching the DOM or calling fetch.

- [ ] **Step 1: Write the bootstrap and user intent RED test**

Create test/extension/content-script.test.js with an observable mock core and
synthetic events:

~~~js
import assert from 'node:assert/strict';
import test from 'node:test';
import { bootstrapExtensionContent } from '../../src/browser/entries/extension.js';

function createCoreSpy() {
  const calls = [];
  const session = {
    run() { calls.push('run'); },
    cancel() { calls.push('cancel'); },
  };
  return {
    calls,
    isAllowedSpotmatePage(locationLike) {
      calls.push(['guard', locationLike.href]);
      return locationLike.href === 'https://spotmate.online/en1';
    },
    createSpotmatePageAdapter(options) {
      calls.push(['createSpotmatePageAdapter', Object.keys(options).sort()]);
      return {
        collectTrackInputs() { return []; },
        readCsrfToken() { return undefined; },
      };
    },
    createSpotmateApiAdapter(options) {
      calls.push(['createSpotmateApiAdapter', Object.keys(options).sort()]);
      return { convertTrack: async () => ({ errorCode: 'test' }) };
    },
    createConversionSession(options) {
      calls.push(['createConversionSession', Object.keys(options).sort()]);
      return session;
    },
    createConversionRunner() { calls.push('createConversionRunner'); return {}; },
    mountPlaylistPanel() { calls.push('mountPlaylistPanel'); },
  };
}

test('passive mount on the allowed page', () => {
  const core = createCoreSpy();
  const result = bootstrapExtensionContent({
    windowRef: {
      location: { href: 'https://spotmate.online/en1' },
      fetch: () => { throw new Error('fetch is forbidden during bootstrap'); },
      setTimeout,
      clearTimeout,
    },
    documentRef: { body: {} },
    core,
  });
  assert.equal(result.status, 'mounted');
  assert.deepEqual(core.calls.map((call) => Array.isArray(call) ? call[0] : call),
    ['guard', 'createSpotmatePageAdapter', 'createSpotmateApiAdapter',
      'createConversionSession', 'createConversionRunner', 'mountPlaylistPanel']);
  assert.equal(core.calls.includes('run'), false);
});

test('foreign page ignored without DOM, fetch, or session', () => {
  const core = createCoreSpy();
  const documentRef = { body: { childNodes: [] } };
  const result = bootstrapExtensionContent({
    windowRef: { location: { href: 'https://spotmate.online/other' }, fetch() {
      throw new Error('fetch is forbidden');
    } },
    documentRef,
    core,
  });
  assert.deepEqual(result, { status: 'ignored', reason: 'unsupported-page' });
  assert.deepEqual(core.calls.map((call) => Array.isArray(call) ? call[0] : call), ['guard']);
  assert.deepEqual(documentRef.body.childNodes, []);
});
~~~

Run: node --test test/extension/content-script.test.js

Expected: RED with a missing module and undefined functions.

- [ ] **Step 2: Implement the thin adapter**

Create src/browser/entries/extension.js as ESM without its own SpotMate logic:

~~~js
export function bootstrapExtensionContent({ windowRef, documentRef, core }) {
  if (!core.isAllowedSpotmatePage(windowRef.location)) {
    return { status: 'ignored', reason: 'unsupported-page' };
  }

  const pageAdapter = core.createSpotmatePageAdapter({
    windowRef, documentRef, exposeLegacyGlobals: false,
  });
  const apiAdapter = core.createSpotmateApiAdapter({
    fetchImpl: windowRef.fetch.bind(windowRef),
    location: windowRef.location,
    readCsrfToken: pageAdapter.readCsrfToken,
  });
  const session = core.createConversionSession({
    pageAdapter, apiAdapter, exposeLegacyGlobals: false,
  });
  const runner = core.createConversionRunner({
    session,
    convertTrack: (track, signal) => apiAdapter.convertTrack(track, signal),
    sleep: (ms) => new Promise((resolve) => windowRef.setTimeout(resolve, ms)),
    onChange: () => {},
    onSuccess: () => {},
  });
  const panel = core.mountPlaylistPanel({
    host: documentRef.body,
    session,
    runner,
    documentRef,
    announce: () => {},
  });
  return { status: 'mounted', session, runner, panel };
}
~~~

The onState callback logs nothing and does not reformat results; the
visible surface remains the one mounted by the core. The adapter has no
network call other than fetchImpl passed to the core, no access to cookies,
no storage, and no extension API.

Expected: The content script can only mount the core UI after the page guard;
loading it does not start any track.

- [ ] **Step 3: Run the targeted GREEN test**

Run: node --test test/extension/content-script.test.js

Expected: PASS; no test should run fetch or require Turnstile.

- [ ] **Step 4: REFACTOR — test programmatic and untrusted actions**

Add a test that passes the core a handler receiving, in sequence,
{ isTrusted: false } and then { isTrusted: true }. The mock core must record
only the trusted event in its public trace, and the test must verify
that no conversion call is made for the programmatic event.

Run: node --test test/extension/content-script.test.js

Expected: PASS; event.isTrusted validation remains in the SSOT core and
the adapter provides no shortcut.

- [ ] **Step 5: Atomic commit**

~~~bash
git add src/browser/entries/extension.js test/extension/content-script.test.js
git commit -m "feat: add isolated mv3 content adapter"
~~~

Result expected: The extension has an isolated, passive boundary on
load, reusing the v1.3 core without implicit startup.

### Task 3: Build and verify the Chrome/Edge ZIPs deterministically

**Files:**
- Modify: tools/build-browser-artifacts.mjs
- Create: tools/build-extension.mjs
- Create: tools/verify-extension.mjs
- Create: test/extension/build.test.js
- Generate: extension/content-script.js
- Generate: dist/chrome/music-converter-v1.4.0.zip
- Generate: dist/chrome/music-converter-v1.4.0.zip.sha256
- Generate: dist/edge/music-converter-v1.4.0.zip
- Generate: dist/edge/music-converter-v1.4.0.zip.sha256

**Interfaces:**
- node tools/build-extension.mjs --browser chrome --out-dir dist and the same
  command with --browser edge write the four artifacts to dist/.
- node tools/verify-extension.mjs --browser chrome --out-dir dist verifies the
  ZIP, its SHA-256, allowed paths, manifest, and rebuild;
  --browser edge performs the same verification.
- The bundle contains only content-script.js, manifest.json, and
  assets/playlist-panel.css; content-script.js is generated by the assembly
  SSOT in tools/build-browser-artifacts.mjs with src/browser/entries/extension.js,
  never by manually copying logic.

- [ ] **Step 1: Write the reproducibility and archive RED tests**

Create test/extension/build.test.js to run the commands in a temporary
directory and verify:

~~~js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const build = path.join(root, 'tools', 'build-extension.mjs');
const verify = path.join(root, 'tools', 'verify-extension.mjs');

test('builds byte-identical, verifiable Chrome and Edge archives', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-converter-v14-'));
  execFileSync(process.execPath, [build, '--browser', 'chrome', '--out-dir', outDir], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [build, '--browser', 'edge', '--out-dir', outDir], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [verify, '--browser', 'chrome', '--out-dir', outDir], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, [verify, '--browser', 'edge', '--out-dir', outDir], { cwd: root, stdio: 'pipe' });
  const chromeZip = fs.readFileSync(path.join(outDir, 'chrome', 'music-converter-v1.4.0.zip'));
  const edgeZip = fs.readFileSync(path.join(outDir, 'edge', 'music-converter-v1.4.0.zip'));
  assert.deepEqual(chromeZip, edgeZip);
});

test('the build rejects remote or nondeterministic inputs', () => {
  const source = fs.readFileSync(build, 'utf8');
  for (const forbidden of ['http://', 'https://', 'localhost', '127.0.0.1', 'Date.now()', 'new Date(']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
~~~

Run: node --test test/extension/build.test.js

Expected: RED because the build tools are missing.

- [ ] **Step 2: Implement the controlled assembly and canonical ZIP**

In tools/build-extension.mjs, require the three entries and canonical order:

~~~js
const archiveEntries = [
  ['assets/playlist-panel.css', 'extension/assets/playlist-panel.css'],
  ['content-script.js', 'generated content from core and extension adapter'],
  ['manifest.json', `extension/${browser}/manifest.json`],
];
~~~

Ask tools/build-browser-artifacts.mjs for the deterministic v1.3 assembly,
add src/browser/entries/extension.js as an adapter in a strict IIFE,
then resolve the core index exports before calling
bootstrapExtensionContent. The generator rejects any input outside the three
declared paths. It normalizes line endings to LF and writes UTF-8.

The native ZIP writer uses / paths, a fixed DOS date
1980-01-01 00:00:00, no extra fields, fixed attributes, CRC-32,
zlib.deflateRawSync at level 9, and a lowercase hexadecimal SHA-256 followed by a
newline. No system timestamp, temporary directory, absolute path, or
machine identifier may be included in the archive.

Generate dist/chrome and dist/edge separately from the same bytes; the
--browser parameter does not change contents in v1.4 because there is no
browser-specific extension origin or bridge yet.

Expected: Two valid, identical ZIPs contain only the three
expected entries; content-script.js is derived from the core and adapter.

- [ ] **Step 3: Implement independent verification**

In tools/verify-extension.mjs, read the archive without external dependencies and
verify:

1. The exact three entries and no others;
2. The manifest JSON and its empty permissions list;
3. The exact https://spotmate.online/en1* match and isolated world;
4. No background, service_worker, localhost, storage, downloads,
   cookies, webRequest et URL distantes;
5. The published SHA-256;
6. A second rebuild in a temporary directory and byte-for-byte equality
   of the ZIP and SHA-256.

Expected: A modified archive, one with an extra file, or one rebuilt at a different
time or changed to include a forbidden permission fails with a nonzero exit code
and a message containing no page data.

- [ ] **Step 4: Run the GREEN test and verify the archives**

Run:

~~~bash
node --test test/extension/build.test.js
node tools/build-extension.mjs --browser chrome --out-dir dist
node tools/build-extension.mjs --browser edge --out-dir dist
node tools/verify-extension.mjs --browser chrome --out-dir dist
node tools/verify-extension.mjs --browser edge --out-dir dist
~~~

Expected: PASS; the Chrome and Edge SHA-256 hashes match, the four files
are reproducible, and no secret or SpotMate content is printed.

- [ ] **Step 5: REFACTOR — lock down the allowlist and prevent leaks**

Add a rebuild in two separate directories to the test, then compare
the file lists and ZIP buffers. Also add a static scan of
extension/content-script.js that rejects the strings document.cookie,
Authorization, Set-Cookie, localhost, 127.0.0.1, chrome.storage, and
chrome.runtime.sendMessage.

Run: node --test test/extension/build.test.js

Expected: PASS; the build remains hermetic and its output is independent of the
machine and time.

- [ ] **Step 6: Atomic commit**

~~~bash
git add tools/build-extension.mjs tools/verify-extension.mjs test/extension/build.test.js extension/content-script.js dist
git commit -m "build: add deterministic mv3 archives"
~~~

Result expected: The Chrome and Edge ZIPs are verifiable, identical in v1.4, and
ready for QA without serving as proof of publication.

### Task 4: Prove core/userscript/extension parity and permanent invariants

**Files:**
- Create: test/extension/parity.test.js
- Modify: test/guardrails/secret-guard.test.js
- Modify: tests/test_all_scripts.cjs

**Interfaces:**
- test/extension/parity.test.js reuses the DOM fixtures and v1.3
  session contract, comparing a normalized publicTrace and never sensitive values.
- The three compared surfaces are src/browser/index.js through
  src/browser/entries/userscript.js, dist/spotmate.user.js et
  extension/content-script.js.
- The historical guards continue to check all four console scripts;
  the extension is added to the surface list without replacing those tests.

- [ ] **Step 1: Write the parity and contract RED tests**

Create test/extension/parity.test.js with a shared harness that provides a DOM
fixture, controlled timers, and a fetchImpl that returns responses
built synthetically at runtime. For each surface, verify:

~~~js
assert.deepEqual(publicTrace(surface), publicTrace(referenceSurface));
assert.equal(countRequests(trace, '/convert'), trackCount);
assert.equal(maxTrackCount(trace), 100);
assert.equal(delayBetweenStarts(trace), 2000);
assert.equal(pollingInterval(trace), 4500);
assert.equal(maxPollCount(trace), 40);
assert.equal(terminalErrorsHaveNoAutomaticRetry(trace), true);
assert.equal(finalUrlsAreHttpsOnly(trace), true);
assert.equal(trace.some((event) => event.type === 'auto-start'), false);
~~~

The test injects an untrusted event followed by a trusted click and verifies that only
the second triggers the action, cancellation prevents the next track, and no
token, cookie, finalAudioUrl, Authorization, or
Set-Cookie appears in public traces. Fixture values are assembled at runtime and do not
come from an account or a real response.

Run: node --test test/extension/parity.test.js

Expected: RED while the extension artifact and parity harness do not exist.

- [ ] **Step 2: Implement the surface harness without alternative logic**

The harness loads each artifact in an isolated vm with the same documentRef,
locationRef, fetchImpl, and deterministic clock. It compares only these events
from the public interface: { type, trackIndex, state, delayMs, requestPath }. It replaces
audio values, tokens, and cookies with private sentinels that are never
added to the trace or failure message.

The userscript and extension surfaces must produce the same flow
for an allowed page followed by a trusted click, rejected foreign page, limit of 100
tracks, direct HTTPS success, polling every 4.5 seconds up to 40 times, HTTP or network error
terminal without retry, cancellation before the next track, and programmatic click
rejected by event.isTrusted.

Expected: The test detects any difference in transition, limit, delay, request,
or user intent between the surfaces.

- [ ] **Step 3: Run the targeted GREEN**

Run:

~~~bash
node --test test/extension/parity.test.js
node --test test/guardrails/secret-guard.test.js
node tests/test_all_scripts.cjs
~~~

Expected: PASS; all four console scripts remain covered, and the extension follows
the same public contract without exposing sensitive data.

- [ ] **Step 4: REFACTOR — fail on any duplicated core implementation**

Add an assertion that counts the canonical core source in the generated bundle
and verifies that the adapter contains no second implementation of
the symbols isAllowedSpotmatePage, createConversionSession, startSelected, cancel
or resumeQueued. Also compare
the hash of the embedded core portion with the hash of
src/browser/index.js after LF normalization.

Run: node --test test/extension/parity.test.js

Expected: PASS with only one copy of the core; any direct edit to logic
in extension/content-script.js or src/browser/entries/extension.js is blocking.

- [ ] **Step 5: Atomic commit**

~~~bash
git add test/extension/parity.test.js test/guardrails/secret-guard.test.js tests/test_all_scripts.cjs
git commit -m "test: enforce browser surface parity"
~~~

Result expected: Behavioral parity is falsifiable and covers the
permanent invariants, manual consent, and absence of leakage.

### Task 5: Synchronize SemVer, documentation, and CI before the gate

**Files:**
- Modify: package.json
- Modify: CHANGELOG.md
- Modify: README.md
- Modify: dist/spotmate.user.js
- Modify: extension/chrome/manifest.json
- Modify: extension/edge/manifest.json
- Modify: tools/check-release-metadata.mjs
- Modify: test/guardrails/release-metadata.test.js
- Modify: .github/workflows/ci.yml

**Interfaces:**
- package.json remains the single SemVer source and is bumped to "1.4.0"; the added scripts
  are build:extension and verify:extension.
- The canonical release test reads all six surfaces and requires the same "1.4.0" string.
- CI runs npm test, rebuilds Chrome and Edge in a clean directory, then
  runs both independent verifications.

- [ ] **Step 1: Write the v1.4 synchronization RED test**

Extend test/guardrails/release-metadata.test.js with a test that reads
package.json, extracts the version badge from README.md and the first @version
from dist/spotmate.user.js and both manifest.version fields, then verifies:

~~~js
assert.equal(pkg.version, '1.4.0');
assert.equal(readmeVersion, pkg.version);
assert.equal(userscriptVersion, pkg.version);
assert.equal(manifest.version, pkg.version);
assert.match(changelog, /^## \[1\.4\.0\] - 2026-08-26/m);
~~~

Keep the existing CONVERSION_CAPABILITY.enabled=false and
/api/queue/start=503 assertions so the surface bump cannot
reactivate the launcher.

Run: node --test test/guardrails/release-metadata.test.js

Expected: RED on the starting v1.3 version or any surface that is not yet aligned.

- [ ] **Step 2: Update the five version surfaces**

Set package.json to version "1.4.0" and add the commands
build:extension and verify:extension, calling these scripts respectively:
tools/build-extension.mjs and tools/verify-extension.mjs with browser chrome and
out-dir dist; add a dated 2026-08-26 entry to CHANGELOG.md describing
only the isolated MV3 content script, shared core, deterministic build,
and Chrome/Edge QA, then update the visible README.md badge to 1.4.0.

The README must add the local installation steps: extract the
verified archive, enable developer mode, load the extracted folder in
chrome://extensions or edge://extensions, then verify the extension is
active only on https://spotmate.online/en1. It must mention manual Turnstile,
click-based actions, no service worker/localhost, and launcher false/503; it
must contain no audio URL, token, or cookie.

Regenerate dist/spotmate.user.js with the v1.3/v1.4 generator so
its metadata block has @version 1.4.0; do not edit the bundle by hand.
No changes to script1.txt are allowed.

Expected: The metadata and usage guide describe v1.4.0 exactly,
without promising a bridge, local access, or hidden downloads.

- [ ] **Step 3: Run the GREEN and the full suite**

Run:

~~~bash
node --test test/guardrails/release-metadata.test.js
npm test
npm run build:extension
npm run verify:extension
~~~

Expected: PASS; npm test includes manifest, content script, parity, build,
secret guard, and launcher tests; build checksums are verified.

- [ ] **Step 4: REFACTOR — add the gate to CI**

Update .github/workflows/ci.yml after the Test step to add:

~~~yaml
      - name: Build Chrome extension
        run: npm run build:extension
      - name: Verify Chrome extension
        run: npm run verify:extension
      - name: Build Edge extension
        run: node tools/build-extension.mjs --browser edge --out-dir dist
      - name: Verify Edge extension
        run: node tools/verify-extension.mjs --browser edge --out-dir dist
~~~

Keep Node 22 and 24, Ubuntu and Windows, contents: read permissions, the
pinned actions, and existing timeout. Add a comparison of the
Chrome and Edge outputs on each matrix to the build test.

Run: npm test

Expected: PASS locally; CI will rebuild and verify both archives on
each environment without publishing an artifact or creating a tag.

- [ ] **Step 5: Atomic commit**

~~~bash
git add package.json CHANGELOG.md README.md dist/spotmate.user.js extension/chrome/manifest.json extension/edge/manifest.json tools/check-release-metadata.mjs test/guardrails/release-metadata.test.js .github/workflows/ci.yml
git commit -m "chore: synchronize v1.4 release metadata"
~~~

Result expected: Version 1.4.0 is synchronized before any release review,
and CI has the static/reproducibility gate.

### Task 6: Run real Chrome/Edge QA and prepare the release gate

**Files:**
- Create: qa/v1.4-extension-checklist.md
- Create: test/extension/qa-checklist.test.js

**Interfaces:**
- The checklist records only browser versions, PASS/FAIL result,
  track count, observed timings, archive SHA-256 hashes, tested commit, and
  timestamp; it stores no entered URL, title, account, or cookie,
  token, final audio URL, or unredacted capture.
- QA uses the built and verified ZIPs, then the corresponding
  extracted folder; it runs separately in stable Chrome and stable Edge.
- Failure of real QA, a checksum, a permission, a
  voluntary behavior, or a sensitive-data check blocks further work; no simulation
  can turn a failure into PASS.

- [ ] **Step 1: Write the non-sensitive checklist RED test**

Create test/extension/qa-checklist.test.js to verify that the QA document
contains the sections Preparation, Chrome, Edge, Voluntary contract, Permissions,
Retained evidence, and Release gate, along with the phrases manual Turnstile,
event.isTrusted, no auto-start, no localhost, and no sensitive data. The
test rejects the secret and real audio URL patterns already used by the
secret guard.

Run: node --test test/extension/qa-checklist.test.js

Expected: RED because the checklist does not exist yet.

- [ ] **Step 2: Write the operational checklist for real QA**

Create qa/v1.4-extension-checklist.md with these checks:

~~~markdown
# Real Music Converter v1.4.0 QA — Chrome and Edge

## Preparation

- Check the SHA-256 hashes printed by the build and verify commands.
- Extract the Chrome and Edge ZIPs separately into temporary directories.
- Do not retain profile files, network exports, or entered URLs.

## Chrome

- Open chrome://extensions, enable developer mode, and load the Chrome folder.
- Verify the manifest declares MV3, no functional permissions, and no service worker.
- Manually open https://spotmate.online/en1.
- Verify the panel appears once and no conversion starts on load.
- Manually enter an allowed test input, complete Turnstile manually, and record only PASS/FAIL.
- Verify that a programmatic event triggers nothing and a trusted user click is required (event.isTrusted).
- Verify states, the 100-track limit, 2 seconds between starts, polling every 4.5 seconds up to 40 times, one POST per track, terminal errors without automatic retry, and HTTPS URLs only.
- Verify cancellation before the next track and no download without a voluntary click.
- Verify that no localhost request is made.

## Edge

- Repeat the checklist exactly at edge://extensions with the Edge ZIP.
- Record the Edge result and archive SHA-256 separately, without page data.

## Voluntary contract

- Turnstile is manual only.
- Privileged actions only after a visible click with event.isTrusted true.
- No auto-start after installation, navigation, refresh, DOM appearance, or a synthetic event.
- No localhost permission, bridge service worker, storage, or transmitted token/cookie.
- CONVERSION_CAPABILITY.enabled=false and /api/queue/start remains 503.

## Permissions

- The manifest sets permissions: [] and host_permissions: [].
- The only match is https://spotmate.online/en1*, and the core rejects paths other than /en1 and /en1/.
- Scripts and styles are local, and the CSP remains script-src 'self'; object-src 'self';.

## Retained evidence

- PASS/FAIL per check, browser version, tested commit, timestamp, and SHA-256.
- Track count and aggregate timings only.
- No account, title, entered URL, cookie, token, header, audio URL, or unredacted capture.

## Release gate

- Local tests pass.
- CI passes on the PR.
- Manifest and security scope review approved.
- Chrome and Edge QA PASS.
- Merge to main.
- Rerun CI on the main SHA.
- Only then, create the annotated v1.4.0 tag, followed by a separate GitHub Release with the already verified ZIPs and checksums.
~~~

Expected: The checklist supports repeatable real execution and does not invite
the retention of sensitive data.

- [ ] **Step 3: Run the static GREEN**

Run:

~~~bash
node --test test/extension/qa-checklist.test.js
git diff --check
~~~

Expected: PASS; the checklist has all required sections and the diff contains no
no whitespace or end-of-line errors.

- [ ] **Step 4: Perform real QA without changing the product**

For each browser, run the checklist on the matching ZIP. Record
only nonsensitive results and SHA-256 hashes from the commands
in the document. Inspect DevTools only for methods,
paths, and aggregates; do not copy request bodies, cookies, headers,
task identifiers, or final URLs.

Expected: Two independent PASS results, Chrome and Edge, with nonsensitive
evidence. A real failure leaves the release unpublished and triggers
the appropriate product/security escalation; no silent adjustment is
allowed.

- [ ] **Step 5: Atomic commit for the QA evidence**

~~~bash
git add qa/v1.4-extension-checklist.md test/extension/qa-checklist.test.js
git commit -m "docs: record chrome edge v1.4 qa gate"
~~~

Result expected: Real QA evidence is attached to the code and remains nonsensitive;
it does not yet mean a tag or GitHub Release exists.

### Task 7: Final v1.4.0 gate after QA and merge

**Files:**
- Read-only validation: all files from Tasks 1–6
- No code or documentation changes in this task unless a preceding gate fails

**Interfaces:**
- Release is allowed only if the tests, both ZIPs, review,
  Chrome QA, Edge QA, and CI on main are all green.
- The annotated tag is exactly v1.4.0; the GitHub Release is a separate gate
  created after the tag and verification of the published artifacts.

- [ ] **Step 1: Rerun the full local validation**

Run:

~~~bash
npm test
npm run build:extension
npm run verify:extension
node tools/build-extension.mjs --browser edge --out-dir dist
node tools/verify-extension.mjs --browser edge --out-dir dist
node --test test/extension/manifest.test.js test/extension/content-script.test.js test/extension/parity.test.js test/extension/build.test.js test/extension/qa-checklist.test.js
git diff --check
~~~

Expected: PASS everywhere; both archives and both checksums are
reproducible, the SemVer guard passes, and the launcher remains false/503.

- [ ] **Step 2: Check diff scope and review**

Run:

~~~bash
git status --short
git diff --stat main...HEAD
git diff --check main...HEAD
~~~

Expected: the v1.4 PR diff contains only the files listed in this
plan and no opportunistic change to the launcher, script1.txt, the
capability, secret, or unjustified MV3 permission.

- [ ] **Step 3: Pass review and CI before merge**

Open the v1.4 PR from the dedicated worktree to main, link #13–#16, request review of the manifest and trust boundary,
then wait for green CI and both QA proofs. A review, CI, or QA failure
blocks the merge and does not trigger publication.

Expected: An approved PR with green CI, Chrome QA, and Edge QA; no tag
is created before the merge.

- [ ] **Step 4: Merge, then confirm CI on main**

After the authorized merge to main, read the main SHA, run CI for that SHA, and
verify checksums from the same inputs again. Do not rewrite
history or tag a SHA other than the one actually merged.

Expected: The merged SHA is the only tag candidate and its CI remains green.

- [ ] **Step 5: Create the tag and release in the required order**

Only after the preceding gates pass:

~~~bash
git tag -a v1.4.0 -m "Release v1.4.0"
git push origin v1.4.0
gh release create v1.4.0 dist/chrome/music-converter-v1.4.0.zip dist/chrome/music-converter-v1.4.0.zip.sha256 dist/edge/music-converter-v1.4.0.zip dist/edge/music-converter-v1.4.0.zip.sha256 --title "Music Converter v1.4.0" --notes-file qa/v1.4-extension-checklist.md
~~~

Expected: the annotated tag points to the merged SHA; the GitHub Release is created
afterward with the four verified artifacts. These commands are a future
publication gate and must not be run in this plan-writing
task.

- [ ] **Step 6: Atomic commit for documentary closure, if needed**

If release closure adds only a factual reference to the SHA,
CI and checksums to the checklist, use:

~~~bash
  git add qa/v1.4-extension-checklist.md
git commit -m "docs: record v1.4 release evidence"
~~~

This step remains after QA and merge; it changes no code and
replaces no real evidence.

Result expected: v1.4.0 can be published only after parity, packaging,
SemVer, review, CI, Chrome QA, Edge QA, and merge, in that order; no gate
later publication cannot be inferred from npm test alone.

## Final command matrix

| Gate | Command | Expected result |
| --- | --- | --- |
| Manifest | node --test test/extension/manifest.test.js | CSP, /en1* match, empty permissions, and no bridge PASS |
| Content script | node --test test/extension/content-script.test.js | Isolated mount, foreign page ignored, no auto-start PASS |
| Parity | node --test test/extension/parity.test.js | Core/userscript/extension and SpotMate invariants match PASS |
| Build | node --test test/extension/build.test.js | Deterministic Chrome/Edge ZIPs and allowlist PASS |
| Release metadata | node --test test/guardrails/release-metadata.test.js | package/CHANGELOG/README/userscript/manifest synchronized PASS |
| Secret guard | npm test | No sensitive data in surfaces or artifacts PASS |
| Chrome archive | node tools/verify-extension.mjs --browser chrome --out-dir dist | Chrome ZIP and SHA-256 verified PASS |
| Edge archive | node tools/verify-extension.mjs --browser edge --out-dir dist | Edge ZIP and SHA-256 verified PASS |
| QA | Real Chrome then Edge checklist | Two nonsensitive PASS results, no simulation |
| Release | Green CI, review, merge, tag, release | Each gate is separate and ordered |

## Explicit escalation

Escalate immediately and stop the phase if the SpotMate DOM, an
MV3 permission, CSP, page contract, trusted events, secret model,
real QA, or the launcher boundary contradicts this plan. Do not address it by
adding localhost, a service worker, storage, or a bridge, or by bypassing
Turnstile, adding hidden downloads, exposing tokens/cookies, or using arbitrary
destinations; do not reactivate CONVERSION_CAPABILITY.
