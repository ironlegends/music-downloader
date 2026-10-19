> **Status: Historical v2.0.0 planning record — inactive.**

> Historical plan for the published v2.0.0 baseline. Current support and unreleased artifact names are documented in the README and browser support guide.

# Music Converter v2.0.0 — Extension-first architecture implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v2.0.0 with the Chrome/Edge extensions and script_complet.txt as the only officially documented, tested, and supported methods, while removing all launcher, bridge, pairing, USB, PowerShell, Windows, and userscript surfaces.

**Architecture:** The src/browser/ core remains the SSOT for SpotMate policies, sessions, conversion, progress, and voluntary downloads. Both MV3 manifests load an isolated content script only on https://spotmate.online/en1 and https://spotmate.online/en1/; the complete script is generated from a dedicated entry in the same core and runs only when manually pasted into the DevTools Console.

**Tech Stack:** Node.js ESM 22/24, node --test, Chrome/Edge Manifest V3, deterministic ZIP, SHA-256, SPDX 2.3 SBOM, GitHub Actions on Ubuntu/Windows, and Markdown.

## Global Constraints

- Target version: `2.0.0`, with `package.json` as the SemVer source of truth.
- Official surfaces: Chrome/Edge extensions and `script_complet.txt` only.
- Script procedure: the user navigates to the exact SpotMate page, opens that page's DevTools Console, then manually pastes and runs the script.
- Tampermonkey, userscripts, bookmarklets, and remote injection are prohibited and unsupported.
- Exact top-level manifest allowlist: `manifest_version`, `name`, `version`, `description`, `content_scripts`, `content_security_policy`.
- One content script only: exact matches for the two paths, `content-script.js`, `assets/playlist-panel.css`, `document_idle`, `ISOLATED`.
- No `permissions`, `optional_permissions`, `host_permissions`, `background`, `action`, `commands`, `scripting`, `tabs`, `downloads`, `nativeMessaging`, `web_accessible_resources`, `externally_connectable`, broad origin, or localhost key.
- Explicit same-origin API: `credentials: 'same-origin'`. The browser attaches ambient cookies without the code reading them; any CSRF value comes from the meta tag and is sent only in `X-CSRF-TOKEN` to the same origin. No Cookies API and no cross-origin `credentials: 'include'`.
- Invariants: exact page, at most 100 tracks, 2 seconds between starts, polling after 4.5 seconds at most 40 times, one `POST /convert`, final HTTPS URL, terminal errors without retry, visible clicks, and `event.isTrusted === true`.
- Post-build processing extracts and scans each ZIP and scans the complete script; worker, bridge, `public/`, `server.js`, localhost, USB, PowerShell, userscript, scripts 1–3, and files outside the inventory are rejected.
- The inventory scanner explicitly ignores `.git/`, `node_modules/`, `docs/archive/v1/`, and all external temporary directories; any v1 surface outside the archive is prohibited.
- Release closed to six files: Chrome ZIP, Edge ZIP, `script_complet.txt`, `SHA256SUMS`, `sbom.spdx.json`, `release-manifest.json`.
- CI: Node 22/24 on Ubuntu and Windows. Real Chrome/Edge QA gates the tag and release, but not a merge validated by CI and automated review. Merge, tag, and release remain separate.
- Any later code/config/test change after `FINAL_SUITE_GREEN` invalidates the final suite and requires it to be run again in full.
- This plan stops before implementation, commit, push, PR, merge, tag, release, and real QA until the user gives approval.

---

## Scope, files, and ownership

