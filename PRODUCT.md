# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want to convert Spotify links and download tracks through SpotMate, without a terminal or a complex guide.

## Product Purpose

Music Downloader adds clear, user-controlled loading, conversion and download controls to the supported SpotMate page.

## Stack

Existing vanilla JavaScript, CSS and Chrome Manifest V3 extension. A manual console helper shares the browser core. No framework or service migration is requested.

## Operating Context

The extension runs on https://spotmate.online/en1 and its trailing-slash equivalent. Users paste a Spotify link into the site's field, complete verification manually, load tracks, start conversion, then request downloads.

## Capabilities and Constraints

- Chrome on Windows and macOS is the target; actual macOS browser QA remains pending.
- Safari is optional and deferred while platform validation and packaging remain unresolved.
- Keep explicit trusted user actions, manual verification, the restricted page scope and existing privacy boundaries.
- Do not imply the extension provides a standalone conversion service, bypasses verification or downloads without a user command.
- Loading, converting, ready, canceled and failed states must give understandable next actions.
- All persisted product text is English.
- Installation currently uses an extracted extension folder and Chrome Developer mode; no store listing is available.

## Brand Commitments

Product name: Music Downloader. Public repository: ironlegends/music-downloader. The user approved the centered smoked olive workspace, small drifting covers and responsive ambient motion on October 20, 2026. This replaces the earlier light blue direction. See DESIGN.md for the implementation contract.

## Evidence on Hand

Shared source and generated browser outputs, focused regression tests, and synthetic Windows Chromium captures at desktop and narrow widths. The integrated browser proof is recorded in qa/living-workspace-2026-10-20.json. These do not establish real SpotMate, macOS or Safari runtime validation.

## Product Principles

- Make the next action obvious without a separate guide.
- Show clear status and recovery instructions.
- Keep the interface focused on the user's current music task.
- Preserve user control and describe support honestly.
