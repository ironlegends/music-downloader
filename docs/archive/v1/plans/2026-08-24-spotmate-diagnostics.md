> **Status: Historical v1.x record — inactive and unsupported.**

# SpotMate Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free, strictly inert SpotMate diagnostic in Node.js ESM, based on a redacted DOM observation and separate response metadata.

**Architecture:** A synchronous browser boundary reduces the DOM to booleans, counts, and allowlisted anomalies. Pure policies classify response metadata and retry potential separately, then produce a terminal verdict with no effects. Behavioral tests stay with the policies and observer; evidence and the final gate use direct validation after those batches pass.

**Tech Stack:** Native Node.js ESM, JavaScript with JSDoc `Readonly`, `node:test`, `node:assert/strict`, zero npm dependencies, no GitHub CI.

## Global Constraints

- Node.js ESM, with zero dependencies.
- Browser observer is synchronous and read-only.
- No fetch, XHR, WebSocket, EventSource, beacon, navigation, click, submission, storage, clipboard, download, polling, timer, or child process.
- No raw CSRF, Turnstile, opaque token, DOM ID, task ID, or media URL in the repository.
- DOM observation contains only `csrfPresent`, `turnstilePresent`, `trackRowCount`, `buttonIdCount`, `opaqueFieldCount`, `malformedRowCount`, `duplicateIdCount`, and `anomalies`.
- Response metadata contains only `status`, `bodyKind`, `errorFlag`, `hasDirectUrl`, and `hasTaskId`.
- Redacted CSRF, Turnstile, and opaque-field presence is expected and does not fail.
- The verdict contains only `immediate`, `queued`, or `failed-closed`, with `terminal: true` and `effects: []`.
- Any unknown or non-2xx status, HTML/unknown body, or ambiguous result fails closed.
- Retry policy is informational; `autoRetryAllowed` is always `false` for `POST`, with no timer, loop, or polling.
- Each batch targets at most 8 files and 800 lines.
- No GitHub CI in this scope because active authentication lacks the workflow scope.
- Publish to a private GitHub repository only after complete validation.

---

## File map and responsibilities

| Batch | Files | Responsibility | Target limit |
|---|---|---|---:|
| 1 | `package.json`, `src/policy/diagnostic-policy.js`, `src/policy/retry-policy.js`, `test/fixtures/safe-diagnostics.js`, `test/policy/diagnostic-policy.test.js`, `test/policy/retry-policy.test.js` | Pure contracts, response matrix, redacted validation, and informational retry | 6 files / 650 lines |
| 2 | `src/observer/readonly-dom-capabilities.js`, `src/observer/spotmate-dom-observer.js`, `test/fixtures/synthetic-dom-root.js`, `test/observer/readonly-dom-capabilities.test.js`, `test/observer/spotmate-dom-observer.test.js` | Read-only DOM boundary and aggregated observation without raw values | 5 files / 600 lines |
| 3 | `docs/diagnostics-evidence.md`, `docs/diagnostics-runbook.md`, `test/guardrails/static-scan.test.js` | Redacted live evidence, inert procedure, and final gate | 3 files / 450 lines |

The batches are sequential. Batch 1 defines types and pure policies, batch 2 produces a conforming observation, and batch 3 verifies the whole without moving behavioral tests outside their owning batches.

## Shared interfaces

### DOM observation

```js
/**
 * @typedef {Readonly<{
 *   csrfPresent: boolean,
 *   turnstilePresent: boolean,
 *   trackRowCount: number,
 *   buttonIdCount: number,
 *   opaqueFieldCount: number,
 *   malformedRowCount: number,
 *   duplicateIdCount: number,
 *   anomalies: readonly (
 *     'csrf-absent'|'turnstile-absent'|'track-row-malformed'|
 *     'duplicate-button-id'|'button-count-mismatch'|
 *     'opaque-field-count-unexpected'
 *   )[]
 * }>} DomObservation
 */
```

### Response metadata and verdict

