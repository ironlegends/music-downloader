# Open-source preparation: English and Chrome on macOS

> Preparation completed. The maintainer subsequently authorized publication in a new public repository and an update of the private repository. The original preparation restrictions below describe that earlier phase. See [the source publication record](../../security/source-publication.md) for the approved follow-up.

## Goal and acceptance
Prepare Music Converter for an MIT-licensed open-source release. Use English throughout tracked source, tests, messages, documentation and filenames. Keep the existing English product and repository name. Remove active Microsoft Edge support. Target Chrome on Windows and macOS; record Safari as deferred unless it can be delivered and validated without a new Apple build/signing lifecycle.

The user approved implementation and GitHub issue creation. MIT was explicitly selected. Do not change repository visibility, rewrite Git history, delete published releases, publish a package, tag or release, or claim third-party rights without evidence. Keep npm private=true. Keep version 2.0.0 as the current published baseline; describe these changes as unreleased.

## Baseline
HEAD 623c772. Clean checkout. 177/177 tests passed on Windows/Node 24. Browser artifact check and release metadata check passed. GitHub repository is private. A historical CSRF literal exists; the known literal is absent at the tip. Existing QA documentation remains PENDING despite an existing private v2.0.0 release.

## Deliverables and ownership
1. English documentation and project presentation: isolated Luna worker, docs/**, qa/**, README.md, CHANGELOG.md and GitHub contribution templates. Preserve historical facts and clearly label retired browser support in archives. Main owns this plan and new docs/security/**. Rename active console guide to docs/guides/console-script.md.
2. English runtime and regression tests: isolated Luna worker, src/**, test/** and tests/**. Rename src/browser/entries/script-complet.js to console-script.js and tests/test_script_complet.cjs to console-script.test.cjs. Preserve execution contracts, timings, same-origin requests, manual Turnstile and trusted user actions. Tests must describe Chrome-only packaging and the English console-script.js artifact. Do not delete tests to make them pass.
3. Chrome-only packaging and release safety: main, tools/**, packaging/**, package.json, manifests, generated artifacts and workflows. Rename script_complet.txt to console-script.js. Reject unsupported browser names in both programmatic and CLI paths. Include MIT license in distributable archives and document license metadata accurately. Use environment variables for dispatch inputs; build the exact validated tag commit and require completed QA evidence. Add macOS to the CI matrix.
4. Release-readiness audit and GitHub tracking: main. Scan reachable Git history and current files with redacted results, identify provenance and rights unknowns, write an English report and actionable issues. Evaluate Safari using Apple documentation. Update repository description in English.

## Validation and review
Use focused RED/GREEN tests for changed packaging/workflow contracts. Translation-only changes use direct language and reference checks. After integration: npm test, browser generation --check, metadata check, build/verify Chrome and release in temporary directories, git diff --check, active inventory and language checks. Confirm a source snapshot can run tests without historical sensitive objects. Inspect English UI in a synthetic browser fixture without contacting SpotMate or downloading music. Chrome/macOS and Safari real-device evidence remains pending unless actually executed.

One independent Sol low review covers the integrated browser/release/security boundary. Correct deterministic findings and rerun affected checks; request at most one targeted re-review for material uncertainty. No publication until history, provenance and real-browser gates are addressed.
