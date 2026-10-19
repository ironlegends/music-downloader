## Summary

Describe the change and its scope. State explicitly whether this is a documentation change or a release.

## Reproducible evidence

- Test commands run:
- Expected and observed behavior:
- Environment (OS, Node.js, browser if applicable):
- Reproducible verification steps:

## Required checklist

- [ ] Relevant tests were added or run, with results recorded.
- [ ] npm test was run.
- [ ] The diff was reviewed with git diff --check and the changed files were inspected.
- [ ] The SemVer check was reviewed; the version agrees with package.json, the changelog, and relevant badges.
- [ ] A documentation-only, test-only, or chore-only PR does not introduce a version bump.
- [ ] Sensitive-data review confirms the diff, logs, fixtures, and documentation contain no token, cookie, CSRF value, secret, audio URL, or session data.
- [ ] User actions remain visible and voluntary; no hidden or background download is added.

## v2 product boundaries

- [ ] Active browser target is Chrome; retired Edge support is not reintroduced.
- [ ] The manual helper remains console-script.js, sourced from src/browser/entries/console-script.js.
- [ ] No active local Node.js launcher, USB bridge, Windows executable, userscript, or automatic code injection is added.
- [ ] Turnstile remains manual; the product does not bypass access controls.
- [ ] Downloads require explicit user actions and do not start hidden or in the background.
- [ ] Windows and macOS Chrome QA status is recorded accurately; PENDING remains PENDING until observed.

## Issue reference

Provide an issue number only after GitHub has assigned one; do not invent a reference.

## Expected behavior

Describe the expected behavior and how tests or a minimal reproduction will verify it.
