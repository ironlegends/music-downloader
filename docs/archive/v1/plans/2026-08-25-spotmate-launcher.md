> **Status: Historical v1.x — inactive and unsupported.**

# Implementation Plan: SpotMate Web Launcher

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete local Node.js application with a web interface for pasting a Spotify URL, displaying full metadata (titles, artists, cover art, durations), converting and automatically downloading MP3 files to a local folder with real-time progress bars, ID3v2 tagging, automatic quota handling (429), and audio previews.

**Architecture:** A modular architecture built around a Node.js backend (HTTP server, Spotify extractor, SpotMate client, smart queue, streaming downloader with ID3v2 tagging, SSE stream) and a responsive single-page frontend (HTML5/CSS3/vanilla JS) without heavy dependencies.

**Tech Stack:** Node.js (>= 18.0.0, API native HTTP/Fetch/Crypto/Stream/Buffer), Server-Sent Events (SSE), HTML5 Audio & CSS moderne sombre.

## Global Constraints

- Respond and document in French.
- Do not use emoji in code, comments, logs, or the interface.
- UTF-8 encoding is required for all files.
- Never use `git clean` or similar destructive commands.
- Follow the user's repository conventions (full French accents in documentation and the interface).

---

### Task 1: Spotify metadata extractor (`src/spotify-extractor.js`)

**Files:**
- Create: `src/spotify-extractor.js`
- Test: `test/spotify-extractor.test.js`

**Interfaces:**
- Produces: `extractSpotifyMetadata(url: string): Promise<{ type: string, title: string, description: string, cover_url: string, tracks: Array<{ id: string, title: string, artists: string, album: string, duration_ms: number, cover_url: string, spotify_url: string }> }>`
- Consumes: Public Spotify endpoints (`open.spotify.com/oembed`, embed HTML scraping, or Spotify public web API).

- [ ] **Step 1: Write the unit test for the Spotify extractor**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSpotifyMetadata, parseSpotifyUrl } from '../src/spotify-extractor.js';

test('parseSpotifyUrl correctly identifies the types and IDs', () => {
    assert.deepStrictEqual(
        parseSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=123'),
        { type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M' }
    );
    assert.deepStrictEqual(
        parseSpotifyUrl('https://open.spotify.com/track/7e4YH6cKzvCR9ud4LoVd0I'),
        { type: 'track', id: '7e4YH6cKzvCR9ud4LoVd0I' }
    );
    assert.deepStrictEqual(
        parseSpotifyUrl('https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa'),
        { type: 'album', id: '4m2880jivSbbyEGAKfITCa' }
    );
    assert.strictEqual(parseSpotifyUrl('https://example.com/invalid'), null);
});

test('extractSpotifyMetadata structures tracks with titles, artists, and covers', async () => {
    // Mock or test extraction for an individual track
    const mockFetcher = async (url) => {
        if (url.includes('oembed')) {
            return {
                ok: true,
                json: async () => ({ title: 'Au Manava', author_name: 'Te Ava Piti', thumbnail_url: 'https://i.scdn.co/image/ab67616d0000b273' })
            };
        }
        return {
            ok: true,
            text: async () => `<html><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"state":{"data":{"entity":{"name":"Au Manava","artists":[{"name":"Te Ava Piti"}],"album":{"name":"Album","images":[{"url":"https://i.scdn.co/image/test"}]},"duration_ms":180000,"id":"7e4YH6cKzvCR9ud4LoVd0I"}}}}}}</script></html>`
        };
    };

    const result = await extractSpotifyMetadata('https://open.spotify.com/track/7e4YH6cKzvCR9ud4LoVd0I', { fetcher: mockFetcher });
    assert.strictEqual(result.title, 'Au Manava');
    assert.strictEqual(result.tracks.length, 1);
    assert.strictEqual(result.tracks[0].artists, 'Te Ava Piti');
    assert.strictEqual(result.tracks[0].id, '7e4YH6cKzvCR9ud4LoVd0I');
});
```

- [ ] **Step 2: Run the test to verify the initial failure**

Run: `node --test test/spotify-extractor.test.js`
Expected: FAIL with `Cannot find module '../src/spotify-extractor.js'`

- [ ] **Step 3: Implement `src/spotify-extractor.js`**

```javascript
export function parseSpotifyUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') return null;
    const match = inputUrl.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return { type: match[1], id: match[2] };
}

