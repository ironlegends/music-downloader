> **Status: Historical v1.x — inactive and unsupported.**

# Music Converter Launcher Safety and Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable local launcher conversion fail-closed, remove active copies of the real CSRF value, document existing boundaries, and prepare the SemVer metadata and rename to music-converter.

**Architecture:** The server is the gate’s sole authority: it exposes an immutable conversion.enabled=false capability through /api/status, while /api/queue/start returns 503 before reading the body or calling the queue. The UI consumes this capability and fails closed; diagnostics in src/observer/src/policy and the DevTools scripts remain in place and keep separate contracts.

**Tech Stack:** Node.js 18+ ESM, native HTTP server, node:test, vanilla browser JavaScript, historical CommonJS tests, and npm with no new dependencies.

## Global Constraints

- Local conversion remains temporarily disabled; downloads remain the future goal, and no Turnstile/CAPTCHA bypass is added.
- GET /api/status exposes capabilities.conversion.enabled=false with code launcher-local-conversion-disabled; POST /api/queue/start returns 503 and never calls queueManager.start.
- The DevTools scripts remain outside the conversion gate; only their secret hygiene changes.
- Every copy of the real CSRF value is removed from files tracked at the tip; executable assertions use generic opaque-literal detection, and fixtures use synthetic values only.
- Do not move src/observer or src/policy; clarify their responsibilities in README, architecture documentation, and script/test names.
- package.json is the SemVer SSOT; keep version: "1.0.0", set name: "music-converter", and keep private: true.
- Create CHANGELOG.md with [Unreleased] followed by [1.0.0] - 2026-08-25.
- Future rules: fix=PATCH, compatible feat=MINOR, breaking=MAJOR, and docs/tests/chore alone do not bump the version; future annotated tags use vX.Y.Z after npm test.
- Do not create VERSION, a dev branch, a hard-coded version badge, a deployment workflow, or artificial AGENTS.md/SECURITY.md files.
- All existing specification and plan documents remain intact except docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md, where only the two real values are replaced with [REDACTED_CSRF_TOKEN], without changing any other sentence, its vision, or its purpose; after review PASS, only the final orchestrator performs the GitHub rename and non-force push, while tags and releases remain separate gates that are not run.
- Do not parallelize tasks: package/tests, server, frontend, and documentation are coupled; traceability relies on the SDD ledger and atomic commits, without a MemPalace checkpoint because no project wing/config has been verified.

## File map

| File | Implementation responsibility | Task |
| --- | --- | --- |
| package.json | npm name, version, and visibility | 1 |
| CHANGELOG.md | Minimal SemVer history | 1 |
| tests/secret-guard.cjs | Reusable opaque-literal detection | 1 |
| test/guardrails/release-metadata.test.js | Metadata/changelog contract | 1 |
| test/guardrails/secret-guard.test.js | RED/GREEN for generic detection | 1 |
| tests/test_all_scripts.cjs | Global guard for the four scripts | 1 |
| tests/test_script2.cjs | Guard and tests for script 2 | 1 |
| tests/test_script_complet.cjs | Guard and tests for the complete script | 1 |
| docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md | Redact only the two documentary copies of the real value | 1 |
| server.js | Server capability and rejection | 2 |
| test/server.test.js | HTTP contract and no queue call | 2 |
| public/index.html | Disabled initial state and accessibility | 3 |
| public/app.js | Capability reading, fail-closed UI, and handler | 3 |
| test/frontend-static.test.js | Behavioral smoke test without external dependencies | 3 |
| README.md | Actual usage, API, and temporary status | 4 |
| docs/architecture.md | Diagnostics/launcher/scripts boundaries | 4 |
| docs/diagnostics-evidence.md | Inert status and no authorization | 4 |
| docs/diagnostics-runbook.md | Inert status and fail-closed stop | 4 |

### Task 1: SemVer tests, secret guard, and metadata/changelog

**Files:**
- Create: tests/secret-guard.cjs
- Create: test/guardrails/secret-guard.test.js
- Create: test/guardrails/release-metadata.test.js
- Modify: tests/test_all_scripts.cjs
- Modify: tests/test_script2.cjs
- Modify: tests/test_script_complet.cjs
- Modify: docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md (two values only)
- Modify: package.json
- Create: CHANGELOG.md

**Interfaces:**
- Produces assertNoOpaqueTokenLiteral(content, fileName), findOpaqueTokenLiterals(content), assertHistoricalTokenAbsentAtTip() and assertHistoricalPlanRedactionOnly() from tests/secret-guard.cjs.
- Produces the metadata contract name=music-converter, version=1.0.0, private=true and the two required changelog headings.
- Consumes the four DevTools script files and their active CommonJS guard tests for the generic scan; it handles the authorized historical plan separately, using the value read into memory from 38c4e403241f7dfecfb0b56e2ea3e4c79d4bf428:script2.txt.

- [ ] **Step 1: Create only the initial CLI end-to-end test**

Create test/guardrails/secret-guard.test.js without importing the guard, which does not exist yet.
The fixture is created outside the repository, and its synthetic value is assembled at
runtime:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guardPath = path.join(rootDir, 'tests', 'secret-guard.cjs');

