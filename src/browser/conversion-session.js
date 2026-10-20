import { BROWSER_LIMITS } from './policy.js';

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
const cancelledResult = () => Object.freeze({ kind: 'terminal', status: 'cancelled', error: 'cancelled' });
const emptyResult = () => Object.freeze({ kind: 'terminal', status: 'input_error', error: 'empty-track-value' });
const schemaResult = () => Object.freeze({ kind: 'terminal', status: 'schema_error', error: 'schema-missing' });

const createAbortableSleep = (setTimeoutImpl, clearTimeoutImpl) => (delay, signal) => {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeoutImpl(timer);
      signal?.removeEventListener?.('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    timer = setTimeoutImpl(() => {
      cleanup();
      resolve();
    }, delay);
    signal?.addEventListener?.('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
};

const toLegacyResult = (track, result) => {
  const success = result?.kind === 'success';
  return Object.freeze({
    id: track?.id,
    status: success ? 'success' : result?.status ?? 'schema_error',
    success,
    pending: false,
    url: success ? result.url : null,
    error: success ? null : result?.error ?? 'schema-missing'
  });
};

const createConversionSession = ({
  pageAdapter,
  apiAdapter,
  exposeLegacyGlobals,
  AbortControllerImpl,
  setTimeoutImpl,
  clearTimeoutImpl,
  sleep,
  onTrackUpdate
} = {}) => {
  if (!pageAdapter || typeof pageAdapter.publishLegacyConversionResults !== 'function') {
    throw new TypeError('pageAdapter is required');
  }
  if (!apiAdapter || typeof apiAdapter.convertTrack !== 'function') {
    throw new TypeError('apiAdapter is required');
  }
  if (typeof AbortControllerImpl !== 'function') throw new TypeError('AbortControllerImpl is required');
  if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
  if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');
  if (exposeLegacyGlobals !== undefined && typeof exposeLegacyGlobals !== 'boolean') {
    throw new TypeError('exposeLegacyGlobals must be boolean');
  }
  const wait = typeof sleep === 'function'
    ? sleep
    : createAbortableSleep(setTimeoutImpl, clearTimeoutImpl);
  let activeController = null;
  const notify = (track, state) => {
    // Optional visual feedback must never alter conversion or cancellation behavior.
    try { onTrackUpdate?.(track?.id, state); } catch { /* The view may have been detached. */ }
  };

  const cancel = () => {
    activeController?.abort();
  };

  const run = async (tracks, signal) => {
    if (activeController) throw new Error('session-active');
    if (!Array.isArray(tracks)) throw new TypeError('tracks must be an array');
    if (tracks.length > BROWSER_LIMITS.maxTracks) throw new Error('track-limit');
    if (signal?.aborted) return [];

    const operationController = new AbortControllerImpl();
    activeController = operationController;
    const onAbort = () => operationController.abort();
    signal?.addEventListener?.('abort', onAbort, { once: true });
    const results = [];
    const decisions = [];
    const append = (track, result) => {
      const safeResult = result && typeof result === 'object' ? result : schemaResult();
      results.push(safeResult);
      decisions.push({ track, result: safeResult });
      notify(track, safeResult.kind === 'success' ? 'ready' : safeResult.status === 'cancelled' ? 'canceled' : 'failed');
    };
    try {
      for (let index = 0; index < tracks.length; index += 1) {
        if (operationController.signal.aborted) break;
        if (index > 0) {
          try {
            await wait(BROWSER_LIMITS.conversionGapMs, operationController.signal);
          } catch (error) {
            if (error?.name === 'AbortError' || operationController.signal.aborted) break;
            throw error;
          }
          if (operationController.signal.aborted) break;
        }

        const track = tracks[index];
        if (!track || typeof track.value !== 'string' || track.value.trim().length === 0) {
          append(track, emptyResult());
          continue;
        }
        try {
          notify(track, 'converting');
          let result = await apiAdapter.convertTrack(track, operationController.signal);
          if (operationController.signal.aborted) {
            append(track, cancelledResult());
            break;
          }
          if (result?.kind === 'poll') {
            notify(track, 'polling');
            result = await apiAdapter.pollTask(result.taskId, operationController.signal);
            if (operationController.signal.aborted) {
              append(track, cancelledResult());
              break;
            }
          }
          append(track, result);
        } catch (error) {
          if (error?.name === 'AbortError' || operationController.signal.aborted) {
            append(track, cancelledResult());
            break;
          }
          throw error;
        }
      }
    } finally {
      signal?.removeEventListener?.('abort', onAbort);
      if (activeController === operationController) activeController = null;
    }
    const ordered = Object.freeze(results.slice());
    if (exposeLegacyGlobals === true) {
      pageAdapter.publishLegacyConversionResults(Object.freeze(decisions.map(({ track, result }) => (
        toLegacyResult(track, result)
      ))));
    }
    return ordered;
  };

  return Object.freeze({ run, cancel });
};

export { createConversionSession };
