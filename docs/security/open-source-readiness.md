# Open-source release readiness

Assessment date: 2026-10-19. Published baseline: v2.0.0, commit `623c772`. Current work is unreleased.

## Decision

The project is technically suitable for an MIT-licensed source release. The maintainer authorized a new public source repository on 2026-10-19 while keeping the legacy repository private. The approved route starts a fresh Git history from the reviewed source snapshot; it excludes all legacy refs and release assets. The historical sensitive literal remains a gate against opening the legacy history. The maintainer confirmed authorship of the initial scripts and selected MIT; third-party service and music rights still require use-specific care. Real Chrome QA on Windows and macOS remains a stable-release gate. See [the source publication record](source-publication.md).

This is a bounded source and release-readiness assessment, not a legal opinion, external penetration test or guarantee that all vulnerabilities or secrets have been found.

## Scope and method

- Reviewed the browser entry points, page-origin policy, API adapter, payload parser, user-action checks, download adapter, session projection/storage, manifests and build/release workflows.
- Reviewed declared dependencies and package/license metadata. There are no declared npm dependencies; GitHub Actions and the external service still form part of the supply chain. The distributed asset inventory contains authored JavaScript, CSS, the manifest and MIT notice; no music, third-party logo or downloaded service script is bundled.
- Scanned all 151 locally reachable commits using Gitleaks v8.30.1, default rules plus a CSRF-header literal rule, with full redaction. The official Windows tool archive was verified against its release checksum: `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`.
- Independently checked the known historical literal across 673 reachable Git blobs without printing its value.
- Downloaded all 58 assets from the nine existing private GitHub releases. The earliest release has no assets. Expanded 160 ZIP entries after validating extraction paths and sizes. No downloaded code or installer was executed.
- Scanned downloaded and expanded assets with the same redacted rules, then searched them for the exact known historical literal.
- Checked the current source snapshot and build outputs separately after integration. Validation results are recorded below.

Raw redacted scanner reports and downloaded historical assets are retained outside the repository. Their contents must not be added to the public source distribution.

Issue numbers in this assessment refer to the private legacy tracker. They are not issue numbers in the new public repository.

## Findings and disposition

### OSS-01: historical sensitive literal remains reachable

Legacy-history publication blocker. One Gitleaks CSRF-literal finding is confirmed in the initial historical script. The independent exact-value check found the same value in nine blob versions across old scripts, tests and an implementation plan. Its current validity and exploitability are unknown. Its absence at the tip does not remove it from history. The approved public source repository excludes this history entirely.

No Gitleaks finding or exact known-literal hit was detected in the 58 downloaded release assets and their expanded contents. This result does not establish the absence of all personal data, secrets or vulnerable legacy code.

The maintainer selected a reviewed source snapshot in the separate public repository, retaining legacy history privately. A new local repository with independent object storage supplies the initial public commit. No private refs, tags or release assets are imported. This resolves the historical-object exposure for the selected source publication; it does not sanitize the legacy repository. Opening the legacy history, rewriting it or removing published releases still requires separate authorization. Track #40.

### OSS-02: code provenance and third-party rights

The maintainer explicitly confirmed on 2026-10-19 that they wrote the initial scripts and selected MIT. A root MIT license and distributable notices are included. No third-party code source was identified. The source/resource inventory consists of authored JavaScript, CSS, manifests, tests, tools and documentation. No music, third-party logo, service script or npm dependency is bundled. External GitHub Actions and the service remain separate dependencies. This owner statement and inventory resolve the source-publication provenance check; they are not an independent legal clearance of every historical snippet or of third-party service/content use. A use-specific review remains relevant before promotion, store submission or distributing third-party content. Track #41.

The workflow performs conversions and downloads through SpotMate. The MIT license covers only rights granted by software copyright holders; it does not license music, service access or trademarks. Spotify's user guidelines restrict unauthorized copying and ripping. SpotMate reserves rights in its materials. These terms require a use-specific review; they do not by themselves establish that publishing this independent software is unlawful.