test('the CLI rejects an opaque fixture with a generic message', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-converter-secret-guard-'));
  const fixturePath = path.join(tempDir, 'fixture.js');
  const syntheticValue = ['synthetic', '_csrf_', 'token_', 'value_', '1234567890'].join('');

  try {
    fs.writeFileSync(
      fixturePath,
      "const csrfToken = '" + syntheticValue + "';\n",
      'utf8'
    );
    const result = spawnSync(process.execPath, [guardPath, fixturePath], {
      cwd: rootDir,
      encoding: 'utf8'
    });

    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'SECRET_GUARD_VIOLATION count=1');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
~~~

- [ ] **Step 2: Run the first RED alone before creating the guard**

Run: node --test test/guardrails/secret-guard.test.js

Expected: FAIL. spawnSync runs Node and returns status 1, but
tests/secret-guard.cjs is missing; stderr contains the missing-module error instead of
the exact SECRET_GUARD_VIOLATION count=1 message.

- [ ] **Step 3: Create the CLI guard after the first RED**

Create tests/secret-guard.cjs with the following complete contents. The CLI counts
violations without displaying their values:

~~~js
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const OPAQUE_LITERAL = /(['"\x60])([A-Za-z0-9+/=_-]{32,})\1/g;
const BASE_COMMIT = '493fbf178450702a602c8fb0469ab8ac8a4fddfc';
const HISTORICAL_TOKEN_SOURCE = '38c4e403241f7dfecfb0b56e2ea3e4c79d4bf428:script2.txt';
const HISTORICAL_PLAN = 'docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md';
const REDACTION = '[REDACTED_CSRF_TOKEN]';

function findOpaqueTokenLiterals(content) {
    return Array.from(content.matchAll(OPAQUE_LITERAL), (match) => ({
        index: match.index,
        length: match[2].length
    }));
}

function assertNoOpaqueTokenLiteral(content, fileName) {
    const matches = findOpaqueTokenLiterals(content);
    assert.equal(matches.length, 0, fileName + ' contains a potentially secret opaque literal');
}

function readHistoricalCsrfToken() {
    const source = execFileSync('git', ['show', HISTORICAL_TOKEN_SOURCE], { encoding: 'utf8' });
    const matches = Array.from(source.matchAll(/["']x-csrf-token["']\s*:\s*(["'])([A-Za-z0-9+/=_-]{32,})\1/gi));
    assert.equal(matches.length, 1, 'The historical source must contain exactly one reference CSRF value');
    return matches[0][2];
}

function scanTrackedFilesForValue(value) {
    const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
        .split('\0')
        .filter(Boolean);
    const hits = [];
    for (const file of files) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        for (const [index, line] of lines.entries()) {
            if (line.includes(value)) hits.push(file + ':' + (index + 1));
        }
    }
    return hits;
}

function assertHistoricalTokenAbsentAtTip() {
    const hits = scanTrackedFilesForValue(readHistoricalCsrfToken());
    if (hits.length > 0) console.error(hits.join('\n'));
    assert.equal(hits.length, 0, 'The historical CSRF value is still present at the tip');
    console.log('historical-token-occurrence-count=0');
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function assertHistoricalPlanRedactionOnly() {
    const token = readHistoricalCsrfToken();
    const original = execFileSync('git', ['show', BASE_COMMIT + ':' + HISTORICAL_PLAN], { encoding: 'utf8' });
    const current = fs.readFileSync(HISTORICAL_PLAN, 'utf8');
    const occurrenceCount = original.split(token).length - 1;
    const expected = original.split(token).join(REDACTION);
    assert.equal(occurrenceCount, 2, 'The historical plan must contain exactly two values to redact');
    assert.equal(sha256(current), sha256(expected), 'The historical plan contains a change other than the two authorized redactions');
    console.log('historical-plan-redacted-lines=2');
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === '--historical-tip-scan') {
        assertHistoricalTokenAbsentAtTip();
    } else if (args[0] === '--historical-plan-redaction') {
        assertHistoricalPlanRedactionOnly();
    } else {
        assert.ok(args.length > 0, 'At least one file must be provided to the guard');
        let violationCount = 0;
        for (const file of args) {
            violationCount += findOpaqueTokenLiterals(fs.readFileSync(file, 'utf8')).length;
        }
        if (violationCount > 0) {
            console.error('SECRET_GUARD_VIOLATION count=' + violationCount);
            process.exitCode = 1;
        } else {
            console.log('SECRET_GUARD_OK files=' + args.length);
        }
    }
}

module.exports = {
    OPAQUE_LITERAL,
    findOpaqueTokenLiterals,
    assertNoOpaqueTokenLiteral,
    assertHistoricalTokenAbsentAtTip,
    assertHistoricalPlanRedactionOnly
};
~~~

- [ ] **Step 4: Run the first GREEN alone**

Run: node --test test/guardrails/secret-guard.test.js

Expected: PASS; the CLI returns status 1 and exactly
SECRET_GUARD_VIOLATION count=1 for the generated fixture.

- [ ] **Step 5: Add the pure tests and metadata after the first GREEN**

At the top of test/guardrails/secret-guard.test.js, after the Node imports, add:

~~~js
import {
  findOpaqueTokenLiterals,
  assertNoOpaqueTokenLiteral,
  assertHistoricalTokenAbsentAtTip,
  assertHistoricalPlanRedactionOnly
} from '../../tests/secret-guard.cjs';
~~~

Then add these tests. Keep the synthetic value split across fragments in the
tracked file:

~~~js
const activeFiles = [
  'script1.txt',
  'script2.txt',
  'script3.txt',
  'script_complet.txt',
  'tests/test_all_scripts.cjs',
  'tests/test_script2.cjs',
  'tests/test_script_complet.cjs'
];

test('generic detection catches a synthetic opaque literal', () => {
  const syntheticValue = ['synthetic', '_csrf_', 'token_', 'value_', '1234567890'].join('');
  const content = "const csrfToken = '" + syntheticValue + "';";
  assert.equal(findOpaqueTokenLiterals(content).length, 1);
});

test('active surfaces do not copy any opaque literal', () => {
  for (const relativeFile of activeFiles) {
    const file = path.join(rootDir, relativeFile);
    assertNoOpaqueTokenLiteral(fs.readFileSync(file, 'utf8'), relativeFile);
  }
});

test('the historical CSRF value is absent from all files tracked at the tip', () => {
  assertHistoricalTokenAbsentAtTip();
});

test('the historical plan differs only by the two authorized redactions', () => {
  assertHistoricalPlanRedactionOnly();
});
~~~

Create test/guardrails/release-metadata.test.js with an existence assertion
before reading the changelog:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

test('package.json is the private SemVer contract for music-converter', () => {
  assert.equal(packageJson.name, 'music-converter');
  assert.equal(packageJson.version, '1.0.0');
  assert.equal(packageJson.private, true);
});

test('CHANGELOG exists and contains the sections in the expected order', () => {
  assert.equal(fs.existsSync(changelogPath), true, 'CHANGELOG.md must exist');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.match(changelog, /^## \[1\.0\.0\] - 2026-08-25$/m);
  assert.ok(changelog.indexOf('## [Unreleased]') < changelog.indexOf('## [1.0.0] - 2026-08-25'));
});
~~~

- [ ] **Step 6: Run the second targeted RED**

Run: node --test test/guardrails/release-metadata.test.js test/guardrails/secret-guard.test.js

Expected: FAIL with the CHANGELOG.md must exist assertion, the package name/private
still incorrect, three executable opaque-value assertions, and two documentary lines
that still contain the historical value. The initial CLI test remains
PASS.

- [ ] **Step 7: Replace hard-coded assertions, redact the historical plan, and write the metadata**

In each of tests/test_all_scripts.cjs, tests/test_script2.cjs, and
tests/test_script_complet.cjs, add:

~~~js
const { assertNoOpaqueTokenLiteral } = require('./secret-guard.cjs');
~~~

Then replace the assertion that compares a specific CSRF value with:

~~~js
assertNoOpaqueTokenLiteral(content, file);
~~~

or, in tests that use the name scriptContent:

~~~js
assertNoOpaqueTokenLiteral(scriptContent, 'script2.txt');
~~~

Next, redact only the two values in the historical plan with this script
PowerShell/Node. Read the value into memory and never display it:

~~~powershell
@'
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const source = execFileSync(
  'git',
  ['show', '38c4e403241f7dfecfb0b56e2ea3e4c79d4bf428:script2.txt'],
  { encoding: 'utf8' }
);
const matches = Array.from(
  source.matchAll(/["']x-csrf-token["']\s*:\s*(["'])([A-Za-z0-9+/=_-]{32,})\1/gi)
);
if (matches.length !== 1) throw new Error('The historical source must provide one unique CSRF value');
const token = matches[0][2];
const plan = 'docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md';
const current = fs.readFileSync(plan, 'utf8');
const count = current.split(token).length - 1;
if (count !== 2) throw new Error('Expected 2 redactions; observed: ' + count);
fs.writeFileSync(plan, current.split(token).join('[REDACTED_CSRF_TOKEN]'), 'utf8');
console.log('historical-plan-redacted-lines=2');
'@ | node
~~~

Do not change any other character in this historical file. Its vision, purpose,
and every other sentence must remain unchanged.

Update package.json while keeping the existing scripts:

~~~json
{
  "name": "music-converter",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node --test test/**/*.test.js && node tests/test_all_scripts.cjs"
  }
}
~~~

