> **Status: Historical v1.x record — inactive and unsupported.**

# Redacted SpotMate diagnostic evidence

## Status

The aggregated evidence is informational and inert. It does not consume the launcher capability (capabilities.conversion) and can never authorize /api/queue/start. A diagnostic verdict is not a conversion request, download authorization, or reactivation of the local launcher.

## Live evidence

The observed evidence concerns script v1.24 and the /getTrackData response. Only the following aggregates are retained:

- HTTP status: 200
- Three rows observed
- A dynamic CSRF value was present
- Three opaque fields, each 405 characters long
- The static token is different

No raw value is retained. The evidence contains no identifier, token, media URL, HTML, header, or raw body. The Turnstile value, number of buttons, IDs, token content, and a direct URL are neither invented nor recorded.

## Aggregated contracts

A DomObservation contains exactly these eight fields:

csrfPresent, turnstilePresent, trackRowCount, buttonIdCount, opaqueFieldCount, malformedRowCount, duplicateIdCount, anomalies.

A ResponseMetadata contains exactly these five fields:

status, bodyKind, errorFlag, hasDirectUrl, hasTaskId.

A DiagnosticVerdict is terminal (terminal: true), has no effects (effects: []), and uses one of three outcomes: immediate, queued, or failed-closed.

## Evidence matrix

| Aggregated response facts | Verdict | Rationale |
| --- | --- | --- |
| Immediate URL only | immediate | Unambiguous direct result |
| task_id only | queued | Deferred result reported without a direct URL |
| URL plus task_id | failed-closed | Ambiguous shape |
| HTML body | failed-closed | Body is outside the contract |
| Status 403 | failed-closed | Access denied |
| Status 422 | failed-closed | Request cannot be processed |
| Status 429 | failed-closed | Rate limited |
| Status 500 | failed-closed | Server error |

For statuses 429 and 500, RetryAssessment is informational: potentiallyRetryable: true and autoRetryAllowed: false. No verdict triggers transport, polling, or a side effect.

## Documentation gate

This evidence is a transcription of aggregates already observed. It does not describe a new behavioral policy and cannot authorize a remote action. Any data that cannot be reduced to these redacted contracts must be omitted from the evidence.
