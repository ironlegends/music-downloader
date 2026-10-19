import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackSession, transitionTrack } from '../../src/browser/track-session.js';
import {
  SESSION_STORAGE_KEY,
  saveSession,
  loadSession,
  clearSession
} from '../../src/browser/session-storage.js';

const createMockStorage = (initialData = {}) => {
  const store = new Map(Object.entries(initialData));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    has: (key) => store.has(key),
    dump: () => Object.fromEntries(store.entries())
  };
};

test('SESSION_STORAGE_KEY uses the canonical v1.3 versioned key', () => {
  assert.equal(SESSION_STORAGE_KEY, 'music-converter:v1.3:playlist-session');
});

test('saveSession stores only the safe projection without leaks', () => {
  const storage = createMockStorage();
  const session = createTrackSession(['a', 'b'], () => 'session-abc');
  const converted = transitionTrack(session, 'a', 'converting');

  const saved = saveSession(storage, converted);
  assert.equal(saved, true);

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  assert.notEqual(raw, null);

  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed, {
    schemaVersion: 1,
    sessionId: 'session-abc',
    tracks: [
      { id: 'a', selected: true, status: 'converting', progressPercent: 0, errorCode: null },
      { id: 'b', selected: true, status: 'queued', progressPercent: 0, errorCode: null }
    ],
    activeTrackId: 'a'
  });

  // Check that sensitive or unexpected strings are absent.
  assert.equal(raw.includes('token'), false);
  assert.equal(raw.includes('http'), false);
  assert.equal(raw.includes('url'), false);
});

test('saveSession handles storage exceptions without throwing', () => {
  const throwingStorage = {
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };
  const session = createTrackSession(['a'], () => 's-1');
  const result = saveSession(throwingStorage, session);
  assert.equal(result, false);
});

test('clearSession removes the session key from storage', () => {
  const storage = createMockStorage();
  const session = createTrackSession(['a'], () => 's-1');
  saveSession(storage, session);
  assert.equal(storage.has(SESSION_STORAGE_KEY), true);

  clearSession(storage);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);
});

test('loadSession restores a valid session matching currentTrackIds', () => {
  const storage = createMockStorage();
  const session = createTrackSession(['track-1', 'track-2'], () => 'sess-42');
  saveSession(storage, session);

  const loaded = loadSession(storage, ['track-1', 'track-2']);
  assert.notEqual(loaded, null);
  assert.equal(loaded.schemaVersion, 1);
  assert.equal(loaded.sessionId, 'sess-42');
  assert.deepEqual(loaded.tracks.map((t) => t.id), ['track-1', 'track-2']);
});

test('loadSession returns null and clears storage when JSON is malformed', () => {
  const storage = createMockStorage({
    [SESSION_STORAGE_KEY]: '{ invalid json ...'
  });

  const loaded = loadSession(storage, ['a']);
  assert.equal(loaded, null);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);
});

test('loadSession returns null and clears storage when schemaVersion is not 1', () => {
  const storage = createMockStorage({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      schemaVersion: 2,
      sessionId: 'sess-1',
      tracks: [{ id: 'a', selected: true, status: 'queued', progressPercent: 0, errorCode: null }],
      activeTrackId: null
    })
  });

  const loaded = loadSession(storage, ['a']);
  assert.equal(loaded, null);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);
});

test('loadSession returns null and clears storage when tracks do not match currentTrackIds', () => {
  const storage = createMockStorage();
  const session = createTrackSession(['a', 'b'], () => 'sess-1');
  saveSession(storage, session);

  // Different track count.
  assert.equal(loadSession(storage, ['a']), null);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);

  // Different IDs.
  saveSession(storage, session);
  assert.equal(loadSession(storage, ['a', 'c']), null);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);

  // Different order.
  saveSession(storage, session);
  assert.equal(loadSession(storage, ['b', 'a']), null);
  assert.equal(storage.has(SESSION_STORAGE_KEY), false);
});

test('loadSession fails closed on malformed data, unknown states, or invalid progress', () => {
  const invalidPayloads = [
    null,
    'not an object',
    {},
    { schemaVersion: 1, sessionId: '' },
    { schemaVersion: 1, sessionId: 's-1', tracks: 'not an array' },
    { schemaVersion: 1, sessionId: 's-1', tracks: [] },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: Array.from({ length: 101 }, (_, i) => ({
        id: String(i),
        selected: true,
        status: 'queued',
        progressPercent: 0,
        errorCode: null
      }))
    },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: [
        { id: 'a', selected: true, status: 'queued', progressPercent: 0, errorCode: null },
        { id: 'a', selected: true, status: 'queued', progressPercent: 0, errorCode: null }
      ]
    },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: [{ id: 'a', selected: true, status: 'pending', progressPercent: 0, errorCode: null }]
    },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: [{ id: 'a', selected: true, status: 'queued', progressPercent: -5, errorCode: null }]
    },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: [{ id: 'a', selected: true, status: 'queued', progressPercent: 150, errorCode: null }]
    },
    {
      schemaVersion: 1,
      sessionId: 's-1',
      tracks: [{ id: 'a', selected: true, status: 'failed', progressPercent: 0, errorCode: 'unknown_err' }]
    }
  ];

  for (const payload of invalidPayloads) {
    const storage = createMockStorage({
      [SESSION_STORAGE_KEY]: typeof payload === 'string' ? payload : JSON.stringify(payload)
    });
    const loaded = loadSession(storage);
    assert.equal(loaded, null);
    assert.equal(storage.has(SESSION_STORAGE_KEY), false);
  }
});