```js
/**
 * @typedef {Readonly<{
 *   status: number|null,
 *   bodyKind: 'json'|'html'|'empty'|'unknown',
 *   errorFlag: boolean|null,
 *   hasDirectUrl: boolean,
 *   hasTaskId: boolean
 * }>} ResponseMetadata
 *
 * @typedef {Readonly<{
 *   terminal: true,
 *   outcome: 'immediate'|'queued'|'failed-closed',
 *   reason:
 *     'immediate-direct-url'|'queued-task-id'|'unknown-status'|
 *     'http-403'|'http-422'|'http-429'|'http-500'|'other-non-2xx'|
 *     'html-body'|'empty-body'|'unknown-body'|'error-flag'|
 *     'ambiguous-direct-and-task'|'missing-result-shape'|
 *     'ambiguous-metadata'|'ambiguous-dom-observation'|'raw-value-leak',
 *   effects: readonly []
 * }>} DiagnosticVerdict
 */
```

### Pure signatures

```js
/**
 * @typedef {Readonly<{
 *   potentiallyRetryable: boolean,
 *   autoRetryAllowed: false,
 *   reason: 'rate-limited'|'server-error'|'forbidden'|'unprocessable'|'not-retryable'|'unknown-status'
 * }>} RetryAssessment
 * @typedef {Readonly<{
 *   csrfPresent: () => boolean,
 *   turnstilePresent: () => boolean,
 *   trackRowCount: () => number,
 *   buttonIdCount: () => number,
 *   opaqueFieldCount: () => number,
 *   malformedRowCount: () => number,
 *   duplicateIdCount: () => number
 * }>} ReadonlyDomCapabilities
 */

export function validateExpurgatedObservation(observation) {
  // {ok: true} or {ok: false, reason: 'raw-value-leak'|'ambiguous-dom-observation'}
}

export function evaluateResponseMetadata(metadata) {
  // DiagnosticVerdict
}

export function evaluateDiagnosticSnapshot({ observation, response }) {
  // DiagnosticVerdict
}

export function assessRetryPolicy({ method, status }) {
  // {potentiallyRetryable: boolean, autoRetryAllowed: false, reason: RetryReason}
}
```

### DOM boundary

```js
export function createReadonlyDomCapabilities(root, selectors) {
  // Readonly<{csrfPresent, turnstilePresent, trackRowCount, buttonIdCount,
  // opaqueFieldCount, malformedRowCount, duplicateIdCount}>, each member is a
  // synchronous no-argument function returning a boolean or number.
}

export function observeSpotMateDom(capabilities) {
  // Frozen DomObservation with exactly eight fields and no raw values.
}
```

`selectors` contains only the structural selectors `csrf`, `turnstile`, `trackRows`, `buttons`, `opaqueFields`, and the integer `expectedTrackCellCount`. It contains no concrete ID, token, or page content.

### Task 1: Pure policies, retry, and fixtures

**Files:**
- Create: `package.json`
- Create: `src/policy/diagnostic-policy.js`
- Create: `src/policy/retry-policy.js`
- Create: `test/fixtures/safe-diagnostics.js`
- Create: `test/policy/diagnostic-policy.test.js`
- Create: `test/policy/retry-policy.test.js`

**Interfaces:**
- Consumes: DomObservation and ResponseMetadata defined above; no raw DOM or HTTP data.
- Produces: validateExpurgatedObservation(observation), evaluateResponseMetadata(metadata), evaluateDiagnosticSnapshot({observation, response}), and assessRetryPolicy({method, status}) with the exact signatures above.

- [ ] **Step 1: Create synthetic redacted fixtures**

First create package.json with no other executable key:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

In `test/fixtures/safe-diagnostics.js`, export frozen objects in this shape:

```js
export const SAFE_DOM_OBSERVATION = Object.freeze({
  csrfPresent: true,
  turnstilePresent: true,
  trackRowCount: 3,
  buttonIdCount: 3,
  opaqueFieldCount: 3,
  malformedRowCount: 0,
  duplicateIdCount: 0,
  anomalies: Object.freeze([])
});

export const RESPONSE_CASES = Object.freeze({
  directOnly: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: true, hasTaskId: false }),
  taskOnly: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: false, hasTaskId: true }),
  directAndTask: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: true, hasTaskId: true }),
  missingShape: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: false, hasTaskId: false }),
  unknownErrorFlag: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: null, hasDirectUrl: true, hasTaskId: false }),
  errorDeclared: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  html: Object.freeze({ status: 200, bodyKind: 'html', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  empty: Object.freeze({ status: 204, bodyKind: 'empty', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  unknownBody: Object.freeze({ status: 200, bodyKind: 'unknown', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  unknownStatus: Object.freeze({ status: null, bodyKind: 'unknown', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  forbidden: Object.freeze({ status: 403, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  unprocessable: Object.freeze({ status: 422, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  rateLimited: Object.freeze({ status: 429, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  serverError: Object.freeze({ status: 500, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false })
});
```