- **Baseline:** `BASE_SHA` is the branch anchor/ancestor; startup checks `git merge-base --is-ancestor "$BASE_SHA" HEAD`, requires a clean worktree after the plan commit, and reruns the `422/422` baseline.
- **Keep:** `src/browser/` required by the core, `extension/content-script.js`, `extension/assets/playlist-panel.css`, both manifests, and `script_complet.txt`.
- **Delete:** `server.js`, `public/`, `src/bridge-*.js`, `src/browser/bridge-client.js`, `src/browser/bridge-panel.js`, `src/downloader.js`, `src/queue-manager.js`, `src/safe-https-client.js`, `src/spotify-extractor.js`, `src/spotmate-client.js`, `src/windows-usb.js`, `packaging/windows/`, `extension/service-worker.js`, `extension/message-adapter.js`, `script1.txt`, `script2.txt`, `script3.txt`, userscript/legacy entry points, and dedicated tests/builds/importers.
- **Tracked builds to remove:** `dist/spotmate.user.js`, `dist/chrome/*.zip`, `dist/chrome/*.zip.sha256`, `dist/edge/*.zip`, and `dist/edge/*.zip.sha256`; no persistent build remains in the repository.
- **Tools:** `tools/build-browser-artifacts.mjs`, `tools/build-extension.mjs`, `tools/verify-extension.mjs`, `tools/release/build.mjs`, `tools/release/check-artifacts.mjs`, `packaging/release-inputs.json`, `package.json`.
- **Active docs:** `README.md`, `docs/architecture.md`, `docs/roadmap.md`, Chrome/Edge guides, a new console guide, `CHANGELOG.md`, v2 notes, QA checklist. **Historical docs:** diagnostics, v1 release/QA, USB security, older plans/specs, and v1 guides under `docs/archive/v1/`, marked inactive/unsupported and not linked from the Quickstart.
- **Tests:** inventory/docs/CI guardrails, browser API/parity, extension manifest/build/content, release build/contract/integrity/post-build; remove tests for deleted surfaces.
- **Budgets:** Lot 1 <=6 files/250 lines; Lot 2 <=12/700; Lot 3 <=8/450; Lot 4 <=10/500. Split and justify work exceeding 8 files or 800 lines.
- **Parallel work:** read-only research and disjoint documentation may run in isolated worktrees. Core, manifests, `package.json`, release tools, and coupled tests are sequential.
- **Agents:** Sol orchestrator; current frontier researcher in read-only mode at `high`; Spark worker at `xhigh` for a small bounded batch; Luna worker at `high` for a complex batch; if Spark cannot take its small batch, assign it to Luna at `high`; Terra is reserved for `high` reviews of the manifest/security and release/inventory boundaries, never as a worker. Each worker gets a compact handoff, ownership, validation steps, and escalation conditions.

# Phase 0 — Read-only research and baseline

### Task 0.1 — Map the current state

**Agent:** current frontier researcher, effort `high`.
**Dependencies:** none.
**Files:** read-only inspection of `package.json`, workflows, `extension/`, `src/`, `test/`, `tests/`, `docs/`, `packaging/`.

- [ ] Run:

```powershell
git rev-parse HEAD
git branch --show-current
git status --short
rg -n "service-worker|message-adapter|bridge|localhost|script1|script2|script3|userscript|server.js|packaging/windows" .
npm test
git merge-base --is-ancestor "$BASE_SHA" HEAD
```

- [ ] Require BASE_SHA from the orchestrator, verify `git merge-base --is-ancestor "$BASE_SHA" HEAD`, then require a clean worktree when implementation begins after the plan commit and rerun `npm test` with `422/422`. Any discrepancy blocks progress.
- [ ] Confirm interfaces `createBrowserCore`, `createSpotmateApiAdapter`, `createSpotmatePageAdapter`, `createDownloadAdapter`, `generateBundle`, `buildExtension`, `buildRelease`, and `checkArtifacts`.
- [ ] Record a checkpoint, commands, Git status, findings, docs/rules/skills, the single MemPalace attempt, and the next step. No commit.

# Phase 1 — v2 RED contracts

**Worker:** Luna `high`; Spark `xhigh` is possible for the manifest contract alone.
**Dependency:** Phase 0.
**Future commit:** `test: lock v2 contracts`.

### Task 1.1 — Active and forbidden inventory

**Files:** Create `test/guardrails/v2-inventory.test.js` and `tools/verify-v2-inventory.mjs`.

- [ ] Write and run the RED test:

```js
test('v1 surfaces are rejected', () => {
  const result = scanV2Inventory({ rootDir });
  assert.equal(result.success, false);
  assert.match(result.errors.join('\\n'), /server\\.js|public|bridge|USB|PowerShell|script1|script2|script3/);
});
test('active surfaces are exactly the v2 inventory', () => {
  assert.deepEqual(scanV2Inventory({ rootDir }).active.sort(), [
    'extension/assets/playlist-panel.css',
    'extension/chrome/manifest.json',
    'extension/content-script.js',
    'extension/edge/manifest.json',
    'script_complet.txt'
  ].sort());
});

test('a v1 surface is allowed in the archive but rejected at the same logical path outside it', () => {
  const archivedRoot = createFixtureRepository({
    'extension/chrome/manifest.json': '{}',
    'extension/edge/manifest.json': '{}',
    'extension/content-script.js': '',
    'extension/assets/playlist-panel.css': '',
    'script_complet.txt': '',
    'docs/archive/v1/pairing.md': 'historical v1 pairing guide'
  });
  const outsideRoot = createFixtureRepository({
    'extension/chrome/manifest.json': '{}',
    'extension/edge/manifest.json': '{}',
    'extension/content-script.js': '',
    'extension/assets/playlist-panel.css': '',
    'script_complet.txt': '',
    'docs/pairing.md': 'historical v1 pairing guide'
  });
  assert.equal(scanV2Inventory({ rootDir: archivedRoot }).success, true);
  assert.equal(scanV2Inventory({ rootDir: outsideRoot }).success, false);
});
```

```powershell
node --test test/guardrails/v2-inventory.test.js
```

**Expected failure:** FAIL while server.js, public/, bridge, worker, userscript, and scripts 1–3 are present.

- [ ] Rerun `node --test test/guardrails/v2-inventory.test.js` exactly after archiving and deletions.
**Expected GREEN:** the fixture containing `docs/archive/v1/pairing.md` passes, while the fixture with the same content under `docs/pairing.md` fails.

- [ ] Implement `scanV2Inventory({ rootDir }) -> { success, errors, forbidden, active }` with deterministic traversal, an active allowlist, and forbidden patterns; keep the test red until the deletions are made.

### Task 1.2 — RED manifest contract

**Files:** Modify `test/extension/manifest.test.js` and create `tools/manifest-contract.mjs`.

- [ ] Write mutations for the twelve forbidden keys and a broad origin.

```js
for (const key of [
  'permissions', 'optional_permissions', 'host_permissions', 'background',
  'action', 'commands', 'scripting', 'tabs', 'downloads', 'nativeMessaging',
  'web_accessible_resources', 'externally_connectable'
]) {
  assert.throws(() => assertV2Manifest({ ...validManifest(), [key]: [] }), new RegExp(key));
}
assert.throws(() => assertV2Manifest({
  ...validManifest(),
  content_scripts: [{ ...validManifest().content_scripts[0], matches: ['https://spotmate.online/*'] }]
}), /matches/);
assert.throws(() => assertV2Manifest({ ...validManifest(), version_name: '2.0.0' }), /version_name/);
assert.throws(() => assertV2Manifest({
  ...validManifest(),
  content_scripts: [{ ...validManifest().content_scripts[0], all_frames: true }]
}), /all_frames/);
```

- [ ] Run `node --test test/extension/manifest.test.js`.
- [ ] Expect FAIL for `storage`, localhost, worker, `https://spotmate.online/en1*`, unknown key `version_name`, and property `all_frames`.
- [ ] Implement `assertV2Manifest(manifest, { browser }) -> void` with sorted top-level keys, one content script, exact matches/JS/CSS/run_at/world, and self CSP.

### Task 1.3 — RED release/post-build contract

**Files:** Create `tools/post-build-scan.mjs`, `test/release/post-build-scan.test.js`, and modify `test/release/release-contract.test.js`.

- [ ] Define `expectedV2ReleaseNames(version) -> string[]` with exactly six names.
- [ ] Test a current ZIP:

```js
const result = await scanPostBuildArtifact({
  artifactPath: currentZip,
  kind: 'chrome-zip',
  allowedEntries: ['manifest.json', 'content-script.js', 'assets/playlist-panel.css']
});
assert.equal(result.success, false);
assert.match(result.errors.join('\\n'), /service-worker|message-adapter/);
```

- [ ] Run `node --test test/release/post-build-scan.test.js test/release/release-contract.test.js`.
- [ ] Expect FAIL for userscript, Windows, worker/adapter, and an open-ended inventory.
- [ ] Implement `scanPostBuildArtifact({ artifactPath, kind, allowedEntries }) -> { success, errors, entries }`; reject traversal, absolute paths, symlinks, and files outside the allowlist.

**Phase 1 gate:** Observe RED; rerun the complete `npm test` after the batch; Terra reviewer at `high` for manifest/origin; ledger `REAL`/`NOT_REAL`; MemPalace checkpoint; no product code deleted yet.

# Phase 2 — Core, official script, and removals

**Worker:** Luna `high`.
**Dependency:** Phase 1.
**Parallel work:** prohibited across entry points, core, and SSOT build.
**Future commit:** `feat: make browser surfaces extension-first`.

### Task 2.1 — Rename the complete-script entry, close the build, and lock parity

**Files:** Rename `src/browser/entries/legacy-complete.js` to `src/browser/entries/script-complet.js`; delete `src/browser/entries/userscript.js`, `legacy-conversion.js`, `legacy-download.js`, `script1.txt`, `script2.txt`, and `script3.txt`; modify `tools/build-browser-artifacts.mjs`, `test/extension/build.test.js`, and `test/extension/parity.test.js`; create `test/browser/surface-contract-parity.test.js`; preserve `script_complet.txt`.

- [ ] Add RED coverage for the existence of `entries/script-complet.js` and absence of the deleted entry points.
- [ ] Before removing the older tests, name and run the test `contract parity Chrome Edge script_complet traces the same invariants`; it loads the three generated outputs and compares origin/path, 100-track bound, timings, single POST, HTTPS URL, terminal errors, voluntary clicks, and absence of secrets.
- [ ] Add a RED extension-build check: generated content must not contain `bridge-panel.js` or `bridge-client.js`, and `ARTIFACT_MODULES['extension/content-script.js']` must not reference either module.

```js
test('extension build excludes bridge and preserves contract parity across three surfaces', () => {
  const bundle = fs.readFileSync(path.join(root, 'extension/content-script.js'), 'utf8');
  assert.doesNotMatch(bundle, /bridge-panel|bridge-client|service-worker/);
  assert.deepEqual(readContract('chrome'), readContract('edge'));
  assert.deepEqual(readContract('chrome'), readContract('script_complet'));
});
```

- [ ] Run `node --test test/extension/build.test.js test/extension/parity.test.js test/browser/surface-contract-parity.test.js`.
**Expected failure:** FAIL because `ARTIFACT_MODULES` still contains `bridge-panel.js` and `bridge-client.js`, and v1 outputs still exist.
- [ ] Update:

```js
const ALLOWED_OUTPUTS = Object.freeze(['script_complet.txt']);
const ENTRY_MAP = Object.freeze({
  'script_complet.txt': 'entries/script-complet.js',
  'extension/content-script.js': 'entries/extension.js'
});
```

- [ ] Remove userscript/legacy from modules, exports, tests, and `npm test`.
- [ ] Regenerate and verify:

```powershell
node tools/build-browser-artifacts.mjs --write
node tools/build-browser-artifacts.mjs --check
```

**Expected GREEN:** the complete script is reproducible, no userscript or scripts 1–3 output remains, and browser invariants pass.

### Task 2.2 — Extension entry without the bridge

