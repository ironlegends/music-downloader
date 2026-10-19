> **Status: Historical v1.x record — inactive and unsupported.**

# Threat model and security contract — Music Converter v1.5.0 USB bridge

## 1. Purpose and scope

Milestone v1.5.0 introduced a secure pairing bridge between the browser extension (Google Chrome / Microsoft Edge) and the local Music Converter launcher for direct, voluntary transfer of validated audio files to a selected USB storage device whose identity is rechecked locally.

Local launcher conversion remains **strictly disabled** (CONVERSION_CAPABILITY.enabled=false; POST /api/queue/start returns HTTP 503 launcher-local-conversion-disabled).

---

## 2. Communication and route contract

The bridge listens exclusively on the IPv4 loopback address:

~~~text
http://127.0.0.1:3210
~~~

### Bridge route table

| Method | Route | Role | Authentication | Maximum payload |
| :--- | :--- | :--- | :--- | :--- |
| POST | /api/bridge/pair | Single-use ephemeral pairing | 128-bit nonce (base64url) | 64 KiB |
| POST | /api/bridge/jobs | Submit a batch of tracks for download | HMAC-SHA256 (256-bit session key) | 64 KiB (up to 100 tracks) |
| GET | /api/bridge/status | Read job progress | HMAC-SHA256 (session key) | No body |
| POST | /api/bridge/cancel | Immediately cancel the active job | HMAC-SHA256 (session key) | 64 KiB |
| GET | /bridge/pairing | Local interface for displaying the pairing code | None (local browser access) | N/A (HTML) |
| GET | /bridge/destination | Select and configure the local USB volume | None (local browser access) | N/A (HTML/JSON) |

---

## 3. Limits, bounds, and quotas

- **Maximum body size:** 64 KiB for all incoming requests.
- **Maximum URL length:** 2048 characters for finalAudioUrl.
- **Tracks per batch (job):** maximum 100 tracks.
- **Job queue capacity:** 1 active job and up to 2 waiting jobs (HTTP 429 rejection beyond that).
- **Pairing nonce:** exactly 128 random bits encoded as unpadded base64url; expires after 120 seconds; one use only; at most 5 failed attempts per rolling minute.
- **Session key:** exactly 256 random bits; maximum lifetime 12 hours or expires after 30 minutes of inactivity; stored in chrome.storage.session on the extension side; invalidated when the launcher restarts.
- **HMAC-SHA256:** computed over the canonical representation v1\nMETHOD\nPATH\nTIMESTAMP\nREQUEST_ID\nBODY_HASH. Timestamp tolerance: ±30 seconds. Replay cache: 1024 entries kept for 2 minutes.

---

## 4. Sensitive data and redaction rules

- finalAudioUrl is the only audio URL accepted by the bridge.
- finalAudioUrl must NEVER appear in logs, DOM text, public traces, errors, or persistent storage.
- No cookie, token, remote authentication header (Authorization, Set-Cookie), or arbitrary path passes from the extension.

---

## 5. Network attack and SSRF protections

- Remote downloads require the HTTPS scheme and effective port 443.
- Strictly reject literal IP addresses, localhost, 127.0.0.1, single-label domains, .local suffixes, and private/non-public DNS answers (SSRF).
- Revalidate DNS and IP on every connection and redirect, pin the validated IP, and preserve SNI.
- Check the declared MIME type and audio magic bytes (for example ID3, MP3, FLAC, AAC) before any atomic rename.

---

## 6. File system and USB volume security

- Supported file systems: FAT32, exFAT, NTFS.
- Revalidate the unique, stable USB volume identity immediately before every track write and atomic rename.
- Immediately reject symbolic links, Windows junctions, and directory traversal (..).
- Write exclusively to a temporary .part file, then atomically rename with a deterministic collision suffix; never overwrite an existing file.

---

## 7. Explicitly out of scope

- **Local attacker with process privileges (Malicious Local Process):** out of scope for v1.5.0. Isolation relies on authenticated loopback and strict CORS.
- **Native Messaging:** reserved for a later version after a dedicated architecture review.
