# Music Downloader design

The maintainer approved the centered smoked olive workspace on October 20, 2026, after iterating on the earlier light guided interface.

## Purpose and composition

Help a first-time user load a Spotify link, convert tracks and request ready downloads without a separate technical guide. The workspace appears before the original SpotMate content. A direct **Open SpotMate form** link reaches the unchanged source form and manual verification. The extension does not replace or hide that form.

Center a maximum 824px working surface in a full-width dark olive section. Give it a translucent olive fill, a fine border and 16px corners. Apply only 2px of backdrop blur so small album images remain recognizable behind the controls. Use a stronger translucent fill when filtering is unavailable. On narrow screens, stack source actions and ready-download controls while retaining clear track/status columns.

## Visual system

Use warm ivory text, muted olive-tinted secondary text, copper primary actions and sage ready states. Failed states use a warm amber label. Use the platform sans-serif stack, 44px button targets, visible keyboard focus and scoped selection/scrollbar colors. Keep every rule within extension-owned classes; the host page keeps its original styles.

Keep column headings and rows inside one scroll viewport so scrollbar space cannot shift their alignment. Long names and error text wrap inside their own column. Loaded, converting, checking, ready, failed, canceled, not-started and requested states use real text rather than color alone.

## Motion and artwork

Small covers drift behind the entire workspace and react to pointer movement and clicks. Copper/olive light, fine curved lines and travelling points complement them. An activity trace follows real workflow state and click/request impulses; it is not an audio visualizer.

A single frame loop caps work at approximately 30 FPS and limits logical covers to 32 desktop or 18 narrow. Pause and the operating system's reduced-motion preference stop all persistent motion. Hidden tabs and offscreen workspaces suspend the loop. Remount/removal cancels frames, disconnects observers and removes listeners. A clipped fixed backdrop follows the viewport only within the extension section, leaving the original page outside that section unobscured. Text/control masks dim artwork locally without making the whole surface opaque.

Read optional display metadata from existing track inputs or an unambiguous nearby track row. Reuse only existing HTTPS Spotify CDN image URLs in the allowed image-path format. Missing/unsafe/broken images use a geometric record tile. Never infer a song title from conversion values, fetch a metadata API, request broader permissions or persist artwork/links. The exact live SpotMate markup and representative-device performance remain pending validation.

## User control and product truth

The original form handles submitted Spotify links and verification stays manual. Loading/conversion retain visible cancellation. Downloads require trusted user commands. Feedback counts requests started and asks users to check their browser; it never claims that files were saved. Do not fabricate metadata, percentages, file sizes or time estimates. Final audio URLs remain volatile and are absent from visible rows and announcements.

## Evidence

The shared source and generated bundles pass Node tests and a synthetic Chromium-on-Windows workflow check. The README image uses sample tracks and original fictional artwork. These checks do not establish live SpotMate behavior, Chrome macOS or Safari runtime compatibility, or Chrome Web Store eligibility.
