# Install Music Downloader in Chrome

Use Google Chrome 120 or later. You do not need Node.js, Git or a terminal.

1. [Download the source ZIP](https://github.com/ironlegends/music-downloader/archive/refs/heads/main.zip) and extract it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted project's **extension** folder. It contains `manifest.json`, `content-script.js` and an `assets` folder.
4. Open [SpotMate](https://spotmate.online/en1). The conversion panel appears on that page.

Keep the extracted folder in a stable location. Chrome uses those files while the extension is installed. The extension is not installed from the Chrome Web Store.

## Start a download

Paste a Spotify link into the site's URL field and complete the site's verification manually if asked. Click **Load Spotify URL** in the extension panel. Wait for the track list, then click **Start conversions**. Use a track's download button or **Download all** when conversion finishes.

Keep the tab open during conversion. Chrome may ask you to allow multiple downloads for the site.

## Fix installation problems

- **Manifest missing:** choose the **extension** folder, not the ZIP or the top-level project folder.
- **Panel missing:** check that the extension is enabled, then reload https://spotmate.online/en1.
- **Folder moved or deleted:** restore it, or remove the old extension entry and load the new folder again.

See [browser support](browser-support.md) for platform validation status. Developers can find build and test instructions in the [README](../../README.md#development).
