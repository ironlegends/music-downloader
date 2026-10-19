> **Status: Historical v1.x record — inactive and unsupported.**

# Music Converter v1.5.0 USB Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Keep the tasks sequential, use the stated TDD RED/GREEN/REFACTOR cycle, and stop at every gate.

**Goal:** Deliver v1.5.0 as a voluntary, authenticated extension-to-launcher bridge that downloads only a validated `finalAudioUrl` to a locally selected and revalidated USB volume, while leaving launcher conversion permanently fail-closed.

**Architecture:** The v1.4 shared browser kernel remains the SpotMate SSOT and is the only producer of a validated `finalAudioUrl`. The MV3 service worker and message adapter accept only trusted user actions, keep the session key in `storage.session`, and send canonical HMAC-authenticated requests to a separate loopback bridge on `127.0.0.1:3210`; the bridge owns pairing, validation, a volatile download queue, safe HTTPS, and Windows USB writes. The legacy launcher `QueueManager`, `SpotmateClient.convertTrack`, `CONVERSION_CAPABILITY.enabled`, and `POST /api/queue/start` remain untouched except for read-only regression proof.

**Tech Stack:** Node.js ESM on Node 22 and 24; native `http`, `crypto`, `fs`, `path`, `stream`, and `child_process`; Chrome/Edge Manifest V3; Node built-in test runner; PowerShell-backed Windows volume inspection with `shell: false`; no new runtime dependency.

## Global Constraints