Create CHANGELOG.md:

~~~markdown
# Changelog

## [Unreleased]

- Local launcher conversion temporarily disabled and fail-closed.
- Capability contract and CSRF hygiene guard documented.

## [1.0.0] - 2026-08-25

- Initial version of the local launcher and historical DevTools scripts.
~~~

- [ ] **Step 8: Run the targeted GREEN and verify no opaque value remains**

Run: node --test test/guardrails/release-metadata.test.js test/guardrails/secret-guard.test.js

Expected: PASS with two metadata tests and five secret tests.

Run: node tests/secret-guard.cjs script1.txt script2.txt script3.txt script_complet.txt tests/test_all_scripts.cjs tests/test_script2.cjs tests/test_script_complet.cjs

Expected: PASS and SECRET_GUARD_OK files=7 without displaying any value.

Run: node tests/secret-guard.cjs --historical-plan-redaction

Expected: PASS and historical-plan-redacted-lines=2. The script compares
SHA-256 hashes and displays neither the old value nor the lines.

Run: node tests/secret-guard.cjs --historical-tip-scan

Expected: PASS and historical-token-occurrence-count=0. On failure, the
output contains only path:line and the count, never the value.

- [ ] **Step 9: Independent security/secrets review**

Review gate: INDEPENDENT_REVIEW for the Task 1 files. Verify that the
guard does not reintroduce any observed value and that the generic scan remains limited
to executable surfaces, the historical plan differs only by two
[REDACTED_CSRF_TOKEN] redactions, and no failure message reveals the
value.

