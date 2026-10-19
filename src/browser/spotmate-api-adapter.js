import { BROWSER_LIMITS, isAllowedSpotmatePage } from './policy.js';
import { parseConversionPayload, parsePollingPayload } from './payload-parser.js';

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
const terminal = (status, error) => Object.freeze({ kind: 'terminal', status, error });

const assertAllowed = (location) => {
  if (!isAllowedSpotmatePage(location)) throw new Error('unsupported-page');
};

const isJsonResponse = (response) => {
  const contentType = response?.headers?.get?.('content-type')
    ?? response?.headers?.get?.('Content-Type');
  return typeof contentType === 'string' && contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
};

const responseMeta = (response) => ({
  ok: response?.ok,
  status: response?.status,
  headers: response?.headers,
  contentType: response?.headers?.get?.('content-type')
    ?? response?.headers?.get?.('Content-Type')
});

const readPayload = async (response) => {
  if (!isJsonResponse(response)) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const createDefaultSleep = (setTimeoutImpl, clearTimeoutImpl) => (delay, signal) => {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      if (timer !== undefined && typeof clearTimeoutImpl === 'function') clearTimeoutImpl(timer);
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

const createSpotmateApiAdapter = ({
  fetchImpl,
  location,
  readCsrfToken,
  sleep,
  URLImpl,
  setTimeoutImpl,
  clearTimeoutImpl
} = {}) => {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
  if (typeof URLImpl !== 'function') throw new TypeError('URLImpl is required');
  if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
  if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');
  const wait = typeof sleep === 'function'
    ? sleep
    : createDefaultSleep(setTimeoutImpl, clearTimeoutImpl);

  const request = async (url, signal) => {
    if (signal?.aborted) throw abortError();
    const csrfToken = typeof readCsrfToken === 'function' ? readCsrfToken() : undefined;
    const headers = {
      accept: 'application/json',
      'content-type': 'application/json'
    };
    if (typeof csrfToken === 'string' && csrfToken.trim().length > 0) headers['X-CSRF-TOKEN'] = csrfToken;
    try {
      const response = await fetchImpl(url, { method: 'GET', credentials: 'same-origin', headers, signal });
      const payload = await readPayload(response);
      return { meta: responseMeta(response), payload };
    } catch (error) {
      if (error?.name === 'AbortError' || signal?.aborted) throw abortError();
      return { meta: { error }, payload: undefined };
    }
  };

  const convertTrack = async (track, signal) => {
    assertAllowed(location);
    if (signal?.aborted) throw abortError();
    if (!track || typeof track.value !== 'string' || track.value.trim().length === 0) {
      return terminal('input_error', 'empty-track-value');
    }
    const csrfToken = typeof readCsrfToken === 'function' ? readCsrfToken() : undefined;
    const headers = {
      accept: 'application/json',
      'content-type': 'application/json'
    };
    if (typeof csrfToken === 'string' && csrfToken.trim().length > 0) headers['X-CSRF-TOKEN'] = csrfToken;
    const url = new URLImpl('/convert', location.origin).href;
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ urls: track.value }),
        signal
      });
    } catch (error) {
      if (error?.name === 'AbortError' || signal?.aborted) throw abortError();
      return parseConversionPayload({ error }, undefined);
    }
    const payload = await readPayload(response);
    return parseConversionPayload(responseMeta(response), payload);
  };

  const pollTask = async (taskId, signal) => {
    assertAllowed(location);
    if (typeof taskId !== 'string' || taskId.trim().length === 0) {
      return terminal('input_error', 'empty-task-id');
    }
    let nextTaskId = taskId;
    for (let attempt = 0; attempt < BROWSER_LIMITS.pollLimit; attempt += 1) {
      await wait(BROWSER_LIMITS.pollGapMs, signal);
      if (signal?.aborted) throw abortError();
      const url = new URLImpl(`/tasks/${encodeURIComponent(nextTaskId)}`, location.origin).href;
      const result = await request(url, signal);
      const parsed = parsePollingPayload(result.meta, result.payload);
      if (parsed.kind !== 'poll') return parsed;
      nextTaskId = parsed.taskId;
    }
    return terminal('poll_limit', 'poll-limit');
  };

  return Object.freeze({ convertTrack, pollTask });
};

export { createSpotmateApiAdapter };
