> **Status: Historical v1.x record — inactive and unsupported.**

# SpotMate diagnostics — design specification

## Objective

Build a dependency-free Node.js ESM project that diagnoses SpotMate in a strictly inert way from two already-observed sources: a redacted DOM summary and redacted response metadata. The project never mixes DOM state with the HTTP response contract and retains no raw values.

Each evaluation produces a terminal verdict with no effects. queued describes the presence of a task identifier without starting polling. Retry policy is informational only: it may report that a status could be retryable, but it never authorizes an automatic retry or a wait.

## Observed contract

The real data being modeled is distinct:

1. The DOM observation describes only presences, counts, and anomaly categories.
2. Response metadata describes only the status, body kind, and presence of result shapes.
3. The verdict classifies the diagnosis as immediate, queued, or failed-closed.
4. Retry assessment remains separate from the verdict and never instructs an action.

There is no artificial container that combines DOM state with response diagnostics. DOM state is never interpreted as HTTP state, and no HTTP response includes a DOM observation.

## Reference redacted live evidence

The design uses this observed evidence, retained only as aggregates:

- SpotMate script v1.24.
- Observed path /getTrackData with status 200.
- Three rows observed.
- A dynamic CSRF value was present.
- Three opaque fields, with an observed length of 405.
- The static token was observed to be different.
- No raw value, identifier, or media URL was retained.

The evidence invents no values for unreported fields. It shows the distinction between redacted presence and leakage: csrfPresent: true, turnstilePresent: true, or opaqueFieldCount > 0 are expected observations and do not fail. For these sensitive signals, only exposure of a raw value, identifier, or media URL fails closed; unknown shapes remain subject to the general fail-safe rule.

## Non-goals

- No HTTP client, application transport, or network access.
- No task polling, automatic retry, loop, or delayed wait.
- No navigation, user interaction, submission, download, DOM write, or browser state change.
- No storage, clipboard, raw-value export, or child process.
- No npm package, external provider, or GitHub workflow in this scope.

## Safety and security constraints

1. Runtime is Node.js ESM with zero production or test dependencies.
2. Browser observation is synchronous and read-only.
3. The repository contains no fetch, XHR, WebSocket, EventSource, beacon, navigation, click, submission, storage, clipboard, download, polling, timer, or child process.
4. The repository contains no raw CSRF, Turnstile, opaque token, button ID, task ID, or media URL.
5. CSRF, Turnstile, and opaque-field presence are normal DOM diagnostics when represented as booleans or counts.
6. immediate, queued, and failed-closed are terminal and always have effects: [].
7. Any unknown or non-2xx status, HTML or unknown body, declared error, or ambiguous response combination fails closed.
8. A queued result never starts polling, a timer, a loop, or transport.
9. Retry policy is informational; autoRetryAllowed is always false for POST.
10. Each implementation batch changes at most eight files and targets at most 800 added or changed lines.
11. There is no GitHub CI in this scope because active authentication lacks the workflow scope.
12. Publication to a private GitHub repository is authorized only after complete validation of the final batch.

## Architecture

~~~text
already-open document
        |
        v
read-only DOM boundary --> redacted DomObservation --+
                                                      |
already-captured response metadata ------------------+--> pure policy --> terminal verdict
                                                      |
                                                      +--> informational retry assessment
~~~

The DOM boundary immediately reduces reads to booleans and counts. The policy receives an observation and already-redacted metadata; it receives no DOM node, HTTP body, URL, or identifier. Retry policy does not alter the verdict and has no execution capability.

## Contract interfaces

The project uses JavaScript ESM with strict JSDoc and frozen objects.

### Redacted DOM observation

~~~js
/**
 * @typedef {
 *   'csrf-absent'|'turnstile-absent'|'track-row-malformed'|
 *   'duplicate-button-id'|'button-count-mismatch'|
 *   'opaque-field-count-unexpected'
 * } DomAnomaly
 *
 * @typedef {Readonly<{
 *   csrfPresent: boolean,
 *   turnstilePresent: boolean,
 *   trackRowCount: number,
 *   buttonIdCount: number,
 *   opaqueFieldCount: number,
 *   malformedRowCount: number,
 *   duplicateIdCount: number,
 *   anomalies: readonly DomAnomaly[]
 * }>} DomObservation
 */