export async function extractSpotifyMetadata(url, options = {}) {
    const fetcher = options.fetcher || globalThis.fetch;
    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
        throw new Error('Unrecognized Spotify URL. Enter a valid Spotify playlist, album, or track link.');
    }

    const { type, id } = parsed;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

    const embedResponse = await fetcher(embedUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!embedResponse.ok) {
        throw new Error(`Unable to retrieve Spotify metadata (HTTP status ${embedResponse.status}).`);
    }

    const html = await embedResponse.text();
    const matchJson = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!matchJson) {
        // Repli via oEmbed
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const oembedRes = await fetcher(oembedUrl);
        if (oembedRes.ok) {
            const data = await oembedRes.json();
            return {
                type: type,
                title: data.title || 'Titre Spotify',
                description: '',
                cover_url: data.thumbnail_url || '',
                tracks: [{
                    id: id,
                    title: data.title || 'Titre Spotify',
                    artists: data.author_name || 'Artiste',
                    album: '',
                    duration_ms: 0,
                    cover_url: data.thumbnail_url || '',
                    spotify_url: `https://open.spotify.com/track/${id}`
                }]
            };
        }
        throw new Error('Spotify metadata format not found.');
    }

    const parsedData = JSON.parse(matchJson[1]);
    const entity = parsedData?.props?.pageProps?.state?.data?.entity;

    if (!entity) {
        throw new Error('Playlist or track data not found.');
    }

    const coverUrl = entity.images?.[0]?.url || entity.album?.images?.[0]?.url || entity.visualIdentity?.image?.[0]?.url || '';
    const title = entity.name || entity.title || 'Collection Spotify';
    const description = entity.description || '';

    const rawTrackList = entity.trackList || (entity.tracks?.items ? entity.tracks.items.map(i => i.track || i) : null) || [entity];

    const tracks = rawTrackList.map((t, index) => {
        const trackId = t.id || `track_${index + 1}`;
        const artists = Array.isArray(t.artists)
            ? t.artists.map(a => a.name).join(', ')
            : (t.subtitle || t.artist || 'Artiste inconnu');
        const trackTitle = t.title || t.name || 'Unknown track';
        const albumName = t.album?.name || entity.name || '';
        const duration = t.duration || t.duration_ms || 0;
        const trackCover = t.album?.images?.[0]?.url || coverUrl;

        return {
            id: trackId,
            title: trackTitle,
            artists: artists,
            album: albumName,
            duration_ms: duration,
            cover_url: trackCover,
            spotify_url: `https://open.spotify.com/track/${trackId}`
        };
    }).filter(t => t.id);

    return {
        type: type,
        title: title,
        description: description,
        cover_url: coverUrl,
        tracks: tracks
    };
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test test/spotify-extractor.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/spotify-extractor.js test/spotify-extractor.test.js
git commit -m "feat: add standalone Spotify metadata extractor"
```

---

### Task 2: SpotMate conversion engine (`src/spotmate-client.js`)

**Files:**
- Create: `src/spotmate-client.js`
- Test: `test/spotmate-client.test.js`

**Interfaces:**
- Produces: `class SpotmateClient { initSession(): Promise<string>, convertTrack(trackUrl: string, options?: object): Promise<{ success: boolean, url: string|null, pending: boolean, taskId: string|null, error: string|null, status: number|string }> }`
- Consumes: API SpotMate (`https://spotmate.online/en1`, `https://spotmate.online/convert`, `https://spotmate.online/tasks`).

- [ ] **Step 1: Write the unit test for the SpotMate client**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpotmateClient } from '../src/spotmate-client.js';