Do not add any string resembling a URL, ID, token, CSRF value, or real HTML.

- [ ] **Step 2: Write RED tests for the response matrix**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAFE_DOM_OBSERVATION, RESPONSE_CASES } from '../fixtures/safe-diagnostics.js';
import { evaluateDiagnosticSnapshot } from '../../src/policy/diagnostic-policy.js';

const cases = [
  ['directOnly', 'immediate', 'immediate-direct-url'],
  ['taskOnly', 'queued', 'queued-task-id'],
  ['directAndTask', 'failed-closed', 'ambiguous-direct-and-task'],
  ['missingShape', 'failed-closed', 'missing-result-shape'],
  ['unknownErrorFlag', 'failed-closed', 'ambiguous-metadata'],
  ['errorDeclared', 'failed-closed', 'error-flag'],
  ['html', 'failed-closed', 'html-body'],
  ['empty', 'failed-closed', 'empty-body'],
  ['unknownBody', 'failed-closed', 'unknown-body'],
  ['unknownStatus', 'failed-closed', 'unknown-status'],
  ['forbidden', 'failed-closed', 'http-403'],
  ['unprocessable', 'failed-closed', 'http-422'],
  ['rateLimited', 'failed-closed', 'http-429'],
  ['serverError', 'failed-closed', 'http-500']
];

for (const [name, outcome, reason] of cases) {
  test(`${name} produces the expected terminal verdict`, () => {
    const verdict = evaluateDiagnosticSnapshot({
      observation: SAFE_DOM_OBSERVATION,
      response: RESPONSE_CASES[name]
    });
    assert.equal(verdict.outcome, outcome);
    assert.equal(verdict.reason, reason);
    assert.equal(verdict.terminal, true);
    assert.deepEqual(verdict.effects, []);
  });
}
```

- [ ] **Step 3: Run the matrix and verify RED**

Run: `node --test test/policy/diagnostic-policy.test.js`

Expected: FAIL because `diagnostic-policy.js` and its exports do not exist.

- [ ] **Step 4: Implement the minimum response policy**

In `diagnostic-policy.js`, validate the exact observation and metadata keys and types, then apply this order without reading globals:

```js
const verdict = (outcome, reason) => Object.freeze({
  terminal: true,
  outcome,
  reason,
  effects: Object.freeze([])
});

export function evaluateResponseMetadata(metadata) {
  if (!isExactResponseMetadata(metadata)) return verdict('failed-closed', 'ambiguous-metadata');
  if (!Number.isInteger(metadata.status)) return verdict('failed-closed', 'unknown-status');
  if (metadata.status === 403) return verdict('failed-closed', 'http-403');
  if (metadata.status === 422) return verdict('failed-closed', 'http-422');
  if (metadata.status === 429) return verdict('failed-closed', 'http-429');
  if (metadata.status === 500) return verdict('failed-closed', 'http-500');
  if (metadata.status < 200 || metadata.status > 299) return verdict('failed-closed', 'other-non-2xx');
  if (metadata.bodyKind === 'html') return verdict('failed-closed', 'html-body');
  if (metadata.bodyKind === 'empty') return verdict('failed-closed', 'empty-body');
  if (metadata.bodyKind === 'unknown') return verdict('failed-closed', 'unknown-body');
  if (metadata.errorFlag === null) return verdict('failed-closed', 'ambiguous-metadata');
  if (metadata.errorFlag === true) return verdict('failed-closed', 'error-flag');
  if (metadata.hasDirectUrl && metadata.hasTaskId) return verdict('failed-closed', 'ambiguous-direct-and-task');
  if (metadata.hasDirectUrl) return verdict('immediate', 'immediate-direct-url');
  if (metadata.hasTaskId) return verdict('queued', 'queued-task-id');
  return verdict('failed-closed', 'missing-result-shape');
}
```

`isExactResponseMetadata` accepts exactly the five contract keys, a `null` or integer status from 100 through 599, an allowlisted `bodyKind`, a boolean or `null` `errorFlag`, and two presence booleans. `validateExpurgatedObservation` accepts exactly the eight DOM keys, the six permitted anomaly categories, and non-negative integer counts. Additional key names that could carry `id`, `token`, `url`, `value`, `content`, or `html` return `raw-value-leak`; other deviations return `ambiguous-dom-observation`. A conforming observation with CSRF, Turnstile, or opaque fields present remains valid.

- [ ] **Step 5: Run the policy tests and verify GREEN**

Run: `node --test test/policy/diagnostic-policy.test.js`

Expected: PASS for immediate URL only, task_id only, ambiguous direct + task, missing shape, declared or unknown error, HTML/empty/unknown body, unknown status, 403, 422, 429, and 500; every verdict is terminal with effects: [].

- [ ] **Step 6: Write RED tests for informational retry**

```js
import { assessRetryPolicy } from '../../src/policy/retry-policy.js';

