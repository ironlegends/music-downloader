/**
 * @fileoverview Pure playlist session model for SpotMate v1.3.
 */

import { BROWSER_LIMITS } from './policy.js';

/**
 * @typedef {'queued' | 'converting' | 'polling' | 'success' | 'failed' | 'cancelled'} TrackState
 */

/**
 * @type {readonly TrackState[]}
 */
const TRACK_STATES = Object.freeze([
  'queued',
  'converting',
  'polling',
  'success',
  'failed',
  'cancelled'
]);

/**
 * @type {readonly string[]}
 */
const ERROR_CODES = Object.freeze([
  'network',
  'http',
  'schema',
  'poll_timeout',
  'input'
]);

/**
 * Internal validations.
 */

const assertTrackIds = (trackIds) => {
  if (!Array.isArray(trackIds)) {
    throw new TypeError('trackIds must be an array');
  }
  if (trackIds.length === 0) {
    throw new Error('trackIds must contain at least 1 track');
  }
  if (trackIds.length > BROWSER_LIMITS.maxTracks) {
    throw new Error(`Track limit exceeded (max ${BROWSER_LIMITS.maxTracks})`);
  }
  const seen = new Set();
  for (const id of trackIds) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Track id must be a non-empty string');
    }
    if (seen.has(id)) {
      throw new Error(`Duplicate track id: ${id}`);
    }
    seen.add(id);
  }
};

const assertTrackState = (state) => {
  if (typeof state !== 'string' || !TRACK_STATES.includes(state)) {
    throw new Error(`Invalid track state: ${state}`);
  }
};

const assertProgress = (progress) => {
  const num = Number(progress);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const assertErrorCode = (errorCode) => {
  if (errorCode === null || errorCode === undefined) return;
  if (typeof errorCode !== 'string' || !ERROR_CODES.includes(errorCode)) {
    throw new Error(`Invalid errorCode: ${errorCode}`);
  }
};

const VALID_TRANSITIONS = Object.freeze({
  queued: Object.freeze(['converting']),
  converting: Object.freeze(['polling', 'success', 'failed', 'cancelled']),
  polling: Object.freeze(['polling', 'success', 'failed', 'cancelled']),
  success: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([])
});

/**
 * Creates a playlist conversion session.
 * @param {string[]} trackIds
 * @param {(() => string)|string} [createSessionId]
 */
const createTrackSession = (trackIds, createSessionId) => {
  assertTrackIds(trackIds);
  let sessionId = 'session-1';
  if (typeof createSessionId === 'function') {
    sessionId = createSessionId();
  } else if (typeof createSessionId === 'string' && createSessionId.trim().length > 0) {
    sessionId = createSessionId.trim();
  } else if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    sessionId = crypto.randomUUID();
  }

  const tracks = Object.freeze(
    trackIds.map((id) => Object.freeze({
      id,
      selected: true,
      status: 'queued',
      progressPercent: 0,
      errorCode: null
    }))
  );

  return Object.freeze({
    schemaVersion: 1,
    sessionId,
    tracks,
    activeTrackId: null
  });
};

/**
 * Updates one track's selection immutably.
 */
const setTrackSelected = (session, trackId, selected) => {
  if (!session || !Array.isArray(session.tracks)) return session;
  const isSelected = Boolean(selected);
  const tracks = Object.freeze(
    session.tracks.map((track) => {
      if (track.id !== trackId) return track;
      return Object.freeze({
        ...track,
        selected: isSelected
      });
    })
  );
  return Object.freeze({
    ...session,
    tracks
  });
};

/**
 * Updates the selection of all tracks immutably.
 */
const setAllSelected = (session, selected) => {
  if (!session || !Array.isArray(session.tracks)) return session;
  const isSelected = Boolean(selected);
  const tracks = Object.freeze(
    session.tracks.map((track) => Object.freeze({
      ...track,
      selected: isSelected
    }))
  );
  return Object.freeze({
    ...session,
    tracks
  });
};