test('SpotmateClient extracts CSRF and successfully converts a direct track', async () => {
    const mockFetcher = async (url, options) => {
        if (url.includes('/en1')) {
            return {
                ok: true,
                status: 200,
                headers: {
                    get: (h) => h.toLowerCase() === 'set-cookie' ? 'XSRF-TOKEN=test_xsrf; path=/; secure' : null
                },
                text: async () => `<html><head><meta name="csrf-token" content="mock_csrf_token"></head></html>`
            };
        }
        if (url.includes('/convert')) {
            const body = JSON.parse(options.body);
            assert.strictEqual(options.headers['X-CSRF-TOKEN'], 'mock_csrf_token');
            assert.strictEqual(body.urls, 'https://open.spotify.com/track/track_1');
            return {
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({ error: false, url: 'https://rapid.dlapi.app/download/tracks/123.mp3' })
            };
        }
        throw new Error('URL inattendue : ' + url);
    };

    const client = new SpotmateClient({ fetcher: mockFetcher });
    await client.initSession();
    const res = await client.convertTrack('https://open.spotify.com/track/track_1');

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.url, 'https://rapid.dlapi.app/download/tracks/123.mp3');
});

test('SpotmateClient treats status 429 as an explicit rate limit', async () => {
    const mockFetcher = async (url) => {
        if (url.includes('/en1')) {
            return { ok: true, status: 200, headers: { get: () => null }, text: async () => `<meta name="csrf-token" content="t">` };
        }
        return { ok: false, status: 429, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Too Many Requests' }) };
    };

    const client = new SpotmateClient({ fetcher: mockFetcher });
    await client.initSession();
    const res = await client.convertTrack('https://open.spotify.com/track/track_429');

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.error, 'HTTP error 429');
});
```

- [ ] **Step 2: Run the test to verify the failure**

Run: `node --test test/spotmate-client.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/spotmate-client.js`**

```javascript
export class SpotmateClient {
    constructor(options = {}) {
        this.fetcher = options.fetcher || globalThis.fetch;
        this.baseUrl = options.baseUrl || 'https://spotmate.online';
        this.csrfToken = null;
        this.xsrfCookie = null;
        this.sessionCookie = null;
    }

    async initSession() {
        const res = await this.fetcher(`${this.baseUrl}/en1`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!res.ok) {
            throw new Error(`Unable to initialize the SpotMate session (HTTP status ${res.status}).`);
        }

        const setCookieHeader = res.headers.get('set-cookie');
        if (setCookieHeader) {
            const xsrfMatch = setCookieHeader.match(/XSRF-TOKEN=([^;]+)/);
            if (xsrfMatch) this.xsrfCookie = decodeURIComponent(xsrfMatch[1]);
            const sessionMatch = setCookieHeader.match(/spotmate_session=([^;]+)/);
            if (sessionMatch) this.sessionCookie = sessionMatch[1];
        }

        const html = await res.text();
        const csrfMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
        if (csrfMatch) {
            this.csrfToken = csrfMatch[1];
        } else if (this.xsrfCookie) {
            this.csrfToken = this.xsrfCookie;
        }

        return this.csrfToken;
    }

    async convertTrack(trackUrl) {
        if (!this.csrfToken) {
            await this.initSession();
        }

        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        };

        if (this.csrfToken) {
            headers['X-CSRF-TOKEN'] = this.csrfToken;
            headers['x-csrf-token'] = this.csrfToken;
        }
        if (this.xsrfCookie) {
            headers['X-XSRF-TOKEN'] = this.xsrfCookie;
        }

        const cookieParts = [];
        if (this.xsrfCookie) cookieParts.push(`XSRF-TOKEN=${encodeURIComponent(this.xsrfCookie)}`);
        if (this.sessionCookie) cookieParts.push(`spotmate_session=${this.sessionCookie}`);
        if (cookieParts.length > 0) {
            headers['Cookie'] = cookieParts.join('; ');
        }

        const payload = {
            urls: trackUrl,
            ...(this.csrfToken ? { _token: this.csrfToken } : {})
        };