for (const [status, potentiallyRetryable, reason] of [
  [403, false, 'forbidden'],
  [422, false, 'unprocessable'],
  [429, true, 'rate-limited'],
  [500, true, 'server-error']
]) {
  test(`POST ${status} remains informational and has no auto-retry`, () => {
    assert.deepEqual(assessRetryPolicy({ method: 'POST', status }), {
      potentiallyRetryable,
      autoRetryAllowed: false,
      reason
    });
  });
}
```

- [ ] **Step 7: Run retry tests and verify RED**

Run: `node --test test/policy/retry-policy.test.js`

Expected: FAIL because `retry-policy.js` does not exist.

- [ ] **Step 8: Implement retry and verify GREEN**

Implement a pure function that classifies 429 as rate-limited, all 5xx as server-error, 403 as forbidden, 422 as unprocessable, missing statuses as unknown-status, and everything else as not-retryable. Return literal autoRetryAllowed: false in every branch and use no timer, loop, Promise, or callback.

Run: `node --test test/policy/*.test.js`

Expected: PASS; 429 and 500 are potentially retryable, but no POST is retried automatically.

- [ ] **Step 9: Verify fixture hygiene and commit**

Add a test that serializes fixtures and rejects any URL, long opaque string, sensitive-value key, or HTML content. Confirm that the only positive information consists of booleans, counts, and categories.

Run: `node --test test/fixtures/safe-diagnostics.js test/policy/*.test.js`

Expected: PASS with no raw values.

```bash
git add package.json src/policy/diagnostic-policy.js src/policy/retry-policy.js test/fixtures/safe-diagnostics.js test/policy/diagnostic-policy.test.js test/policy/retry-policy.test.js
git commit -m "feat: add SpotMate diagnostic policies"
```

### Task 2: DOM observer and capability boundary

**Files:**
- Create: `src/observer/readonly-dom-capabilities.js`
- Create: `src/observer/spotmate-dom-observer.js`
- Create: `test/fixtures/synthetic-dom-root.js`
- Create: `test/observer/readonly-dom-capabilities.test.js`
- Create: `test/observer/spotmate-dom-observer.test.js`

**Interfaces:**
- Consumes: a document-like root, a structural selectors object, and the batch 1 contracts.
- Produces: createReadonlyDomCapabilities(root, selectors) and observeSpotMateDom(capabilities); no public method returns a string or node.

- [ ] **Step 1: Write a RED test for the capability surface**

```js
test('the boundary exposes only seven aggregate reads', () => {
  const capabilities = createReadonlyDomCapabilities(makeSyntheticRoot(), SYNTHETIC_SELECTORS);
  assert.deepEqual(Object.keys(capabilities).sort(), [
    'buttonIdCount', 'csrfPresent', 'duplicateIdCount', 'malformedRowCount',
    'opaqueFieldCount', 'trackRowCount', 'turnstilePresent'
  ]);
  for (const read of Object.values(capabilities)) {
    assert.equal(typeof read, 'function');
    assert.ok(['boolean', 'number'].includes(typeof read()));
  }
});
```

- [ ] **Step 2: Run the boundary test and verify RED**

Run: `node --test test/observer/readonly-dom-capabilities.test.js`

Expected: FAIL because the capability adapter does not exist.

- [ ] **Step 3: Implement the minimal synchronous boundary**

createReadonlyDomCapabilities uses only querySelector, querySelectorAll, children.length, and an internal read of the id attribute to count duplicates. The read attribute stays within the call scope and is never returned. The seven public functions return only:

```js
Object.freeze({
  csrfPresent: () => root.querySelector(selectors.csrf) !== null,
  turnstilePresent: () => root.querySelector(selectors.turnstile) !== null,
  trackRowCount: () => root.querySelectorAll(selectors.trackRows).length,
  buttonIdCount: () => countNodesWithId(root, selectors.buttons),
  opaqueFieldCount: () => root.querySelectorAll(selectors.opaqueFields).length,
  malformedRowCount: () => countMalformedRows(root, selectors.trackRows, selectors.expectedTrackCellCount),
  duplicateIdCount: () => countDuplicateIds(root, selectors.buttons)
});
```

Helpers return numbers and immediately discard all temporary values. No setter, listener, browser action global, or deferred callback is allowed.

- [ ] **Step 4: Run the boundary test and verify GREEN**

Run: `node --test test/observer/readonly-dom-capabilities.test.js`

Expected: PASS; the public surface contains exactly seven synchronous functions that return booleans or numbers.

- [ ] **Step 5: Write RED tests for the redacted observation**

```js
test('the observer returns exactly the redacted DOM contract', () => {
  const observation = observeSpotMateDom({
    csrfPresent: () => true,
    turnstilePresent: () => true,
    trackRowCount: () => 3,
    buttonIdCount: () => 3,
    opaqueFieldCount: () => 3,
    malformedRowCount: () => 0,
    duplicateIdCount: () => 0
  });
  assert.deepEqual(observation, {
    csrfPresent: true,
    turnstilePresent: true,
    trackRowCount: 3,
    buttonIdCount: 3,
    opaqueFieldCount: 3,
    malformedRowCount: 0,
    duplicateIdCount: 0,
    anomalies: []
  });
  assert.equal(observation instanceof Promise, false);
});

test('redacted presence does not fail policy evaluation', () => {
  const verdict = evaluateDiagnosticSnapshot({
    observation: SAFE_DOM_OBSERVATION,
    response: RESPONSE_CASES.directOnly
  });
  assert.equal(verdict.outcome, 'immediate');
  assert.equal(verdict.reason, 'immediate-direct-url');
});
```

- [ ] **Step 6: Run the observer test and verify RED**

Run: `node --test test/observer/spotmate-dom-observer.test.js`

Expected: FAIL because `observeSpotMateDom` does not exist.

- [ ] **Step 7: Implement the observer and verify GREEN**

Call each capability once, validate the type of each result, then build the eight contract fields. Add only these categories when their condition is true: missing CSRF, missing Turnstile, malformed rows, duplicate IDs, row/button count mismatch, and unexpected opaque-field count. Never include the ID or value that triggered a category.

Run: `node --test test/observer/*.test.js test/policy/diagnostic-policy.test.js`

Expected: PASS; observation is synchronous, frozen, contains no raw string, and continues to accept CSRF/Turnstile/opaque-field presence.

- [ ] **Step 8: Verify the negative boundary and commit**

Use a synthetic Proxy that throws on any write or read outside querySelector, querySelectorAll, children.length, and getAttribute('id'). Confirm that the root, any node, and any attribute value are absent from the serialized result.

Run: `node --test test/observer/*.test.js`

Expected: PASS with no mutation or raw value.

```bash
git add src/observer/readonly-dom-capabilities.js src/observer/spotmate-dom-observer.js test/fixtures/synthetic-dom-root.js test/observer/readonly-dom-capabilities.test.js test/observer/spotmate-dom-observer.test.js
git commit -m "feat: add expurgated SpotMate DOM observer"
```

### Task 3: Evidence, documentation, and final gate

**Files:**
- Create: `docs/diagnostics-evidence.md`
- Create: `docs/diagnostics-runbook.md`
- Create: `test/guardrails/static-scan.test.js`

**Interfaces:**
- Consumes: all passing tests and DomObservation, ResponseMetadata, DiagnosticVerdict, and RetryAssessment from batches 1 and 2.
- Produces: redacted live evidence, a strictly inert runbook, and a local static guard; no new behavioral policy.

**TDD applicability:** DIRECT_VALIDATION. Behaviors already have their RED/GREEN cycle in batches 1 and 2. Documentation and the aggregation gate do not manufacture a RED afterward; their first run should be GREEN. Any real failure is sent back to its owning batch for a tested fix.

- [ ] **Step 1: Confirm GREEN prerequisites**

Run: `node --test test/policy/*.test.js test/observer/*.test.js`

Expected: PASS for the full response matrix, retry policy, and DOM observer before writing the evidence.

- [ ] **Step 2: Write the static guard without artificial RED**

Create test/guardrails/static-scan.test.js using native APIs:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const forbiddenCapabilities = [
  /\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /\bWebSocket\b/i,
  /\bEventSource\b/i, /\bsendBeacon\s*\(/i,
  /\blocation\.(assign|replace|reload)\s*\(/i,
  /\.\s*(click|submit)\s*\(/i,
  /\b(localStorage|sessionStorage)\b/i,
  /\bnavigator\.clipboard\b/i,
  /\b(setTimeout|setInterval|queueMicrotask)\s*\(/i,
  /\b(child_process|spawn|exec|fork)\b/i
];

const rawValues = [
  /https?:\/\//i,
  /\b(?:csrf|turnstile|token|task[_-]?id|url|value)\b\s*[:=]\s*['"][^'"]{8,}/i,
  /['"][A-Za-z0-9+/_=-]{80,}['"]/
];

test('sources and fixtures remain inert and redacted', () => {
  for (const file of [...filesUnder('src'), ...filesUnder('test/fixtures')]) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      assert.equal(forbiddenCapabilities.some((pattern) => pattern.test(line)), false, `${file}:${index + 1}`);
      assert.equal(rawValues.some((pattern) => pattern.test(line)), false, `${file}:${index + 1}`);
    }
  }
});
```

The guard file is outside its own scan scope because it must name the forbidden capabilities to detect them. Production sources and fixtures remain fully covered.

- [ ] **Step 3: Run the guard and require GREEN**

Run: `node --test test/guardrails/static-scan.test.js`

Expected: PASS on its first run. A failure indicates a real regression in batch 1 or 2 and must be fixed there with its owning test.

- [ ] **Step 4: Write the redacted live evidence**

In docs/diagnostics-evidence.md, record exactly: script v1.24, /getTrackData status 200, three rows, dynamic CSRF present, three opaque fields of length 405, the static token is different, and no raw value retained. Present facts as aggregates; do not invent the Turnstile value, number of buttons, IDs, token content, or a direct URL.

Also document the evidence matrix: immediate URL only -> immediate; task_id only -> queued; URL plus task, HTML, 403, 422, 429, and 500 -> failed-closed. For 429 and 500, include the informational assessment potentiallyRetryable: true and autoRetryAllowed: false.

- [ ] **Step 5: Write the inert runbook**

In docs/diagnostics-runbook.md, describe using a page that is already open and a response that has already been observed, performing one synchronous observation, immediately reducing data to the redacted contracts, calculating the verdict and informational retry assessment, then stopping. Explicitly prohibit navigation, clicks, submissions, transport, task polling, retry, waits, timers, loops, downloads, storage, and copying raw values.

- [ ] **Step 6: Directly validate the documents and full gate**

Search the documents for the prescribed incompleteness markers, then verify the eight response cases, eight DOM fields, five response fields, three outcomes, terminal: true, effects: [], and autoRetryAllowed: false.

Run in this order:

```bash
node --test
git diff --check
git status --short
```

Expected: all tests PASS, no output from git diff --check, and Git status limited to the three batch files. Confirm that no GitHub workflow was added; publish to the private repository only after full validation.

- [ ] **Step 7: Commit the evidence batch**

```bash
git add docs/diagnostics-evidence.md docs/diagnostics-runbook.md test/guardrails/static-scan.test.js
git commit -m "docs: add SpotMate diagnostic evidence"
```

## Delivery gate and escalation condition

The final gate is fail-closed: any failing test, static guard, documentation check, or git diff --check blocks publication. No GitHub workflow is added in this scope. Publication to a private GitHub repository is a separate step, authorized only after complete local validation.

Escalate only if a requirement mandates transport, conversion, polling, downloads, storage of sensitive values, or an external dependency. Stop the plan and request an explicit decision; do not silently expand the inert scope.

## Final plan review

- DOM and response contracts are separate; the old artificial payload is gone.
- Redacted CSRF, Turnstile, and opaque-field presence is accepted; only a raw leak of these signals fails.
- Interfaces and signatures match the specification.
- Cases 403, 422, 429, 500, HTML, direct + task, task only, and URL only each have a behavioral test in batch 1.
- Retry policy is pure and informational, uses autoRetryAllowed: false for POST, and has no timer or loop.
- Batch 2 proves the eight DOM fields without exposing IDs or values.
- Batch 3 uses DIRECT_VALIDATION and adds no artificial RED.
- All three batches stay under eight files and 800 lines.
- Redacted live evidence contains only observed facts and invents no unreported fields.
