> **Status: Historical v1.x record — inactive and unsupported.**

# Secure pairing guide

This guide describes pairing the browser extension with the local SpotMate Launcher through the HMAC-SHA256 loopback bridge (127.0.0.1:3210).

## Configuration prerequisites

Before starting, copy the ID shown by Chrome or Edge at chrome://extensions or edge://extensions, then define MUSIC_CONVERTER_EXTENSION_ORIGINS in the launcher process's environment. The list contains the exact extension origins, separated by commas; a missing or invalid configuration disables the bridge. For USB transfers, also copy the approved volume ID and define MUSIC_CONVERTER_USB_VOLUME_ID before pairing. Without a valid USB destination, pairing is still possible, but sending returns 503 bridge-download-unavailable without retaining a job.

## Security invariants

- Pairing uses a unique, volatile 128-bit nonce that expires after 120 seconds.
- The 256-bit session key is kept only in memory (chrome.storage.session).
- No code, private key, token, or nonce is displayed in logs or sent to third parties.

## Pairing procedure

1. **Start the local launcher:**
   - Start SpotMate Launcher at http://localhost:3000. The configured bridge starts at http://127.0.0.1:3210.

2. **Start pairing from the extension:**
   - On https://spotmate.online/en1, click **Connect to local launcher**.

3. **Authorize in the launcher:**
   - A confirmation appears in the local launcher interface at http://127.0.0.1:3210/bridge/pairing.
   - Click **Authorize pairing**.
   - The nonce is never rendered in this interface.

4. **Confirm in the extension:**
   - Click **Confirm pairing**.
   - The status changes to **Connected (Bridge active)**.

5. **Send to USB voluntarily:**
   - After a successful conversion, click **Send results to USB**.
   - Only HTTPS results produced by the core are sent; mounting a drive never starts a transfer.