        try {
            const response = await this.fetcher(`${this.baseUrl}/convert`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const status = response.status;
            const contentType = response.headers.get('content-type') || '';

            if (status === 403 || status === 419 || status === 422 || status === 429 || status >= 500) {
                return {
                    success: false,
                    pending: false,
                    taskId: null,
                    url: null,
                    status: status,
                    error: `HTTP error ${status}`
                };
            }

            if (!response.ok) {
                return {
                    success: false,
                    pending: false,
                    taskId: null,
                    url: null,
                    status: status,
                    error: `HTTP error ${status}`
                };
            }

            if (!contentType.includes('application/json')) {
                return {
                    success: false,
                    pending: false,
                    taskId: null,
                    url: null,
                    status: status,
                    error: 'Content-Type non JSON'
                };
            }

            const data = await response.json();
            const taskId = data.task_id || data.taskId || null;

            if (taskId) {
                return {
                    success: false,
                    pending: true,
                    taskId: taskId,
                    url: null,
                    status: status,
                    error: null
                };
            }

            if (data && typeof data.url === 'string' && (data.url.startsWith('http://') || data.url.startsWith('https://'))) {
                return {
                    success: true,
                    pending: false,
                    taskId: null,
                    url: data.url,
                    status: status,
                    error: null
                };
            }

            return {
                success: false,
                pending: false,
                taskId: null,
                url: null,
                status: status,
                error: 'Final URL is missing or invalid'
            };

        } catch (error) {
            return {
                success: false,
                pending: false,
                taskId: null,
                url: null,
                status: 'network_error',
                error: error.message
            };
        }
    }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test test/spotmate-client.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/spotmate-client.js test/spotmate-client.test.js
git commit -m "feat: add full SpotMate client with CSRF session and conversion"
```

---

### Task 3: MP3 stream downloader and ID3v2 tagging (`src/downloader.js`)

**Files:**
- Create: `src/downloader.js`
- Test: `test/downloader.test.js`

**Interfaces:**
- Produces: `downloadAndTagTrack(track: object, downloadUrl: string, destinationDir: string, options?: object): Promise<{ filePath: string, sizeBytes: number }>`
- Features: Calculate byte progress using `Content-Length`, write atomically to disk, and write ID3v2 tags (title, artist, album, cover art).

- [ ] **Step 1: Write the unit test for downloads and ID3 tags**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { downloadAndTagTrack, createID3TagBuffer } from '../src/downloader.js';

test('createID3TagBuffer generates a valid ID3v2.3 structure', () => {
    const tagBuffer = createID3TagBuffer({
        title: 'Au Manava',
        artist: 'Te Ava Piti',
        album: 'Best Of'
    });

    assert(tagBuffer.length > 10);
    assert.strictEqual(tagBuffer.toString('utf8', 0, 3), 'ID3');
    assert.strictEqual(tagBuffer.readUInt8(3), 3); // ID3v2.3
});

test('downloadAndTagTrack writes the tagged MP3 file to disk', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotmate-test-'));
    const track = {
        id: 'track123',
        title: 'Chanson Test',
        artists: 'Artiste Test',
        album: 'Album Test'
    };

    const mockFetcher = async (url) => {
        const dummyAudio = Buffer.from('FAKE_MP3_AUDIO_STREAM_DATA_FOR_TESTING');
        return {
            ok: true,
            status: 200,
            headers: {
                get: (h) => h.toLowerCase() === 'content-length' ? String(dummyAudio.length) : null
            },
            arrayBuffer: async () => dummyAudio.buffer
        };
    };

    let reportedProgress = [];
    const res = await downloadAndTagTrack(track, 'https://example.com/audio.mp3', tempDir, {
        fetcher: mockFetcher,
        onProgress: (percent, bytes) => reportedProgress.push(percent)
    });

    assert(fs.existsSync(res.filePath));
    assert(reportedProgress.length > 0);
    const content = fs.readFileSync(res.filePath);
    assert.strictEqual(content.toString('utf8', 0, 3), 'ID3');

    fs.rmSync(tempDir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run the test to observe the failure**

Run: `node --test test/downloader.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/downloader.js`**

```javascript
import fs from 'node:fs';
import path from 'node:path';

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
}

function makeID3Frame(frameId, textContent) {
    if (!textContent) return Buffer.alloc(0);
    const textBuffer = Buffer.from(textContent, 'utf8');
    const contentBuffer = Buffer.concat([Buffer.from([0x03]), textBuffer]); // 0x03 = UTF-8
    const header = Buffer.alloc(10);
    header.write(frameId, 0, 4, 'ascii');
    header.writeUInt32BE(contentBuffer.length, 4);
    header.writeUInt16BE(0, 8); // Flags
    return Buffer.concat([header, contentBuffer]);
}

