> **Status: Historical v1.x record — inactive and unsupported.**

# Music Converter v1.6.0 Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver v1.6.0 as a verifiable Music Converter distribution containing the userscript, Chrome/Edge ZIPs, installable and portable Windows bundles, checksums, a minimal SBOM, guides, and an automated release after human and CI gates.

**Architecture:** The browser core and loopback bridge delivered in v1.5 remain the execution sources; v1.6 adds only a deterministic packaging pipeline that assembles them, verifies their versions, and writes archives outside the Git tree. The installable Windows launcher is an unsigned PowerShell bundle that installs the existing launcher and HTTP bridge on 127.0.0.1; the portable bundle runs the same contents without installation, Native Messaging, runtime download, or deletion of user downloads.

**Tech Stack:** Node.js 22 and 24, npm with lockfile v3, native Node.js modules (fs, path, crypto, zlib, child_process), native Windows PowerShell, node:test, GitHub Actions with SHA-pinned actions, and preinstalled GitHub CLI. No new runtime dependency, third-party MSI/EXE, or paid signing certificate.

## Global Constraints

- The allowed page remains exactly https://spotmate.online/en1 or https://spotmate.online/en1/.
- The core keeps a maximum of 100 tracks, 2 seconds between tracks, polling after 4.5 seconds up to 40 times, one POST /convert per track, and HTTPS-only final URLs.
- Every terminal error remains terminal with no automatic retry; any retry remains manual.
- Turnstile, consent, conversion, and download are triggered manually; every privileged action checks event.isTrusted.
- CONVERSION_CAPABILITY.enabled remains false and POST /api/queue/start remains HTTP 503 with launcher-local-conversion-disabled.
- No token, cookie, HMAC key, usable pairing nonce, or finalAudioUrl may appear in logs, UI, persistence, reports, fixtures, checksums, or archives; tests use synthetic values assembled at runtime.
- The bridge uses HTTP on 127.0.0.1:<fixed port> with the exact CORS origin for each extension; no wildcard, origin reflection, Native Messaging, or Native Messaging manifest is added.
- The v1.5 bridge remains a separate volatile download queue; the USB destination is selected and revalidated locally, files use .part, are renamed atomically, and never replace an existing file.
- v1.6 packaging does not change script1.txt behavior; legacy artifacts and the userscript derive from v1.5 outputs and are checked against the SSOT core.
- This documentation PR remains at `1.1.0`; the v1.6 release PR, created in a dedicated clean worktree based on up-to-date `main`, carries the corresponding bump and closes #23–#26 after the gates.
- In this v1.6 PR, package.json is the SemVer source of truth and must be exactly 1.6.0; CHANGELOG.md, the README badge, dist/spotmate.user.js metadata, and Chrome/Edge manifests must also be exactly 1.6.0.
- The v1.6 archives are verifiable and unsigned. Metadata and guides state that they are unsigned; no paid signature is simulated or promised.
- Decision [#23](https://github.com/ironlegends/music-converter/issues/23) sets an unsigned portable archive and unprivileged PowerShell installer in the user profile; they use no Native Messaging, runtime download, or elevation and never delete the user's music.
- Archives are written outside the repository with sorted paths, deterministic timestamps, modes, and compression, leaving the source tree unchanged.
- GitHub Actions are pinned to full SHAs; test jobs have contents: read, and only the release job has contents: write.
- CI artifacts are retained for 14 days; the GitHub Release remains a draft until a human verifies the assets and checksums.
- Chrome/Edge installation, Windows install/upgrade/uninstall, pairing, and physical USB evidence are separate manual gates and are never replaced by static tests or a simulated mount.
- v1.6 tickets: [#23](https://github.com/ironlegends/music-converter/issues/23) covers the unsigned portable archive and unprivileged PowerShell installer in the user profile, without Native Messaging, runtime download, elevation, or music deletion; [#24](https://github.com/ironlegends/music-converter/issues/24) covers artifacts/checksums; [#25](https://github.com/ironlegends/music-converter/issues/25) covers guides; [#26](https://github.com/ironlegends/music-converter/issues/26) covers release automation. The v1.6 PR closes #23–#26.

## Starting point and file map

This plan assumes v1.5 has shipped and its outputs exist at the paths below. These paths become the v1.6 input contract in packaging/release-inputs.json; a missing path or real discrepancy blocks execution and must be escalated without silently moving sources.

| File | v1.6 responsibility |
| --- | --- |
| packaging/release-inputs.json | Closed inventory of v1.5 sources, Chrome/Edge extensions, userscript, and launcher to package. |
| tools/release/zip.mjs | Write deterministic ZIP files without an external dependency. |
| tools/release/build.mjs | Build the five v1.6 artifacts and build manifest in an external directory. |
| tools/release/check-artifacts.mjs | Verify paths, versions, hashes, archives, absence of secrets, and a clean generated tree. |
| tools/release/write-sbom.mjs | Generate a minimal SPDX JSON SBOM from package.json and package-lock.json. |
| test/release/release-contract.test.js | Contract for inputs, artifact names, and allowed surfaces. |
| test/release/release-build.test.js | Byte-for-byte reproducibility and build-manifest equality. |
| test/release/windows-packaging.test.js | Static contract for Windows scripts and preservation of downloads. |
| test/release/smoke-install.ps1 | Real Windows smoke test for install, upgrade, and uninstall. |
| test/release/release-integrity.test.js | Checksums, SBOM, safe extraction, and absence of sensitive data. |
| packaging/windows/install.ps1 | Install under %LOCALAPPDATA%/Music Converter, verify Node, and create a shortcut. |
| packaging/windows/uninstall.ps1 | Uninstall only files owned by the application. |
| packaging/windows/run-portable.ps1 | Run portably without writing outside the bundle or deleting downloads. |
| packaging/windows/loopback-bridge.json | Local manifest generated from v1.5 configuration: loopback, fixed port, and exact origins; no session data. |
| .github/workflows/ci.yml | Distribution tests and CI upload with bounded retention and least privilege. |
| .github/workflows/release.yml | Verify annotated tag, main commit, CI, and version, then create a draft release. |
| README.md | Consistent badges, Quickstart, and links to all v1.6 guides. |
| CHANGELOG.md | v1.6.0 entry. |
| docs/guides/chrome-install.md | Exact Chrome installation steps and limits of the extension not published to the store. |
| docs/guides/edge-install.md | Exact Edge installation steps and limits of the extension not published to the store. |
| docs/guides/pairing.md | Manual extension ↔ launcher pairing without exposing a nonce or secret. |
| docs/guides/usb-downloads.md | USB selection, revalidation, downloads, and device removal. |
| docs/guides/windows-launcher.md | Installation, portable mode, upgrade, and uninstall without deleting downloads. |
| docs/releases/v1.6.0.md | Scope, unsigned status, assets, checksums, SBOM, evidence, and publication gates. |
| test/guardrails/release-metadata.test.js | Canonical multi-surface SemVer guard, including the userscript and v1.6 manifests. |
| tools/check-release-metadata.mjs | SemVer check tool used by the guard and release gate. |
| package.json and package-lock.json | Version 1.6.0, release scripts, and reproducible lockfile. |

The v1.5 paths consumed by the inventory are fixed: dist/spotmate.user.js, extension/chrome/manifest.json, extension/edge/manifest.json, extension/content-script.js, extension/service-worker.js, extension/message-adapter.js, extension/assets/, server.js, public/, src/, script1.txt, script2.txt, script3.txt, script_complet.txt, package.json, and CHANGELOG.md. The extension manifests remain the v1.5 manifests; v1.6 adds no permission.

---

### Task 1: Lock the input contract and artifact names

**Files:**
- Create: packaging/release-inputs.json
- Create: test/release/release-contract.test.js
- Modify: package.json
- Create: package-lock.json

**Interfaces:**
- packaging/release-inputs.json exports the exact relative source paths and five artifact families without secret values.
- node tools/release/build.mjs --out <directory> reads this inventory, rejects a missing, absolute, symlinked, or out-of-root path, and emits only names derived from the version read from package.json.
- npm run release:build -- --out <directory> and npm run release:verify -- <directory> become the public v1.6 pipeline commands.

- [ ] **Step 1: Write RED contract tests**

Add assertions to test/release/release-contract.test.js that load the JSON and verify:

    assert.deepEqual(Object.keys(inputs.extensions).sort(), ['chrome', 'edge']);
    assert.equal(inputs.userscript, 'dist/spotmate.user.js');
    assert.deepEqual(inputs.legacyScripts, [
      'script1.txt', 'script2.txt', 'script3.txt', 'script_complet.txt'
    ]);
    assert.deepEqual(inputs.artifacts, [
      'userscript', 'chrome-extension', 'edge-extension',
      'windows-portable', 'windows-installable'
    ]);
    assert.equal(JSON.parse(readFileSync('package.json')).version, '1.6.0');

Add a test that fails if the inventory contains nativeMessaging, allowed_origins, an extension permission not inherited from v1.5, or an archive name containing a token, cookie, or audio URL.

- [ ] **Step 2: Run the RED tests**

Run: node --test test/release/release-contract.test.js

Expected: FAIL because the inventory and v1.6 release scripts do not exist yet.

- [ ] **Step 3: Add the minimal inventory and npm scripts**

Set package.json.version to 1.6.0, then generate package-lock.json with npm install --package-lock-only --ignore-scripts --lockfile-version=3. Create packaging/release-inputs.json with the paths from the file map and fields artifactPrefix: music-converter, releaseVersionSource: package.json, nativeMessaging: false, and bridgeManifest: packaging/windows/loopback-bridge.json. Add these scripts to package.json:

    "release:build": "node tools/release/build.mjs",
    "release:verify": "node tools/release/check-artifacts.mjs"

The builder always reads the version from package.json; it contains no second source of truth.

- [ ] **Step 4: Run the GREEN tests**

Run: node --test test/release/release-contract.test.js

Expected: PASS; paths are relative, the five artifact families are closed, and Native Messaging is explicitly absent.

- [ ] **Step 5: REFACTOR — strengthen the contract without expanding scope**

Reject symlinks, node_modules directories, .env* files, private keys, cookies, real audio fixtures, and any unlisted file in both the test and future builder. Keep script1.txt read-only and do not create a source parallel to the SSOT core.

- [ ] **Step 6: Verify the REFACTOR**

Run: node --test test/release/release-contract.test.js test/guardrails/release-metadata.test.js

Expected: PASS; the inventory is closed and no secret is read or displayed.

- [ ] **Step 7: Atomic commit**

    git add packaging/release-inputs.json test/release/release-contract.test.js package.json
    git commit -m "test(release): define v1.6 artifact contract"

---

### Task 2: Build reproducible artifacts

**Files:**
- Create: tools/release/zip.mjs
- Create: tools/release/build.mjs
- Create: test/release/release-build.test.js
- Modify: packaging/release-inputs.json

**Interfaces:**
- createDeterministicZip({ rootDir, files, outputPath, sourceDateEpoch }) sorts UTF-8 paths, normalizes /, fixes timestamps and modes, rejects symlinks/path traversal, and writes a ZIP without a comment.
- buildRelease({ repoRoot, outputDir, sourceDateEpoch }) produces exactly five distributable artifacts: dist/spotmate.user.js and four ZIP archives, plus SHA256SUMS, sbom.spdx.json, and release-manifest.json.
- release-manifest.json contains version, sourceCommit, sourceDateEpoch, the sorted file list, sizes, and hashes; it contains no audio URL, key, cookie, or pairing value.

- [ ] **Step 1: Write RED reproducibility tests**

In test/release/release-build.test.js, build two temporary outputs from the same commit and SOURCE_DATE_EPOCH, then compare every archive's bytes and the normalized manifest JSON:

    const first = await runBuild('build-a', epoch);
    const second = await runBuild('build-b', epoch);
    assert.deepEqual(await sha256Tree(first), await sha256Tree(second));
    assert.equal(await readText(first, 'release-manifest.json'),
      await readText(second, 'release-manifest.json'));

Add red cases for a missing file, a ../outside path, a symlink, a different timestamp, and an unsorted ZIP path.

- [ ] **Step 2: Run the RED tests**

Run: node --test test/release/release-build.test.js

Expected: FAIL because the builder import and reproducibility assertions fail.

- [ ] **Step 3: Implement the minimal deterministic builder**

In tools/release/zip.mjs, write local/central ZIP headers with CRC-32, zlib.deflateRawSync using fixed parameters, DOS timestamps derived only from sourceDateEpoch, mode 0644, sorted paths, and no implicit directory entries. Reject entries whose realpath leaves rootDir or whose lstat reports a symlink.

In tools/release/build.mjs, read package.json and the inventory; use git rev-parse HEAD and git show -s --format=%ct HEAD when SOURCE_DATE_EPOCH is absent, then produce:

    dist/spotmate.user.js
    music-converter-v1.6.0-chrome-extension.zip
    music-converter-v1.6.0-edge-extension.zip
    music-converter-v1.6.0-windows-portable.zip
    music-converter-v1.6.0-windows-installable.zip
    SHA256SUMS
    sbom.spdx.json
    release-manifest.json

The extension ZIP contains only its exact variant manifest, content script, service worker, and shared resources under extension/; the portable Windows ZIP contains the launcher, run-portable.ps1, and local documentation; the installable Windows ZIP contains the launcher, install.ps1, uninstall.ps1, loopback-bridge.json, and owned files. Do not copy node_modules, .git, .env, logs, caches, or secrets.

- [ ] **Step 4: Run the GREEN tests**

Run: node --test test/release/release-build.test.js

Expected: PASS; two builds from the same tree and epoch produce identical bytes, all five archives use the version read from package.json, and the Git tree remains unchanged.

Run: node tools/release/build.mjs --out <external-output>

Expected: the external directory contains the eight expected files and no file is created in the repository.

- [ ] **Step 5: REFACTOR — make inputs and outputs auditable**

Add the relative path, size, and SHA-256 of every packaged file to release-manifest.json; sort all array keys, normalize text file line endings to LF, and preserve binaries unchanged. Explicitly exclude script1.txt from rewriting.

- [ ] **Step 6: Verify the REFACTOR**

Run: node --test test/release/release-contract.test.js test/release/release-build.test.js

Expected: PASS; the build is byte-for-byte reproducible and the generated list is closed.

- [ ] **Step 7: Atomic commit**

    git add tools/release/zip.mjs tools/release/build.mjs test/release/release-build.test.js packaging/release-inputs.json
    git commit -m "feat(release): build reproducible v1.6 artifacts"

---

### Task 3: Package the Windows launcher and loopback bridge

**Files:**
- Create: packaging/windows/install.ps1
- Create: packaging/windows/uninstall.ps1
- Create: packaging/windows/run-portable.ps1
- Create: packaging/windows/loopback-bridge.json
- Create: test/release/windows-packaging.test.js
- Create: test/release/smoke-install.ps1
- Modify: tools/release/build.mjs

**Interfaces:**
- install.ps1 -PackageRoot <dir> [-InstallRoot <dir>] verifies the manifest, requires Node 22 or 24 to be installed already, installs only under the install root, optionally creates a shortcut, and writes a manifest of owned files.
- uninstall.ps1 -InstallRoot <dir> removes only files listed as owned, the created shortcut, and the bridge descriptor; it never removes the target folder, downloads, a USB device, or a path supplied by the extension.
- run-portable.ps1 -PackageRoot <dir> starts the launcher from the bundle with shell: false on the Node side and writes no configuration into the repository.
- loopback-bridge.json is generated from v1.5 configuration and contains only transport http, bindAddress 127.0.0.1, the fixed port delivered in v1.5, both effective chrome-extension:// origins, and bridge start/stop commands; it persists no session key, nonce, or finalAudioUrl.

- [ ] **Step 1: Write RED Windows and static tests**

In test/release/windows-packaging.test.js, statically verify that the scripts reject a missing package root, do not construct arbitrary shell commands, do not run Remove-Item on a user destination path, and require 127.0.0.1. Add a Windows smoke test that creates two separate temporary directories:

    $downloads = Join-Path $env:TEMP ('mc-downloads-' + [guid]::NewGuid())
    $install = Join-Path $env:TEMP ('mc-install-' + [guid]::NewGuid())
    New-Item -ItemType Directory -Force $downloads | Out-Null
    Set-Content -LiteralPath (Join-Path $downloads 'keep.txt') -Value 'synthetic-download'
    & $installer -PackageRoot $packageRoot -InstallRoot $install
    & $installer -PackageRoot $packageRoot -InstallRoot $install
    & $uninstaller -InstallRoot $install
    if (-not (Test-Path (Join-Path $downloads 'keep.txt'))) { throw 'download removed' }

- [ ] **Step 2: Run the RED tests**

Run: node --test test/release/windows-packaging.test.js

Expected: FAIL because the Windows scripts and loopback descriptor do not exist yet.

- [ ] **Step 3: Implement installation without implicit privilege**

In install.ps1, validate bundle hashes before copying, reject a destination outside the install root, copy to a versioned staging directory and then atomically replace the previous installation, write owned-files.json only under the install root, and create a Start menu shortcut without registering Native Messaging. The script downloads no runtime and returns a non-zero code if node --version is neither 22.x nor 24.x.

In uninstall.ps1, load owned-files.json, verify that every resolved path stays under the install root, remove the shortcut and owned files, and preserve every configured destination, Downloads folder, and USB volume. Reinstalling is the v1.6 upgrade and must preserve downloads.

In run-portable.ps1, resolve only the launcher under PackageRoot, pass separate arguments to node, reject a package root that is not a real path, and never start conversion or call /api/queue/start.

In loopback-bridge.json, materialize the v1.5 values generated by the builder. This file must not be a Native Messaging manifest; the test checks for the absence of allowed_origins, arbitrary executable paths, tokens, and secrets. The bridge remains loopback and installation does not change the false/503 capability.

- [ ] **Step 4: Run GREEN tests and the Windows smoke test**

Run: node --test test/release/windows-packaging.test.js

Expected: PASS for the static guards.

Run on Windows: pwsh -NoProfile -ExecutionPolicy Bypass -File test/release/smoke-install.ps1 -PackageRoot <built-package-root>

Expected: clean installation, idempotent upgrade, clean uninstall, /api/status still fail-closed, and keep.txt still present outside the install root.

- [ ] **Step 5: REFACTOR — bound deletions and errors**

Add explicit rejection for an install root equal to the downloads folder, missing USB path, modified package manifest, different version, and bridge listening somewhere other than 127.0.0.1. Output messages contain only install paths, status codes, and versions; they contain no token, cookie, key, nonce, or audio URL.

- [ ] **Step 6: Verify the REFACTOR**

Run: node --test test/release/windows-packaging.test.js test/release/release-build.test.js

Expected: PASS on Windows; on other operating systems, static tests pass and the physical smoke test is marked not run, never green by simulation.

- [ ] **Step 7: Atomic commit**

    git add packaging/windows tools/release/build.mjs test/release/windows-packaging.test.js test/release/smoke-install.ps1
    git commit -m "feat(windows): package portable and installable launchers"

---

### Task 4: Add checksums, SBOM, and archive integrity checks

**Files:**
- Create: tools/release/write-sbom.mjs
- Create: tools/release/check-artifacts.mjs
- Create: test/release/release-integrity.test.js
- Modify: tools/release/build.mjs
- Modify: tests/secret-guard.cjs

**Interfaces:**
- writeSbom({ repoRoot, outputPath, sourceDateEpoch }) produces deterministic SPDX JSON for music-converter@1.6.0, dependencies actually present in package-lock.json, a date derived from sourceDateEpoch, and no invented license value.
- checkArtifacts({ artifactDir, expectedVersion, sourceCommit }) verifies SHA-256, sizes, manifests, extraction without traversal, absence of symlinks, and absence of secrets in distributed files.
- tests/secret-guard.cjs continues to mask values and returns only a code, count, and non-sensitive paths.

- [ ] **Step 1: Write RED integrity tests**

Add the following assertions:

    assert.match(checksums, /^[0-9a-f]{64}  music-converter-v1\\.6\\.0-/m);
    assert.equal(sbom.spdxVersion, 'SPDX-2.3');
    assert.equal(sbom.packages.find((item) => item.name === 'music-converter').versionInfo, '1.6.0');
    assert.equal(await verifyArchiveHasNoTraversal(artifact), true);
    assert.equal(await verifyGeneratedTreeIsClean(repoRoot), true);

Add mutations that must fail: one changed ZIP byte, a reordered hash, ../escape, a symlink, a .env file, a private key, a cookie, or a synthetic opaque value inserted into an archive.

- [ ] **Step 2: Run the RED tests**

Run: node --test test/release/release-integrity.test.js

Expected: FAIL because the SBOM, checksums, and verifier do not exist yet.

- [ ] **Step 3: Implement the checks**

Generate SHA256SUMS with one line per name in sorted order, two spaces between hash and name, then recalculate each hash with crypto.createHash('sha256'). Generate an SPDX 2.3 SBOM with deterministic namespace https://github.com/ironlegends/music-converter/releases/tag/v1.6.0#sbom, no random UUID, and only packages from the lockfile.

Extract each ZIP into a controlled temporary directory; reject absolute paths, .. segments, symlinks, and prohibited extensions. Scan distributed contents with the existing guard and a packaging guard that rejects secrets, cookies, private keys, .env files, captured logs, and real audio values, while allowing contract identifiers required by the bridge outside logs/UI/persistence.

The verification command must finish with git diff --exit-code -- . and git status --porcelain producing no output; it never modifies the repository.

- [ ] **Step 4: Run the GREEN tests**

Run: node --test test/release/release-integrity.test.js

Expected: PASS; recomputed hashes, SBOM, archives, and secret scan agree, and every synthetic mutation is rejected.

Run: node tools/release/check-artifacts.mjs <built-output> --version 1.6.0 --source-commit <source-commit>

Expected: RELEASE_ARTIFACTS_OK with no secret or log content displayed.

- [ ] **Step 5: REFACTOR — make results falsifiable**

Display only artifact-count, sbom-package-count, source-commit, version, tree-clean, and secret-scan=clean. Add a test that modifies each archive after generation and confirms the release command fails before publication.

- [ ] **Step 6: Verify the REFACTOR**

Run: node --test test/release/release-contract.test.js test/release/release-build.test.js test/release/release-integrity.test.js

Expected: PASS; no altered artifact or sensitive content passes the check.

- [ ] **Step 7: Atomic commit**

    git add tools/release/write-sbom.mjs tools/release/check-artifacts.mjs test/release/release-integrity.test.js tests/secret-guard.cjs tools/release/build.mjs
    git commit -m "feat(release): add v1.6 checksums and sbom"

---

### Task 5: Synchronize SemVer, README, and user guides

**Files:**
- Modify: CHANGELOG.md
- Modify: README.md
- Modify: test/guardrails/release-metadata.test.js
- Modify: dist/spotmate.user.js
- Modify: extension/chrome/manifest.json
- Modify: extension/edge/manifest.json
- Create: docs/guides/chrome-install.md
- Create: docs/guides/edge-install.md
- Create: docs/guides/pairing.md
- Create: docs/guides/usb-downloads.md
- Create: docs/guides/windows-launcher.md
- Create: docs/releases/v1.6.0.md

**Interfaces:**
- The guard reads the version from package.json and compares it with CHANGELOG.md, the README badge, the userscript @version, and both manifests; any mismatch fails before build or tag.
- Guides name exact visible controls, describe expected results, and never ask users to copy a token, cookie, nonce, remote path, or audio URL.
- docs/releases/v1.6.0.md states signature-status: unsigned-verifiable, the five expected assets, checksums/SBOM, and the separation between automation and physical gates.

- [ ] **Step 1: Write RED version and documentation tests**

Extend test/guardrails/release-metadata.test.js to reject any value other than 1.6.0, verify both manifests, find the three Quickstart guide links, and reject a license badge if LICENSE does not exist. Add a test requiring enabled=false, 503, /en1, manual Turnstile, event.isTrusted, Node 22 | 24, Chrome, Edge, pairing, USB, and SHA-256 mentions in the v1.6 documentation corpus.

- [ ] **Step 2: Run the RED tests**

Run: node --test test/guardrails/release-metadata.test.js

Expected: FAIL until the version and documentation surfaces are aligned on v1.6.0.

- [ ] **Step 3: Align the already-versioned metadata**

In the v1.6 PR from the dedicated clean worktree based on up-to-date main, verify that package.json and package-lock.json are version 1.6.0, then add the ## [1.6.0] - 2026-08-26 entry to CHANGELOG.md. Set // @version 1.6.0 in dist/spotmate.user.js and "version": "1.6.0" in both manifests; do not change any v1.5 permission. The lockfile must contain no runtime dependency added by v1.6; this PR closes #23–#26.

- [ ] **Step 4: Rewrite the README and guides with the exact workflow**

Structure README.md in the MemPalace/AdBlocker/Superpowers style: short introduction, readable badges, Quickstart, boundaries, development, and release sections. Add only CI, version 1.6.0, and Node 22 | 24 badges at the top, all flat-square, with CI linked to ci.yml on main; do not add a license badge. Add these Quickstart links:

    - Installation Chrome: docs/guides/chrome-install.md
    - Installation Edge: docs/guides/edge-install.md
    - Pairing with the launcher: docs/guides/pairing.md
    - Download to USB: docs/guides/usb-downloads.md
    - Launcher Windows: docs/guides/windows-launcher.md

chrome-install.md and edge-install.md must provide the steps for chrome://extensions or edge://extensions, Developer mode, Load unpacked, selecting the extracted folder, checking the version, and confirming that a foreign page receives no panel.

pairing.md must give this order: start the launcher, open the extension on SpotMate, click Connect to local launcher, click Authorize pairing in the launcher, confirm Pair in the extension, then check the Connected status. No code or nonce is copied, logged, or retained.

usb-downloads.md must give this order: select USB in the local picker, verify the local path, complete Turnstile manually, click Start conversions, click the track or Download all, observe the .part write and rename, then remove USB to verify a clean failure without another destination or overwrite.

windows-launcher.md must give the exact Install.ps1, run-portable.ps1, and uninstall.ps1 commands, Node 22/24 prerequisites, expected /api/status result, the 503 from /api/queue/start, the upgrade procedure, and the statement that uninstall does not delete downloads.

README and release notes must distinguish automatable work (build, versions, hashes, SBOM, secret scan, CI, draft release) from manual/physical work (real Chrome/Edge, pairing with clicks, Windows install/upgrade/uninstall on a host, physical USB, and any future signing). Signing is not a v1.6 gate because the assets are explicitly unsigned and verifiable.

- [ ] **Step 5: Run the GREEN tests**

Run: npm test

Expected: PASS, including the three historical suites tests/test_script2.cjs, tests/test_script3.cjs, and tests/test_script_complet.cjs already required by the roadmap.

Run: node --test test/guardrails/release-metadata.test.js

Expected: PASS; all five SemVer surfaces show 1.6.0, badges are consistent, and no license badge is present.

- [ ] **Step 6: REFACTOR — review visible boundaries**

Search for any statement promising launcher conversion, automatic downloads, Turnstile bypass, store installation, an existing signature, or deletion of downloads; replace only incompatible claims with the fail-closed status and exact manual workflow.

- [ ] **Step 7: Verify the REFACTOR and commit**

Run: rg -n -i "enabled=false|/api/queue/start|503|spotmate\\.online/en1|Turnstile|event\\.isTrusted|Node 22|Node 24|Chrome|Edge|pairing|USB|SHA-256|unsigned" README.md docs/guides docs/releases CHANGELOG.md

Expected: every boundary and guide can be found; no guide contains a secret or real audio URL.

    git add CHANGELOG.md README.md dist/spotmate.user.js extension test/guardrails/release-metadata.test.js tools/check-release-metadata.mjs docs/guides docs/releases
    git commit -m "chore(release): prepare v1.6.0 documentation"

---

### Task 6: Add CI gates and tagged release

**Files:**
- Modify: .github/workflows/ci.yml
- Create: .github/workflows/release.yml
- Modify: tools/release/check-artifacts.mjs
- Create: test/release/workflow-contract.test.js

**Interfaces:**
- CI runs npm ci --ignore-scripts, npm test, release tests, and two deterministic builds; it keeps contents: read permissions and uploads only a temporary artifact with 14-day retention.
- The release workflow triggers only on v*.*.*, rejects a lightweight tag, compares the tag with package.json, verifies that the commit is on main, requires a green CI run on that commit, and stops before upload if any check fails.
- GitHub release creation uses only gh release create --draft --verify-tag; it does not publish an npm package, sign with a paid key, or disclose GH_TOKEN.

- [ ] **Step 1: Write RED workflow tests**

In test/release/workflow-contract.test.js, parse the YAML as controlled text and verify read permissions, checkout and setup-node pinned to full SHAs, tag trigger, git cat-file -t, --draft --verify-tag, retention-days: 14, and absence of npm publish, Native Messaging, and injected secrets.

Add a workflow mutation that replaces a pinned action with a moving tag or removes contents: read; the test must reject it.

- [ ] **Step 2: Run the RED tests**

Run: node --test test/release/workflow-contract.test.js

Expected: FAIL because the release workflow, tag checks, and build retention do not exist.

- [ ] **Step 3: Strengthen CI with permissions and builds**

Keep the Ubuntu/Windows Node 22/24 matrix in .github/workflows/ci.yml; add npm ci --ignore-scripts, npm test, node --test test/release/*.test.js, and two builds with the same SOURCE_DATE_EPOCH. Use actions/upload-artifact pinned to a full SHA with retention-days: 14, and check git status --porcelain before and after the build. Inject no secret into this job.

Create .github/workflows/release.yml on push.tags: [v*.*.*], using checkout and setup-node pinned to the same full SHAs as CI, then:

1. verify git cat-file -t "$GITHUB_REF" returns tag and resolve commit ^{};
2. verify the tag name equals v + package.json.version;
3. verify git branch -r --contains <tag-commit> includes origin/main;
4. query gh run list --workflow ci.yml --commit <tag-commit> --status success --limit 1 without printing a token;
5. run npm ci --ignore-scripts, npm test, release tests, build, and check-artifacts;
6. wait for the protected release-qa environment before final upload, then run gh release create v1.6.0 <artifacts> --draft --verify-tag --title "Music Converter v1.6.0" --notes-file docs/releases/v1.6.0.md with GH_TOKEN only in the process environment.

The job that writes the release has permissions: contents: write; all other jobs have contents: read. CI retention is 14 days; release assets remain attached to the draft until the release is explicitly deleted.

- [ ] **Step 4: Run the GREEN tests**

Run: node --test test/release/workflow-contract.test.js

Expected: PASS; actions are pinned, the workflow is tag-only, permissions are minimal, and the release is always a draft.

Run: npm ci --ignore-scripts; npm test; node --test test/release/*.test.js

Expected: PASS; the same commit produces the same artifacts and the repository stays clean.

- [ ] **Step 5: REFACTOR — close accidental publication paths**

Fail the workflow if the tag is lightweight, the commit is not on main, CI does not succeed, the version differs, protected QA is not approved, or an artifact is missing. Never call gh release publish, npm publish, a signing tool, or a command that prints the environment.

- [ ] **Step 6: Verify the REFACTOR and commit**

Run: node --test test/release/workflow-contract.test.js test/release/release-integrity.test.js

Expected: PASS; every failure stops before draft creation and no secret reaches logs or assets.

    git add .github/workflows/ci.yml .github/workflows/release.yml tools/release/check-artifacts.mjs test/release/workflow-contract.test.js
    git commit -m "ci(release): gate v1.6.0 artifacts on annotated tags"

---

### Task 7: Run final gates and prepare the tag/release

**Files:**
- Create: docs/releases/v1.6.0-qa.md
- Read-only validation: the whole repository and external build directory
- No code changes: no runtime change during this task

**Interfaces:**
- docs/releases/v1.6.0-qa.md contains only QA results, dates, versions, states, HTTP codes, artifact hashes, and browser names; it contains no token, cookie, nonce, private USB path, or audio URL.
- The external build directory contains the five archives, SHA256SUMS, sbom.spdx.json, and release-manifest.json; the Git tree contains only branch commits and the current plan before the QA evidence commit.
- The tag is annotated v1.6.0; the GitHub Release is first created as a draft with assets and is published only after a human reads the hashes.

- [ ] **Step 1: Establish a clean baseline and run the full tests**

Run: git status --short --branch

Expected: dedicated branch is clean before QA; no unrelated change is cleaned or restored.

Run: npm ci --ignore-scripts

Expected: installation follows package-lock.json and runs no post-install script.

Run: npm test

Expected: PASS, including historical tests and fail-closed guards.

Run: node --test test/release/*.test.js

Expected: PASS for the contract, reproducibility, static Windows checks, integrity, workflows, and SemVer.

- [ ] **Step 2: Produce and verify the external build**

Run: node tools/release/build.mjs --out <external-output>

Expected: five archives and three evidence files are produced outside the repository.

Run: node tools/release/check-artifacts.mjs <external-output> --version 1.6.0 --source-commit <source-commit>

Expected: RELEASE_ARTIFACTS_OK, hashes recomputed, valid SBOM, clean secret scan, and unchanged generated tree.

Run: git diff --check

Expected: no whitespace errors.

- [ ] **Step 3: Complete the physical and manual gates**

On a real Chrome browser, install the Chrome ZIP through chrome://extensions and Load unpacked after extraction; verify version 1.6.0, v1.5 permissions, no UI on a foreign page, and operation only on /en1 or /en1/.

Repeat the same steps in real Edge through edge://extensions for the Edge ZIP.

On real Windows, perform a fresh install, start the launcher, verify enabled=false and /api/queue/start=503, upgrade, then uninstall; verify that a synthetic download file placed outside the install root remains intact.

Complete pairing with visible clicks on Connect to local launcher, Authorize pairing, and Pair; do not copy or log any nonce, token, or cookie.

With an approved physical USB device, select the destination in the local launcher, run the SpotMate workflow with manual Turnstile and explicit clicks, observe .part, atomic rename, overwrite refusal, and clean failure after removal; retain only status, code, and artifact hash. A fixture, fake mount, or code evidence does not close this gate.

Record results in docs/releases/v1.6.0-qa.md; if a gate fails or is unavailable, keep the release unpublished and do not create the tag.

- [ ] **Step 4: Verify scope and history**

Run: git diff --name-only HEAD

Expected before writing QA: the dedicated implementation worktree is clean; during this documentation phase, the five plans and the pre-existing link update in docs/roadmap.md are expected, then QA evidence is added in its own commit.

Run: git show --format= --name-only 5bbfdf2

Expected: base history contains only docs/roadmap.md and docs/superpowers/specs/2026-08-26-music-converter-productization-design.md; no base file has been rewritten.

- [ ] **Step 5: Commit only the QA evidence**

    git add docs/releases/v1.6.0-qa.md
    git commit -m "docs(release): record v1.6.0 distribution qa"

Expected: isolated documentation commit, with no runtime change, secret, or binary asset in Git.

- [ ] **Step 6: Create the annotated tag after all gates**

Required prerequisites: PR merged to main, CI green on the exact commit, review approved, SemVer guard green, reproducible build green, checksums/SBOM verified, secret scan green, real Chrome/Edge QA, real Windows QA, and pairing and physical USB tests green.

    git switch main
    git pull --ff-only origin main
    git tag -a v1.6.0 -m "Release v1.6.0"
    git push origin v1.6.0

Expected: one unique annotated v1.6.0 tag; no tag command runs before the prerequisites and no lightweight tag is accepted.

- [ ] **Step 7: Create and then publish the release separately**

The .github/workflows/release.yml workflow verifies the tag, rebuilds assets, waits for the release-qa environment, and creates only a draft GitHub Release with the five archives, SHA256SUMS, sbom.spdx.json, release-manifest.json, and v1.6 notes. Manually verify downloaded names, versions, and hashes, then publish the draft through GitHub's interface. No npm publish, deployment, or signing is included.

---

## Integration sequence and final validation

Tasks are sequential because the builder depends on the input contract, Windows bundles depend on the archives, checksums depend on final contents, CI depends on release commands, and QA depends on a versioned build. Each task has its own TDD RED/GREEN/REFACTOR cycle and a small Conventional Commit.

Final validation of this plan is strictly documentation-only:

    git diff --check
    git status --short
    git diff --name-only HEAD
    git show --format= --name-only 5bbfdf2
    node -e "const fs=require('fs'); const p='docs/superpowers/plans/2026-08-26-music-converter-v1.6-distribution.md'; const r=new RegExp([[84,79,68,79],[84,66,68]].map(a=>a.map(String.fromCharCode).join('')).join('|'),'i'); if(r.test(fs.readFileSync(p,'utf8'))) process.exit(1)"

Expected: git diff --check reports nothing; during this documentation phase, git status --short may show the five plans and the pre-existing link update to docs/roadmap.md; the base commit retains its expected files; the final search returns no lines. No code, workflow, archive, tag, push, or release is changed or run while writing this plan.

### Coverage self-review

- Userscript packaging: Tasks 1–2 and the dist/spotmate.user.js artifact.
- Chrome/Edge ZIPs, manifests, and permissions: Tasks 1–2, 5, and Task 7 Chrome/Edge QA.
- Installable/portable Windows launcher and upgrade without deleting downloads: Task 3, Windows guide, and Task 7 Windows QA.
- Local loopback and absence of Native Messaging: Tasks 1 and 3, loopback-bridge.json derived from v1.5.
- SHA-256 checksums, SBOM, reproducible build, and clean tree: Tasks 2 and 4.
- Least-privilege CI, pinned actions, 14-day retention, annotated tag, and draft release: Task 6.
- README, CI/version/Node badges, Quickstart, and Chrome/Edge/pairing/USB guides: Task 5.
- Permanent SpotMate invariants, fail-closed launcher, manual Turnstile, event.isTrusted, absence of secrets, and terminal errors: Global Constraints and Tasks 1, 3, 4, 5, and 7.
- Separation of automation from physical/manual gates and escalation if v1.5 has a contradiction: Global Constraints and Task 7.