- [ ] **Step 10: Atomic commit for Task 1**

~~~bash
git add package.json CHANGELOG.md tests/secret-guard.cjs test/guardrails/release-metadata.test.js test/guardrails/secret-guard.test.js tests/test_all_scripts.cjs tests/test_script2.cjs tests/test_script_complet.cjs docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md
git commit -m "chore: add semver metadata and secret guard"
~~~

### Task 2: Server capability and fail-closed gate

**Files:**
- Modify: server.js:31-40,132-195
- Modify: test/server.test.js:40-212,255-302

**Interfaces:**
- Produces CONVERSION_CAPABILITY exported by server.js, immutable and equal to the object { enabled: false, code: 'launcher-local-conversion-disabled', message: 'Local launcher conversion is temporarily disabled.' }.
- GET /api/status returns capabilities.conversion without removing status, config, or queue.
- POST /api/queue/start returns HTTP 503 and the object { success: false, error: { code, message } } before readJsonBody() and queueManager.start().
- Consumes the existing QueueManager; does not change its unit behavior or the src/observer/src/policy paths.

- [ ] **Step 1: Add the HTTP contract RED tests**

Update the import in test/server.test.js and add the immutability test:

~~~js
import * as serverModule from '../server.js';

const { CONVERSION_CAPABILITY, createSpotmateServer } = serverModule;

test('CONVERSION_CAPABILITY is immutable', () => {
    assert.ok(CONVERSION_CAPABILITY, 'CONVERSION_CAPABILITY must be exported');
    assert.equal(Object.isFrozen(CONVERSION_CAPABILITY), true);
});
~~~

In test/server.test.js, extend the status test with:

~~~js
assert.deepStrictEqual(data.capabilities.conversion, {
    enabled: false,
    code: 'launcher-local-conversion-disabled',
    message: 'Local launcher conversion is temporarily disabled.'
});
~~~

Add a dedicated test proving rejection before the queue and before validating the
body:

~~~js
test('POST /api/queue/start rejects disabled conversion without starting the queue', async () => {
    let startCalls = 0;
    const queueManager = {
        on() {},
        getStatus() { return { isRunning: false, items: [] }; },
        start() { startCalls += 1; }
    };
    const { server, port } = await createSpotmateServer({ port: 0, queueManager });

    try {
        const res = await fetch('http://localhost:' + port + '/api/queue/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"tracks":'
        });
        assert.equal(res.status, 503);
        assert.deepStrictEqual(await res.json(), {
            success: false,
            error: {
                code: 'launcher-local-conversion-disabled',
                message: 'Local launcher conversion is temporarily disabled.'
            }
        });
        assert.equal(startCalls, 0);
    } finally {
        await closeServer(server);
    }
});
~~~

Then add a node:http test proving that the server responds before the end
of the declared body. The test never calls req.end():

~~~js
test('POST /api/queue/start returns 503 before the body ends and without starting the queue', async () => {
    let startCalls = 0;
    const queueManager = {
        on() {},
        getStatus() { return { isRunning: false, items: [] }; },
        start() { startCalls += 1; }
    };
    const { server, port } = await createSpotmateServer({ port: 0, queueManager });
    let request;

    try {
        const result = await new Promise((resolve, reject) => {
            let settled = false;
            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                request.destroy();
                reject(new Error('The server waited for the body to finish instead of returning 503'));
            }, 1000);

            request = http.request({
                hostname: '127.0.0.1',
                port,
                path: '/api/queue/start',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': '4096'
                }
            }, (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => { body += chunk; });
                response.on('end', () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);
                    resolve({ status: response.statusCode, body: JSON.parse(body) });
                });
            });

            request.on('error', (error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                reject(error);
            });
            request.flushHeaders();
        });

        assert.equal(result.status, 503);
        assert.equal(result.body.error.code, 'launcher-local-conversion-disabled');
        assert.equal(startCalls, 0);
    } finally {
        request?.destroy();
        await closeServer(server);
    }
});
~~~

Update server tests that assume POST /api/queue/start returns
an active queue: the start/pause/resume/stop test becomes a
503 rejection test, and the audio test no longer starts a queue over HTTP. For the audio test,
provide a mock item directly to queueManager.getStatus() that contains the
filePath of a temporary file; this keeps the read endpoint tested without
bypassing the conversion gate.

- [ ] **Step 2: Run the server RED**

Run: node --test test/server.test.js

Expected: FAIL with the CONVERSION_CAPABILITY must be exported assertion, the
missing HTTP capability, unimplemented 503 status, unfinished-body timeout, and
existing tests that still expect an HTTP queue start.

- [ ] **Step 3: Implement the capability and rejection before JSON reading**

Add this at the top of server.js:

