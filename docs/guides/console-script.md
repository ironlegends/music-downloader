# Use the manual console helper

The console-script.js helper can be run manually from Chrome DevTools if you prefer not to install the extension. Its source entry point is src/browser/entries/console-script.js.

## Steps

1. Open https://spotmate.online/en1 or https://spotmate.online/en1/ in Chrome.
2. Complete the Cloudflare Turnstile check yourself.
3. Open Chrome DevTools with **F12** or **Ctrl+Shift+I**, then select **Console**.
4. Copy the full contents of console-script.js, paste it into the console, and press **Enter**.
5. Use the visible controls to start conversion and trigger downloads manually.

## Important

Run this helper only by pasting it into the console yourself. Automatic injection tools such as Tampermonkey, userscripts, bookmarklets, and remote code injection are unsupported. The helper does not bypass Turnstile and does not start hidden or background downloads.