**Files:** Modify `src/browser/entries/extension.js`; delete `extension/service-worker.js`, `extension/message-adapter.js`, `src/browser/bridge-client.js`, `src/browser/bridge-panel.js`, `src/bridge-auth.js`, `src/bridge-config.js`, `src/bridge-downloader.js`, `src/bridge-queue-manager.js`, `src/bridge-validator.js`, `src/downloader.js`, `src/queue-manager.js`, `src/safe-https-client.js`, `src/spotify-extractor.js`, `src/spotmate-client.js`, `src/windows-usb.js`, `server.js`, `public/`, `packaging/windows/`, `test/extension/bridge-flow.test.js`, `test/extension/service-worker.test.js`, `test/server.test.js`, `test/bridge-*.test.js`, `test/downloader.test.js`, `test/queue-manager.test.js`, `test/safe-https-client.test.js`, `test/spotify-extractor.test.js`, `test/spotmate-client.test.js`, `test/windows-usb.test.js`, `test/audit-remediation.test.js`, `test/release/windows-packaging.test.js`, and `test/release/smoke-install.ps1`.

- [ ] RED:

```js
const result = bootstrapExtensionContent(fixtureOptions());
assert.equal(result.status, 'mounted');
assert.equal('bridgePanel' in result, false);
assert.equal('bridgeClient' in result, false);
```

- [ ] Run `node --test test/extension/content-script.test.js` and expect FAIL because the bridge is created.
- [ ] Produce `bootstrapExtensionContent(options) -> { status: 'mounted', runtime } | { status: 'ignored', reason: 'unsupported-page' }` as follows:

```js
const runtime = createBrowserCore({
  ...resolveBrowserDependencies(options),
  exposeConversionGlobals: false,
  exposeDownloadGlobals: false
});
return runtime ? { status: 'mounted', runtime }
  : { status: 'ignored', reason: 'unsupported-page' };
```

- [ ] Remove bridge/worker imports, packaging, and tests; confirm foreign pages remain inert.
- [ ] Before each deletion, inventory callers and imports with `rg -n "downloader|queue-manager|safe-https-client|spotify-extractor|spotmate-client|audit-remediation|server|bridge|windows-usb" src test tests tools package.json .github`.
- [ ] Remove remaining launcher sources and their v1 importers/tests; explicitly remove `src/downloader.js`, `src/queue-manager.js`, `src/safe-https-client.js`, `src/spotify-extractor.js`, `src/spotmate-client.js`, and `test/audit-remediation.test.js`.

```powershell
npm test
```

**Expected GREEN:** the full suite passes with no remaining launcher/bridge/USB/Windows/userscript source, import, or test.

### Task 2.3 — Same-origin cookies and CSRF

**Files:** Modify `src/browser/spotmate-api-adapter.js` only if needed; API/page/static tests.

- [ ] Add or preserve:

```js
assert.equal(call.options.credentials, 'same-origin');
assert.equal(call.options.headers['X-CSRF-TOKEN'], 'synthetic-csrf');
assert.equal(source.includes('document.cookie'), false);
assert.equal(source.includes('chrome.cookies'), false);
assert.equal(source.includes("credentials: 'include'"), false);
```

- [ ] Run `node --test test/browser/spotmate-api-adapter.test.js test/browser/spotmate-page-adapter.test.js`.
- [ ] GREEN: the browser attaches ambient cookies for same-origin requests, the code does not read them, CSRF from meta is sent only to `location.origin`, and there is no export, persistence, or logging.

**Phase 2 gate:** core/parity/extension pass; run complete `npm test` after the phase; Terra reviewer at `high`; checkpoint; atomic commit only after review.

# Phase 3 — Manifests, exact release, scanning, and CI

**Worker:** Luna `high`; Spark `xhigh` only for the isolated manifest task.
**Dependency:** Phase 2.
**Parallel work:** prohibited across package, release tools, and release tests.
**Future commit:** `build: close v2 release inventory`.

### Task 3.1 — Manifests and verification

**Files:** Modify both manifests, `tools/verify-extension.mjs`, and manifest/build tests.

- [ ] Apply this exact structure:

```json
{
  "manifest_version": 3,
  "name": "Music Converter",
  "version": "2.0.0",
  "description": "Voluntary SpotMate actions on the supported page.",
  "content_scripts": [{
    "matches": ["https://spotmate.online/en1", "https://spotmate.online/en1/"],
    "js": ["content-script.js"],
    "css": ["assets/playlist-panel.css"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

- [ ] Make `verifyExtension` call `assertV2Manifest`; reject storage/localhost/worker/wildcard.
- [ ] Build Chrome/Edge into an external OS temporary directory, clean up in `finally`, then verify each extracted ZIP. GREEN: only three ZIP entries are allowed.

```powershell
$extTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("music-converter-ext-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $extTemp | Out-Null
try {
  node tools/build-extension.mjs --browser chrome --out-dir $extTemp
  node tools/verify-extension.mjs --browser chrome --out-dir $extTemp
  node tools/build-extension.mjs --browser edge --out-dir $extTemp
  node tools/verify-extension.mjs --browser edge --out-dir $extTemp
} finally {
  Remove-Item -LiteralPath $extTemp -Recurse -Force
}
```

### Task 3.2 — Release builder closed to six files

**Files:** Modify `packaging/release-inputs.json`, `tools/release/build.mjs`, `tools/release/check-artifacts.mjs`, and release tests.

- [ ] RED: `fs.readdirSync(tempDir)` must equal the six-name v2 list.
- [ ] Have `buildRelease({ repoRoot, outputDir, sourceDateEpoch })` produce the two ZIPs, script, SBOM, checksums, and manifest in an OS temporary directory outside the repository, with no persistent `.sha256` file.
- [ ] Set `release-manifest.json` to `version`, `sourceRevision` (full Git SHA), `sourceDateEpoch`, an `inventory` of six names, and `files` for the four hashable payloads to avoid a circular self-hash.
- [ ] Add `assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$/)` to the release test and verify that `checkArtifacts` rejects a missing, short, or non-hex revision.

```js
import { execFileSync } from 'node:child_process';

