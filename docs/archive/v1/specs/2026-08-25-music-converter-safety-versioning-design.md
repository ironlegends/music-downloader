> **Status: Historical v1.x record — inactive and unsupported.**

# Design specification: Music Converter launcher safety and versioning

**Date:** 2026-08-25
**Status:** Approved for planning and additive implementation
**Base:** 493fbf178450702a602c8fb0469ab8ac8a4fddfc
**Working branch:** feat/launcher-safety-semver

## Objective and boundaries

This change keeps the local launcher fail-closed while remote conversion is not a supported and tested contract. Downloads remain a future product goal; only local conversion execution is temporarily disabled. Metadata analysis, interface display, and inert diagnostics remain documented separately.

Scope:

- The server-side conversion gate and its stable API contract.
- The interface reading this capability and explicitly disabling the button.
- Removing every copy of the real CSRF value from files tracked at the tip, with a generic guard over executable surfaces and targeted redaction of the two occurrences in the relevant historical plan.
- Clarifying the documentation distinction between inert diagnostics, the active launcher, and historical DevTools scripts.
- Minimal SemVer metadata and preparation for renaming to music-converter.

Out of scope: bypassing Turnstile/CAPTCHA, reactivating conversion, rewriting Git history, moving src/observer or src/policy, splitting the repository, a deployment workflow, a tag, or a release. The implementation worker performs no GitHub operation; after a PASS review, the final orchestrator performs only the explicitly requested rename and non-forced push. All older specification and plan documents remain intact except the two real values in docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md, which are replaced without changing another sentence, its vision, or its purpose.

## Options considered

### Option A — Minimal fail-closed gate (selected)

Add a stable server capability, expose capabilities.conversion.enabled=false from /api/status, reject POST /api/queue/start with 503 and an explicit code, then have the UI disable the control based on this capability. Keep the modules in place; QueueManager tests continue to cover their unit behavior without making the endpoint active.

**Benefits:** additive, reversible change; short regression surface; contract observable to the UI and future clients; no ambiguity about side effects. **Cost:** conversion modules remain present but unreachable through the protected endpoint until an explicitly tested future reactivation.

### Option B — Move diagnostics physically

Move src/observer and src/policy into a dedicated tree, then rewrite imports and tests.

**Benefits:** stronger visual separation. **Cost:** broad diff, regression risk, and loss of traceability for existing paths; this option does not by itself solve the conversion gate. Rejected for this task.

### Option C — Split the repository

Separate diagnostics and DevTools scripts from the active launcher in two repositories.

**Benefits:** very explicit lifecycle and permission boundaries. **Cost:** more coordination, history, CI, and documentation; the separation does not justify an irreversible migration for a temporary disablement. Out of scope.

## Architecture decision

Option A is selected. The boundary is contractual rather than physical:

~~~text
Inert diagnostics                    Active local launcher
src/observer                          server.js
src/policy                            public/
test/observer, test/policy            src/spotify-extractor.js
test/fixtures                         src/spotmate-client.js
docs/diagnostics-*                    src/queue-manager.js
                                      src/downloader.js
                                      /api/queue/start -> 503 gate

Historical DevTools scripts: script*.txt and their tests
They do not consume the launcher capability; changes are limited to
secret hygiene and preserving their existing tests.
~~~

Diagnostics continue to produce only presence flags, counts, categories, and verdicts with no side effects. The launcher retains its files and current vision, but the server becomes the authority that refuses local conversion. No large-scale move is required.

## Capability contract and flow

The server defines an immutable capability with these values; Object.isFrozen(CONVERSION_CAPABILITY) must return true:

~~~js
{
  enabled: false,
  code: 'launcher-local-conversion-disabled',
  message: 'La conversion locale du launcher est temporairement désactivée.'
}
~~~

GET /api/status remains an HTTP 200 success and adds the capability without removing status, config, or queue:

~~~json
{
  "status": "online",
  "capabilities": {
    "conversion": {
      "enabled": false,
      "code": "launcher-local-conversion-disabled",
      "message": "La conversion locale du launcher est temporairement désactivée."
    }
  },
  "config": {},
  "queue": {}
}
~~~

POST /api/queue/start checks the capability before reading or validating the JSON body. While enabled is false, it returns exactly a 503 with a structured error and never calls queueManager.start:

~~~json
{
  "success": false,
  "error": {
    "code": "launcher-local-conversion-disabled",
    "message": "La conversion locale du launcher est temporairement désactivée."
  }
}
~~~