/**
 * Returns the ordered IDs of selected tracks that are queued.
 */
const getSelectedQueuedTrackIds = (session) => {
  if (!session || !Array.isArray(session.tracks)) return [];
  return session.tracks
    .filter((track) => track.selected && track.status === 'queued')
    .map((track) => track.id);
};

/**
 * Returns the IDs of failed tracks.
 */
const getFailedTrackIds = (session) => {
  if (!session || !Array.isArray(session.tracks)) return [];
  return session.tracks
    .filter((track) => track.status === 'failed')
    .map((track) => track.id);
};

/**
 * Returns failed tracks to the 'queued' state for manual retry.
 */
const requeueFailedTracks = (session) => {
  if (!session || !Array.isArray(session.tracks)) return session;
  const tracks = Object.freeze(
    session.tracks.map((track) => {
      if (track.status !== 'failed') return track;
      return Object.freeze({
        ...track,
        status: 'queued',
        progressPercent: 0,
        errorCode: null
      });
    })
  );
  return Object.freeze({
    ...session,
    tracks
  });
};

/**
 * Transitions a track to another state.
 */
const transitionTrack = (session, trackId, nextState, patch = {}) => {
  if (!session || !Array.isArray(session.tracks)) {
    throw new TypeError('session must be an object with tracks');
  }
  assertTrackState(nextState);

  const trackIndex = session.tracks.findIndex((t) => t.id === trackId);
  if (trackIndex === -1) {
    throw new Error(`Track with id ${trackId} not found in session`);
  }

  const track = session.tracks[trackIndex];
  const allowed = VALID_TRANSITIONS[track.status];
  if (!allowed || !allowed.includes(nextState)) {
    throw new Error(`Invalid transition from '${track.status}' to '${nextState}'`);
  }

  let progressPercent = track.progressPercent;
  if (patch.progressPercent !== undefined) {
    progressPercent = assertProgress(patch.progressPercent);
  } else if (nextState === 'success') {
    progressPercent = 100;
  } else if (nextState === 'queued') {
    progressPercent = 0;
  }

  let errorCode = null;
  if (nextState === 'failed') {
    if (patch.errorCode !== undefined) {
      assertErrorCode(patch.errorCode);
      errorCode = patch.errorCode;
    }
  }

  const updatedTrack = Object.freeze({
    ...track,
    status: nextState,
    progressPercent,
    errorCode
  });

  let activeTrackId = session.activeTrackId;
  if (patch.activeTrackId !== undefined) {
    activeTrackId = patch.activeTrackId;
  } else if (nextState === 'converting' || nextState === 'polling') {
    activeTrackId = trackId;
  } else if (nextState === 'success' || nextState === 'failed' || nextState === 'cancelled') {
    activeTrackId = null;
  }

  const tracks = Object.freeze(
    session.tracks.map((t, idx) => (idx === trackIndex ? updatedTrack : t))
  );

  return Object.freeze({
    ...session,
    tracks,
    activeTrackId
  });
};

/**
 * Projects the session into a safe format for persistence, without sensitive data.
 */
const toPersistedSession = (session) => {
  if (!session || typeof session !== 'object') return null;
  return Object.freeze({
    schemaVersion: 1,
    sessionId: String(session.sessionId || ''),
    tracks: Object.freeze(
      (session.tracks || []).map((t) => Object.freeze({
        id: String(t.id),
        selected: Boolean(t.selected),
        status: t.status,
        progressPercent: assertProgress(t.progressPercent),
        errorCode: t.errorCode || null
      }))
    ),
    activeTrackId: session.activeTrackId ?? null
  });
};

export {
  TRACK_STATES,
  ERROR_CODES,
  assertTrackIds,
  assertTrackState,
  assertProgress,
  assertErrorCode,
  createTrackSession,
  setTrackSelected,
  setAllSelected,
  getSelectedQueuedTrackIds,
  getFailedTrackIds,
  requeueFailedTracks,
  transitionTrack,
  toPersistedSession
};
