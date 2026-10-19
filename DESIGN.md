# Music Downloader design

The maintainer approved option A, the clear guided interface, on October 19, 2026.

## Purpose

Help a first-time user load a Spotify link, convert tracks and download ready results without a separate technical guide. Keep the original SpotMate form and manual verification available.

## Visual system

Use a white working surface, a blue product header and blue action color, dark navy text, cool borders and generous spacing. Ready states use green; failed states use amber with an explicit text label. Use the platform sans-serif stack. Controls have a 44-pixel minimum target and clear keyboard focus. All colors and styles are scoped to the extension panels.

## First viewport and reading order

1. Music Downloader header with a secondary “for SpotMate” descriptor and a working Help link.
2. A persistently labeled Spotify link input, short link instructions and manual verification note.
3. Three visible stages: load, convert and download. The current stage changes with actual workflow state.
4. Load and conversion controls, with cancellation and an accessible live status.
5. A results list containing ready, failed and canceled tracks, a clear summary, and individual download controls only for ready results.
6. A blue primary action to download all ready tracks, with the actual ready count explained beside it.

The three-stage rail is the signature interaction. It becomes vertical at narrow widths. Result rows and the footer stack naturally without horizontal scrolling.

## Product boundaries

The source field passes the user's link through SpotMate's original form. Verification remains manual. Do not fabricate track metadata, progress percentages, download sizes or timing estimates. Track numbers are ordinal labels, not invented song titles. URLs remain in volatile memory and are not displayed in the results list. Download buttons require trusted user actions.

The source design is a browser extension embedded in a third-party page. The implementation preserves that page's controls and form rather than replacing the entire site. The approved visual direction is implemented in semantic HTML and CSS; the mockup is not a runtime image.
