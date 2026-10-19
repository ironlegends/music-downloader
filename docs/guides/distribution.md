# Distribution options

## Available now

Users can [install the source ZIP](chrome-install.md) without a terminal or build. Chrome's Developer mode is still required. There is no Chrome Web Store or Safari listing to install from.

## Chrome Web Store

The Chrome Web Store is the intended route for installation without Developer mode. Publication remains pending real Chrome testing on Windows and macOS, publisher access and store review.

Google requires a [registered developer account and a one-time registration fee](https://developer.chrome.com/docs/webstore/register). The owner must choose the publishing account and handle registration, payment and account verification. No account registration, payment or store submission has been performed for this project.

The existing Chrome ZIP builder supplies the extension package. Before upload, prepare real product screenshots, store icons and accurate privacy disclosures, then complete Google's [publication flow](https://developer.chrome.com/docs/webstore/publish) and [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy). Store approval is an external decision, not a property established by local tests.

Draft listing text:

> Music Downloader adds clear conversion and download controls to the supported SpotMate page. Paste a Spotify track or playlist link on SpotMate, complete any verification, load the tracks and start conversion. Download ready tracks individually or together. Conversions run through SpotMate; keep its tab open while they run.

The listing must disclose the supported page, third-party service dependency and user-triggered processing accurately. Do not advertise Safari, automatic verification, background downloads or platform testing that has not occurred. Complete the real-browser checklist before publishing a stable package.

## Safari

Safari remains deferred in favor of Chrome on macOS. Apple documents [packaging with Xcode on a Mac or the web packager in App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), followed by [Safari distribution requirements](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

Web packaging can reduce setup work, but it does not establish that this extension works in Safari. A Mac with Safari, platform testing and an Apple publishing/signing arrangement are still needed for a supported release. There is no Safari artifact or verified Safari runtime claim here.

Follow-ups: [real Chrome QA](https://github.com/ironlegends/music-downloader/issues/2), [Safari feasibility](https://github.com/ironlegends/music-downloader/issues/3), and [first-use validation](https://github.com/ironlegends/music-downloader/issues/4).