~~~

This interface contains no ID, field name, attribute content, token, or value. Numbers are integers greater than or equal to zero. anomalies contains only the allowlisted categories above.

### Redacted response metadata

~~~js
/**
 * @typedef {'json'|'html'|'empty'|'unknown'} BodyKind
 * @typedef {Readonly<{
 *   status: number|null,
 *   bodyKind: BodyKind,
 *   errorFlag: boolean|null,
 *   hasDirectUrl: boolean,
 *   hasTaskId: boolean
 * }>} ResponseMetadata
 */
~~~

hasDirectUrl and hasTaskId indicate presence only. They contain no URL or task_id. errorFlag is null when the body does not let this field be observed unambiguously.

### Terminal verdict

~~~js
/**
 * @typedef {'immediate'|'queued'|'failed-closed'} DiagnosticOutcome
 * @typedef {
 *   'immediate-direct-url'|'queued-task-id'|'unknown-status'|
 *   'http-403'|'http-422'|'http-429'|'http-500'|'other-non-2xx'|
 *   'html-body'|'empty-body'|'unknown-body'|'error-flag'|
 *   'ambiguous-direct-and-task'|'missing-result-shape'|
 *   'ambiguous-metadata'|'ambiguous-dom-observation'|'raw-value-leak'
 * } DiagnosticReason
 * @typedef {Readonly<{
 *   terminal: true,
 *   outcome: DiagnosticOutcome,
 *   reason: DiagnosticReason,
 *   effects: readonly []
 * }>} DiagnosticVerdict
 */
~~~

### Informational retry assessment

~~~js
/**
 * @typedef {
 *   'rate-limited'|'server-error'|'forbidden'|'unprocessable'|
 *   'not-retryable'|'unknown-status'
 * } RetryReason
 * @typedef {Readonly<{
 *   potentiallyRetryable: boolean,
 *   autoRetryAllowed: false,
 *   reason: RetryReason
 * }>} RetryAssessment
 * @typedef {
 *   Readonly<{ok: true}>|
 *   Readonly<{ok: false, reason: 'raw-value-leak'|'ambiguous-dom-observation'}>
 * } DomValidation
 * @typedef {Readonly<{
 *   csrfPresent: () => boolean,
 *   turnstilePresent: () => boolean,
 *   trackRowCount: () => number,
 *   buttonIdCount: () => number,
 *   opaqueFieldCount: () => number,
 *   malformedRowCount: () => number,
 *   duplicateIdCount: () => number
 * }>} ReadonlyDomCapabilities
 * @typedef {Readonly<{
 *   csrf: string,
 *   turnstile: string,
 *   trackRows: string,
 *   buttons: string,
 *   opaqueFields: string,
 *   expectedTrackCellCount: number
 * }>} SpotMateDomSelectors
 */
~~~

Public signatures:

~~~js
/** @param {unknown} observation @returns {DomValidation} */
export function validateExpurgatedObservation(observation) {}

/** @param {unknown} metadata @returns {DiagnosticVerdict} */
export function evaluateResponseMetadata(metadata) {}

/**
 * @param {Readonly<{observation: unknown, response: unknown}>} input
 * @returns {DiagnosticVerdict}
 */
export function evaluateDiagnosticSnapshot(input) {}

/**
 * @param {Readonly<{method: string, status: number|null}>} input
 * @returns {RetryAssessment}
 */
export function assessRetryPolicy(input) {}

/**
 * @param {Readonly<object>} root
 * @param {SpotMateDomSelectors} selectors
 * @returns {ReadonlyDomCapabilities}
 */
export function createReadonlyDomCapabilities(root, selectors) {}

/** @param {ReadonlyDomCapabilities} capabilities @returns {DomObservation} */
export function observeSpotMateDom(capabilities) {}
~~~

evaluateDiagnosticSnapshot consumes exactly { observation: DomObservation, response: ResponseMetadata }. assessRetryPolicy consumes exactly { method: string, status: number|null }. The functions accept no network capability and return no raw input data.

## Response policy

