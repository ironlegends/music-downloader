> **Status: Historical v1.x record — inactive and unsupported.**

# Windows Launcher guide (installed and portable modes)

This guide describes use of SpotMate Launcher on Windows in installed or portable mode.

## Requirements

- Node.js 22 or 24 (LTS recommended).
- PowerShell 5.1 or PowerShell Core.

## Option A: Installed version (music-converter-v1.6.2-windows-installable.zip)

1. Extract the archive into a temporary folder.
2. Open PowerShell and run the installation script:

   ~~~powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
   ~~~

   The application is installed in %LOCALAPPDATA%\Music Converter without requiring administrator privileges.
3. To uninstall:

   ~~~powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
   ~~~

   Uninstallation removes only application-owned files and does not touch music or download folders.

## Option B: Portable version (music-converter-v1.6.2-windows-portable.zip)

1. Extract the archive wherever you want.
2. Run the portable script:

   ~~~powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\run-portable.ps1
   ~~~

3. The application starts at http://localhost:3000. The bridge remains disabled until a valid allowlist is configured.

## Bridge configuration

After loading the extension, open chrome://extensions or edge://extensions and copy the ID shown under Music Converter. Before pairing, set this configuration in the PowerShell session that starts the launcher, replacing the placeholders with the IDs actually shown:

~~~powershell
$env:MUSIC_CONVERTER_EXTENSION_ORIGINS = 'chrome-extension://<ID_CHROME>,chrome-extension://<ID_EDGE>'
$env:MUSIC_CONVERTER_USB_VOLUME_ID = '<VOLUME_ID_USB>'
~~~

The launcher accepts only exact chrome-extension:// origins. A missing or invalid value leaves the main server running and disables the bridge without a secret or listener. With valid origins but no injected bridgeUsb or valid USB ID, pairing remains available, but jobs return 503 bridge-download-unavailable without being queued.

## Fail-closed status of local conversion

Local launcher conversion remains intentionally disabled (CONVERSION_CAPABILITY.enabled = false and HTTP 503 from /api/queue/start with code launcher-local-conversion-disabled). The user voluntarily runs the conversion flow on https://spotmate.online/en1.