~~~js
export const CONVERSION_CAPABILITY = Object.freeze({
    enabled: false,
    code: 'launcher-local-conversion-disabled',
    message: 'Local launcher conversion is temporarily disabled.'
});
~~~

In the /api/status response, add exactly:

~~~js
capabilities: {
    conversion: CONVERSION_CAPABILITY
},
~~~

At the start of the /api/queue/start block, before readJsonBody(), add:

~~~js
if (!CONVERSION_CAPABILITY.enabled) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
        success: false,
        error: {
            code: CONVERSION_CAPABILITY.code,
            message: CONVERSION_CAPABILITY.message
        }
    }));
}
~~~

Do not add an environment branch, query parameter, or
fallback that bypasses this gate. The rest of the handler keeps its
400 validation for the future state when the capability is re-enabled under a
supported contract.

- [ ] **Step 4: Run the server GREEN and queue unit tests**

Run: node --test test/server.test.js

Expected: PASS; Object.isFrozen(CONVERSION_CAPABILITY) is true, the rejection test
confirms status=503, the exact code, and startCalls=0 with invalid JSON,
and the node:http test receives 503 within 1000 ms without calling req.end().

Run: node --test test/queue-manager.test.js

Expected: PASS; the HTTP gate did not move or remove the unit logic of
queue.

- [ ] **Step 5: Independent security/behavior review**

Review gate: INDEPENDENT_REVIEW for server.js and test/server.test.js.
Verify gate order, no indirect call to queueManager.start, the
stability of the error code, and no Turnstile
CAPTCHA, or configuration bypass.

- [ ] **Step 6: Atomic commit for Task 2**

~~~bash
git add server.js test/server.test.js
git commit -m "fix: fail closed launcher conversion"
~~~

### Task 3: UI capability and dependency-free behavioral validation

**Files:**
- Modify: public/index.html:99-111,136-148
- Modify: public/app.js:7-24,206-235,548-635
- Modify: test/frontend-static.test.js

**Interfaces:**
- state.capabilities.conversion starts with enabled=false and the server code/reason.
- loadServerStatus() consumes data.capabilities.conversion; missing or invalid responses remain disabled.
- updateSelectionCounts() and handleStartQueue() reject the local action while enabled !== true.
- The smoke test uses only node:vm and a minimal simulated DOM; no browser library is added.

- [ ] **Step 1: Add the UI capability RED smoke test**

In the existing public/index.html test, first add the
fail-closed assertions before JavaScript:

~~~js
const downloadButtonMarkup = html.match(/<button[^>]*id="btnDownload"[^>]*>/)?.[0];
assert.ok(downloadButtonMarkup, 'The btnDownload button must exist');
assert.match(downloadButtonMarkup, /\sdisabled(?:\s|>)/);
assert.match(downloadButtonMarkup, /aria-disabled="true"/);
~~~

Then import node:vm and add a harness that records the listeners and
each fetch method:

~~~js
import vm from 'node:vm';

function makeElement() {
    const attributes = new Map();
    const listeners = new Map();
    return {
        listeners,
        addEventListener(name, handler) { listeners.set(name, handler); },
        appendChild() {},
        querySelectorAll() { return []; },
        style: {},
        textContent: '',
        value: '',
        checked: false,
        disabled: false,
        className: '',
        innerHTML: '',
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; }
    };
}

async function loadFrontend(statusPayload) {
    const elements = new Map();
    const fetches = [];
    let domReadyHandler = null;
    const document = {
        readyState: 'loading',
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, makeElement());
            return elements.get(id);
        },
        addEventListener(name, handler) {
            if (name === 'DOMContentLoaded') domReadyHandler = handler;
        }
    };
    const context = vm.createContext({
        document,
        fetch: async (url, options = {}) => {
            const method = String(options.method || 'GET').toUpperCase();
            fetches.push({ url, method });
            if (url === '/api/status' && method === 'GET') {
                return { ok: true, status: 200, json: async () => statusPayload };
            }
            return {
                ok: false,
                status: 503,
                json: async () => ({
                    success: false,
                    error: {
                        code: 'launcher-local-conversion-disabled',
                        message: 'Local launcher conversion is temporarily disabled.'
                    }
                })
            };
        },
        EventSource: class {
            addEventListener() {}
        },
        console,
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout
    });
    const source = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
    vm.runInContext(source, context);
    assert.equal(typeof domReadyHandler, 'function');
    await domReadyHandler();
    const btnDownload = elements.get('btnDownload');
    return {
        btnDownload,
        alertMessage: elements.get('alertMessage'),
        fetches,
        clickListener: btnDownload.listeners.get('click')
    };
}
~~~

Add the disabled capability case with this payload and these assertions:

~~~js
const disabledPayload = {
    status: 'online',
    config: { destinationDir: '', organizeFolders: false },
    queue: { isRunning: false, isPaused: false },
    capabilities: {
        conversion: {
            enabled: false,
            code: 'launcher-local-conversion-disabled',
            message: 'Local launcher conversion is temporarily disabled.'
        }
    }
};
const disabledUi = await loadFrontend(disabledPayload);
assert.equal(disabledUi.btnDownload.disabled, true);
assert.equal(disabledUi.btnDownload.getAttribute('aria-disabled'), 'true');
assert.equal(disabledUi.alertMessage.textContent, 'Local launcher conversion is temporarily disabled.');
assert.deepStrictEqual(disabledUi.fetches, [{ url: '/api/status', method: 'GET' }]);
assert.equal(typeof disabledUi.clickListener, 'function');
await disabledUi.clickListener();
assert.equal(
    disabledUi.fetches.some(({ url, method }) => url === '/api/queue/start' && method === 'POST'),
    false
);
assert.equal(disabledUi.alertMessage.textContent, 'Local launcher conversion is temporarily disabled.');
~~~