The refusal is identical for an empty, invalid, incomplete, or track-bearing body. A node:http request declares Content-Length, calls flushHeaders(), never ends the body, and must still receive 503 within a bounded time with startCalls=0; this proves that the gate runs before readJsonBody(). The gate depends on no quota, CSRF state, or bypass attempt. Metadata-reading endpoints and configuration controls remain separate from starting conversion; no endpoint implicitly reactivates the queue.

The UI initializes the capability in fail-closed state. The markup in public/index.html already has disabled and aria-disabled="true" before any JavaScript runs. After /api/status, the UI reads data.capabilities.conversion, keeps btnDownload disabled if the capability is missing, invalid, or disabled, and displays its message in the existing alert banner. The test records the click listener and distinguishes GET /api/status from POST /api/queue/start; invoking the listener must never emit POST, and the reason must remain visible. A client that bypasses the UI is still protected by the server's 503.

## CSRF hygiene and no bypass

DevTools scripts remain outside the launcher's conversion gate. They are not rewritten to follow the server capability. Their hygiene is still strengthened:

- Remove every current copy of a real CSRF value from files tracked at the tip.
- Assertions no longer contain the real value; instead they search for generic opaque literals in a token context.
- Tests construct synthetic values at runtime from fragments so no complete opaque literal is versioned.
- src/spotmate-client.js retains only dynamic runtime resolution and has no secret default value.
- Diagnostics neither extract nor display raw values; no Turnstile/CAPTCHA data is used to authorize an action.

Older specification and plan documents are historical and are neither executable surfaces nor sources of authorization. They remain intact except docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md: only its two copies of the real value are replaced with [REDACTED_CSRF_TOKEN]. Validation retrieves the value in memory from 38c4e403241f7dfecfb0b56e2ea3e4c79d4bf428:script2.txt, checks for it across git ls-files, and prints only paths with line numbers or a count, never the value. This redaction at the tip does not rewrite Git history.

## Tests and acceptance criteria

The change is accepted when:

1. An end-to-end test run alone with spawnSync fails before tests/secret-guard.cjs exists, then passes with the exact generic message SECRET_GUARD_VIOLATION count=1; its temporary fixture assembles the synthetic value from fragments at runtime.
2. The metadata test confirms package.json.name = "music-converter", version = "1.0.0", and private = true.
3. The test checks fs.existsSync(changelogPath) before readFileSync, then confirms [Unreleased] followed by [1.0.0] - 2026-08-25.
4. Guardrails detect a synthetic opaque literal without embedding a real CSRF value; active scripts contain no opaque copy of that kind; and a non-disclosing historical scan confirms zero occurrences of the real value across all files tracked at the tip.
5. /api/status exposes the exact capability and Object.isFrozen(CONVERSION_CAPABILITY) is true.
6. /api/queue/start returns 503 and the exact code, with zero calls to start, including for an invalid body or a declared but never completed body.
7. HTML is disabled before JavaScript; when the capability is missing or disabled, the click listener emits no POST /api/queue/start while GET /api/status remains observed and the reason stays visible.
8. Diagnostic unit tests remain inert and DevTools scripts pass their existing functional tests.
9. npm test, targeted tests, git diff --check 493fbf178450702a602c8fb0469ab8ac8a4fddfc..HEAD, documentation review, and git status --short with no output pass on the branch.
10. No older specification or plan is modified except the two lines containing the real value in docs/superpowers/plans/2026-08-25-spotmate-scripts-update.md; those lines change only by replacing that value with [REDACTED_CSRF_TOKEN].

## SemVer and repository rename

package.json is the single SemVer source of truth. The retained value is 1.0.0; no tag or release exists at this baseline. The package is marked private: true and named music-converter. CHANGELOG.md has [Unreleased] and [1.0.0] - 2026-08-25 sections.

Future rule: fix increments PATCH, compatible feat increments MINOR, and a breaking change increments MAJOR; docs, tests, or chore alone do not trigger a bump. A future tag will be annotated vX.Y.Z after npm test. After final review passes, the final orchestrator — never the implementation worker — renames the repository to ironlegends/music-converter, checks the URL, PRIVATE visibility, and main default branch, updates origin, pushes feat/launcher-safety-semver without force, then reads and compares the remote SHA. Tags and releases remain separate gates and are not part of this handoff.

## Limits and future reactivation

This specification does not claim to prove that the remote service still accepts the conversion protocol. Conversion can be reactivated only with a supported contract, explicit activation code, server/UI tests, and security validation covering errors and secrets. No such change is included in this version.
