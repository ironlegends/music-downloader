/**
 * @fileoverview Versioned session storage manager for SpotMate v1.3.
 */

import {
  TRACK_STATES,
  ERROR_CODES,
  toPersistedSession
} from './track-session.js';
import { BROWSER_LIMITS } from './policy.js';

const SESSION_STORAGE_KEY = 'music-converter:v1.3:playlist-session';

/**
 * Saves the session after projecting it to a safe format.
 * @param {{ setItem: (key: string, val: string) => void }} storage
 * @param {object} session
 * @returns {boolean}
 */
const saveSession = (storage, session) => {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false;
    const persisted = toPersistedSession(session);
    if (!persisted) return false;
    const json = JSON.stringify(persisted);
    storage.setItem(SESSION_STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes the session from storage.
 * @param {{ removeItem: (key: string) => void }} storage
 * @returns {boolean}
 */
const clearSession = (storage) => {
  try {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(SESSION_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Loads and validates a session from storage, failing closed on invalid data.
 * @param {{ getItem: (key: string) => string|null, removeItem: (key: string) => void }} storage
 * @param {string[]} [currentTrackIds]
 * @returns {object|null}
 */
const loadSession = (storage, currentTrackIds) => {
  if (!storage || typeof storage.getItem !== 'function') return null;

  let raw;
  try {
    raw = storage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null || raw === undefined || typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    clearSession(storage);
    return null;
  }

  // Validate the structure and fail closed on invalid data.
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    clearSession(storage);
    return null;
  }

  if (data.schemaVersion !== 1) {
    clearSession(storage);
    return null;
  }

  if (typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
    clearSession(storage);
    return null;
  }

  if (!Array.isArray(data.tracks) || data.tracks.length === 0 || data.tracks.length > BROWSER_LIMITS.maxTracks) {
    clearSession(storage);
    return null;
  }

  const seenIds = new Set();
  const validTracks = [];

  for (const t of data.tracks) {
    if (!t || typeof t !== 'object') {
      clearSession(storage);
      return null;
    }
    if (typeof t.id !== 'string' || t.id.trim().length === 0) {
      clearSession(storage);
      return null;
    }
    if (seenIds.has(t.id)) {
      clearSession(storage);
      return null;
    }
    seenIds.add(t.id);

    if (typeof t.selected !== 'boolean') {
      clearSession(storage);
      return null;
    }

    if (typeof t.status !== 'string' || !TRACK_STATES.includes(t.status)) {
      clearSession(storage);
      return null;
    }

    if (typeof t.progressPercent !== 'number' || Number.isNaN(t.progressPercent) || t.progressPercent < 0 || t.progressPercent > 100) {
      clearSession(storage);
      return null;
    }

    if (t.errorCode !== null) {
      if (typeof t.errorCode !== 'string' || !ERROR_CODES.includes(t.errorCode)) {
        clearSession(storage);
        return null;
      }
    }

    validTracks.push(Object.freeze({
      id: t.id,
      selected: t.selected,
      status: t.status,
      progressPercent: t.progressPercent,
      errorCode: t.errorCode
    }));
  }

  let activeTrackId = null;
  if (data.activeTrackId !== null && data.activeTrackId !== undefined) {
    if (typeof data.activeTrackId !== 'string' || !seenIds.has(data.activeTrackId)) {
      clearSession(storage);
      return null;
    }
    activeTrackId = data.activeTrackId;
  }

  // If currentTrackIds is provided, require an exact match.
  if (Array.isArray(currentTrackIds)) {
    if (currentTrackIds.length !== validTracks.length) {
      clearSession(storage);
      return null;
    }
    for (let i = 0; i < currentTrackIds.length; i += 1) {
      if (currentTrackIds[i] !== validTracks[i].id) {
        clearSession(storage);
        return null;
      }
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    sessionId: data.sessionId,
    tracks: Object.freeze(validTracks),
    activeTrackId
  });
};

export {
  SESSION_STORAGE_KEY,
  saveSession,
  loadSession,
  clearSession
};
