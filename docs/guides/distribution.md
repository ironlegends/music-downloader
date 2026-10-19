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

### Feasibility review (2026-10-19)

**Technically feasible; store eligibility is unresolved.** A published Chrome Web Store listing lets users install directly from the listing, without Developer mode or a source ZIP. Chrome on Windows and macOS uses this distribution route. The ZIP is uploaded by the publisher, not installed manually by each user. See [Chrome's installation guidance](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions).

The first decision is eligibility, before paying or preparing a submission. Google's [Malicious and Prohibited Products policy](https://developer.chrome.com/docs/webstore/program-policies/policies) prohibits facilitating unauthorized access to, downloading of, or streaming of copyrighted content. The current extension submits Spotify links to SpotMate and exposes the returned download links. Whether that use is authorized has not been established. The MIT license covers this source code; it does not grant rights to third-party music. A disclaimer or a renamed listing does not resolve this product-level question. Obtain evidence of an authorized use case and assess the actual service behavior before treating store publication as viable. Store approval cannot be promised.

If eligibility is established, the remaining work is bounded:

1. The owner selects a Google publishing account, registers, pays the one-time fee shown by Google and completes the required account verification and two-step verification. See [account setup](https://developer.chrome.com/docs/webstore/set-up-account) and the [two-step verification requirement](https://developer.chrome.com/blog/policy-update-2sv/). No fee amount is assumed here.
2. Complete real Chrome QA on Windows and macOS, including SpotMate's manual verification and explicit individual/batch download flow. Local synthetic fixtures do not replace this step.
3. Add a packaged PNG extension icon (128 × 128), a small promotional image (440 × 280) and at least one real product screenshot (1280 × 800 or 640 × 400). These are listed in Google's [image requirements](https://developer.chrome.com/docs/webstore/images). Experimental background previews are not screenshots of a shipped feature.
4. Publish an accurate privacy policy and fill in the single-purpose, permissions and data-handling fields. The extension reads website/form data, submits conversion requests to SpotMate and temporarily handles its response URLs. Google's [user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires disclosures even for local processing. Do not claim that no data is handled merely because the extension has no analytics or developer-operated server. Describe third-party processing and any authentication-related handling accurately without exposing credentials.
5. Build and verify the package, provide reproducible review instructions, upload the ZIP to the developer dashboard and submit it for Google's review. Use the [publication flow](https://developer.chrome.com/docs/webstore/publish). A store listing would distribute this independent project; it would not imply endorsement by Google, Spotify or SpotMate.

Current gaps: no verified publishing account, no packaged store icons or promotional art, no published privacy-policy URL, no completed real Windows/macOS QA, and no established download-rights evidence. Registration, payment and submission remain owner actions. No store account or submission has been created during this feasibility review.

## Safari

Safari remains deferred in favor of Chrome on macOS. Apple documents [packaging with Xcode on a Mac or the web packager in App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), followed by [Safari distribution requirements](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

Web packaging can reduce setup work, but it does not establish that this extension works in Safari. A Mac with Safari, platform testing and an Apple publishing/signing arrangement are still needed for a supported release. There is no Safari artifact or verified Safari runtime claim here.

Follow-ups: [real Chrome QA](https://github.com/ironlegends/music-downloader/issues/2), [Safari feasibility](https://github.com/ironlegends/music-downloader/issues/3), and [first-use validation](https://github.com/ironlegends/music-downloader/issues/4).