- This documentation PR remains at `1.1.0`; the v1.5 release PR is created in its dedicated clean worktree based on up-to-date `main`, carries the corresponding version bump, and closes #17–#22 after the gates.
- Assume v1.4.0 has been delivered: `src/browser/index.js`, `src/browser/entries/userscript.js`, `src/browser/entries/extension.js`, `dist/spotmate.user.js`, `extension/chrome/manifest.json`, `extension/edge/manifest.json`, the shared extension assets/scripts, reproducible ZIPs, and Chrome/Edge QA already exist at the starting SHA.
- SpotMate remains exactly `https://spotmate.online/en1` or `https://spotmate.online/en1/`; reject every other origin or path.
- Preserve at most 100 tracks, 2 seconds between track starts, polling after 4.5 seconds for at most 40 polls, exactly one `POST /convert` per track, HTTPS final URLs only, terminal errors without automatic retry, manual Turnstile, and `event.isTrusted` for privileged actions.
- Keep `CONVERSION_CAPABILITY.enabled=false`; `POST /api/queue/start` continues to return HTTP 503 with `launcher-local-conversion-disabled` and never starts the legacy queue.
- The content script is untrusted. Only the service worker validates and signs bridge requests; no content-script value can select a path, destination, header, cookie, or arbitrary route.
- The bridge listens only on HTTP `127.0.0.1:3210`; it never binds `0.0.0.0`, IPv6 wildcard, or an ephemeral port (decision [#19](https://github.com/ironlegends/music-converter/issues/19)).
- Each Chrome/Edge build allows exactly its build-specific `chrome-extension://<ID>` origin; never use a wildcard, origin reflection, or a shared Chrome/Edge origin.
- The v1.5 service worker modifies both `extension/chrome/manifest.json` and `extension/edge/manifest.json` to use only `host_permissions: ["http://127.0.0.1/*"]` for loopback and `permissions: ["storage"]` solely for `storage.session` (decision [#19](https://github.com/ironlegends/music-converter/issues/19)); it adds no localhost hostname, wildcard host, downloads, cookies, webRequest, or nativeMessaging permission.
- Pairing nonces are exactly 128 random bits encoded base64url without padding, memory-only, valid for 120 seconds, one-use, and limited to five failed attempts per rolling minute (decision [#17](https://github.com/ironlegends/music-converter/issues/17)).
- Session keys are exactly 256 random bits; launcher memory expires them after 12 hours absolute or 30 minutes idle, extension state uses `storage.session`, and a launcher restart invalidates all sessions (decision [#17](https://github.com/ironlegends/music-converter/issues/17)).
- HMAC-SHA256 signs the canonical `version/method/path/timestamp/request-id/body-hash` representation; timestamps are valid only within ±30 seconds, replay cache capacity is 1024 entries for 2 minutes, request IDs are consumed atomically, and MAC comparisons are constant-time (decision [#18](https://github.com/ironlegends/music-converter/issues/18)).
- Every message body is at most 64 KiB; URL strings are at most 2048 characters; metadata is bounded; the bridge accepts at most 100 tracks per request, one active job, and two queued jobs (decisions [#18](https://github.com/ironlegends/music-converter/issues/18) and [#19](https://github.com/ironlegends/music-converter/issues/19)).
- The validated `finalAudioUrl` is the sole audio URL allowed in the signed volatile bridge payload; bounded non-URL metadata may accompany its job. The URL never appears in logs, UI, persisted state, durable queues, fixtures, reports, or error messages. No token, cookie, arbitrary header, path, or destination crosses from the extension.
- Remote downloads require HTTPS with effective port 443, reject userinfo, fragments, IP literals, `.local`, mono-label hosts, and all non-public DNS answers; revalidate DNS/IP on every connection and redirect while preserving hostname SNI and pinning the validated IP.
- Downloads validate declared type, magic bytes, and maximum size before atomic rename; files are written to an exclusive `.part`, then atomically renamed with deterministic collision suffixes and never overwrite an existing file.
- USB selection is local-only, uses stable volume identity plus removable/USB checks, and revalidates identity immediately before every track write and rename; symlinks and junctions are refused.
- The bridge queue is separate and volatile. It never calls `SpotmateClient.convertTrack` or the legacy `QueueManager`, and it never creates a durable queue containing `finalAudioUrl`.
- Native Messaging is outside v1.5.0 and remains a future option only after a threat-model decision that includes a malicious local process.
- No task changes `script1.txt`, `script2.txt`, `script3.txt`, or `script_complet.txt`; no task adds hidden downloads, Turnstile automation, CAPTCHA bypass, iframe relays, token collection, or launcher conversion.

## Contract and Threat Model

The security boundary is explicit before implementation:

1. SpotMate DOM responses, task IDs, redirects, DNS answers, response headers, content type, and audio bytes are untrusted. The browser kernel validates the page contract and `finalAudioUrl`; the bridge validates the URL again before opening a connection.
2. The content script is untrusted even when it runs on the correct page. It may propose only a kernel-produced `finalAudioUrl`; the service worker rejects unknown fields, missing trusted-action evidence, stale session state, and malformed signatures.
3. The service worker is trusted only for the exact extension build. Its key is volatile, its origin is fixed at build time, and its message adapter rejects programmatic privileged events. `storage.local`, `storage.sync`, cookies, page headers, and arbitrary destinations are out of scope and must not be read.
4. The loopback listener is an authenticated transport boundary, not protection against a malicious local process. Exact CORS, HMAC, replay protection, TTLs, limits, and fail-closed parsing protect the supported extension path; a malicious-process claim is escalated instead of silently expanded.
5. The filesystem is hostile between checks. A USB can be unplugged, remounted, made read-only, filled, or replaced at the same drive letter. Stable identity, reparse-point checks, exclusive `.part`, revalidation, and atomic no-overwrite rename are required for every track.
6. Assets to protect are session keys, pairing nonces, `finalAudioUrl`, cookies/tokens/headers, local paths, destination identity, and durable queue state. The permitted observable outputs are redacted job IDs, counts, bounded metadata, states, error codes, and non-sensitive hashes.

Threat cases that must be tested are origin confusion, content-script message forgery, pairing replay and brute force, stale timestamp, MAC mismatch, request replay, body/queue exhaustion, route confusion, SSRF through redirects or DNS rebinding, invalid media, symlink/junction traversal, USB replacement, unplug/read-only/full-volume failure, collision overwrite, launcher capability reactivation, and accidental secret leakage. A failure is terminal and explicit; no fallback, retry, alternate destination, or silent downgrade is allowed.

## Sequencing, Ownership, and Change Budget

The implementation is sequential in one assigned clean worktree based on up-to-date `main` because the queue, route contract, auth state, validator, downloader, and extension adapter share security-critical interfaces. No parallel worker may edit overlapping files; exploratory review may be read-only, but implementation remains one worker per task with a target of at most two implementation files plus their tests per task. The only independent review is the final security review, with a targeted re-review only if a real finding is corrected.

Every implementation task uses RED (a named test fails for the intended reason), GREEN (the smallest implementation passes), and REFACTOR (remove duplication without changing the contract). After each green task, record a checkpoint containing task status, files, commands/results, findings, documentation state, planned commit, and next task. Tickets v1.5 are [#17](https://github.com/ironlegends/music-converter/issues/17) pairing/session, [#18](https://github.com/ironlegends/music-converter/issues/18) signed protocol/anti-replay, [#19](https://github.com/ironlegends/music-converter/issues/19) CORS/SSRF, [#20](https://github.com/ironlegends/music-converter/issues/20) volatile queue, [#21](https://github.com/ironlegends/music-converter/issues/21) USB/atomic writes, and [#22](https://github.com/ironlegends/music-converter/issues/22) physical QA; the v1.5 PR closes #17–#22.

### Task 1: Freeze the v1.5 contract and threat-model evidence

**Owner:** orchestrator coordinates; `gpt-5.6-luna` worker, high effort, writes only the files below.

**Dependencies:** v1.4.0 branch is merged and its exact SHA is recorded; no v1.5 implementation is present.

**Files:**
- Create: `docs/security/2026-08-26-music-converter-v1.5-usb-bridge-threat-model.md`
- Create: `test/bridge-contract.test.js`
- Read-only reference: `docs/superpowers/specs/2026-08-26-music-converter-productization-design.md`, `docs/roadmap.md`, `server.js`, `src/queue-manager.js`, `src/spotmate-client.js`, and the v1.4 `extension/` tree
- Do not modify: any source module, legacy script, `package.json`, or existing documentation outside the new threat-model file

**Interfaces:** The threat model records the fixed route contract `POST /api/bridge/pair`, `POST /api/bridge/jobs`, `GET /api/bridge/status`, `POST /api/bridge/cancel`, `GET /bridge/pairing`, and `GET /bridge/destination`; `test/bridge-contract.test.js` first proves that the written contract is complete, while Task 3 adds executable route-constant assertions.

- [ ] **Step 1 — RED: write the contract test before implementation**

Create a documentation contract test with these named assertions:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('threat model records the fixed bridge contract', () => {
    const threatModel = fs.readFileSync(
        'docs/security/2026-08-26-music-converter-v1.5-usb-bridge-threat-model.md',
        'utf8'
    );
    for (const term of [
        '127.0.0.1:3210', '/api/bridge/pair', '/api/bridge/jobs',
        '/api/bridge/status', '/api/bridge/cancel', '/bridge/pairing',
        '/bridge/destination', 'finalAudioUrl', 'Native Messaging'
    ]) assert.ok(threatModel.includes(term), `missing contract term: ${term}`);
});
```

Run: `node --test test/bridge-contract.test.js`

Expected: FAIL because the threat-model document and its contract terms do not yet exist.

- [ ] **Step 2 — GREEN: record the threat model and contract acceptance matrix**

Write the threat-model document with assets, trust boundaries, attacker capabilities, route/method/body limits, redaction rules, SSRF rules, USB rules, fail-closed outcomes, explicit non-goals, and the exact physical QA matrix from Task 10. The document must state that a malicious local process and Native Messaging are future scope, not silently accepted assumptions.

Run: `rg -n "127\.0\.0\.1:3210|pair|jobs|status|cancel|finalAudioUrl|Native Messaging|FAT32|exFAT|NTFS" docs/security/2026-08-26-music-converter-v1.5-usb-bridge-threat-model.md`

Expected: every fixed contract and threat boundary is present without a token, cookie, usable nonce, session key, path, destination, or real URL.

- [ ] **Step 3 — REFACTOR: make the contract assertions deterministic**

Keep the test limited to constants and route names; use generated synthetic URLs only in later tests. Do not introduce a shared fixture containing a reusable secret or `finalAudioUrl`.

Run: `node --test test/bridge-contract.test.js`

Expected: PASS; the written threat model remains the source for the fixed route contract until Task 3 adds executable route constants.

- [ ] **Step 4 — Commit the documentation/test contract**

```bash
git add docs/security/2026-08-26-music-converter-v1.5-usb-bridge-threat-model.md test/bridge-contract.test.js
git commit -m "docs(security): define v1.5 bridge threat model"
```

Gate: threat model has no open decisions, the fixed route/port contract is agreed by the implementation owner, and no implementation begins with a missing security invariant.

### Gate before code: reread the official loopback permission guidance

Before any v1.5 code is written, reread:

- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- https://developer.chrome.com/blog/local-network-access
- https://learn.microsoft.com/en-us/deployedge/ms-edge-local-network-access

Record the decision against tickets #17–#19. The Chrome documentation requires
`host_permissions` for cross-origin service-worker `fetch`; the Edge documentation
currently indicates that extensions with host permissions can access the local
network. The real Chrome and Edge smoke remains mandatory. If the current state
requires an additional permission or architecture, or if the service worker cannot
establish the intentional flow, STOP, comment on #19, and obtain a security/product
decision; invent nothing and do not write implementation code.

### Task 2: Implement pairing, session lifecycle, HMAC, and replay protection

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Task 1 contract and threat model; no dependency on network or USB code.

**Files:**
- Create: `src/bridge-auth.js`
- Create: `test/bridge-auth.test.js`
- Modify: `test/bridge-contract.test.js` only if an exported auth constant is needed; preserve its route assertions

**Interfaces:**
- `createBridgeAuth({ clock, randomBytes, originAllowlist }) -> { startPairing, completePairing, authenticateRequest, invalidateAll, getSessionSnapshot }`
- `startPairing(origin) -> { pairingNonce, expiresAt }` where the raw nonce is returned only to the in-memory caller and never to UI/log/persistence
- `completePairing({ origin, pairingNonce }) -> { sessionId, sessionKey }` once only; store the key only in launcher memory and return it only to the service-worker adapter
- `authenticateRequest({ origin, method, path, headers, body }) -> { sessionId }` or a terminal typed error
- `canonicalRequest({ method, path, timestamp, requestId, body }) -> Buffer` using exactly `v1\\nMETHOD\\nPATH\\nTIMESTAMP\\nREQUEST_ID\\nBODY_SHA256_HEX`

- [ ] **Step 1 — RED: test the complete auth contract**

Add these named tests: `pairing nonce is 16 random bytes base64url and expires at 120 seconds`; `pairing nonce is one-use`; `sixth failed pairing attempt in one minute is rejected`; `session key is 32 random bytes`; `session expires at 12 hours or 30 minutes idle`; `launcher restart invalidates sessions`; `canonical HMAC rejects method/path/body/timestamp/request-id changes`; `timestamps outside plus-or-minus 30 seconds are terminal`; `replay cache is capped at 1024 entries for 2 minutes`; `MAC comparison does not use string equality`.

Use a deterministic clock and injected random source; assert only lengths, states, error codes, and hashes. Never print or snapshot raw generated values.

Run: `node --test test/bridge-auth.test.js`

Expected: FAIL on missing exports or each unimplemented security behavior.

- [ ] **Step 2 — GREEN: implement the smallest in-memory auth state machine**

Use `crypto.randomBytes(16)` for pairing and request nonces, `crypto.randomBytes(32)` for session keys, base64url without padding, a per-origin rolling failure counter, an atomic consume-before-return pairing map, monotonic expiry checks from the injected clock, and `crypto.timingSafeEqual` after equal-length MAC decoding. Store replay keys as `sessionId + requestId`, evict expired entries before capacity checks, and reject a new request rather than evicting a live replay entry when 1024 live entries are present.

Run: `node --test test/bridge-auth.test.js test/bridge-contract.test.js`

Expected: PASS with no emitted secret values.

- [ ] **Step 3 — REFACTOR: isolate canonicalization and redaction**

Keep canonical bytes, authentication, pairing, expiry, and replay storage in separate pure/internal functions. Expose snapshots containing counts and expiry states only; never expose keys, nonces, MACs, or request bodies.

Run: `node --test test/bridge-auth.test.js`

Expected: PASS; static inspection confirms no `console` call and no persistence API in `src/bridge-auth.js`.

- [ ] **Step 4 — Commit**

```bash
git add src/bridge-auth.js test/bridge-auth.test.js
git commit -m "feat: add bridge pairing authentication"
```

Gate: all auth tests pass; the security reviewer is not yet required, but any deviation from exact nonce/key/TTL/replay/MAC constants stops the sequence.

### Task 3: Validate origins, schemas, limits, and safe bridge payloads

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Task 2 canonical auth interface; v1.4 `extension/chrome/manifest.json` and `extension/edge/manifest.json` provide the build-specific Chrome and Edge IDs.

**Files:**
- Create: `src/bridge-validator.js`
- Create: `test/bridge-validator.test.js`
- Modify: `test/bridge-contract.test.js` to import the finalized constants if needed

**Interfaces:**
- `BRIDGE_PORT = 3210`
- `BRIDGE_ROUTES = { pair, jobs, status, cancel, pairingUi, destinationUi }`
- `validateOrigin(origin, buildId) -> exact chrome-extension://<ID> match`
- `validateBridgeEnvelope({ method, path, origin, headers, body }) -> { route, sessionId, requestId, payload }`
- `validateJobPayload(body) -> { jobs: [{ finalAudioUrl, metadata }] }` with unknown keys rejected
- `validateFinalAudioUrl(value) -> URL` with syntax-only destination checks; network checks remain in `safe-https-client.js`

- [ ] **Step 1 — RED: write boundary and fuzz-style table tests**

Add named tests for exact Chrome origin, exact Edge origin, wrong ID, wildcard, reflected origin, HTTP origin, non-bridge route, body over 64 KiB, more than 100 jobs, more than two queued jobs at queue admission, URL over 2048 characters, HTTP/FTP URL, explicit non-443 port, userinfo, fragment, IP literal, `.local`, mono-label host, unknown object keys, unbounded metadata, path, destination, cookie, and arbitrary-header fields.

Use synthetic values generated inside each test and assert only stable error codes such as `origin-not-allowed`, `payload-too-large`, `url-not-allowed`, and `field-not-allowed`.

Run: `node --test test/bridge-validator.test.js test/bridge-contract.test.js`

Expected: FAIL until the validator exports and rejects every listed boundary.

- [ ] **Step 2 — GREEN: implement strict parsing and bounded projection**

Parse JSON only after enforcing the raw byte limit. Accept only the fixed routes and methods. Project accepted jobs to `{ finalAudioUrl, metadata: { title, artist, album } }`, cap each metadata field at 256 Unicode code points and the combined metadata at 2048 code points, cap one request at 100 jobs, and reject any other key. Return no original body and no URL in thrown error messages.

Run: `node --test test/bridge-validator.test.js test/bridge-contract.test.js`

Expected: PASS; accepted payloads contain no path, destination, header, cookie, token, or arbitrary extension data.

- [ ] **Step 3 — REFACTOR: separate syntax and policy validators**

Keep exact-origin and schema validation independent from DNS/IP validation. Make every policy constant named and exported for tests; do not duplicate URL parsing in later modules.

Run: `node --test test/bridge-validator.test.js`

Expected: PASS and `rg -n "\*|Reflect|Origin.*headers|console\." src/bridge-validator.js` finds no wildcard, reflection, or secret-bearing logging path.

- [ ] **Step 4 — Commit**

```bash
git add src/bridge-validator.js test/bridge-validator.test.js test/bridge-contract.test.js
git commit -m "feat: validate bridge origins and payloads"
```

Gate: contract, origin, schema, size, metadata, URL syntax, and forbidden-field tests pass; CORS configuration remains exact per build.

### Task 4: Add the safe HTTPS client with DNS rebinding and redirect defenses

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Task 3 URL syntax projection; no dependency on Windows USB code.

**Files:**
- Create: `src/safe-https-client.js`
- Create: `test/safe-https-client.test.js`

**Interfaces:**
- `createSafeHttpsClient({ dnsLookup, request, clock }) -> { open, readToSink }`
- `validatePublicHttpsUrl(url) -> { hostname, port: 443, protocol: 'https:', addressFamily }`
- `open(url, { signal, maxRedirects: 5 }) -> { response, finalUrl, pinnedAddress, servername }`

- [ ] **Step 1 — RED: test SSRF and connection invariants**

Add named tests for public DNS success, loopback/private/link-local/multicast/reserved IPv4 and IPv6 rejection, DNS answer set containing one private address, IP literal rejection, `.local` rejection, mono-label rejection, userinfo/fragment/non-443 rejection, redirect revalidation, redirect loop/limit, DNS change between redirect and connection, fixed hostname SNI with pinned resolved address, absence of cookies and caller-supplied headers, and terminal network errors without retry.

Run: `node --test test/safe-https-client.test.js`

Expected: FAIL because the module and safe transport are absent.

- [ ] **Step 2 — GREEN: implement manual redirects and pinned connections**

Use `redirect: 'manual'`; accept only 3xx locations that parse as absolute HTTPS URLs and pass every URL policy check. Resolve all A/AAAA answers, reject if any answer is non-public, select one validated address, and connect to that address while passing the original hostname as TLS `servername`. Re-run resolution and policy checks for every redirect and immediately before each connection. Send only fixed transport headers required for negotiation; ignore all extension headers and never forward cookies.

Run: `node --test test/safe-https-client.test.js`

Expected: PASS; tests prove the request target is the pinned public address while SNI remains the validated hostname.

- [ ] **Step 3 — REFACTOR: make redirect, DNS, and socket policies injectable**

Keep real DNS/socket adapters thin so tests use injected deterministic adapters. Ensure errors expose only stable codes and host-independent context; do not include `finalAudioUrl`, resolved IP, response body, or headers in logs/errors.

Run: `node --test test/safe-https-client.test.js`

Expected: PASS with no sensitive values in captured diagnostics.

- [ ] **Step 4 — Commit**

```bash
git add src/safe-https-client.js test/safe-https-client.test.js
git commit -m "feat: enforce safe bridge HTTPS destinations"
```

Gate: SSRF, rebinding, redirect, SNI, header, and no-retry tests pass; any inability to prove DNS/IP checks on every connection blocks the task.

### Task 5: Implement bounded volatile downloading and redacted job results

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Task 3 bounded job projection and Task 4 safe HTTPS stream.

**Files:**
- Create: `src/bridge-downloader.js`
- Create: `test/bridge-downloader.test.js`

**Interfaces:**
- `downloadBridgeTrack({ job, usb, httpsClient, signal, clock }) -> { fileName, bytes, status }`
- `validateAudioResponse({ contentType, firstBytes, contentLength }) -> { format, maxBytes: 268435456 }`
- `redactJob(job) -> { id, state, bytes, format, errorCode }` with no URL

- [ ] **Step 1 — RED: test type, magic, size, abort, and redaction**

Add named tests for accepted MPEG/ID3, OggS, FLAC, and MP4 `ftyp` signatures; content-type/magic mismatch; missing or excessive content length; streamed size over 256 MiB; network error; cancellation; USB disappearance during stream; `.part` cleanup; and `redactJob` excluding URL, path, destination, headers, cookies, and keys.

Run: `node --test test/bridge-downloader.test.js`

Expected: FAIL because no bridge downloader exists.

- [ ] **Step 2 — GREEN: stream to exclusive volatile `.part` and expose redacted state**

Require the safe client to provide the already-validated final URL but do not store it outside the in-memory active job. Open the target through `windows-usb.js` with exclusive creation, enforce the 256 MiB byte limit while streaming, validate magic bytes before committing, abort and remove `.part` on every failure, and return only bounded filename/bytes/format/state data.

Run: `node --test test/bridge-downloader.test.js`

Expected: PASS; captured logs, events, and return values contain no URL or filesystem path.

- [ ] **Step 3 — REFACTOR: centralize terminal errors and cleanup**

Use one terminal error mapping for `invalid-media`, `size-limit`, `network-failure`, `cancelled`, `usb-unavailable`, `read-only`, and `disk-full`; never retry or switch destination. Make cleanup idempotent and run it before returning each terminal error.

Run: `node --test test/bridge-downloader.test.js`

Expected: PASS and a repeated cleanup path never removes a file that was not created by the current job.

- [ ] **Step 4 — Commit**

```bash
git add src/bridge-downloader.js test/bridge-downloader.test.js
git commit -m "feat: add volatile bridge downloader"
```

Gate: media validation, size, cleanup, no-retry, redaction, and cancellation tests pass.

### Task 6: Add the separate queue and authenticated bridge routes

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Tasks 2–5; v1.4 extension IDs and existing launcher server contract.

**Files:**
- Create: `src/bridge-queue-manager.js`
- Create: `test/bridge-queue-manager.test.js`
- Modify: `server.js` only to mount the separate `127.0.0.1:3210` bridge listener and local UI route handlers; do not alter legacy queue behavior
- Create or modify: `test/bridge-e2e.test.js` only for the route-level contract introduced here

**Interfaces:**
- `createBridgeQueueManager({ auth, validator, downloader, usb, clock }) -> { enqueue, status, cancel, close }`
- `enqueue({ sessionId, jobs }) -> { jobIds }` with one active and at most two queued
- `status({ sessionId }) -> { active, queued, completed, failed, cancelled }` containing IDs, states, bounded metadata, byte counts, and error codes only
- `cancel({ sessionId, jobIds }) -> { cancelledIds }`
- `createBridgeListener({ port: 3210, auth, validator, queue, corsOrigin }) -> http.Server`
- `POST /api/bridge/pair` accepts exactly `{ action: 'start' }` to issue a volatile nonce and exactly `{ action: 'complete', pairingNonce }` to consume it and return session material only to the in-memory service-worker caller; the UI route never renders either value.
- `POST /api/bridge/jobs` accepts only the validator projection `{ jobs: [{ finalAudioUrl, metadata }] }`; `GET /api/bridge/status` and `POST /api/bridge/cancel` require the signed session envelope.

- [ ] **Step 1 — RED: prove queue isolation and route behavior**

Add named tests for one active/two queued admission, fourth job rejection, status redaction, cancellation before start, cancellation of active stream, terminal downloader failure without retry, volatile state after process restart, exact CORS response for the build origin, rejection of every other origin, signed `pair/jobs/status/cancel` routes, and unchanged legacy `POST /api/queue/start` returning 503.

Add a static assertion that `src/bridge-queue-manager.js` does not import `src/queue-manager.js` or `src/spotmate-client.js`, and that no call expression named `convertTrack` exists in the bridge modules.

Run: `node --test test/bridge-queue-manager.test.js test/bridge-e2e.test.js test/server.test.js`

Expected: FAIL until queue, listener, and route wiring exist.

- [ ] **Step 2 — GREEN: implement volatile queue and route dispatch**

Run pairing through `auth`; authenticate every non-pair route before parsing job data; validate the body; enqueue only projected jobs; emit redacted status; and consume replay IDs before invoking a handler. Keep `GET /api/bridge/status` and `POST /api/bridge/cancel` signed. Keep `POST /api/queue/start` on its current 503 branch before any legacy queue call. Pairing and destination UI routes render only local redacted state; they never accept an extension-supplied path or destination.

Use fixed route/method dispatch, fixed CORS headers for the build origin, `Access-Control-Allow-Origin` only when the exact allowlist matches, and no reflected request origin. Return stable status codes and error codes without request bodies, URLs, paths, headers, cookies, MACs, keys, or nonces.

Run: `node --test test/bridge-queue-manager.test.js test/bridge-e2e.test.js test/server.test.js`

Expected: PASS; queue status cannot reveal `finalAudioUrl`, route failures are terminal, and no legacy conversion call occurs.

- [ ] **Step 3 — REFACTOR: isolate bridge lifecycle from launcher lifecycle**

Make bridge restart/close wipe auth and queue memory, abort active streams, remove owned `.part` files, and leave the existing launcher server/status/events unchanged. Do not reuse legacy pause/rate-limit/retry behavior.

Run: `node --test test/bridge-queue-manager.test.js test/bridge-e2e.test.js test/server.test.js`

Expected: PASS; the only shared launcher assertion is the fail-closed capability/503 contract.

- [ ] **Step 4 — Commit**

```bash
git add src/bridge-queue-manager.js server.js test/bridge-queue-manager.test.js test/bridge-e2e.test.js
git commit -m "feat: add isolated bridge download queue"
```

Gate: authenticated routes, exact CORS, capacity, redaction, cancellation, restart invalidation, no-retry, legacy isolation, and 503 regression tests pass. This is the first security review boundary; record a targeted review request for the final reviewer, but continue only with green tests.

### Task 7: Add Windows USB identity, revalidation, and atomic no-overwrite writes

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Task 5 downloader interface and Task 6 queue ownership; Windows execution environment is required for integration proof.

**Files:**
- Create: `src/windows-usb.js`
- Create: `test/windows-usb.test.js`
- Modify: `src/bridge-downloader.js` only to consume the finalized USB interface; preserve its redaction and byte/magic gates

**Interfaces:**
- `listApprovedUsbVolumes({ execFile }) -> [{ volumeId, driveLetter, fileSystem, removable, usb }]`
- `selectUsbVolume(volumeId) -> UsbVolumeHandle`
- `UsbVolumeHandle.revalidate() -> { volumeId, driveLetter, fileSystem }`
- `UsbVolumeHandle.createExclusivePart(relativeName) -> WritableHandle`
- `UsbVolumeHandle.atomicRenameNoOverwrite(partName, finalName) -> { finalName }`

- [ ] **Step 1 — RED: write mockable identity and filesystem tests**

Add named tests for stable volume identity surviving drive-letter changes, removable and USB checks, rejection of fixed/non-USB volumes, revalidation mismatch, unplug, read-only, full volume, symlink, junction/reparse point, exclusive `.part` collision, atomic rename, deterministic ` (1)`, ` (2)` collision suffixes, and refusal to overwrite an existing final file.

Run: `node --test test/windows-usb.test.js`

Expected: FAIL because the module and handle are absent.

- [ ] **Step 2 — GREEN: implement local-only Windows volume and file operations**

Use `execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ...], { shell: false })` for volume metadata. Require stable volume identity, `DriveType=2`, `BusType=USB`, and a supported FAT32, exFAT, or NTFS filesystem. Resolve every path under the selected volume root, reject symlinks/junctions and Windows reparse points with `lstat`/file attributes, revalidate before every track and immediately before rename, open `.part` with exclusive creation, flush/close it, and atomically rename only when the destination does not exist.

Run: `node --test test/windows-usb.test.js`

Expected: PASS with injected command/filesystem adapters; no shell interpolation and no extension-supplied path/destination.

- [ ] **Step 3 — REFACTOR: keep collision and cleanup deterministic**

Centralize filename sanitization from bounded metadata, use a fixed suffix sequence, preserve extension from validated media format, and make unplug/read-only/full failures terminal without trying another drive, directory, or filename.

Run: `node --test test/windows-usb.test.js test/bridge-downloader.test.js`

Expected: PASS; the downloader and USB module agree on ownership and cleanup.

- [ ] **Step 4 — Commit**

```bash
git add src/windows-usb.js src/bridge-downloader.js test/windows-usb.test.js test/bridge-downloader.test.js
git commit -m "feat: add safe USB volume writes"
```

Gate: mocked identity/filesystem tests pass and a Windows-only physical QA reservation exists for Task 10; no simulated result is accepted as the physical gate.

### Task 8: Harden the MV3 service worker and message adapter

**Owner:** `gpt-5.6-luna` worker, high effort.

**Dependencies:** Tasks 2–7; v1.4 extension content script, shared assets/scripts, and both manifests are present; build-specific Chrome/Edge IDs are known from the manifests.

**Files:**
- Modify: `extension/service-worker.js`
- Modify: `extension/message-adapter.js`
- Modify: `extension/chrome/manifest.json`
- Modify: `extension/edge/manifest.json`
- Create: `test/extension-static.test.js`

**Interfaces:**
- `createMessageAdapter({ clock, tokenStore, signer }) -> { handleTrustedClick, handleKernelResult, handleRuntimeMessage }`
- `handleTrustedClick(event, action) -> signed bridge request` only when `event.isTrusted === true`
- `service-worker` startup clears `storage.session` and in-memory session state; pairing stores only the session ID/key in `storage.session`
- `signBridgeRequest({ sessionId, sessionKey, method, path, body, timestamp, requestId }) -> { headers, body }`

- [ ] **Step 1 — RED: test static and behavioral extension boundaries**

Add named tests for exact SpotMate content-script match, exact build origin, no wildcard/reflected origin, `host_permissions` equal only to `["http://127.0.0.1/*"]`, `permissions` equal only to `["storage"]` for `storage.session`, no localhost hostname, no broad permissions, no `storage.local`/`storage.sync`, no cookies, no downloads, no webRequest, no nativeMessaging, no arbitrary headers, no destination/path input, rejection of missing or false `event.isTrusted`, rejection of forged runtime messages, only kernel-produced `finalAudioUrl` accepted, no automatic pairing/download at install/startup, session stored only in `storage.session`, startup invalidation, and no URL in UI/log/status payloads.

Run: `node --test test/extension-static.test.js`

Expected: FAIL on missing adapter behavior or any v1.5 service-worker boundary.

- [ ] **Step 2 — GREEN: implement trusted-action mediation and signing**

Make visible extension UI handlers call `handleTrustedClick(event, action)` directly; mint a short-lived in-memory action capability only after `event.isTrusted === true`; require that capability for pairing, enqueue, cancel, and destination-related messages; accept `finalAudioUrl` only from the v1.4 kernel adapter; build fixed paths and fixed headers; sign through the canonical auth function; and send no cookies or caller headers. Store the resulting session material only in `chrome.storage.session` and clear it on service-worker startup.

Run: `node --test test/extension-static.test.js test/bridge-auth.test.js test/bridge-validator.test.js`

Expected: PASS; programmatic events, content-script injections, arbitrary message fields, and startup-time actions cannot reach bridge mutation routes.

- [ ] **Step 3 — REFACTOR: keep adapter and worker responsibilities narrow**

Keep DOM/page values in the kernel adapter, trusted-event checks in `message-adapter.js`, session storage/signing/transport in `service-worker.js`, and redacted statuses in the UI adapter. Do not duplicate SpotMate conversion logic or expose the final URL for rendering.

Run: `node --test test/extension-static.test.js test/bridge-e2e.test.js`

Expected: PASS; static import and permission checks show no legacy queue or direct remote download path in the extension.

- [ ] **Step 4 — Commit**

```bash
git add extension/service-worker.js extension/message-adapter.js extension/chrome/manifest.json extension/edge/manifest.json test/extension-static.test.js
git commit -m "feat: authenticate MV3 bridge actions"
```

Gate: extension static/behavioral tests pass on both build IDs; any new permission or message field requires a security decision and stops the task.

### Task 9: Complete end-to-end bridge proof and sensitive-data guardrails

**Owner:** orchestrator coordinates; `gpt-5.6-luna` worker for test-only changes, high effort.

**Dependencies:** Tasks 2–8 are green and their commits are recorded.

**Files:**
- Modify: `test/bridge-e2e.test.js`
- Create: `test/bridge-sensitive-data.test.js`
- Read-only: all bridge modules, `server.js`, extension files, legacy queue/client, and existing secret guards

**Interfaces:** E2E uses only injected DNS, HTTP, filesystem, clock, and downloader adapters; it never reaches SpotMate, Spotify, a real audio URL, a real account, a real cookie, or a real secret.

- [ ] **Step 1 — RED: define the full supported user flow**

Add one deterministic E2E test that pairs through the exact extension origin, submits two synthetic `finalAudioUrl` jobs after a trusted-action adapter call, observes redacted status, cancels one queued job, completes one validated download through an injected safe client/USB handle, replays the same request, restarts the launcher, and checks that the old session is rejected. Add assertions that the legacy capability remains false and `/api/queue/start` remains 503.

Run: `node --test test/bridge-e2e.test.js test/bridge-sensitive-data.test.js`

Expected: FAIL until all routes and lifecycle transitions are connected.

- [ ] **Step 2 — GREEN: prove integration and leakage absence**

The sensitive-data suite must capture logs, errors, events, status JSON, UI-facing JSON, `storage.session` writes, in-memory queue snapshots, and test artifacts, then assert that none contains the generated `finalAudioUrl`, token, cookie, header, path, destination, pairing nonce, session key, or MAC. Assertions may inspect presence/count/error-code fields only.

Run: `node --test test/bridge-e2e.test.js test/bridge-sensitive-data.test.js test/server.test.js`

Expected: PASS; one track produces one bridge job and one downloader invocation, replay is terminal, no automatic retry occurs, and launcher conversion remains disabled.

- [ ] **Step 3 — REFACTOR: make E2E cleanup fail-safe**

Ensure every test closes the bridge listener, invalidates sessions, aborts active streams, and removes only synthetic files owned by the test. Keep generated secrets in process memory and never include them in assertion messages.

Run: `node --test test/bridge-e2e.test.js test/bridge-sensitive-data.test.js`

Expected: PASS repeatedly in the same process and in a fresh process.

- [ ] **Step 4 — Commit**

```bash
git add test/bridge-e2e.test.js test/bridge-sensitive-data.test.js
git commit -m "test: prove bridge lifecycle and redaction"
```

Gate: E2E pairing, signed job, status, cancel, replay, restart, 503, no-retry, one-job, and no-leakage assertions pass with synthetic inputs only.

### Task 10: Security review, physical USB QA, release alignment, and final gates

**Owner:** orchestrator; one independent `gpt-5.6-terra` security reviewer at high-risk boundary with xhigh effort; no additional reviewer unless a real finding changes the surface.

**Dependencies:** Tasks 1–9 green; v1.4 Chrome/Edge baseline evidence available; physical Windows USB devices and a disposable test volume are available.

**Files:**
- Modify: `package.json` to `1.5.0` only at the release-alignment step
- Modify: `CHANGELOG.md` with the v1.5.0 entry
- Modify: `README.md` with the actual v1.5 bridge limits, manual pairing/download flow, USB constraints, and unchanged launcher 503 state
- Modify: `extension/chrome/manifest.json` version during release alignment
- Modify: `extension/edge/manifest.json` version during release alignment
- Modify: `tools/check-release-metadata.mjs` and `test/guardrails/release-metadata.test.js`
- Read-only: all source/tests/docs from Tasks 1–9 during review

- [ ] **Step 1 — RED: run the complete impacted test matrix before final alignment**

Run:

```powershell
node --test test/bridge-auth.test.js test/bridge-validator.test.js test/safe-https-client.test.js test/bridge-downloader.test.js test/bridge-queue-manager.test.js test/windows-usb.test.js test/extension-static.test.js test/bridge-e2e.test.js test/bridge-sensitive-data.test.js test/server.test.js
```

Expected: any failure returns to its owning task; do not soften an assertion or skip a physical requirement.

- [ ] **Step 2 — GREEN: run the independent security review**

Give the reviewer one compact handoff containing the exact validated SHA, the threat model, all changed files, the route/auth/SSRF/USB invariants, and the full test output. Request one verdict with findings classified `REAL` or `NOT_REAL`, severity, domain, exact file/line evidence, exploit precondition, and required test. Review scope must include origin allowlisting, pairing brute force, HMAC canonicalization, replay atomicity, key expiry/restart, payload bounds, URL/DNS/redirect/SNI policy, redaction, queue isolation, trusted events, reparse points, atomic rename, and legacy 503.

Expected: `PASS` with no blocking `REAL` finding. A `REQUEST_CHANGES` result stops the release, groups fixes by domain, runs one targeted re-review after correction, and does not start a third identical review.

- [ ] **Step 3 — GREEN: execute physical USB QA on real Windows volumes**

Run the supported flow on each filesystem with a real removable USB device:

| Case | Required observation | Expected result |
| --- | --- | --- |
| FAT32 | select stable USB identity, download one synthetic test response | `.part` then atomic final file; bounded format/size accepted |
| exFAT | repeat after drive-letter change | stable identity revalidation succeeds; no overwrite |
| NTFS | repeat with a pre-existing same-name file | deterministic suffix is used; original is unchanged |
| Unplug before write | remove device after queue admission | terminal `usb-unavailable`; no alternate destination or retry |
| Unplug before rename | remove device after `.part` begins | `.part` is cleaned when reachable; no final partial file |
| Read-only | make target volume read-only | terminal `read-only`; no overwrite and no retry |
| Full drive | fill disposable volume until target write fails | terminal `disk-full`; no alternate destination |
| Junction/symlink | place a junction and symlink below the selected root | both are refused; no write outside the volume |

Record only filesystem, state, error code, byte count, non-sensitive hash, and timestamps. Do not retain URLs, paths, volume serials, keys, nonces, cookies, or tokens in the QA artifact.

Expected: every row passes exactly as stated; a missing physical device or failed real observation blocks v1.5.0 and cannot be replaced by a fixture.

- [ ] **Step 4 — GREEN: align release metadata after behavior is proven**

In the v1.5 implementation/release PR from the clean dedicated worktree, update `package.json` to `1.5.0`, add the dated `CHANGELOG.md` entry, align the README badge, `dist/spotmate.user.js` metadata, and both manifest versions, and close #17–#22. Do not publish, tag, create a GitHub Release, or alter the launcher capability in this task.

Run:

```powershell
npm test
node --test test/guardrails/release-metadata.test.js test/guardrails/secret-guard.test.js test/guardrails/static-scan.test.js
git diff --check
```

Expected: `npm test` is green, all guardrails are green, metadata is synchronized to `1.5.0`, and no secret or sensitive bridge value appears in tracked files.

- [ ] **Step 5 — REFACTOR: perform the final scope and evidence audit**

Run:

```powershell
git status --short
git diff --name-only f57b3de..HEAD
git diff --check f57b3de..HEAD
rg -n "CONVERSION_CAPABILITY|launcher-local-conversion-disabled|SpotmateClient|QueueManager|convertTrack|finalAudioUrl|storage\.session|event\.isTrusted|chrome-extension://" src server.js extension test docs README.md
```

Expected: only intended v1.5 files are changed in the dedicated implementation/release branch; `CONVERSION_CAPABILITY.enabled=false` and the 503 branch remain; the bridge has no legacy conversion call; all sensitive-value matches are in tests or policy assertions that use generated values and never print them; no wildcard CORS or arbitrary destination exists.

- [ ] **Step 6 — Commit the release-alignment slice**

```bash
git add package.json CHANGELOG.md README.md dist/spotmate.user.js extension/chrome/manifest.json extension/edge/manifest.json tools/check-release-metadata.mjs test/guardrails/release-metadata.test.js
git commit -m "release: align music converter v1.5.0"
```

Gate: final security review is `PASS`, physical USB matrix is complete, all targeted and full tests are green, metadata guard is green, and the exact implementation SHA is recorded separately from any future merge/tag/release state.

- [ ] **Step 7 — Mandatory PR→merge→tag→release order**

  The following sequence is strict and non-negotiable after Task 10 gates are green:

  - a. All targeted gates, full test suite, security review, Chrome/Edge QA, and physical USB QA are green.
  - b. PR v1.5 CI is green and the security review verdict is `PASS`.
  - c. Merge the v1.5 PR into `main`, then read and record the merged SHA.
  - d. Create and push the annotated tag `v1.5.0` on that exact merged SHA.
  - e. Verify the tag independently and record the tag SHA.
  - f. Create the GitHub Release `v1.5.0` only after the tag is verified; publish artifacts/checksums only after the tag.

  No tag/release operation is allowed before merge and the above gates.

  Keep proofs separated by evidence type:

  - PR proof: PR identifier and CI status.
  - Merge proof: merged commit SHA.
  - Tag proof: tag SHA and `git rev-parse v1.5.0`.
  - Release proof: GitHub Release URL and checksum publication reference.

## Final Validation and Handoff

The implementation owner must hand off distinct evidence for: targeted tests, `npm test`, guardrail tests, physical USB QA, security-review verdict, local commit SHA, branch/PR state, merge state, annotated tag state, GitHub Release state, and live/deployment state. A green test run proves none of the latter states. v1.5.0 is not publishable until the physical and security gates pass.

For this planning-only change, the current worktree validation is intentionally narrower and must not mutate Git:

```powershell
git diff --check
git status --short
git diff --name-only f57b3de..HEAD
git diff --check f57b3de..HEAD
```

Expected now: `git diff --check` is clean; during this planning phase the expected documentation set is the five version plans plus the pre-existing `docs/roadmap.md` link change; future v1.5 implementation starts in a clean dedicated worktree based on up-to-date `main`; and no code is committed, pushed, tagged, merged, or released by this plan-writing task.
