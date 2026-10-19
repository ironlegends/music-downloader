> **Status: Historical v1.x record — inactive and unsupported.**

# Music Converter v1.3.0 Playlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v1.3.0 of the SpotMate browser core with track selection, observable conversion states, accessible progress, cancellation, explicit resumption, and manual retry of failed tracks only.

**Architecture:** The browser SSOT core delivered in v1.2 remains authoritative for DOM inputs, sequential conversion, and URL validation. v1.3 adds a pure session model, versioned sessionStorage, a sequential runner, and an accessible playlist view; legacy scripts and the userscript remain artifacts generated from that same entry point. Final URLs stay only in volatile memory until the user clicks to download; they are not part of the serialized session, DOM text, or logs.

**Tech Stack:** Node.js 22 and 24 ESM, vanilla browser JavaScript, node:test, historical CommonJS tests, sessionStorage, deterministic v1.2 build, playwright-cli for real QA, no new npm dependency.

## Global constraints

- Prerequisite: v1.2.0 has shipped and provides src/browser/index.js, src/browser/entries/userscript.js, tools/build-browser-artifacts.mjs, dist/spotmate.user.js, and generated legacy artifacts.
- The allowed page is exactly https://spotmate.online/en1 or https://spotmate.online/en1/.
- Collection is limited to 100 non-empty tracks.
- Track starts are sequential and 2 seconds apart.
- Polling waits 4.5 seconds before each request and stops after 40 polls.
- Each track receives exactly one POST /convert.
- Accepted final URLs use the https: protocol only.
- Any HTTP, network, schema, terminal-state, or timeout error is terminal and triggers no automatic retry.
- Turnstile, submission, conversion, and download remain manual; a privileged action runs only from an event where event.isTrusted === true.
- Cancellation marks the active track cancelled, leaves tracks not yet started queued, and prevents the next track from starting.
- Resumption is always triggered by an explicit click; page load, refresh, script installation, and sessionStorage restoration start no request.
- Manual retry requeues only failed tracks; success, cancelled, and queued tracks are unchanged by this action.
- The only allowed track states are queued, converting, polling, success, failed, and cancelled; do not add pending, completed, or error aliases.
- No token, cookie, key, CSRF value, or finalAudioUrl appears in logs, UI text or persistent attributes, sessionStorage, fixtures, reports, or artifacts.
- CONVERSION_CAPABILITY.enabled remains false and POST /api/queue/start remains HTTP 503 with launcher-local-conversion-disabled; v1.3 modifies neither server.js, public/, nor src/queue-manager.js.
- script1.txt remains unchanged.
- No manifest.json, service worker, MV3 permission, or extension directory is created or changed in v1.3; extension work starts in v1.4.
- package.json remains private: true; this documentation PR stays at 1.1.0. The v1.3 PR, created in a dedicated clean worktree based on up-to-date main, carries the 1.3.0 bump, closes #9–#12, and synchronizes surfaces only after implementation gates pass.
- The canonical SemVer guard is test/guardrails/release-metadata.test.js, with tools/check-release-metadata.mjs; it covers package.json, CHANGELOG.md, the README badge, dist/spotmate.user.js, and, starting in v1.4, both manifests.
- v1.3 tickets: [#9](https://github.com/ironlegends/music-converter/issues/9) session model; [#10](https://github.com/ironlegends/music-converter/issues/10) selection/progress; [#11](https://github.com/ironlegends/music-converter/issues/11) cancellation/resumption; [#12](https://github.com/ironlegends/music-converter/issues/12) accessibility.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| src/browser/track-session.js | Pure model, selection, transitions, and safe projection | 1 |
| src/browser/session-storage.js | Versioned serialization and sessionStorage invalidation | 1 |
| src/browser/index.js | SSOT barrel updated to export playlist modules | 1, 2, 3, 4 |
| test/browser/track-session.test.js | Unit tests for the model and selection | 1 |
| test/browser/session-storage.test.js | Unit tests for serialization, rejection, and cleanup | 1 |
| src/browser/conversion-runner.js | Sequential execution, cancellation, resumption, and manual retry | 2 |
| test/browser/conversion-runner.test.js | Unit tests for transitions, delays, and injected network calls | 2 |
| src/browser/playlist-view.js | Rendering, keyboard controls, focus, ARIA, and live regions | 3 |
| src/browser/panel.css | Mobile and desktop layout for the SpotMate panel | 3 |
| test/browser/playlist-panel.test.js | Behavioral tests for DOM, accessibility, and trusted events | 3 |
| src/browser/entries/userscript.js | Canonical assembly of the core, runner, and panel for the userscript artifact | 4 |
| tools/build-browser-artifacts.mjs | Deterministic build of all v1.3 surfaces | 4 |
| test/browser/artifacts.test.js | Build parity, hashes, and absence of sensitive data | 4 |
| script2.txt | Legacy artifact generated from the core | 4 |
| script3.txt | Generated legacy artifact for voluntary HTTPS downloads | 4 |
| script_complet.txt | Complete legacy artifact generated from the core | 4 |
| dist/spotmate.user.js | Generated installable userscript | 4 |
| tests/test_script2.cjs | CommonJS regression coverage for the conversion surface | 4 |
| tests/test_script3.cjs | CommonJS regression coverage for the download surface | 4 |
| tests/test_script_complet.cjs | CommonJS regression coverage for the complete surface | 4 |
| package.json | Version 1.3.0 and build/test scripts | 5 |
| CHANGELOG.md | Published v1.3.0 entry | 5 |
| README.md | Badge and v1.3 playlist workflow | 5 |
| test/guardrails/release-metadata.test.js | Consistency guard for package/changelog/badge/userscript | 5 |
| tools/check-release-metadata.mjs | SemVer check tool used by the canonical guard | 5 |
| qa/v1.3-playlist-checklist.md | Reproducible evidence of real Chrome/Edge QA | 6 |

The files public/index.html, public/app.js, public/style.css, server.js, src/queue-manager.js, and script1.txt are explicitly out of scope. The extension manifest is absent from the map because v1.4 is the first phase to create it.

---

### Task 1: Playlist session model and versioned storage

**Files:**
- Create: `src/browser/track-session.js`
- Create: `src/browser/session-storage.js`
- Modify: `src/browser/index.js`
- Create: `test/browser/track-session.test.js`
- Create: `test/browser/session-storage.test.js`

**Interfaces:**
- TRACK_STATES is the frozen array ['queued', 'converting', 'polling', 'success', 'failed', 'cancelled'].
- createTrackSession(trackIds, createSessionId) returns { schemaVersion: 1, sessionId, tracks, activeTrackId: null }, with one track { id, selected: true, status: 'queued', progressPercent: 0, errorCode: null } per unique identifier.
- setTrackSelected(session, trackId, selected), setAllSelected(session, selected), getSelectedQueuedTrackIds(session), and getFailedTrackIds(session) return new structures or arrays without mutating the input.
- transitionTrack(session, trackId, nextState, patch = {}) accepts only valid transitions and rejects unknown states or transitions.
- toPersistedSession(session) retains only schemaVersion, sessionId, tracks, and activeTrackId; it includes no URL, input value, task ID, or raw message.
- saveSession(storage, session), loadSession(storage, currentTrackIds), and clearSession(storage) use the exact key music-converter:v1.3:playlist-session.

- [ ] **Step 1: Write RED tests for the model and selection**

Add tests to test/browser/track-session.test.js that establish these contracts before implementation:

```js
test('creates up to 100 selected queued tracks', () => {
    const session = createTrackSession(['a', 'b'], () => 'session-1');
    assert.deepEqual(session.tracks, [
        { id: 'a', selected: true, status: 'queued', progressPercent: 0, errorCode: null },
        { id: 'b', selected: true, status: 'queued', progressPercent: 0, errorCode: null }
    ]);
    assert.throws(() => createTrackSession(Array.from({ length: 101 }, (_, i) => String(i)), () => 'x'), /100/);
});

test('individual, select all, and deselect all are independent', () => {
    const initial = createTrackSession(['a', 'b'], () => 'session-1');
    const one = setTrackSelected(initial, 'a', false);
    assert.deepEqual(getSelectedQueuedTrackIds(one), ['b']);
    assert.deepEqual(getSelectedQueuedTrackIds(setAllSelected(one, true)), ['a', 'b']);
    assert.deepEqual(getSelectedQueuedTrackIds(setAllSelected(one, false)), []);
    assert.deepEqual(initial.tracks.map((track) => track.selected), [true, true]);
});

test('transitions only along the exact state graph', () => {
    const queued = createTrackSession(['a'], () => 'session-1');
    const converting = transitionTrack(queued, 'a', 'converting', { activeTrackId: 'a' });
    const polling = transitionTrack(converting, 'a', 'polling', { progressPercent: 25 });
    const success = transitionTrack(polling, 'a', 'success', { progressPercent: 100 });
    assert.equal(success.tracks[0].status, 'success');
    assert.throws(() => transitionTrack(success, 'a', 'polling'), /transition/i);
    assert.throws(() => transitionTrack(queued, 'a', 'pending'), /state/i);
});
```

- [ ] **Step 2: Run the unit RED test**

Run: `node --test test/browser/track-session.test.js`

Expected: FAIL because the model modules and functions do not exist yet.

- [ ] **Step 3: Implement the minimal model and safe projection**

Implement this graph in track-session.js: queued → converting → polling → success; queued → converting → failed; polling → failed; and converting|polling → cancelled. A failed track returns to queued only through requeueFailedTracks(session), called by the manual retry action. A cancelled track never returns automatically to queued. Validate non-empty unique identifiers with a maximum of 100; bound progress to [0, 100]; and accept only a short errorCode from network, http, schema, poll_timeout, or input.

Implement versioned JSON serialization and fail-closed cleanup in session-storage.js: invalid JSON, unknown version, malformed shape, duplicate ID, unknown state, out-of-range progress, or an ID set different from currentTrackIds triggers removeItem and returns null. If sessionStorage access fails, return null without propagating a secret or starting the runner. savedAt is unnecessary: sessionStorage is already tab-scoped, and invalidation is based on version and exact playlist identity.

- [ ] **Step 4: Run the unit GREEN tests**

Run: `node --test test/browser/track-session.test.js test/browser/session-storage.test.js`

Expected: PASS; selections are immutable, the six states are exhaustive, the projection contains only IDs and states, and every invalid session is removed before it can be resumed.

- [ ] **Step 5: REFACTOR without changing the contract**

Extract shared validation of IDs, states, and progress into internal functions named assertTrackIds, assertTrackState, and assertProgress; keep the public functions listed above and remove unsafe data before serialization. Rerun the full unit suite to prove the refactor changes neither returns nor invalidation.

Run: `node --test test/browser/track-session.test.js test/browser/session-storage.test.js`

Expected: PASS with no new serialized field or additional state.

- [ ] **Step 6: Atomic commit**

```bash
  git add src/browser/track-session.js src/browser/session-storage.js src/browser/index.js test/browser/track-session.test.js test/browser/session-storage.test.js
git commit -m "feat: add versioned playlist sessions"
```

### Task 2: Sequential runner, progress, cancellation, and manual retry

**Files:**
- Create: `src/browser/conversion-runner.js`
- Create: `test/browser/conversion-runner.test.js`
- Modify: `src/browser/index.js`

**Interfaces:**
- createConversionRunner({ session, convertTrack, sleep, onChange, onSuccess }) returns { startSelected, resumeQueued, retryFailedTracks, cancel, getSession }.
- convertTrack(track, signal) is supplied by the v1.2 core and returns either { finalAudioUrl } or { errorCode }; it already enforces SpotMate bounds: POST /convert, HTTPS, 4.5 s × 40, and terminal errors without retry.
- onChange(snapshot) receives only toPersistedSession(session); onSuccess(trackId, finalAudioUrl) receives the URL only in volatile memory and writes it neither to the session, UI, nor logs.
- retryFailedTracks() makes no request and requeues failed tracks only; startSelected() must be called afterward to start them.

- [ ] **Step 1: Write RED tests for sequencing and cancellation**

In test/browser/conversion-runner.test.js, add a fake convertTrack, a sleep function that records delays, and these tests:

```js
test('sequences queued, converting, polling, success, and failed without automatic retry', async () => {
    const calls = [];
    const changes = [];
    const session = createTrackSession(['ok', 'bad'], () => 'session-1');
    const runner = createConversionRunner({
        session,
        convertTrack: async (track) => {
            calls.push(track.id);
            return track.id === 'ok' ? { finalAudioUrl: 'https://example.invalid/ok.mp3' } : { errorCode: 'http' };
        },
        sleep: async (ms) => changes.push(['sleep', ms]),
        onChange: (snapshot) => changes.push(snapshot),
        onSuccess: () => {}
    });
    await runner.startSelected();
    assert.deepEqual(calls, ['ok', 'bad']);
    assert.equal(runner.getSession().tracks[0].status, 'success');
    assert.equal(runner.getSession().tracks[1].status, 'failed');
    assert.equal(changes.some((entry) => entry[0] === 'sleep' && entry[1] === 2000), true);
    assert.equal(runner.getSession().tracks.some((track) => track.status === 'pending'), false);
});

test('cancels the active track and never calls the next track', async () => {
    let release;
    const session = createTrackSession(['a', 'b'], () => 'session-1');
    const runner = createConversionRunner({
        session,
        convertTrack: (track, signal) => new Promise((resolve, reject) => {
            release = () => resolve({ finalAudioUrl: 'https://example.invalid/' + track.id + '.mp3' });
            signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
        }),
        sleep: async () => {},
        onChange: () => {},
        onSuccess: () => {}
    });
    const run = runner.startSelected();
    runner.cancel();
    await run;
    assert.equal(runner.getSession().tracks[0].status, 'cancelled');
    assert.equal(runner.getSession().tracks[1].status, 'queued');
    assert.equal(release, undefined);
});
```

- [ ] **Step 2: Run the runner RED test**

Run: `node --test test/browser/conversion-runner.test.js`

Expected: FAIL because the runner import is missing.

- [ ] **Step 3: Implement the minimal runner**

The runner must reject a second concurrent run, select tracks in DOM order, persist a safe projection after every transition, and call sleep(2000) only between starts. It marks a track converting immediately before the single convertTrack call, polling when the adapter reports an in-progress task, then success or failed. An AbortError marks the active track cancelled, stops the loop, and leaves remaining tracks queued; a terminal error marks the track failed, then allows the next track after the normal delay. cancel() must abort the signal before another iteration can call convertTrack.

resumeQueued() processes queued tracks only after a trusted click. retryFailedTracks() only requeues failed tracks, calls onChange, then stops. The runner never logs raw errors and never passes finalAudioUrl to onChange.

- [ ] **Step 4: Add bounds and explicit resumption tests**

Verify that 40 delays of 4500 precede the adapter's 40 polls, the 2000 ms delay never runs after cancellation, a terminal failed state triggers no second conversion, and retryFailedTracks() does not requeue success or cancelled. Also verify that serialization captured in each onChange contains no finalAudioUrl substring, URL, cookie, or synthetic token.

- [ ] **Step 5: Run GREEN and targeted historical suites**

Run: `node --test test/browser/conversion-runner.test.js tests/test_script2.cjs tests/test_script_complet.cjs`

Expected: PASS; historical delays, one POST per track, polling every 4.5 seconds up to 40 times, final HTTPS URLs, and no automatic retry remain green.

- [ ] **Step 6: REFACTOR without changing transitions**

Extract the onChange emission loop and AbortController cleanup into dedicated internal functions, keep a single sequential loop, and rerun cancellation, retry, and delay tests.

Run: `node --test test/browser/conversion-runner.test.js`

Expected: PASS; no new POST, extra delay, or automatic retry appears.

- [ ] **Step 7: Atomic commit**

```bash
  git add src/browser/conversion-runner.js src/browser/index.js test/browser/conversion-runner.test.js
git commit -m "feat: add playlist conversion runner"
```

### Task 3: Selection interface and keyboard accessibility

**Files:**
- Create: `src/browser/playlist-view.js`
- Create: `src/browser/panel.css`
- Create: `test/browser/playlist-panel.test.js`
- Modify: `src/browser/index.js`
- Modify: `src/browser/entries/userscript.js`

**Interfaces:**
- mountPlaylistPanel({ host, session, runner, document, announce }) creates or reuses #spotmate-voluntary-panel and returns { destroy, render }.
- The panel uses native button and input[type="checkbox"] controls; their events are ignored unless event.isTrusted === true.
- Actions use data-action="select-all|select-none|start|cancel|resume|retry-failed"; each track has data-track-id and a text status limited to the six states.
- Progress uses <progress max="100"> with aria-label, aria-valuemin, aria-valuemax, and aria-valuenow; #spotmate-v13-live-region has role="status", aria-live="polite", and aria-atomic="true".

- [ ] **Step 1: Write the behavioral and static RED tests**

Add tests that verify individual/select all/select none actions, rejection of synthetic events, focus, and accessibility attributes:

```js
test('selection actions require a trusted event', () => {
    const env = mountFixture();
    env.button('select-none').dispatch({ isTrusted: false });
    assert.deepEqual(env.selectedIds(), ['a', 'b']);
    env.button('select-none').dispatch({ isTrusted: true });
    assert.deepEqual(env.selectedIds(), []);
    env.button('select-all').dispatch({ isTrusted: true });
    assert.deepEqual(env.selectedIds(), ['a', 'b']);
});

test('progress and states are announced without URL or secret', () => {
    const env = mountFixture({ status: 'polling', progressPercent: 50 });
    const progress = env.track('a').querySelector('progress');
    assert.equal(progress.getAttribute('max'), '100');
    assert.equal(progress.getAttribute('aria-valuenow'), '50');
    assert.equal(env.liveRegion().getAttribute('role'), 'status');
    assert.equal(env.liveRegion().getAttribute('aria-live'), 'polite');
    assert.equal(env.panelText().includes('finalAudioUrl'), false);
    assert.equal(env.panelText().match(/https?:\\/\\//), null);
});
```

- [ ] **Step 2: Run the UI RED test**

Run: `node --test test/browser/playlist-panel.test.js`

Expected: FAIL because the v1.3 panel, trusted actions, progress, and live region are not implemented yet.

- [ ] **Step 3: Implement accessible, responsive rendering**

Render each track with a checkbox named by its visible title, exact text status, bounded progress, and a voluntary download button only for successes available in memory. Never retain an audio URL in a UI attribute or persistent text, data-*, title, aria-*, textContent, or sessionStorage; the download handler creates a temporary href only after a trusted click and immediately destroys the link.

The select-all, select-none, start, cancel, resume, and retry-failed buttons are native elements with no positive tabindex. After each render, restore focus to the action that triggered it, or to the first checkbox for the relevant track. Announce text in the live region such as "Track a: conversion in progress", "Track a: polling", "Track a: succeeded", "Track a: failed", or "Track a: cancelled"; these messages contain no URL or raw server data.

CSS must keep a readable table layout at 768 px and wider, and switch each track to a stacked grid below 768 px, with touch targets of at least 44 px, visible focus, readable contrast, and no horizontal overflow.

- [ ] **Step 4: Add keyboard, focus, ARIA, and responsive tests**

Test native Enter/Space activation, Tab navigation without positive tabindex, focus restoration after render, all six status labels, disabled states during a run, retry shown only when a track is failed, and CSS rules for @media (max-width: 767px) and desktop.

- [ ] **Step 5: Run UI GREEN and historical download tests**

Run: `node --test test/browser/playlist-panel.test.js tests/test_script3.cjs`

Expected: PASS; selection and accessibility work, untrusted events trigger no privileged action, and the download surface retains HTTPS, voluntary clicks, no iframe, and 1500 ms between starts.

- [ ] **Step 6: REFACTOR accessible rendering**

Factor the six-label dictionary, progress calculation, and requireTrustedEvent handler without changing public DOM selectors. Rerun the behavioral test to verify focus, ARIA attributes, and live region remain unchanged.

Run: `node --test test/browser/playlist-panel.test.js`

Expected: PASS with no positive tabindex and no audio URL in the panel.

- [ ] **Step 7: Atomic commit**

```bash
  git add src/browser/playlist-view.js src/browser/panel.css src/browser/index.js src/browser/entries/userscript.js test/browser/playlist-panel.test.js
git commit -m "feat: add accessible playlist controls"
```

### Task 4: Build the SSOT and ensure browser artifact parity

**Files:**
- Modify: `src/browser/index.js`
- Modify: `src/browser/entries/userscript.js`
- Modify: `tools/build-browser-artifacts.mjs`
- Create: `test/browser/artifacts.test.js`
- Regenerate: `script2.txt`
- Regenerate: `script3.txt`
- Regenerate: `script_complet.txt`
- Regenerate: `dist/spotmate.user.js`
- Modify: `tests/test_script2.cjs`
- Modify: `tests/test_script3.cjs`
- Modify: `tests/test_script_complet.cjs`

**Interfaces:**
- npm run build:browser reads only src/browser/** sources, injects the version from package.json, writes the four artifacts with deterministic ordering and line endings, then prints only names and SHA-256 hashes.
- test/browser/artifacts.test.js verifies that two consecutive runs produce identical bytes and that each artifact contains the same core revision.
- Historical tests evaluate generated artifacts; manually copying logic is prohibited.

- [ ] **Step 1: Write RED tests for reproducibility and absence of sensitive data**

Add a test that saves artifact bytes, runs the build, compares SHA-256 hashes, and inspects outputs without searching for any real value:

```js
test('the build is reproducible and artifacts disclose no sensitive data', () => {
    const files = ['script2.txt', 'script3.txt', 'script_complet.txt', 'dist/spotmate.user.js'];
    const before = Object.fromEntries(files.map((file) => [file, fs.readFileSync(path.join(rootDir, file))]));
    execFileSync(process.execPath, ['tools/build-browser-artifacts.mjs'], { cwd: rootDir, stdio: 'pipe' });
    const after = Object.fromEntries(files.map((file) => [file, fs.readFileSync(path.join(rootDir, file))]));
    for (const file of files) {
        assert.equal(sha256(before[file]), sha256(after[file]), file + ' is not reproducible');
        const source = after[file].toString('utf8');
        assert.equal(/sessionStorage[^\n]*(url|cookie|token)/i.test(source), false);
        assert.equal(/textContent[^\n]*(url|cookie|token)/i.test(source), false);
        assert.equal(/(['"`])[A-Za-z0-9+/=_-]{32,}\\1/.test(source), false);
    }
});
```

- [ ] **Step 2: Run the build RED test**

Run: `node --test test/browser/artifacts.test.js`

Expected: FAIL if the build does not produce all four v1.3 artifacts, bytes differ, or a surface does not embed the same core revision.

- [ ] **Step 3: Implement the single build and userscript entry**

Make src/browser/entries/userscript.js the canonical assembly point for the core, runner, view, and download adapter. The generator must sort entries, normalize line endings, exclude timestamps/local paths, and fail if script1.txt is modified. Artifacts preserve the exact SpotMate contract, 100-track limit, timings, polling, HTTPS, single POST, and terminal errors without retry.

The dist/spotmate.user.js userscript has @version 1.3.0; legacy scripts contain no extension metadata. script3.txt remains only the HTTPS download surface after a click; it receives no polling or secret.

- [ ] **Step 4: Run GREEN build and behavioral parity tests**

Run: `npm run build:browser`

Expected: all four artifacts are regenerated, with output limited to hashes and expected relative paths.

Run: `node --test test/browser/artifacts.test.js tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs`

Expected: PASS; CommonJS tests observe the same behavior across generated surfaces: selection, six states, cancellation before the next track, explicit resumption, manual retry, and no sensitive data.

- [ ] **Step 5: REFACTOR the deterministic generator**

Extract input sorting, line-ending normalization, and hash calculation into internal helpers; keep one write path for the four artifacts and rerun the byte comparison.

Run: `node --test test/browser/artifacts.test.js`

Expected: PASS with identical hashes before and after refactoring.

- [ ] **Step 6: Atomic artifact commit**

```bash
  git add src/browser/index.js src/browser/entries/userscript.js tools/build-browser-artifacts.mjs test/browser/artifacts.test.js script2.txt script3.txt script_complet.txt dist/spotmate.user.js tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs
git commit -m "build: generate playlist browser artifacts"
```

### Task 5: SemVer v1.3.0, changelog, badge, and user documentation

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `test/guardrails/release-metadata.test.js`
- Regenerate: `dist/spotmate.user.js` via Task 4

**Interfaces:**
- package.json.version is 1.3.0 and remains the single SemVer source.
- CHANGELOG.md starts with ## [1.3.0] - 2026-08-26 before existing sections.
- README.md shows a 1.3.0 flat-square version badge, describes selection, states, resumption, and manual retry, and keeps the launcher at false/503.
- dist/spotmate.user.js has @version 1.3.0; no manifest check is added before v1.4.

- [ ] **Step 1: Write the RED release consistency test**

Extend test/guardrails/release-metadata.test.js with exact assertions:

```js
test('v1.3 metadata is aligned', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const changelog = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
    const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
     const userscript = fs.readFileSync(path.join(rootDir, 'dist/spotmate.user.js'), 'utf8');
    assert.equal(pkg.name, 'music-converter');
    assert.equal(pkg.version, '1.3.0');
    assert.equal(pkg.private, true);
    assert.match(changelog, /^## \[1\.3\.0\] - 2026-08-26$/m);
    assert.match(readme, /version-1\.3\.0[^\n]*flat-square/);
    assert.match(userscript, /^\/\/ @version 1\.3\.0$/m);
});
```

- [ ] **Step 2: Run the metadata RED test**

Run: `node --test test/guardrails/release-metadata.test.js`

Expected: FAIL until the package, changelog, badge, and userscript metadata all show 1.3.0.

- [ ] **Step 3: Align the four release surfaces**

In the v1.3 PR from its dedicated clean worktree, update the package version, add the dated v1.3.0 entry, replace the version badge with 1.3.0, and document the user workflow: individual selection, Select all, Deselect all, visible states, cancellation before the next track, explicit Resume button, and manual Retry failed tracks button. Do not promise launcher conversion, add a license badge, or add a manifest.

- [ ] **Step 4: Run GREEN metadata and documentation tests**

Run: `node --test test/guardrails/release-metadata.test.js test/frontend-static.test.js`

Expected: PASS; README, metadata, and guardrails preserve CONVERSION_CAPABILITY.enabled=false, launcher-local-conversion-disabled, and /api/queue/start=503.

- [ ] **Step 5: REFACTOR the release guard**

Extract reading of the four surfaces into one test helper; keep separate assertions for the package, changelog, badge, and userscript; then explicitly verify that no manifest is read or required in v1.3.

Run: `node --test test/guardrails/release-metadata.test.js`

Expected: PASS with the same 1.3.0 contract and no dependency on an MV3 surface.

- [ ] **Step 6: Atomic release commit**

```bash
  git add package.json CHANGELOG.md README.md tools/check-release-metadata.mjs test/guardrails/release-metadata.test.js dist/spotmate.user.js
git commit -m "chore: release music converter 1.3.0"
```

### Task 6: Full validation and real browser QA

**Files:**
- Create: `qa/v1.3-playlist-checklist.md`
- Read-only validation: all tracked files and v1.3 artifacts
- No code or metadata changes during this task

**Interfaces:**
- The checklist retains only results, codes, counts, and hashes; it retains no audio URL, cookie, token, CSRF value, or session data.
- The final gate reports tests, build, artifacts, real QA, SemVer, commit, tag, and release states separately; green CI is not proof of a tag or release.

- [ ] **Step 1: Run unit and behavioral tests**

Run: `node --test test/browser/track-session.test.js test/browser/session-storage.test.js test/browser/conversion-runner.test.js test/browser/playlist-panel.test.js`

Expected: PASS with the exact six states, individual/select all/select none, ARIA progress, cancellation before the next track, explicit resumption, and manual retry of failed tracks only.

Run: `node --test tests/test_script2.cjs tests/test_script3.cjs tests/test_script_complet.cjs`

Expected: PASS for generated scripts, trusted clicks, final HTTPS URLs, 2000/4500 × 40 timings, one POST, and no automatic retry.

- [ ] **Step 2: Run the build and guardrails**

Run: `npm run build:browser`

Expected: PASS with deterministic artifacts.

Run: `npm test`

Expected: PASS, including the three historical v1.2 suites and all test/browser/** suites added in v1.3.

Run: `node --test test/guardrails/release-metadata.test.js`

Expected: PASS for 1.3.0, changelog, badge, and userscript; no manifest is expected in this phase.

- [ ] **Step 3: Run real Chrome and Edge QA**

Run: `npm start`

Then use playwright-cli in Chrome and Edge on https://spotmate.online/en1 after completing Turnstile manually. Record each result in qa/v1.3-playlist-checklist.md using only PASS or FAIL, viewport, browser, date, observed state, and artifact hash:

1. At 1440×900, load a synthetic playlist provided by the page, check individual boxes, Select all, and Deselect all, then confirm focus remains visible after each render.
2. At 390×844, check the stacked grid, no horizontal scrolling, touch targets, Tab navigation, and Enter/Space activation.
3. Start explicitly and observe queued, converting, polling, then success or failed in visible text and the live region; check progress values without displaying an audio URL.
4. Cancel during conversion and during the inter-track wait; confirm the active track becomes cancelled, the next track remains queued, and no following POST is sent.
5. Click Resume; confirm only queued tracks start.
6. Cause a track to fail; confirm Retry failed tracks changes no other track, sends no request before Start, and a second click does not create a duplicate run.
7. Refresh, then click Resume explicitly; confirm no request starts on load, valid state is restored, and an invalid session is deleted with no fallback.
8. In DevTools, confirm logs, DOM text, ARIA/data attributes, sessionStorage, and the panel contain no token, cookie, or finalAudioUrl; confirm programmatic untrusted clicks are inert.

Expected: real Chrome and Edge pass every case at both sizes; real unavailability of either browser blocks the release and is not replaced by simulation.

- [ ] **Step 4: Verify Git scope and separate gates**

Run: `git diff --check`

Expected: no whitespace or line-ending error.

Run: `git status --short`

Expected: no changes after the task commits.

Run: `git diff --name-only origin/main...HEAD`

Expected: only v1.3 files listed in this plan; no MV3 manifest, launcher public/ file, or script1.txt.

- [ ] **Step 5: Commit the checklist only if evidence is complete**

```bash
git add qa/v1.3-playlist-checklist.md
git commit -m "test: record v1.3 browser QA"
```

Do not create a tag, GitHub Release, npm publication, push, or merge in this task. The annotated v1.3.0 tag and GitHub Release are separate gates after review, merge to main, green CI, verified artifacts, and real Chrome/Edge QA.

## Plan self-review

- Individual/select all/select none, six states, progress, cancellation before the next track, explicit resumption, manual retry, keyboard, focus, ARIA, live regions, and both screen sizes are covered by Tasks 1–3 and Task 6 QA.
- SpotMate timings, one POST, final HTTPS URLs, terminal errors, event.isTrusted, manual Turnstile, absence of sensitive data, and launcher false/503 are global constraints and task assertions.
- Serialization is versioned by schemaVersion: 1, limited to IDs, states, selection, progress, and error codes, and deleted fail-closed when invalid or mismatched with the current playlist.
- Build, four artifacts, CommonJS parity, SemVer, CHANGELOG, badge, userscript, and absence of a manifest before v1.4 each have a task and a verification command.
- The v1.3 PR explicitly closes #9–#12; the annotated tag and GitHub Release remain separate gates after merge and CI.