function makePictureFrame(imageBuffer, mimeType = 'image/jpeg') {
    if (!imageBuffer || imageBuffer.length === 0) return Buffer.alloc(0);
    const mimeBuffer = Buffer.from(mimeType + '\0', 'ascii');
    const pictureType = Buffer.from([0x03]); // Front cover
    const description = Buffer.from('\0', 'ascii');
    const encoding = Buffer.from([0x00]); // ISO-8859-1 for mime/desc
    const contentBuffer = Buffer.concat([encoding, mimeBuffer, pictureType, description, imageBuffer]);

    const header = Buffer.alloc(10);
    header.write('APIC', 0, 4, 'ascii');
    header.writeUInt32BE(contentBuffer.length, 4);
    header.writeUInt16BE(0, 8);
    return Buffer.concat([header, contentBuffer]);
}

function encodeSynchsafeInteger(value) {
    let out = Buffer.alloc(4);
    out[0] = (value >> 21) & 0x7F;
    out[1] = (value >> 14) & 0x7F;
    out[2] = (value >> 7) & 0x7F;
    out[3] = value & 0x7F;
    return out;
}

export function createID3TagBuffer(metadata, imageBuffer = null) {
    const frames = [
        makeID3Frame('TIT2', metadata.title),
        makeID3Frame('TPE1', metadata.artist || metadata.artists),
        makeID3Frame('TALB', metadata.album)
    ];

    if (imageBuffer) {
        frames.push(makePictureFrame(imageBuffer));
    }

    const framesBuffer = Buffer.concat(frames.filter(f => f.length > 0));
    const header = Buffer.alloc(10);
    header.write('ID3', 0, 3, 'ascii');
    header.writeUInt8(3, 3); // ID3v2.3
    header.writeUInt8(0, 4); // Revision
    header.writeUInt8(0, 5); // Flags

    const synchsafeSize = encodeSynchsafeInteger(framesBuffer.length);
    synchsafeSize.copy(header, 6);

    return Buffer.concat([header, framesBuffer]);
}

