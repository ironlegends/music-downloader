> **Status: Historical v1.x record — inactive and unsupported.**

# Design specification: SpotMate web launcher

- **Date:** 2026-08-25
- **Status:** Approved
- **Objective:** Provide a local Node.js application with a responsive web interface where users can paste a Spotify URL, view all metadata (titles, artists, covers, durations), follow conversion and downloads in real time with progress bars, choose a destination folder, inject ID3v2 tags, manage quotas (HTTP 429) automatically, and listen to tracks in an integrated player.

---

## 1. Overall architecture

The application has two main layers: a Node.js server backend and a local single-page web application (SPA).

~~~text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Web interface (SPA)                          │
│  - Spotify URL input and local folder picker                           │
│  - Full metadata display (title, artist, cover art)                    │
│  - Individual and overall real-time progress bars (SSE)               │
│  - HTML5 audio player for previews of downloaded tracks                │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │ Server-Sent Events and REST API
┌────────────────────────────────────▼────────────────────────────────────┐
│                         Local Node.js server                           │
│  - HTTP router and static file handler                                 │
│  - Spotify metadata extractor (oEmbed / public API scraping)           │
│  - SpotMate conversion engine (/convert, CSRF, cookies, task_id)       │
│  - Smart queue manager (automatic pause on 429)                        │
│  - MP3 stream download engine (Content-Length, progress %)             │
│  - Automatic ID3v2 tagging (title, artist, album, cover art)            │
│  - Local system controller (open folder through explorer.exe)          │
└─────────────────────────────────────────────────────────────────────────┘
~~~

---

## 2. Backend component specifications

### 2.1 Spotify metadata extractor (src/spotify-extractor.js)

- **Supported inputs:**
  - Playlists: https://open.spotify.com/playlist/<id>
  - Albums: https://open.spotify.com/album/<id>
  - Individual tracks: https://open.spotify.com/track/<id>
- **Normalized output:**
  - General metadata (playlist/album title, description, cover image, track count).
  - Array of track objects: { id, title, artists, album, duration_ms, cover_url, spotify_url }.
- **Operation:** Retrieve data without an API key through public scraping and Spotify metadata endpoints (open.spotify.com/oembed and anonymous Spotify Web API clienttoken values).

### 2.2 SpotMate conversion engine (src/spotmate-client.js)

- **Initialization:** Connect to https://spotmate.online/en1 to establish a session and extract the CSRF token (meta[name="csrf-token"] and XSRF-TOKEN cookie).
- **Run a conversion:**
  - Send a POST request to https://spotmate.online/convert.
  - Headers: Content-Type: application/json, X-CSRF-TOKEN, X-XSRF-TOKEN, credentials: "include".
  - Body: { urls: track.spotify_url, _token: csrfToken }.
  - Handled responses:
    - Immediate success: { error: false, url: "https://..." }.
    - Asynchronous task: { task_id: "..." } -> periodically poll /tasks until the final URL is available.
    - HTTP 429 (rate limit): immediately notify the Queue Manager to pause adaptively.

### 2.3 Queue manager (src/queue-manager.js)

- Processes selected tracks sequentially or with bounded concurrency (one conversion at a time by default to preserve remote quotas).
- **Adaptive rate-limit handling (429):**
  - On status 429, the queue enters PAUSED_RATE_LIMIT.
  - Start a 60-second countdown and notify the frontend in real time.
  - When the delay expires, retry the current track and resume the queue automatically without user intervention.

### 2.4 Download engine and ID3 tagging (src/downloader.js)

- **Direct stream download:**
  - Send a GET request to the MP3 download URL provided by SpotMate.
  - Continuously calculate the percentage: (receivedBytes / totalBytes) * 100.
  - Report bytes and percentage in real time through SSE.
- **ID3v2 tagging:**
  - Add the title, artists, album name, and cover image (downloaded and embedded as JPEG/PNG in the APIC tag).
  - Atomically write the final .mp3 file to disk.
- **Destination layout:**
  - Flat mode: <Destination Folder>/<Artist> - <Title>.mp3.
  - Structured mode: <Destination Folder>/<Artist>/<Album>/<Title>.mp3.

### 2.5 HTTP server and REST API (server.js)

- POST /api/spotify/load: load and analyze a Spotify URL; return playlist and track metadata.
- POST /api/config/destination: set or verify the local destination folder.
- POST /api/queue/start: start processing selected tracks.
- POST /api/queue/pause and POST /api/queue/resume: control the queue.
- POST /api/system/open-folder: open the destination folder in Windows Explorer.
- GET /api/events: SSE endpoint broadcasting each track's live status.
- GET /api/audio/:trackId: serve a downloaded audio file for preview in the web interface.

---

## 3. Frontend interface specification

### 3.1 Visual structure

- **Configuration header:**
  - Spotify URL input with an Analyze button.
  - Destination folder path picker with visual validation of write access.
  - Toggle option: Organize into Artist / Album subfolders.
  - Open folder button, enabled after a download succeeds.

- **Playlist/album header:**
  - Large cover art, playlist title, total track count, and total duration.
  - Overall progress bar for the current batch.
  - Actions: Select all, Deselect all, Start conversion and download.

- **Track list (responsive grid or table):**
  - Each row includes:
    - Selection checkbox.
    - Cover thumbnail.
    - Track title and artist name.
    - Duration.
    - Dynamic status badge: Pending, SpotMate conversion..., Downloading (XX%), Complete, Error.
    - Animated individual progress bar below the track currently downloading.
    - Integrated HTML5 mini-player for previewing the downloaded file.

---

## 4. Test and validation strategy

1. **Spotify extractor unit tests:** check URL decoding, robustness against invalid input, and the returned normalized structure.
2. **SpotMate client unit tests:** simulate immediate responses, asynchronous tasks (task_id), 429 errors, and CSRF session rejection.
3. **Queue Manager tests:** verify automatic pause for status 429, countdown, and automatic resumption without duplicates.
4. **Download and ID3 write tests:** validate audio file creation on disk, percentage calculations, and conforming ID3v2 tags.
5. **REST API and SSE tests:** check Express/HTTP routes and correct receipt of real-time events.

---

## 5. Acceptance criteria

1. The user can run the application with node server.js or npm start, and the interface opens automatically in the browser.
2. Pasting a Spotify URL (playlist, album, or track) displays all tracks with their actual titles, artists, covers, and durations.
3. The user can choose any folder on disk as the destination.
4. Starting processing converts and downloads selected tracks directly into the chosen folder.
5. Each track being downloaded displays its precise percentage progress.
6. On HTTP 429, the application pauses automatically with a visible countdown and then resumes on its own.
7. Downloaded MP3 files contain ID3 metadata (title, artist, album, cover art).
8. The user can preview downloaded tracks in the web interface.
9. The user can open the destination folder with one click on Open folder.