const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(sourceRevision)) throw new Error('full Git sourceRevision required');
releaseManifest.sourceRevision = sourceRevision;
```
- [ ] Add the explicit test without the `repoRoot` option: `const result = await buildRelease({ outputDir: tempDir, sourceDateEpoch: 0 });`; read `release-manifest.json`, then check `assert.match(result.manifest.sourceRevision, /^[0-9a-f]{40}$/)` and equality with `git rev-parse HEAD` run with `cwd: root`.
- [ ] Run `node --test test/release/release-build.test.js` in RED before implementation and GREEN afterward; without `repoRoot`, the call must resolve the builder root and produce the full Git SHA.
- [ ] Remove userscript, legacyScripts, launcher, bridge, and Windows entries from `release-inputs.json`.
- [ ] Remove `dist/spotmate.user.js` and all v1 ZIPs/checksums under `dist/chrome/` and `dist/edge/` from Git and the working tree; add a guardrail assertion that `dist/` contains no tracked artifact after the batch.
- [ ] Verify with cleanup in `finally` and never create a release directory in the repository:

```powershell
$releaseTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("music-converter-v2-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $releaseTemp | Out-Null
try {
  node tools/release/build.mjs --out $releaseTemp
  node tools/release/check-artifacts.mjs $releaseTemp --version 2.0.0
} finally {
  Remove-Item -LiteralPath $releaseTemp -Recurse -Force
}
```

**Expected GREEN:** `RELEASE_ARTIFACTS_OK`, exactly six files, and a byte-for-byte identical rebuild.

### Task 3.3 — Post-build scan

**Files:** Modify `tools/post-build-scan.mjs`, `tools/release/check-artifacts.mjs`, and post-build/integrity tests.

- [ ] Sequentially inject a worker, bridge, `public/index.html`, `server.js`, localhost, USB, PowerShell, userscript, scripts 1–3, traversal, and an arbitrary file into ZIP fixtures.
- [ ] Require a non-zero failure for every mutation and every symlink.
- [ ] Scan each ZIP after isolated temporary extraction and scan the complete script as text; propagate all errors through `checkArtifacts`.

### Task 3.4 — Package and CI

**Files:** Modify `package.json`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and CI/metadata tests.

- [ ] RED :

```js
assert.doesNotMatch(ci, /spotmate\\.user|windows-portable|userscript/);
assert.match(ci, /ubuntu-latest/);
assert.match(ci, /windows-latest/);
assert.match(ci, /22/);
assert.match(ci, /24/);
assert.doesNotMatch(ci, /git tag|gh release create/);
```

- [ ] Remove `start`, deleted scripts, and Windows/userscript steps; keep tests, Chrome/Edge builds, verification, and release scan.
- [ ] Keep Node 22/24 × Ubuntu/Windows and remove any `push` tag trigger from `release.yml`.
- [ ] Replace it with `workflow_dispatch` requiring inputs `tag` and `qa_confirmed: true`; then validate tag `vX.Y.Z`, annotated tag, tag ancestor of `main`, signed Chrome/Edge QA checklist, and matching version.

```yaml
on:
  workflow_dispatch:
    inputs:
      tag:
        required: true
        type: string
      qa_confirmed:
        required: true
        type: boolean
```

- [ ] Reserve `gh release create` for this manual trigger after tag and QA validation; no CI job automatically creates a tag, merge, or release.
- [ ] Add an explicit release-workflow test: no tag `push`, `workflow_dispatch` is present, inputs `tag` and `qa_confirmed` exist, the annotated/ancestor tag object is validated, and `gh release create` runs only in this manual path; temporary-directory cleanup uses `if: always()`.

```js
assert.doesNotMatch(release, /push:\s*[\s\S]*tags:/);
assert.match(release, /workflow_dispatch/);
assert.match(release, /tag:/);
assert.match(release, /qa_confirmed/);
assert.match(release, /gh release create/);
```
- [ ] Run CI guardrails and the CI's local commands.

**Phase 3 gate:** manifests, six assets, extraction/scan, and four CI combinations; run complete `npm test` after the batch; Terra reviewer at `high` for release/inventory; checkpoint; atomic commit.

# Phase 4 — Documentation, migration, metadata, and publication

**Worker:** Luna `high`; Spark `xhigh` for the short console guide.
**Dependency:** Phase 3.
**Parallel work:** README/guides and release notes may be prepared in disjoint worktrees; package/changelog/tests are sequential.
**Future commits:** `docs: publish v2 supported methods`, then `chore: gate v2 publication` only for distinct files.

### Task 4.1 — Active documentation

**Files:** Modify `README.md`, `docs/architecture.md`, `docs/roadmap.md`, and Chrome/Edge guides; create `docs/guides/script-complet-console.md` and `test/guardrails/v2-documentation.test.js`.

- [ ] RED: fail on `npm start`, `server.js`, launcher, userscript, pairing/USB, and Windows in active documentation.
- [ ] Write the single guide:

```markdown
1. Navigate yourself to https://spotmate.online/en1 or /en1/.
2. Complete Turnstile manually.
3. Open DevTools, then this page's Console.
4. Paste script_complet.txt and press Enter.
5. Trigger the visible controls and each download voluntarily.
6. Do not use Tampermonkey, userscripts, bookmarklets, or remote injection.
```

- [ ] GREEN: active documentation is limited to the two extensions and complete script, with boundaries and v2 support stated.

### Task 4.2 — v1 archive and migration

**Files:** Move `docs/guides/pairing.md`, `usb-downloads.md`, `windows-launcher.md`, `docs/diagnostics-evidence.md`, `docs/diagnostics-runbook.md`, `docs/releases/v1.6.0.md`, `docs/releases/v1.6.1.md`, `docs/releases/v1.6.2.md`, `qa/v1.3-playlist-checklist.md`, `qa/v1.4-extension-checklist.md`, and `docs/security/2026-08-26-music-converter-v1.5-usb-bridge-threat-model.md` to `docs/archive/v1/`; move the older v1 plans/specs to `docs/archive/v1/plans/` and `docs/archive/v1/specs/`; update archive files and documentation guardrails.

- [ ] RED: require a “historical v1.x, inactive, unsupported” marker and no archive links in the Quickstart.
- [ ] Move files without permanently deleting them, add the v1-to-v2 migration guide, and state that no launcher/pairing/USB/userscript state is migrated.
- [ ] Add the “historical v1.x, inactive, unsupported” marker to each diagnostic, v1 release/QA record, USB security note, and older plan/spec; exclude `docs/archive/v1/` from the active inventory and remove all Quickstart links to it.
- [ ] GREEN: archives remain traceable and excluded from active docs and releases.

### Task 4.3 — Version, changelog, notes, and QA

**Files:** Modify `package.json` and `CHANGELOG.md`; create `docs/releases/v2.0.0.md` and `qa/v2.0.0-extension-checklist.md`; modify metadata/CI tests.

- [ ] RED on version `1.6.2` and missing v2 notes.
- [ ] Set version to `2.0.0`, align manifests/changelog/release notes, and document the breaking change.
- [ ] Manual checklist: extract each ZIP to a temporary folder; use Chrome then Edge with Load unpacked on the extracted folder; open the exact page; complete Turnstile manually; voluntarily convert and download; confirm a foreign page remains inert; check the ZIP inventory and SHA; retain no secret. Never describe direct installation of the ZIP.
- [ ] Real QA blocks the tag/release, but merge remains possible after automated CI and review.

### Task 4.4 — Final full suite and separate authorizations

**Files:** Modify CI guardrails and checklist; no artifact is published by this plan.

- [ ] Test:

```js
assert.match(read('qa/v2.0.0-extension-checklist.md'), /tag.*release|release.*tag/i);
assert.match(read('qa/v2.0.0-extension-checklist.md'), /merge.*CI|CI.*merge/i);
assert.doesNotMatch(read('.github/workflows/ci.yml'), /git tag|gh release create/);
```

- [ ] Run:

```powershell
node --test test/guardrails/*.test.js test/browser/*.test.js test/extension/*.test.js test/release/*.test.js
npm test
git diff --check
```

- [ ] Record `FINAL_SUITE_GREEN` with SHA, CI run, checksums, and findings.
- [ ] Document the rule: any code/config/test change clears this marker and requires the full suite, release tests, inventory scan, and secret scan; docs/rules-only changes rerun documentation guardrails.
- [ ] Sequence the gates: CI/review -> merge may proceed; real Chrome/Edge QA -> tag authorization; annotated tag -> release authorization; GitHub release remains separate.

## Final gates and criteria

1. Exact `422/422` baseline and understood inventory.
2. RED observed for inventory, manifest, release, script, and docs.
3. Targeted GREEN followed by the affected suite.
4. Node 22/24 CI on Ubuntu/Windows is green.
5. Terra review at both boundaries with one verdict and a `REAL`/`NOT_REAL` ledger.
6. Active docs describe the extension and script; v1 archives remain inactive.
7. `FINAL_SUITE_GREEN` recorded.
8. Real Chrome then Edge QA blocks tag/release, not merge.
9. Merge, annotated tag, and GitHub release are separate; exactly six assets.
10. Any later code/config/test change reruns the full tests and invalidates the final status.

## Checkpoint and ledger

For each mini-phase, record the objective, status, files, budget, commands/output, review findings, docs/rules/skills, MemPalace attempt, commit, and next step. Ledger:

| ID | Verdict | Severity | Area | Evidence file:line | Decision |
| --- | --- | --- | --- | --- | --- |
| R-### | REAL or NOT_REAL | blocker/high/medium/low | manifest, security, build, release, docs | path:line | fix, accept, or escalate |

Planned atomic commits: `test: lock v2 contracts`, `feat: make browser surfaces extension-first`, `build: close v2 release inventory`, `docs: publish v2 supported methods`, `chore: gate v2 publication`. None is created before user approval, validation, review, and checkpoint.