export async function downloadAndTagTrack(track, downloadUrl, destinationDir, options = {}) {
    const fetcher = options.fetcher || globalThis.fetch;
    const onProgress = options.onProgress || (() => {});
    const organizeFolders = options.organizeFolders || false;

    let targetDir = destinationDir;
    if (organizeFolders && track.artists && track.album) {
        targetDir = path.join(destinationDir, sanitizeFilename(track.artists), sanitizeFilename(track.album));
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${sanitizeFilename(track.artists || 'Artiste')} - ${sanitizeFilename(track.title || 'Titre')}.mp3`;
    const targetFilePath = path.join(targetDir, filename);

    // Download the cover art if available
    let coverBuffer = null;
    if (track.cover_url) {
        try {
            const coverRes = await fetcher(track.cover_url);
            if (coverRes.ok) {
                coverBuffer = Buffer.from(await coverRes.arrayBuffer());
            }
        } catch (e) {}
    }

    const audioRes = await fetcher(downloadUrl);
    if (!audioRes.ok) {
        throw new Error(`Audio download failed (HTTP status ${audioRes.status}).`);
    }

    const contentLength = parseInt(audioRes.headers.get('content-length') || '0', 10);
    let audioBuffer;

    if (audioRes.body && typeof audioRes.body.getReader === 'function') {
        const reader = audioRes.body.getReader();
        const chunks = [];
        let receivedBytes = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedBytes += value.length;
            const percent = contentLength > 0 ? Math.round((receivedBytes / contentLength) * 100) : 0;
            onProgress(percent, receivedBytes, contentLength);
        }
        audioBuffer = Buffer.concat(chunks);
    } else {
        const arrayBuf = await audioRes.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        onProgress(100, audioBuffer.length, audioBuffer.length);
    }

    const id3Header = createID3TagBuffer({
        title: track.title,
        artist: track.artists,
        album: track.album
    }, coverBuffer);

    const finalFileBuffer = Buffer.concat([id3Header, audioBuffer]);
    fs.writeFileSync(targetFilePath, finalFileBuffer);

    return {
        filePath: targetFilePath,
        sizeBytes: finalFileBuffer.length
    };
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test test/downloader.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/downloader.js test/downloader.test.js
git commit -m "feat: add MP3 stream downloader and ID3v2 tag writer"
```

---

### Task 4: Queue manager with adaptive retry (`src/queue-manager.js`)

**Files:**
- Create: `src/queue-manager.js`
- Test: `test/queue-manager.test.js`

**Interfaces:**
- Produces: `class QueueManager extends EventEmitter { start(tracks, destinationDir, options): void, pause(): void, resume(): void, getStatus(): object }`
- Features: Ordered processing, automatic 60-second pause for status code 429 with SSE event broadcasts, followed by download and tagging.

- [ ] **Step 1: Write the unit test for the Queue Manager**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueueManager } from '../src/queue-manager.js';

test('QueueManager processes the queue, pauses adaptively on 429, then resumes', async () => {
    let attempt = 0;
    const mockSpotmateClient = {
        convertTrack: async (url) => {
            attempt++;
            if (url.includes('track_429') && attempt === 1) {
                return { success: false, status: 429, error: 'HTTP error 429' };
            }
            return { success: true, url: 'https://example.com/audio.mp3', status: 200 };
        }
    };

    const mockDownloader = async (track, url, dest, opts) => {
        opts.onProgress(100, 1000, 1000);
        return { filePath: '/tmp/test.mp3', sizeBytes: 1000 };
    };

    const qm = new QueueManager({
        spotmateClient: mockSpotmateClient,
        downloader: mockDownloader,
        rateLimitPauseSeconds: 0.05,
        delayBetweenTracksMs: 10
    });

    const events = [];
    qm.on('track-status', (data) => events.push(data));
    qm.on('rate-limit-pause', (data) => events.push({ type: 'rate-limit', ...data }));

    const tracks = [
        { id: 'track_429', title: 'Morceau 1', spotify_url: 'https://open.spotify.com/track/track_429' }
    ];

    await qm.start(tracks, '/tmp');

    assert(events.some(e => e.type === 'rate-limit'));
    assert(events.some(e => e.status === 'completed'));
    assert.strictEqual(qm.getStatus().completedCount, 1);
});
```

- [ ] **Step 2: Run the test to verify the failure**

Run: `node --test test/queue-manager.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/queue-manager.js`**

```javascript
import { EventEmitter } from 'node:events';

export class QueueManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.spotmateClient = options.spotmateClient;
        this.downloader = options.downloader;
        this.rateLimitPauseSeconds = options.rateLimitPauseSeconds ?? 60;
        this.delayBetweenTracksMs = options.delayBetweenTracksMs ?? 2000;
        this.isRunning = false;
        this.isPaused = false;
        this.items = [];
        this.destinationDir = '';
        this.organizeFolders = false;
    }

    getStatus() {
        const completedCount = this.items.filter(i => i.status === 'completed').length;
        const errorCount = this.items.filter(i => i.status === 'error').length;
        const pendingCount = this.items.filter(i => i.status === 'pending' || i.status === 'converting' || i.status === 'downloading').length;

        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            totalTracks: this.items.length,
            completedCount,
            errorCount,
            pendingCount,
            items: this.items
        };
    }

    async start(tracks, destinationDir, options = {}) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.destinationDir = destinationDir;
        this.organizeFolders = options.organizeFolders || false;

        this.items = tracks.map(t => ({
            track: t,
            status: 'pending',
            progressPercent: 0,
            downloadUrl: null,
            filePath: null,
            error: null
        }));

        this.emit('queue-started', this.getStatus());

        for (let i = 0; i < this.items.length; i++) {
            if (!this.isRunning) break;

            while (this.isPaused) {
                await new Promise(r => setTimeout(r, 500));
            }

            const item = this.items[i];
            if (item.status === 'completed') continue;

            await this.processItem(item);

            if (i < this.items.length - 1 && this.isRunning) {
                await new Promise(r => setTimeout(r, this.delayBetweenTracksMs));
            }
        }

        this.isRunning = false;
        this.emit('queue-finished', this.getStatus());
    }

    async processItem(item) {
        const track = item.track;
        item.status = 'converting';
        this.emit('track-status', { id: track.id, status: 'converting', progressPercent: 0 });

        let conversion = await this.spotmateClient.convertTrack(track.spotify_url);

        // Adaptive rate limit handling (429)
        if (conversion.status === 429) {
            this.emit('rate-limit-pause', {
                id: track.id,
                pauseSeconds: this.rateLimitPauseSeconds,
                message: `SpotMate rate limit reached (HTTP 429). Pausing for ${this.rateLimitPauseSeconds} seconds...`
            });

            await new Promise(r => setTimeout(r, this.rateLimitPauseSeconds * 1000));
            // Retry after the pause
            conversion = await this.spotmateClient.convertTrack(track.spotify_url);
        }

        if (!conversion.success || !conversion.url) {
            item.status = 'error';
            item.error = conversion.error || 'Conversion failed';
            this.emit('track-status', { id: track.id, status: 'error', error: item.error });
            return;
        }

        item.downloadUrl = conversion.url;
        item.status = 'downloading';
        this.emit('track-status', { id: track.id, status: 'downloading', progressPercent: 0 });

        try {
            const downloadResult = await this.downloader(track, conversion.url, this.destinationDir, {
                organizeFolders: this.organizeFolders,
                onProgress: (percent) => {
                    item.progressPercent = percent;
                    this.emit('track-status', { id: track.id, status: 'downloading', progressPercent: percent });
                }
            });

            item.status = 'completed';
            item.progressPercent = 100;
            item.filePath = downloadResult.filePath;
            this.emit('track-status', { id: track.id, status: 'completed', progressPercent: 100, filePath: downloadResult.filePath });

        } catch (downloadErr) {
            item.status = 'error';
            item.error = downloadErr.message;
            this.emit('track-status', { id: track.id, status: 'error', error: downloadErr.message });
        }
    }

    pause() {
        this.isPaused = true;
        this.emit('queue-paused', this.getStatus());
    }

    resume() {
        this.isPaused = false;
        this.emit('queue-resumed', this.getStatus());
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.emit('queue-stopped', this.getStatus());
    }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test test/queue-manager.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/queue-manager.js test/queue-manager.test.js