Decision order is deterministic:

1. Invalid DOM observation shape or detected raw field: failed-closed.
2. Missing or invalid status: failed-closed / unknown-status.
3. Status 403: failed-closed / http-403.
4. Status 422: failed-closed / http-422.
5. Status 429: failed-closed / http-429.
6. Status 500: failed-closed / http-500.
7. Any other non-2xx status: failed-closed / other-non-2xx.
8. Body html, empty, or unknown: fail closed with the corresponding reason.
9. JSON with errorFlag: null: failed-closed / ambiguous-metadata.
10. JSON with errorFlag: true: failed-closed / error-flag.
11. JSON with both a direct URL and task identifier: failed-closed / ambiguous-direct-and-task.
12. JSON with only a direct URL: immediate / immediate-direct-url.
13. JSON with only a task identifier: queued / queued-task-id.
14. JSON without either result shape: failed-closed / missing-result-shape.

Redacted CSRF, Turnstile, or opaque-field presence does not change this decision. Known DOM anomalies remain informational. An unexpected key that could carry an ID or value produces raw-value-leak; any other invalid DOM shape produces ambiguous-dom-observation.

## Retry policy

Policy is separate and never changes the terminal verdict:

| Status | potentiallyRetryable | autoRetryAllowed | Reason |
|---:|:---:|:---:|---|
| 403 | false | false | forbidden |
| 422 | false | false | unprocessable |
| 429 | true | false | rate-limited |
| 500 | true | false | server-error |
| Other 5xx | true | false | server-error |
| Other known status | false | false | not-retryable |
| Unknown status | false | false | unknown-status |

For POST, autoRetryAllowed is always false, even when potentiallyRetryable is true. No timer, loop, callback, Promise, or transport is associated with this assessment.

## Read-only browser boundary

createReadonlyDomCapabilities(root, selectors) may read synchronous DOM properties to calculate the seven required booleans or counts. Its public surface returns only booleans and numbers: CSRF presence, Turnstile presence, row count, count of buttons with IDs, opaque-field count, malformed-row count, and duplicate-ID count.

The adapter may compare IDs or lengths in memory to produce an aggregate, but discards them before returning. It exposes no document, node, attribute, or value. observeSpotMateDom assembles the aggregates, derives anomaly categories, and returns a frozen object with exactly the eight DomObservation fields.

## Fixtures and data hygiene

Fixtures are synthetic and contain no URL, task_id, DOM ID, token, or real HTML content. Response cases use only ResponseMetadata. DOM cases use only DomObservation or synthetic capabilities that return booleans and counts.

The minimum matrix explicitly covers: 403, 422, 429, 500, HTML body, ambiguous JSON with a direct URL plus task ID, task ID alone, and immediate URL alone. It also covers unknown status, empty/unknown body, declared error, and JSON without a result shape.

## Evidence, validation, and publication

Local evidence contains only script version, non-media endpoint path, status, booleans, counts, aggregate lengths, verdicts, capability calls, and test results. It contains no HTML, response body, header, cookie, ID, direct URL, or sensitive value.

The final gate includes searches for the prescribed incompleteness markers, self-review of signatures, the node:test suite, static checks for forbidden capabilities and raw data, git diff --check, review of redacted evidence, and Git state limited to expected files. Behavioral tests belong in the policy and observer batches; documentation and the final gate use direct validation and do not invent a RED failure after earlier batches are green.

There is no GitHub CI in this scope. Private GitHub publication remains blocked until full local validation. The documentation realignment commit uses the exact message docs: align plan with observed contract.

## Acceptance criteria

- DOM and response contracts are separate and contain no raw values.
- The verdict uses only immediate, queued, or failed-closed, with terminal: true and effects: [].
- Redacted CSRF, Turnstile, and opaque-field presence does not fail.
- The response matrix covers all eight explicitly requested cases.
- Retry policy is pure and informational and prohibits automatic POST retry.
- The plan retains exactly three tasks, each limited to eight files and 800 lines.
- Behavioral tests are in batches 1 and 2; batch 3 uses DIRECT_VALIDATION with no artificial RED.
- Only this specification and its associated plan change in the documentation batch.
