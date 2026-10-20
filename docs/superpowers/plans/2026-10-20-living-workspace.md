# Integrate the approved living workspace

The maintainer approved the centered smoked olive prototype on October 20, 2026. Replace the blue guided panel with that visual direction while retaining the existing SpotMate form, manual verification, trusted user commands and conversion/download policies.

## Deliverables

1. Extract optional, bounded display metadata from existing track rows. Conversion inputs stay `{id, value}`. Only already present Spotify CDN images are eligible; missing or unsafe artwork uses a geometric record fallback. No metadata service, credentials, permissions or persistence are added.
2. Add a disposable motion controller shared by the extension and console bundle. Keep covers small, bounded and behind the controls. One bounded frame loop handles covers, copper/olive light, travelling line points and a workflow activity trace. Pause, reduced motion, hidden/offscreen suspension and teardown cover all persistent decoration.
3. Integrate a centered translucent surface before the original page content. Keep the site's form intact and provide a direct verification link. Display loaded tracks and actual per-track conversion states, then ready/failed/canceled results in the same surface. Count download requests started without claiming files were saved.
4. Update the source CSS, regenerate all browser outputs, and update the design contract, README, changelog and QA evidence. Keep the current version under Unreleased; no release or Chrome Web Store submission is requested.

## Validation and delivery

Protect new metadata, conversion notifications and request feedback with focused RED/GREEN regression tests. Run the complete Node suite, generated-output parity, extension/release checks and a synthetic real-browser integration check at desktop/narrow widths. Verify cancellation, trusted actions, remount cleanup, pause/reduced motion, artwork errors, aligned mixed-result rows and original form access. This does not prove live SpotMate, Chrome macOS or Safari runtime behavior.

Obtain one independent source/diff review for the integration and publication boundary. Copy only explicit reviewed files to the fresh-history public repository, with separate commits and no private Git objects. Open and attach both PRs. Wait for all public Actions before merging; the existing private-only billing exception may apply only to the private PR and any temporary protection change must be restored. Update issue #7 with delivered scope and remaining platform QA.

## Review focus

- Metadata provenance and URL safety: track presentation tests and browser image-failure checks.
- Progress notifications must not alter conversion ordering, polling or cancellation: conversion session regression tests.
- No duplicate or untrusted downloads: existing adapter tests plus request notification checks.
- Motion teardown and viewport bounds: deterministic controller tests and browser evidence.
- Original form/verification access and generated bundle parity: integrated browser check and build checks.