git commit -m "feat: add queue manager with adaptive retry for 429"
```

---

### Task 5: HTTP REST server and SSE broadcasts (`server.js`)

**Files:**
- Create: `server.js`
- Test: `test/server.test.js`

**Interfaces:**
- Produces: Node.js HTTP server on port 3000 (or a dynamic port) with routes `/api/spotify/load`, `/api/queue/start`, `/api/events`, `/api/audio/:id`, `/api/system/open-folder`.

- [ ] **Step 1: Write the integration test for the HTTP server**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createSpotmateServer } from '../server.js';

test('HTTP server responds correctly to the status and API routes', async () => {
    const { server, port } = await createSpotmateServer({ port: 0 });

    try {
        const res = await fetch(`http://localhost:${port}/api/status`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'online');
    } finally {
        server.close();
    }
});
```

- [ ] **Step 2: Run the test to verify the failure**

Run: `node --test test/server.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `server.js`**

```javascript
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { extractSpotifyMetadata } from './src/spotify-extractor.js';
import { SpotmateClient } from './src/spotmate-client.js';
import { downloadAndTagTrack } from './src/downloader.js';
import { QueueManager } from './src/queue-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createSpotmateServer(options = {}) {
    const port = options.port ?? 3000;
    const publicDir = path.join(__dirname, 'public');
    const defaultDownloadDir = path.join(os.homedir(), 'Downloads', 'SpotMate');

    let currentConfig = {
        destinationDir: defaultDownloadDir,
        organizeFolders: false
    };

    if (!fs.existsSync(currentConfig.destinationDir)) {
        try { fs.mkdirSync(currentConfig.destinationDir, { recursive: true }); } catch (e) {}
    }

    const spotmateClient = new SpotmateClient();
    const queueManager = new QueueManager({
        spotmateClient: spotmateClient,
        downloader: downloadAndTagTrack
    });

    const sseClients = new Set();

    function broadcastEvent(eventType, data) {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const client of sseClients) {
            try {
                client.write(payload);
            } catch (e) {
                sseClients.delete(client);
            }
        }
    }

    queueManager.on('track-status', (data) => broadcastEvent('track-status', data));
    queueManager.on('rate-limit-pause', (data) => broadcastEvent('rate-limit-pause', data));
    queueManager.on('queue-started', (data) => broadcastEvent('queue-started', data));
    queueManager.on('queue-finished', (data) => broadcastEvent('queue-finished', data));

    const server = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        // Endpoint SSE
        if (pathname === '/api/events') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            res.write(': heartbeat\n\n');
            sseClients.add(res);

            req.on('close', () => {
                sseClients.delete(res);
            });
            return;
        }

        // Helper to read the JSON body
        async function readJsonBody() {
            return new Promise((resolve, reject) => {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
                });
            });
        }

        // API routes
        if (pathname === '/api/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'online', config: currentConfig, queue: queueManager.getStatus() }));
        }

        if (pathname === '/api/spotify/load' && req.method === 'POST') {
            try {
                const { url } = await readJsonBody();
                const metadata = await extractSpotifyMetadata(url);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, metadata }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }
        }

        if (pathname === '/api/config' && req.method === 'POST') {
            try {
                const body = await readJsonBody();
                if (body.destinationDir) currentConfig.destinationDir = body.destinationDir;
                if (typeof body.organizeFolders === 'boolean') currentConfig.organizeFolders = body.organizeFolders;

                if (!fs.existsSync(currentConfig.destinationDir)) {
                    fs.mkdirSync(currentConfig.destinationDir, { recursive: true });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, config: currentConfig }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }
        }

        if (pathname === '/api/queue/start' && req.method === 'POST') {
            try {
                const { tracks } = await readJsonBody();
                if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
                    throw new Error('No tracks provided.');
                }
                queueManager.start(tracks, currentConfig.destinationDir, { organizeFolders: currentConfig.organizeFolders });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: true, queue: queueManager.getStatus() }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }
        }

        if (pathname === '/api/system/open-folder' && req.method === 'POST') {
            const dirToOpen = currentConfig.destinationDir;
            if (process.platform === 'win32') {
                exec(`explorer.exe "${dirToOpen}"`);
            } else if (process.platform === 'darwin') {
                exec(`open "${dirToOpen}"`);
            } else {
                exec(`xdg-open "${dirToOpen}"`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // Static frontend files
        let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            return fs.createReadStream(filePath).pipe(res);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ressource introuvable');
    });

    return new Promise((resolve) => {
        server.listen(port, () => {
            const assignedPort = server.address().port;
            resolve({ server, port: assignedPort });
        });
    });
}

// Direct entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    createSpotmateServer({ port: 3000 }).then(({ port }) => {
        const url = `http://localhost:${port}`;
        console.log(`[SERVER] SpotMate Launcher active at ${url}`);
        if (process.platform === 'win32') {
            exec(`cmd /c start ${url}`);
        } else if (process.platform === 'darwin') {
            exec(`open ${url}`);
        } else {
            exec(`xdg-open ${url}`);
        }
    });
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test test/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server.js test/server.test.js
git commit -m "feat: add HTTP REST server and SSE stream for the launcher"
```

---

### Task 6: Responsive web interface (`public/index.html`, `public/style.css`, `public/app.js`)

**Files:**
- Create: `public/index.html`
- Create: `public/style.css`
- Create: `public/app.js`

**Features:**
- Spotify URL input and dynamic display of the track list with thumbnails, durations, and artists.
- Local folder selector with an “Open folder” button.
- Individual and overall real-time progress bars (fed by the SSE stream).
- HTML5 audio player for listening to downloaded tracks.
- Pause countdown handling for HTTP status 429.

- [ ] **Step 1: Create the HTML5 interface in `public/index.html`**
- [ ] **Step 2: Create the modern stylesheet in `public/style.css`**
- [ ] **Step 3: Create the application logic in `public/app.js`**
- [ ] **Step 4: Test that static files load correctly through `test/server.test.js`**
- [ ] **Step 5: Commit the user interface**

```bash
git add public/index.html public/style.css public/app.js
git commit -m "feat: add responsive SpotMate launcher web interface"
```

---

### Task 7: Overall integration and updates to `package.json` and `README.md`

**Files:**
- Modify: `package.json` (add the script `"start": "node server.js"`)
- Modify: `README.md` (full launcher documentation)

- [ ] **Step 1: Update `package.json`**
- [ ] **Step 2: Update `README.md` with text captures and a launcher guide**
- [ ] **Step 3: Run the full `npm test` suite**
- [ ] **Step 4: Commit and push to GitHub**

```bash
git add package.json README.md
git commit -m "docs: document the web launcher and configure npm start"
git push origin main
```
