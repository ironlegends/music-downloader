/**
 * @fileoverview Sequential conversion runner for SpotMate v1.3.
 */

import { BROWSER_LIMITS, isFinalHttpsUrl } from './policy.js';
import {
  ERROR_CODES,
  getSelectedQueuedTrackIds,
  requeueFailedTracks,
  transitionTrack,
  toPersistedSession
} from './track-session.js';

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

const createDefaultSleep = () => (ms, signal) => {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener?.('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    signal?.addEventListener?.('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
};

const normalizeErrorCode = (code) => {
  if (typeof code !== 'string') return 'network';
  const clean = code.toLowerCase().trim();
  if (ERROR_CODES.includes(clean)) return clean;
  if (clean.startsWith('http')) return 'http';
  if (clean.startsWith('network')) return 'network';
  if (clean.startsWith('schema')) return 'schema';
  if (clean.includes('poll') || clean.includes('timeout')) return 'poll_timeout';
  if (clean.startsWith('input')) return 'input';
  return 'network';
};

/**
 * Creates a sequential conversion runner for a playlist session.
 *
 * @param {object} params
 * @param {object} params.session Session created by createTrackSession.
 * @param {Function} params.convertTrack Async function (track, signal, hooks) => Promise.
 * @param {Function} [params.sleep] Function (ms, signal) => Promise.
 * @param {Function} [params.onChange] Callback (snapshot) => void.
 * @param {Function} [params.onSuccess] Callback (trackId, finalAudioUrl) => void.
 */
const createConversionRunner = ({
  session,
  convertTrack,
  sleep,
  onChange,
  onSuccess
} = {}) => {
  if (!session || !Array.isArray(session.tracks)) {
    throw new TypeError('session is required and must have tracks array');
  }
  if (typeof convertTrack !== 'function') {
    throw new TypeError('convertTrack must be a function');
  }

  const wait = typeof sleep === 'function' ? sleep : createDefaultSleep();
  let currentSession = session;
  let activeController = null;

  const notifyChange = () => {
    if (typeof onChange === 'function') {
      onChange(toPersistedSession(currentSession));
    }
  };

  const handleCancellation = (trackId) => {
    const track = currentSession.tracks.find((t) => t.id === trackId);
    if (track && (track.status === 'converting' || track.status === 'polling')) {
      currentSession = transitionTrack(currentSession, trackId, 'cancelled', {
        activeTrackId: null
      });
      notifyChange();
    }
  };

  const cancel = () => {
    if (activeController) {
      activeController.abort();
    }
  };

  const runQueue = async () => {
    if (activeController) {
      throw new Error('runner-active');
    }

    const targetTrackIds = getSelectedQueuedTrackIds(currentSession);
    if (targetTrackIds.length === 0) {
      return currentSession;
    }

    const operationController = new AbortController();
    activeController = operationController;

    try {
      for (let index = 0; index < targetTrackIds.length; index += 1) {
        if (operationController.signal.aborted) break;

        const trackId = targetTrackIds[index];

        // Wait 2000 ms only between consecutive starts.
        if (index > 0) {
          try {
            await wait(BROWSER_LIMITS.conversionGapMs, operationController.signal);
          } catch (error) {
            if (error?.name === 'AbortError' || operationController.signal.aborted) {
              break;
            }
            throw error;
          }
          if (operationController.signal.aborted) break;
        }

        // Transition to 'converting'.
        currentSession = transitionTrack(currentSession, trackId, 'converting', {
          activeTrackId: trackId
        });
        notifyChange();

        const onPolling = (progressPercent) => {
          if (operationController.signal.aborted) return;
          const currentTrack = currentSession.tracks.find((t) => t.id === trackId);
          if (currentTrack && (currentTrack.status === 'converting' || currentTrack.status === 'polling')) {
            currentSession = transitionTrack(currentSession, trackId, 'polling', {
              progressPercent: progressPercent ?? 25,
              activeTrackId: trackId
            });
            notifyChange();
          }
        };

        try {
          const trackObj = currentSession.tracks.find((t) => t.id === trackId) || { id: trackId };
          const result = await convertTrack(trackObj, operationController.signal, { onPolling });

          if (operationController.signal.aborted) {
            handleCancellation(trackId);
            break;
          }

          const finalAudioUrl = result?.finalAudioUrl ?? result?.url;
          if (isFinalHttpsUrl(finalAudioUrl)) {
            currentSession = transitionTrack(currentSession, trackId, 'success', {
              progressPercent: 100,
              activeTrackId: null
            });
            notifyChange();
            if (typeof onSuccess === 'function') {
              onSuccess(trackId, finalAudioUrl);
            }
          } else {
            const errCode = normalizeErrorCode(result?.errorCode ?? result?.error ?? result?.status);
            currentSession = transitionTrack(currentSession, trackId, 'failed', {
              errorCode: errCode,
              activeTrackId: null
            });
            notifyChange();
          }
        } catch (error) {
          if (error?.name === 'AbortError' || operationController.signal.aborted) {
            handleCancellation(trackId);
            break;
          }
          const errCode = normalizeErrorCode(error?.code ?? error?.message);
          currentSession = transitionTrack(currentSession, trackId, 'failed', {
            errorCode: errCode,
            activeTrackId: null
          });
          notifyChange();
        }
      }
    } finally {
      if (activeController === operationController) {
        activeController = null;
      }
    }

    return currentSession;
  };

  const startSelected = () => runQueue();
  const resumeQueued = () => runQueue();

  const retryFailedTracks = () => {
    currentSession = requeueFailedTracks(currentSession);
    notifyChange();
    return currentSession;
  };

  const getSession = () => currentSession;

  return Object.freeze({
    startSelected,
    resumeQueued,
    retryFailedTracks,
    cancel,
    getSession
  });
};

export { createConversionRunner };