References: [Spotify user guidelines](https://www.spotify.com/ca-en/legal/user-guidelines/), [SpotMate terms](https://spotmate.online/tos).

### SEC-01: dispatch input was interpolated into a privileged shell

Confirmed source defect, addressed in the current local workflow. The original workflow inserted a free-form tag directly into Bash. Exploitation required permission to dispatch the workflow; no unprivileged external exploit is asserted. Inputs now enter through environment variables and a strict release-tag format is checked before Git operations. Regression tests prohibit GitHub-expression interpolation inside run scripts. Track #42.

### REL-01: released artifacts could come from a different commit than the tag

Confirmed provenance defect, addressed in the current local workflow. The original workflow validated the tag's ancestry but built the dispatch checkout. The workflow now resolves the annotated tag, checks its ancestry, checks out the exact commit and checks HEAD/version before testing and building. The release remains a draft. Track #42.

### QA-01: real-browser release evidence is incomplete

Open stable-release gate. The committed checklist remains PENDING despite an existing private v2.0.0 release. This report does not infer that testing never occurred; usable evidence is missing. The release workflow requires overall PASS and, independently for each platform, PASS, all eight named checks, actual OS/Chrome versions and a non-placeholder evidence reference. The independent review found that the first helper accepted an empty platform section; the corrected parser has regressions for missing platform bodies, statuses, checks and evidence. Explicit dispatch confirmation is also required. Track #44.

### TRUST-01: final HTTPS URLs remain a service trust boundary

Residual risk, not a demonstrated code-execution vulnerability. The URL policy accepts HTTPS destinations returned by the service without a hostname allowlist. Downloads require user action; new tabs use noopener/noreferrer. A malicious service response could still send a user to an unwanted HTTPS destination or file. A reliable CDN allowlist cannot be invented from the available evidence. Review actual destinations during authorized real-browser QA before deciding whether to constrain them.

## Browser decision

Chrome is the sole active extension target, on Windows and macOS. The extension uses standard browser capabilities and has no operating-system-specific runtime dependency. The CI matrix includes macOS for Node tests and build behavior. GitHub Actions results must be checked on the uploaded commit; automated macOS CI does not by itself prove real Chrome/SpotMate behavior on a Mac.

Native Safari packaging is deferred under the user's approved Chrome/macOS fallback. Apple supports converting/packaging WebExtensions, but distributing and validating a Safari extension adds an Apple tooling, signing and Mac testing lifecycle. No Safari package or Safari support claim is included. Track #45.

References: [Apple Safari packaging](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), [Chrome unpacked installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Validation evidence

Baseline on Windows with Node 24: 177/177 tests passed. The integrated English/Chrome-only source passes 186/186 local tests, including packaging/license, synthetic Git provenance, hostile release-input and linked-directory CLI regressions. The first public macOS CI run exposed a CLI entry-point comparison that skipped execution through aliased temporary paths; the tools now compare canonical file paths. Browser artifact and release metadata checks passed; actionlint v1.7.12 and YAML parsing passed both workflows. Check the public CI results on the uploaded revision for the operating-system matrix. A synthetic interface fixture passed trusted-click/state checks in installed Windows Chrome 155 at 1280x800 and 390x844, with no console errors or horizontal overflow. Impeccable detector returned no findings for the changed UI targets. No real SpotMate download, macOS browser runtime or Safari validation is claimed.

The exported publication source snapshot passed all 186 tests without the original Git history or any .git directory.

## Remaining release gates

- [x] Resolve OSS-01 for the selected source publication by excluding all legacy history and refs from the fresh public repository.
- [x] Obtain the maintainer statement of initial-script authorship and MIT selection.
- [x] Complete the OSS-02 source/resource inventory and record the maintainer's original-code rights statement.
- [ ] Complete use-specific third-party rights review before public promotion, store submission or distributing third-party content.
- [ ] Complete real Chrome QA on Windows and macOS for the next stable release.
- [x] Obtain independent integrated browser/release review; fix its platform-QA finding and verify the regression deterministically.
- [ ] Choose an appropriate next release version for the breaking artifact/platform changes before tagging; version 2.0.0 remains the already-published baseline.
- [x] Obtain explicit authorization to publish the reviewed source in a new public repository and update the existing private repository.
- [ ] Obtain separate authorization before any future legacy-history visibility change, destructive history rewrite or release deletion.

No paid external multi-pass audit is required by this assessment. Escalate if the scoped review finds unresolved high-impact issues, if broader permissions/authentication are introduced, or if distribution expands materially.
