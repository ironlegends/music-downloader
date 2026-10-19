> **Status: Historical v1.x record — inactive and unsupported.**

# Inert SpotMate diagnostics runbook

## Preconditions

Use only a page that is already open and a response that has already been observed. Do not open a page, request a new response, or depend on an external service. This procedure applies to one synchronous observation. The result is informational and inert: it does not consume the launcher capability and never authorizes /api/queue/start.

## Single procedure

1. Perform exactly one synchronous observation on the page that is already open.
2. Immediately reduce the data to the DomObservation and ResponseMetadata contract fields.
3. Keep only presence flags, counts, categories, status, body category, error flag, and result-presence fields.
4. Calculate the terminal DiagnosticVerdict and, when the status permits, the informational RetryAssessment.
5. Stop immediately after calculation.

Keep the result aggregated. Do not copy, display, or retain any page value, attribute value, identifier, token, media URL, HTML, header, or raw body.

## Strict prohibitions

This runbook does not authorize navigation, clicks, submissions, transport, task polling, retries, waits, timers, loops, downloads, storage, or copying raw values. It uses no fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, clipboard access, browser storage, or child process.

It performs no recovery action and does not turn a verdict into a command. Even when potentiallyRetryable: true, autoRetryAllowed: false remains mandatory.

## Stop and fail closed

Any incomplete, ambiguous, or unredacted observation produces failed-closed, with terminal: true and effects: []. Do not add a wait or resume mechanism to bypass this stop.
