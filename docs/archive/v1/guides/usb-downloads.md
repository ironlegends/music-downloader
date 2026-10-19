> **Status: Historical v1.x record — inactive and unsupported.**

# Download and transfer to a USB drive

This guide describes direct transfer of converted tracks to a removable USB drive on Windows.

## Requirements and supported formats

- A USB drive formatted as FAT32, exFAT, or NTFS.
- SpotMate Launcher paired with the browser extension.

## Procedure

1. **Select the USB volume:**
   - In the launcher's settings panel, choose the detected removable volume (for example, E:\).
   - The unique volume identity is locked and revalidated before each write.

2. **Convert and download:**
   - On https://spotmate.online/en1, load a Spotify playlist and complete the Turnstile challenge manually.
   - Click **Start conversions** with a trusted click (event.isTrusted === true).
   - When a track is converted, click **Transfer to USB** or **Transfer all to USB**.

3. **Write atomically without overwriting:**
   - The stream is written to a temporary .part file.
   - When the download completes, the file is renamed atomically. If a file with the same name already exists, a collision-free suffix such as (1) or (2) is added so existing files are never overwritten.
