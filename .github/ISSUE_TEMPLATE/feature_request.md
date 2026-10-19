---
name: Feature request
about: Propose a bounded change that can be verified
title: "[Feature] "
labels: enhancement
---

## Proposed scope

Describe precisely what is included and excluded.

## User-triggered action

Describe the visible control and explicit user intent. Where required, preserve event.isTrusted === true. Conversion and downloads must not start in the background.

## Acceptance criteria and evidence

- Expected behavior:
- Reproducible steps:
- Environment (OS, Node.js, browser):
- Test command(s) and expected evidence:

## Sensitive data

- [ ] The proposal contains no token, cookie, CSRF value, secret, or audio URL.
- [ ] Any reproduction will be redacted before publication; no secret will be attached.

## Versioning and scope guard

- Proposed SemVer impact (fix, feat, no bump, or undetermined):
- [ ] CONVERSION_CAPABILITY.enabled=false remains unchanged for the retired v1 launcher.
- [ ] /api/queue/start remains HTTP 503 for the retired v1 launcher.
- [ ] The feature does not restore the local launcher or add hidden downloads.

## Issue reference

Leave the issue number blank until GitHub assigns one; do not invent a reference.