Add the missing capability case with these complete assertions:

~~~js
const absentPayload = {
    status: 'online',
    config: { destinationDir: '', organizeFolders: false },
    queue: { isRunning: false, isPaused: false },
    capabilities: {}
};
const absentUi = await loadFrontend(absentPayload);
assert.equal(absentUi.btnDownload.disabled, true);
assert.equal(absentUi.btnDownload.getAttribute('aria-disabled'), 'true');
assert.equal(absentUi.alertMessage.textContent, 'Local launcher conversion is temporarily disabled.');
assert.deepStrictEqual(absentUi.fetches, [{ url: '/api/status', method: 'GET' }]);
assert.equal(typeof absentUi.clickListener, 'function');
await absentUi.clickListener();
assert.equal(
    absentUi.fetches.some(({ url, method }) => url === '/api/queue/start' && method === 'POST'),
    false
);
assert.equal(absentUi.alertMessage.textContent, 'Local launcher conversion is temporarily disabled.');
~~~

- [ ] **Step 2: Run the frontend RED**

Run: node --test test/frontend-static.test.js

Expected: FAIL because the markup is not disabled before JavaScript, capability reading
and the accessible attribute do not exist yet, and the click listener
can reach /api/queue/start.

- [ ] **Step 3: Implement the fail-closed state and reason display**

In state, add:

~~~js
capabilities: {
    conversion: {
        enabled: false,
        code: 'launcher-local-conversion-disabled',
        message: 'Local launcher conversion is temporarily disabled.'
    }
},
~~~

Add an internal applyConversionCapability(capability) function that accepts
only an object where enabled is a boolean and code and message are non-empty
strings; otherwise it keeps the disabled default. It updates
state.capabilities.conversion, btnDownload.disabled, aria-disabled, and title, then
calls showAlert(message, 'info') when conversion is disabled.

In loadServerStatus(), call this function with
data.capabilities?.conversion before updateQueueButtons(). In the catch block,
call it with null before displaying “Server unavailable”.

Update updateSelectionCounts() so the button formula is:

~~~js
el.btnDownload.disabled = !state.capabilities.conversion.enabled
    || selected === 0
    || state.queue.isRunning;
~~~

At the start of handleStartQueue(), add the early return without fetch:

~~~js
if (!state.capabilities.conversion.enabled) {
    showAlert(state.capabilities.conversion.message, 'info');
    return;
}
~~~

In public/index.html, keep the existing control but give it a safe
state before JavaScript loads:

~~~html
<button id="btnDownload" class="btn btn-primary" type="button" disabled aria-disabled="true" title="Local launcher conversion is temporarily disabled.">Download selected tracks</button>
~~~

Do not hide Spotify analysis, change selection controls, or
add a frontend dependency.

- [ ] **Step 4: Run the frontend GREEN and verify the server contract in the simulated browser**

Run: node --test test/frontend-static.test.js

Expected: PASS; the markup fails closed, the button stays disabled with
a false or missing capability, the banner keeps the reason after the
listener runs, and fetches contain only GET /api/status with no POST
/api/queue/start.

Run: node --test test/server.test.js test/frontend-static.test.js

Expected: PASS; the server and client use the same code
launcher-local-conversion-disabled.

- [ ] **Step 5: Independent behavior review**

Review gate: INDEPENDENT_REVIEW for public/index.html, public/app.js, and
test/frontend-static.test.js. Verify that the client does not promise active
conversion, a missing capability fails closed, and no
/api/queue/start call is made by the disabled handler.

- [ ] **Step 6: Atomic commit for Task 3**

~~~bash
git add public/index.html public/app.js test/frontend-static.test.js
git commit -m "fix: disable launcher conversion controls"
~~~

### Task 4: Documentation, architecture, and actual status

**Files:**
- Create: docs/architecture.md
- Modify: README.md
- Modify: docs/diagnostics-evidence.md
- Modify: docs/diagnostics-runbook.md
- Do not modify: any docs/superpowers/specs/*.md or docs/superpowers/plans/*.md already present on the base, except the two redactions to the historical plan made and committed in Task 1

**Interfaces:**
- README.md describes the currently observable behavior: analysis is available, local conversion is temporarily disabled, and the API returns 503 with a capability.
- docs/architecture.md becomes a concise map of the three surfaces without moving files.
- The two diagnostics documents state that their verdicts are inert and do not authorize conversion.
- The specification created in this task remains the current design document; old specifications and plans remain historical and unchanged, except for the two values redacted in docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md in Task 1.

- [ ] **Step 1: Write the additive architecture map**

Create docs/architecture.md with these sections and statements:

~~~markdown
# Repository architecture

## Inert diagnostics

src/observer/, src/policy/, test/observer/, test/policy/, and test/fixtures/
do not navigate, click, submit requests, or follow tasks,
download, or retain raw values. They produce only
presence indicators, counts, categories, and terminal verdicts without
side effects.

## Active local launcher

server.js, public/, src/spotify-extractor.js, src/spotmate-client.js,
src/queue-manager.js and src/downloader.js form the local launcher. Metadata reading
and configuration remain available. Conversion is
protected by capabilities.conversion.enabled=false and
launcher-local-conversion-disabled; /api/queue/start returns 503 without starting the
queue.

## Historical DevTools scripts

script1.txt, script2.txt, script3.txt, and script_complet.txt are direct scripts
that are separate from the local launcher. They do not consume its capability. Their
authorized change surface here is secret hygiene; no
Turnstile/CAPTCHA bypass is added.

## Evolution and version

Files remain in place. package.json is the single source of version
and is set to music-converter, 1.0.0, and private: true. Any future reactivation
requires a supported contract and server/UI tests before changing
capability.
~~~

- [ ] **Step 2: Align README with actual behavior without changing the vision**

Update the title and usage sections to name the repository Music
Converter while keeping functional references to SpotMate when
they describe the remote service. Add this after the launcher introduction:

~~~markdown
> **Current status:** local metadata analysis remains available, but
> local launcher conversion is temporarily disabled. The API exposes
> capabilities.conversion.enabled=false and /api/queue/start returns HTTP 503
> with code launcher-local-conversion-disabled. Downloads remain
> the future goal; this suspension does not change the vision.
~~~

Rewrite the quickstart so the steps stop after analysis and
explain that the download button is disabled. Update the
API table with:

~~~markdown
| GET | /api/status | Returns server status, configuration, queue, and conversion capability |
| POST | /api/queue/start | Temporarily rejects local conversion with HTTP 503 and launcher-local-conversion-disabled |
~~~

Keep a separate section for the DevTools scripts and state that they are
outside the launcher gate; do not present them as a way to re-enable local conversion.
Replace claims that conversion is active in the interface diagram,
feature list, and footer with the temporary status, while preserving
the vision of future downloads.

- [ ] **Step 3: Mark diagnostics as inert and non-authorizing**

In docs/diagnostics-evidence.md, add a ## Status section stating that
aggregated evidence is informational, does not consume the launcher capability, and
can never authorize /api/queue/start. In docs/diagnostics-runbook.md,
add the same boundary to the prerequisites and keep the prohibitions on
transport, tracking, waiting, downloading, and storage. Do not introduce a
raw value, media URL, or secret.

- [ ] **Step 4: Validate the documentation directly**

Run: rg -n "launcher-local-conversion-disabled|conversion\.enabled|diagnostics inertes|Scripts DevTools|music-converter" README.md docs/architecture.md docs/diagnostics-evidence.md docs/diagnostics-runbook.md

Expected: each boundary and the API code appear in the current documents
; no sentence promises active local conversion.

Run: node tests/secret-guard.cjs --historical-plan-redaction

Expected: PASS and historical-plan-redacted-lines=2, without displaying the lines or
the value.

Run: git diff --numstat 493fbf178450702a602c8fb0469ab8ac8a4fddfc..HEAD -- docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md

Expected: exactly `2 2 docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md`.

- [ ] **Step 5: Validation directe docs**

Review gate: DIRECT_VALIDATION. Compare the four modified documents against the
current specification and verify that old documents remain unchanged except for the
two approved redactions to the historical plan and that the vision of
downloads is preserved and the text provides no operational
bypass.

- [ ] **Step 6: Atomic commit for Task 4**

~~~bash
git add README.md docs/architecture.md docs/diagnostics-evidence.md docs/diagnostics-runbook.md
git commit -m "docs: align launcher safety boundaries"
~~~

### Task 5: Full validation and orchestrator rename gate

**Files:**
- Read-only validation: all tracked files on the branch for the implementation worker
- No file changes: any failure returns to the owning task and its review gate before Task 5 is restarted
- Commit: not applicable; the worktree remains read-only during Task 5

**Interfaces:**
- Consumes all outputs from Tasks 1–4 and the exact base commit.
- Produces a validation record with separate states for tests, secret scan, docs diff, local commit, repository rename, push, tag and release.
- The implementation worker performs no remote handoff; after review PASS, the final orchestrator performs the rename and non-force push. Tags and releases remain separate and are not run.

- [ ] **Step 1: Run the targeted suites and the full suite**

Run: node --test test/guardrails/release-metadata.test.js test/guardrails/secret-guard.test.js

Expected: PASS.

Run: node --test test/server.test.js test/frontend-static.test.js test/queue-manager.test.js

Expected: PASS.

Run: npm test

Expected: PASS, including the historical CommonJS script tests.

- [ ] **Step 2: Scan current opaque copies without reproducing a real value**

Run: node tests/secret-guard.cjs script1.txt script2.txt script3.txt script_complet.txt tests/test_all_scripts.cjs tests/test_script2.cjs tests/test_script_complet.cjs

Expected: PASS and SECRET_GUARD_OK files=7 without displaying any value.

Run: node tests/secret-guard.cjs --historical-plan-redaction

Expected: PASS and historical-plan-redacted-lines=2, without displaying the lines or
the value.

Run: node tests/secret-guard.cjs --historical-tip-scan

Expected: PASS and historical-token-occurrence-count=0. The script reads the
value from 38c4e403241f7dfecfb0b56e2ea3e4c79d4bf428:script2.txt into memory,
iterates over the NUL-delimited list from git ls-files and displays only
path:line for any occurrence, never the value.

- [ ] **Step 3: Check the diff, scope, and historical files**

Run: git diff --check 493fbf178450702a602c8fb0469ab8ac8a4fddfc..HEAD

Expected: no whitespace or end-of-line errors.

Run: git diff --name-only 493fbf178450702a602c8fb0469ab8ac8a4fddfc..HEAD

Expected: the two security/versioning documents created by the worker and
the expected files from Tasks 1–4. Among old specification/plan documents,
only docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md appears.

Run: git diff --numstat 493fbf178450702a602c8fb0469ab8ac8a4fddfc..HEAD -- docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md

Expected: exactement `2 2 docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md`;
the node --historical-plan-redaction command separately proves that these two
lines change only by replacing the value.

Run: git status --short

Expected: no output. The .superpowers directory is ignored and does not justify
an exception to this gate.

- [ ] **Step 4: Independent final review of the full branch**

Review gate: security INDEPENDENT_REVIEW of the full branch diff.
The reviewer returns one verdict covering: order of the 503 gate, inability to
start the queue, zero copies of the historical value in tracked files,
no Turnstile/CAPTCHA bypass, separation of
diagnostics/launcher/scripts, documentary changes limited to the two values,
no historical rewrite, and SemVer accuracy.

Expected: verdict PASS before any GitHub mutation or push. A
REQUEST_CHANGES returns to the owning task; the worker does not perform the
remote handoff.


- [ ] **Step 5: Perform the remote handoff in the final orchestrator only**

Precondition: Step 4 produced PASS. The implementation worker gives the
orchestrator the exact SHA judged PASS; before any remote mutation,
the orchestrator stores it in `$validatedBranchSha` and makes it immutable. It
then runs exactly this sequence; any error or mismatch throws
`throw` and STOP before the next step:

~~~powershell
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$validatedBranchSha
)

$ErrorActionPreference = 'Stop'
Set-Variable -Name validatedBranchSha -Value $validatedBranchSha -Option ReadOnly

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne 'feat/launcher-safety-semver') {
    throw "Unexpected branch: $currentBranch"
}

$headSha = (git rev-parse HEAD).Trim()
if ($headSha -ne $validatedBranchSha) {
    throw "HEAD inattendu: $headSha"
}

$worktreeStatus = git status --short
if ($worktreeStatus) {
    throw 'Worktree is not clean before remote handoff'
}

gh repo rename music-converter --repo ironlegends/spotmate-script-diagnostics --yes
if ($LASTEXITCODE -ne 0) {
    throw 'GitHub rename failed'
}

$repository = gh repo view ironlegends/music-converter --json url,visibility,defaultBranchRef | ConvertFrom-Json
if ($repository.url -ne 'https://github.com/ironlegends/music-converter') {
    throw "URL inattendue: $($repository.url)"
}
if ($repository.visibility -ne 'PRIVATE') {
    throw "Unexpected visibility: $($repository.visibility)"
}
if ($repository.defaultBranchRef.name -ne 'main') {
    throw "Unexpected default branch: $($repository.defaultBranchRef.name)"
}

git remote set-url origin https://github.com/ironlegends/music-converter.git
if ($LASTEXITCODE -ne 0) {
    throw 'Updating origin failed'
}
$originUrl = (git remote get-url origin).Trim()
if ($originUrl -ne 'https://github.com/ironlegends/music-converter.git') {
    throw "Origin inattendu: $originUrl"
}

$headShaBeforePush = (git rev-parse HEAD).Trim()
if ($headShaBeforePush -ne $validatedBranchSha) {
    throw "Unexpected HEAD before push: $headShaBeforePush"
}

git push --set-upstream origin feat/launcher-safety-semver
if ($LASTEXITCODE -ne 0) {
    throw 'Push of feat/launcher-safety-semver failed'
}

$actualBranchSha = (gh api repos/ironlegends/music-converter/git/ref/heads/feat/launcher-safety-semver --jq '.object.sha').Trim()
if ($actualBranchSha -ne $validatedBranchSha) {
    throw "Unexpected remote SHA: $actualBranchSha"
}
Write-Output "branch-sha=$actualBranchSha"
~~~

Expected: the rename, `PRIVATE` visibility, default branch `main`,
`origin` and the remote branch SHA exactly match the values
verified above. No SHA is recalculated as a reference after PASS.

Rewriting Git history remains a separate operation, outside this branch and
is not run. No git tag, gh release create, or npm publish command is run;
tags and releases keep their own gates after npm test.

## Sequence and integration

Tasks are sequential: Task 1 establishes the guard and metadata, Task 2
sets the server contract, Task 3 consumes it, Task 4 aligns the text, and
Task 5 closes the gates without changing the worktree or committing. Tasks 1–4
have a RED/GREEN cycle or direct validation, an atomic commit, and
a proportionate review. After final PASS, only the orchestrator performs the
rename, verification, origin update, non-force push, and
SHA readback; the Task 5 commit remains not applicable. A review decision of
REQUEST_CHANGES returns to the owning task; no third round of
the same review is run on an unchanged diff.
