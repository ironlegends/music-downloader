// Isolated SpotMate Manifest V3 content script.
(function () {
  'use strict';

  const __modules = {};
  function __require(id) {
    if (!__modules[id]) {
      throw new Error('Module not found: ' + id);
    }
    return __modules[id];
  }

  const PANEL_CSS = "/**\n * Single source of truth for SpotMate v1.3 panel styles.\n */\n\n:root {\n  --spotmate-bg: #181818;\n  --spotmate-text: #ffffff;\n  --spotmate-subtext: #b3b3b3;\n  --spotmate-accent: #1db954;\n  --spotmate-accent-hover: #1ed760;\n  --spotmate-danger: #e22134;\n  --spotmate-border: #282828;\n  --spotmate-row-bg: #222222;\n  --spotmate-row-hover: #2a2a2a;\n  --spotmate-focus-ring: #ffffff;\n}\n\n.spotmate-voluntary-panel,\n.spotmate-download-panel {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  margin: 1.5rem 0;\n  padding: 1rem;\n  background-color: var(--spotmate-bg);\n  color: var(--spotmate-text);\n  border-radius: 8px;\n  border: 1px solid var(--spotmate-border);\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 100%;\n  overflow-x: hidden;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif;\n}\n\n.spotmate-panel-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.75rem;\n}\n\n.spotmate-button,\n.spotmate-voluntary-panel button,\n.spotmate-download-panel button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  min-width: 44px;\n  padding: 0.5rem 1rem;\n  border-radius: 500px;\n  border: none;\n  font-size: 0.875rem;\n  font-weight: 700;\n  cursor: pointer;\n  background-color: var(--spotmate-accent);\n  color: #000000;\n  transition: transform 0.1s ease, background-color 0.1s ease;\n  box-sizing: border-box;\n  text-align: center;\n}\n\n.spotmate-button:hover:not(:disabled),\n.spotmate-voluntary-panel button:hover:not(:disabled),\n.spotmate-download-panel button:hover:not(:disabled) {\n  background-color: var(--spotmate-accent-hover);\n  transform: scale(1.02);\n}\n\n.spotmate-button:disabled,\n.spotmate-voluntary-panel button:disabled,\n.spotmate-download-panel button:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n  transform: none;\n}\n\n.spotmate-button-cancel {\n  background-color: var(--spotmate-danger);\n  color: #ffffff;\n}\n\n.spotmate-button-cancel:hover:not(:disabled) {\n  background-color: #f13c4e;\n}\n\n.spotmate-button-select-all,\n.spotmate-button-select-none {\n  background-color: #333333;\n  color: var(--spotmate-text);\n  border: 1px solid #555555;\n}\n\n.spotmate-button-select-all:hover:not(:disabled),\n.spotmate-button-select-none:hover:not(:disabled) {\n  background-color: #444444;\n}\n\n.spotmate-button:focus-visible,\n.spotmate-voluntary-panel button:focus-visible,\n.spotmate-download-panel button:focus-visible,\n.spotmate-checkbox-container input[type=\"checkbox\"]:focus-visible {\n  outline: 2px solid var(--spotmate-focus-ring);\n  outline-offset: 2px;\n}\n\n.spotmate-track-list {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  width: 100%;\n}\n\n/* Desktop layout (>= 768px) */\n.spotmate-track-row {\n  display: grid;\n  grid-template-columns: 44px minmax(120px, 2fr) minmax(100px, 1fr) minmax(120px, 1.5fr) auto;\n  align-items: center;\n  gap: 1rem;\n  padding: 0.5rem 0.75rem;\n  background-color: var(--spotmate-row-bg);\n  border-radius: 4px;\n  border: 1px solid var(--spotmate-border);\n  box-sizing: border-box;\n}\n\n.spotmate-track-row:hover {\n  background-color: var(--spotmate-row-hover);\n}\n\n.spotmate-checkbox-container {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  min-width: 44px;\n  cursor: pointer;\n}\n\n.spotmate-checkbox-container input[type=\"checkbox\"] {\n  width: 20px;\n  height: 20px;\n  cursor: pointer;\n  accent-color: var(--spotmate-accent);\n}\n\n.spotmate-track-name {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--spotmate-text);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.spotmate-track-status {\n  font-size: 0.8125rem;\n  color: var(--spotmate-subtext);\n}\n\n.spotmate-track-status[data-status=\"success\"] {\n  color: var(--spotmate-accent);\n  font-weight: 600;\n}\n\n.spotmate-track-status[data-status=\"failed\"] {\n  color: var(--spotmate-danger);\n  font-weight: 600;\n}\n\n.spotmate-track-row progress {\n  width: 100%;\n  height: 8px;\n  border-radius: 4px;\n  overflow: hidden;\n  appearance: none;\n  border: none;\n  background-color: #333333;\n}\n\n.spotmate-track-row progress::-webkit-progress-bar {\n  background-color: #333333;\n  border-radius: 4px;\n}\n\n.spotmate-track-row progress::-webkit-progress-value {\n  background-color: var(--spotmate-accent);\n  border-radius: 4px;\n}\n\n.spotmate-track-row progress::-moz-progress-bar {\n  background-color: var(--spotmate-accent);\n  border-radius: 4px;\n}\n\n.spotmate-live-region {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n\n/* Mobile responsive layout (< 768px) */\n@media (max-width: 767px) {\n  .spotmate-voluntary-panel,\n  .spotmate-download-panel {\n    padding: 0.75rem;\n    gap: 0.75rem;\n  }\n\n  .spotmate-panel-toolbar {\n    flex-direction: column;\n    align-items: stretch;\n  }\n\n  .spotmate-button,\n  .spotmate-voluntary-panel button,\n  .spotmate-download-panel button {\n    width: 100%;\n  }\n\n  .spotmate-track-row {\n    display: grid;\n    grid-template-columns: 44px 1fr;\n    grid-template-rows: auto auto auto;\n    gap: 0.5rem;\n    padding: 0.75rem;\n  }\n\n  .spotmate-checkbox-container {\n    grid-row: 1 / span 3;\n    grid-column: 1;\n    align-self: center;\n  }\n\n  .spotmate-track-name {\n    grid-column: 2;\n    grid-row: 1;\n  }\n\n  .spotmate-track-status {\n    grid-column: 2;\n    grid-row: 2;\n  }\n\n  .spotmate-track-row progress {\n    grid-column: 2;\n    grid-row: 3;\n  }\n\n  .spotmate-track-row .spotmate-button {\n    grid-column: 2;\n    margin-top: 0.5rem;\n  }\n}";

  function __injectStyles(doc) {
    if (!doc || typeof doc.createElement !== 'function') return;
    const id = 'spotmate-panel-styles';
    if (doc.querySelector && doc.querySelector('#' + id)) return;
    if (doc.head && typeof doc.head.appendChild === 'function') {
      const style = doc.createElement('style');
      style.id = id;
      style.textContent = PANEL_CSS;
      doc.head.appendChild(style);
    }
  }

  __modules['./policy.js'] = (() => {
    /**
     * @typedef {Readonly<{
     *   origin: 'https://spotmate.online',
     *   pathnames: readonly ['/en1', '/en1/']
     * }>} SpotmatePage
     */

    const SPOTMATE_PAGE = Object.freeze({
      origin: 'https://spotmate.online',
      pathnames: Object.freeze(['/en1', '/en1/'])
    });

    /**
     * @typedef {Readonly<{
     *   maxTracks: 100,
     *   downloadGapMs: 1500,
     *   conversionGapMs: 2000,
     *   pollGapMs: 4500,
     *   pollLimit: 40
     * }>} BrowserLimits
     */

    const BROWSER_LIMITS = Object.freeze({
      maxTracks: 100,
      downloadGapMs: 1500,
      conversionGapMs: 2000,
      pollGapMs: 4500,
      pollLimit: 40
    });

    const isObjectLike = (value) => value !== null && typeof value === 'object';

    /**
     * @param {{ origin?: unknown, pathname?: unknown }|null|undefined} locationLike
     * @returns {boolean}
     */
    const isAllowedSpotmatePage = (locationLike) => (
      isObjectLike(locationLike)
      && locationLike.origin === SPOTMATE_PAGE.origin
      && SPOTMATE_PAGE.pathnames.includes(locationLike.pathname)
    );

    /**
     * @param {unknown} event
     * @returns {boolean}
     */
    const isTrustedUserEvent = (event) => isObjectLike(event) && event.isTrusted === true;

    /**
     * @param {unknown} value
     * @returns {boolean}
     */
    const isFinalHttpsUrl = (value) => {
      if (typeof value !== 'string') return false;
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    };

    const DOC_PAYLOAD_LAYERS = Object.freeze([
      (value) => value,
      (value) => value?.data,
      (value) => value?.result,
      (value) => value?.data?.data,
      (value) => value?.data?.result
    ]);

    const DOC_URL_KEYS = Object.freeze(['url', 'download_url', 'downloadUrl', 'downloadURL', 'download-url']);
    const DOC_TASK_ID_KEYS = Object.freeze(['task_id', 'taskId']);
    const TERMINAL_STATES = Object.freeze(['failed', 'error', 'expired', 'cancelled']);

    const getDocumentedPayloadLayers = (payload) => DOC_PAYLOAD_LAYERS
      .map((selector) => selector(payload))
      .filter(isObjectLike);

    const findTerminalPayloadDecision = (payload, status) => {
      for (const layer of getDocumentedPayloadLayers(payload)) {
        const terminalState = [layer.status, layer.state]
          .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
          .find((entry) => TERMINAL_STATES.includes(entry));
        if (terminalState) {
          return terminalState;
        }

        if (layer.error) {
          return 'payload-error';
        }
      }
      return null;
    };

    const readPayloadValue = (payload, keys) => {
      for (const layer of getDocumentedPayloadLayers(payload)) {
        for (const key of keys) {
          const candidate = layer[key];
          if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed.length > 0) return trimmed;
          }
        }
      }
      return null;
    };

    return { SPOTMATE_PAGE, BROWSER_LIMITS, isAllowedSpotmatePage, isTrustedUserEvent, isFinalHttpsUrl, getDocumentedPayloadLayers, findTerminalPayloadDecision, readPayloadValue };
  })();

  __modules['./payload-parser.js'] = (() => {
    const { isFinalHttpsUrl, findTerminalPayloadDecision, readPayloadValue } = __require('./policy.js');

    const makeTerminal = (status, error) => Object.freeze({
      kind: 'terminal',
      status,
      error
    });

    const makePoll = (taskId) => Object.freeze({
      kind: 'poll',
      taskId
    });

    const makeSuccess = (url) => Object.freeze({
      kind: 'success',
      url
    });

    const URL_KEYS = Object.freeze(['url', 'download_url', 'downloadUrl', 'downloadURL', 'download-url']);
    const TASK_ID_KEYS = Object.freeze(['task_id', 'taskId']);

    const trimHeaderType = (value) => (
      typeof value === 'string'
        ? value.split(';', 1)[0].trim().toLowerCase()
        : ''
    );

    const isJsonContentType = (responseMeta) => {
      if (!responseMeta || typeof responseMeta !== 'object') return false;
      const contentTypeHeader = responseMeta.headers?.get?.('content-type');
      const fallback = responseMeta.contentType || responseMeta.headers?.get?.('Content-Type');
      return trimHeaderType(contentTypeHeader ?? fallback) === 'application/json';
    };

    const statusFromMeta = (responseMeta) => (
      Number.isInteger(responseMeta?.status) ? responseMeta.status : null
    );

    const preflight = (responseMeta) => {
      if (responseMeta && responseMeta.error !== undefined) {
        return makeTerminal('network_error', 'network-error');
      }

      const status = statusFromMeta(responseMeta);

      if (!responseMeta || typeof responseMeta !== 'object') {
        return makeTerminal('schema_error', 'schema-missing');
      }

      if (responseMeta.ok === false || (Number.isInteger(status) && (status < 200 || status >= 300))) {
        return makeTerminal(status ?? 'unknown-status', 'http-non-ok');
      }

      if (!isJsonContentType(responseMeta)) {
        return makeTerminal(status ?? 'unknown-status', 'invalid-content-type');
      }

      return null;
    };

    const findTerminalInPayload = (payload, status) => {
      const message = findTerminalPayloadDecision(payload, status);
      return message ? makeTerminal(status, message) : null;
    };

    const findUrlFromPayload = (payload) => {
      const candidate = readPayloadValue(payload, URL_KEYS);
      return candidate && isFinalHttpsUrl(candidate) ? candidate : null;
    };

    const findTaskIdFromPayload = (payload) => readPayloadValue(payload, TASK_ID_KEYS);

    /**
     * @param {Readonly<{ok?: boolean, status?: number|null, contentType?: string}>} responseMeta
     * @param {Readonly<object>|undefined} payload
     * @returns {{kind:'success',url:string}|{kind:'poll',taskId:string}|{kind:'terminal',status:(number|string),error:string}}
     */
    const parsePayload = (responseMeta, payload) => {
      const terminal = preflight(responseMeta);
      const status = statusFromMeta(responseMeta) ?? 'unknown-status';

      if (terminal) return terminal;

      const terminalPayload = findTerminalInPayload(payload, status);
      if (terminalPayload) return terminalPayload;

      const url = findUrlFromPayload(payload);
      if (url) return makeSuccess(url);

      const taskId = findTaskIdFromPayload(payload);
      if (taskId) return makePoll(taskId);

      return makeTerminal(status, 'schema-missing');
    };

    const parseConversionPayload = (responseMeta, payload) => parsePayload(responseMeta, payload);
    const parsePollingPayload = (responseMeta, payload) => parsePayload(responseMeta, payload);

    return { parseConversionPayload, parsePollingPayload };
  })();

  __modules['./spotmate-page-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isAllowedSpotmatePage } = __require('./policy.js');

    const fail = (code) => {
      throw new Error(code);
    };

    const assertAllowed = (windowRef) => {
      if (!isAllowedSpotmatePage(windowRef?.location)) fail('unsupported-page');
    };

    const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

    const readTrackInputs = (documentRef) => {
      const container = documentRef?.querySelector?.('#tracks');
      const inputs = container?.querySelectorAll?.('input[type="hidden"]') || [];
      const seen = new Set();
      const tracks = [];

      for (const input of Array.from(inputs)) {
        const id = typeof input.name === 'string' && input.name.length > 0
          ? input.name
          : input.id;
        if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
        const value = typeof input.value === 'string' ? input.value : '';
        if (value.trim().length === 0) fail('empty-track-value');
        seen.add(id);
        tracks.push({ id, value });
      }

      if (tracks.length > BROWSER_LIMITS.maxTracks) fail('track-limit');
      return tracks;
    };

    const isSpotifyUrl = (value, URLImpl) => {
      if (typeof value !== 'string') return false;
      try {
        const url = new URLImpl(value);
        return url.protocol === 'https:' && url.hostname === 'open.spotify.com';
      } catch {
        return false;
      }
    };

    const createSpotmatePageAdapter = ({
      windowRef,
      documentRef,
      exposeLegacyGlobals
    } = {}) => {
      if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
      if (!documentRef || typeof documentRef !== 'object') throw new TypeError('documentRef is required');
      if (typeof windowRef.URL !== 'function') throw new TypeError('URLImpl is required');
      if (exposeLegacyGlobals !== undefined && typeof exposeLegacyGlobals !== 'boolean') {
        throw new TypeError('exposeLegacyGlobals must be boolean');
      }
      const legacyEnabled = exposeLegacyGlobals === true;

      const collectTrackInputs = () => {
        assertAllowed(windowRef);
        return readTrackInputs(documentRef);
      };

      const readCsrfToken = () => {
        assertAllowed(windowRef);
        const meta = documentRef?.querySelector?.('meta[name="csrf-token"]');
        const value = meta?.getAttribute?.('content') ?? meta?.content;
        return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
      };

      const submitExistingSpotifyForm = (url) => {
        assertAllowed(windowRef);
        if (!isSpotifyUrl(url, windowRef.URL)) fail('invalid-spotify-url');
        const input = documentRef?.querySelector?.('#trackUrl');
        const form = input?.form;
        const formElement = windowRef?.HTMLFormElement;
        const requestSubmit = formElement?.prototype?.requestSubmit;
        if (!input || !form || typeof requestSubmit !== 'function') fail('spotify-form-missing');
        input.value = url;
        requestSubmit.call(form);
      };

      const publishLegacyConversionResults = (results) => {
        assertAllowed(windowRef);
        if (legacyEnabled) windowRef.fetchResults = results;
      };

      const waitForTrackInputs = async (signal) => {
        assertAllowed(windowRef);
        if (signal?.aborted) return Promise.reject(abortError());
        const initial = collectTrackInputs();
        if (initial.length > 0) return Promise.resolve(initial);

        const MutationObserverImpl = windowRef?.MutationObserver;
        if (typeof MutationObserverImpl !== 'function') return Promise.reject(new Error('mutation-observer-missing'));
        const container = documentRef?.querySelector?.('#tracks') || documentRef?.body;
        if (!container) return Promise.reject(new Error('tracks-container-missing'));

        return new Promise((resolve, reject) => {
          let settled = false;
          let observer;
          const cleanup = () => {
            if (observer) observer.disconnect();
            signal?.removeEventListener?.('abort', onAbort);
          };
          const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            callback(value);
          };
          const onAbort = () => finish(reject, abortError());
          const onMutation = () => {
            try {
              const tracks = collectTrackInputs();
              if (tracks.length > 0) finish(resolve, tracks);
            } catch (error) {
              finish(reject, error);
            }
          };

          observer = new MutationObserverImpl(onMutation);
          observer.observe(container, { childList: true, subtree: true });
          signal?.addEventListener?.('abort', onAbort, { once: true });
          if (signal?.aborted) onAbort();
        });
      };

      const adapter = {
        collectTrackInputs,
        readCsrfToken,
        submitExistingSpotifyForm,
        waitForTrackInputs,
        publishLegacyConversionResults
      };
      return Object.freeze(adapter);
    };

    return { createSpotmatePageAdapter };
  })();

  __modules['./spotmate-api-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isAllowedSpotmatePage } = __require('./policy.js');
    const { parseConversionPayload, parsePollingPayload } = __require('./payload-parser.js');

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

    return { createSpotmateApiAdapter };
  })();

  __modules['./conversion-session.js'] = (() => {
    const { BROWSER_LIMITS } = __require('./policy.js');

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
      sleep
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
              let result = await apiAdapter.convertTrack(track, operationController.signal);
              if (operationController.signal.aborted) {
                append(track, cancelledResult());
                break;
              }
              if (result?.kind === 'poll') {
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

    return { createConversionSession };
  })();

  __modules['./download-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isFinalHttpsUrl, isTrustedUserEvent } = __require('./policy.js');

    const PANEL_ID = 'spotmate-download-panel';

    const createDownloadAdapter = ({ documentRef, windowRef, exposeLegacyGlobals = false } = {}) => {
      if (!documentRef || typeof documentRef.createElement !== 'function' || !documentRef.body) {
        throw new TypeError('documentRef is required');
      }
      if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
      if (typeof windowRef.URL !== 'function') throw new TypeError('URLImpl is required');
      if (typeof windowRef.setTimeout !== 'function') throw new TypeError('setTimeoutImpl is required');
      if (typeof windowRef.clearTimeout !== 'function') throw new TypeError('clearTimeoutImpl is required');
      if (typeof exposeLegacyGlobals !== 'boolean') throw new TypeError('exposeLegacyGlobals must be boolean');

      let panel = null;
      let items = [];

      const clear = () => {
        const existing = documentRef.getElementById?.(PANEL_ID)
          ?? documentRef.querySelector?.('#' + PANEL_ID);
        existing?.remove?.();
        panel?.remove?.();
        panel = null;
        items = [];
        if (exposeLegacyGlobals) delete windowRef.downloadUrls;
      };

      const sleep = (delay) => new Promise((resolve) => {
        windowRef.setTimeout(resolve, delay);
      });

      const trigger = (item, event) => {
        if (!isTrustedUserEvent(event) || !item || !isFinalHttpsUrl(item.url)) return;
        const anchor = documentRef.createElement('a');
        anchor.href = item.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      };

      const downloadTrack = (item, event) => {
        if (!isTrustedUserEvent(event)) return;
        if (exposeLegacyGlobals) windowRef.downloadUrls = items.map(({ url }) => url);
        trigger(item, event);
      };

      const downloadAll = async (event) => {
        if (!isTrustedUserEvent(event)) return;
        if (exposeLegacyGlobals) windowRef.downloadUrls = items.map(({ url }) => url);
        for (let index = 0; index < items.length; index += 1) {
          if (index > 0) await sleep(BROWSER_LIMITS.downloadGapMs);
          trigger(items[index], event);
        }
      };

      const render = (results) => {
        clear();
        const successful = [];
        for (const [index, result] of (Array.isArray(results) ? results : []).entries()) {
          const url = result?.url;
          if ((result?.kind === 'success' || result?.success === true) && isFinalHttpsUrl(url)) {
            successful.push({
              id: typeof result.id === 'string' && result.id.length > 0 ? result.id : `track-${index + 1}`,
              url
            });
          }
        }
        items = successful;
        if (successful.length === 0) return 0;

        panel = documentRef.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'spotmate-download-panel';

        const allButton = documentRef.createElement('button');
        allButton.type = 'button';
        allButton.textContent = 'Download all';
        allButton.addEventListener('click', async (event) => {
          if (!isTrustedUserEvent(event)) return;
          allButton.disabled = true;
          try {
            await downloadAll(event);
          } finally {
            allButton.disabled = false;
          }
        });
        panel.appendChild(allButton);

        for (const item of successful) {
          const button = documentRef.createElement('button');
          button.type = 'button';
          button.textContent = `Download ${item.id}`;
          button.setAttribute('data-track-id', item.id);
          button.addEventListener('click', (event) => downloadTrack(item, event));
          panel.appendChild(button);
        }
        documentRef.body.appendChild(panel);
        return successful.length;
      };

      const adapter = { clear, render, downloadTrack, downloadAll };
      Object.defineProperty(adapter, 'panel', { enumerable: true, get: () => panel });
      return Object.freeze(adapter);
    };

    return { PANEL_ID, createDownloadAdapter };
  })();

  __modules['./track-session.js'] = (() => {
    /**
     * @fileoverview Pure playlist session model for SpotMate v1.3.
     */

    const { BROWSER_LIMITS } = __require('./policy.js');

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

    return { TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession };
  })();

  __modules['./session-storage.js'] = (() => {
    /**
     * @fileoverview Versioned session storage manager for SpotMate v1.3.
     */

    const { TRACK_STATES, ERROR_CODES, toPersistedSession } = __require('./track-session.js');
    const { BROWSER_LIMITS } = __require('./policy.js');

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

    return { SESSION_STORAGE_KEY, saveSession, loadSession, clearSession };
  })();

  __modules['./conversion-runner.js'] = (() => {
    /**
     * @fileoverview Sequential conversion runner for SpotMate v1.3.
     */

    const { BROWSER_LIMITS, isFinalHttpsUrl } = __require('./policy.js');
    const { ERROR_CODES, getSelectedQueuedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession } = __require('./track-session.js');

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

    return { createConversionRunner };
  })();

  __modules['./playlist-view.js'] = (() => {
    const { isTrustedUserEvent, isFinalHttpsUrl } = __require('./policy.js');
    const { setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks } = __require('./track-session.js');

    const PANEL_ID = 'spotmate-voluntary-panel';
    const LIVE_REGION_ID = 'spotmate-v13-live-region';

    const LABELS = Object.freeze({
      load: 'Load Spotify URL',
      start: 'Start conversions',
      cancel: 'Cancel',
      downloadAll: 'Download all',
      selectAll: 'Select all',
      selectNone: 'Deselect all',
      resume: 'Resume',
      retryFailed: 'Retry failed'
    });

    const STATUS_LABELS = Object.freeze({
      queued: 'Queued',
      converting: 'Converting',
      polling: 'Checking status',
      success: 'Successful',
      failed: 'Failed',
      cancelled: 'Canceled'
    });

    /**
     * Mounts or updates the SpotMate v1.3 playlist panel.
     */
    const mountPlaylistPanel = ({
      host,
      session = null,
      runner = null,
      documentRef = null,
      document = null,
      announce = null,
      onDownloadTrack = null,
      onDownloadAll = null
    } = {}) => {
      const doc = documentRef || document || host?.ownerDocument || globalThis.document;
      if (!doc || typeof doc.createElement !== 'function') {
        throw new TypeError('documentRef is required');
      }

      const targetHost = host || doc.body;
      let currentSession = session || runner?.getSession?.() || null;
      let volatileDownloads = new Map();
      const previousTrackStates = new Map();
      let panel = null;
      let liveRegion = null;

      const getLiveRegion = () => {
        let region = doc.getElementById(LIVE_REGION_ID);
        if (!region) {
          region = doc.createElement('div');
          region.id = LIVE_REGION_ID;
          region.setAttribute('role', 'status');
          region.setAttribute('aria-live', 'polite');
          region.setAttribute('aria-atomic', 'true');
          region.className = 'spotmate-live-region';
          targetHost.appendChild(region);
        }
        return region;
      };

      const publishAnnouncement = (message) => {
        if (!message) return;
        const region = getLiveRegion();
        if (region) {
          region.textContent = message;
        }
        if (typeof announce === 'function') {
          announce(message);
        }
      };

      const syncStateAnnouncements = () => {
        if (!currentSession || !Array.isArray(currentSession.tracks)) return;
        const messages = [];
        for (const track of currentSession.tracks) {
          const prevState = previousTrackStates.get(track.id);
          if (prevState !== track.status) {
            previousTrackStates.set(track.id, track.status);
            if (prevState !== undefined || track.status !== 'queued') {
              const statusLabel = STATUS_LABELS[track.status] || track.status;
              messages.push(`Track ${track.id}: ${statusLabel.toLowerCase()}`);
            }
          }
        }
        if (messages.length > 0) {
          publishAnnouncement(messages.join('. '));
        }
      };

      const getActiveFocusKey = () => {
        const active = doc.activeElement;
        if (!active || !panel) return null;
        const action = active.getAttribute?.('data-action');
        const trackId = active.getAttribute?.('data-track-id');
        const tagName = active.tagName;
        if (action || trackId) {
          return { action, trackId, tagName };
        }
        return null;
      };

      const restoreFocusKey = (key) => {
        if (!key || !panel) return;
        if (key.action) {
          const match = panel.querySelector(`[data-action="${key.action}"]`);
          if (match && typeof match.focus === 'function') {
            match.focus();
            return;
          }
        }
        if (key.trackId) {
          const elements = panel.querySelectorAll ? panel.querySelectorAll('[data-track-id]') : [];
          if (key.tagName) {
            const expectedTag = String(key.tagName).toUpperCase();
            for (const el of elements) {
              if (
                el.tagName === expectedTag &&
                el.getAttribute?.('data-track-id') === key.trackId &&
                typeof el.focus === 'function'
              ) {
                el.focus();
                return;
              }
            }
          }
          for (const el of elements) {
            if (el.getAttribute?.('data-track-id') === key.trackId && typeof el.focus === 'function') {
              el.focus();
              return;
            }
          }
        }
      };

      const destroy = () => {
        if (panel) {
          panel.remove?.();
          panel = null;
        }
        const region = doc.getElementById(LIVE_REGION_ID);
        if (region) {
          region.remove?.();
          liveRegion = null;
        }
      };

      const invokeTrusted = (handler, event) => {
        if (!isTrustedUserEvent(event) || typeof handler !== 'function') return undefined;
        return handler(event);
      };

      const makeButton = ({ label, action, onClick, disabled = false, trackId = null }) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.className = `spotmate-button spotmate-button-${action}`;
        button.setAttribute('data-action', action);
        if (trackId) {
          button.setAttribute('data-track-id', trackId);
        }
        if (disabled) {
          button.disabled = true;
          button.setAttribute('disabled', 'true');
        }
        button.addEventListener('click', (event) => invokeTrusted(onClick, event));
        return button;
      };

      const updateSession = (newSession) => {
        currentSession = newSession;
        if (runner?.setSession) {
          runner.setSession(newSession);
        }
      };

      const render = () => {
        const focusKey = getActiveFocusKey();

        // Remove the previous panel, if present.
        const existing = doc.getElementById(PANEL_ID);
        if (existing) {
          existing.remove?.();
        }

        panel = doc.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'spotmate-voluntary-panel';

        liveRegion = getLiveRegion();

        const isRunning = currentSession?.tracks?.some(
          (t) => t.status === 'converting' || t.status === 'polling'
        );
        const hasQueued = (getSelectedQueuedTrackIds(currentSession) || []).length > 0;
        const hasFailed = (getFailedTrackIds(currentSession) || []).length > 0;

        // Toolbar and global actions.
        const toolbar = doc.createElement('div');
        toolbar.className = 'spotmate-panel-toolbar';

        toolbar.appendChild(
          makeButton({
            label: LABELS.selectAll,
            action: 'select-all',
            disabled: isRunning,
            onClick: () => {
              if (currentSession) {
                updateSession(setAllSelected(currentSession, true));
                render();
              }
            }
          })
        );

        toolbar.appendChild(
          makeButton({
            label: LABELS.selectNone,
            action: 'select-none',
            disabled: isRunning,
            onClick: () => {
              if (currentSession) {
                updateSession(setAllSelected(currentSession, false));
                render();
              }
            }
          })
        );

        toolbar.appendChild(
          makeButton({
            label: LABELS.start,
            action: 'start',
            disabled: isRunning || !hasQueued,
            onClick: async () => {
              if (runner?.startSelected) {
                const updated = await runner.startSelected();
                if (updated) currentSession = updated;
                render();
              }
            }
          })
        );

        toolbar.appendChild(
          makeButton({
            label: LABELS.cancel,
            action: 'cancel',
            disabled: !isRunning,
            onClick: () => {
              if (runner?.cancel) {
                runner.cancel();
                if (runner?.getSession) currentSession = runner.getSession();
                render();
              }
            }
          })
        );

        toolbar.appendChild(
          makeButton({
            label: LABELS.resume,
            action: 'resume',
            disabled: isRunning || !hasQueued,
            onClick: async () => {
              if (runner?.resumeQueued) {
                const updated = await runner.resumeQueued();
                if (updated) currentSession = updated;
                render();
              }
            }
          })
        );

        if (hasFailed) {
          toolbar.appendChild(
            makeButton({
              label: LABELS.retryFailed,
              action: 'retry-failed',
              disabled: isRunning,
              onClick: () => {
                if (runner?.retryFailedTracks) {
                  const updated = runner.retryFailedTracks();
                  if (updated) currentSession = updated;
                } else if (currentSession) {
                  updateSession(requeueFailedTracks(currentSession));
                }
                render();
              }
            })
          );
        }

        if (volatileDownloads.size > 0 || typeof onDownloadAll === 'function') {
          toolbar.appendChild(
            makeButton({
              label: LABELS.downloadAll,
              action: 'download-all',
              disabled: isRunning,
              onClick: async (event) => {
                if (typeof onDownloadAll === 'function') {
                  await onDownloadAll(event);
                }
              }
            })
          );
        }

        panel.appendChild(toolbar);

        // Track list.
        if (currentSession && Array.isArray(currentSession.tracks) && currentSession.tracks.length > 0) {
          const trackList = doc.createElement('div');
          trackList.className = 'spotmate-track-list';

          for (const track of currentSession.tracks) {
            const row = doc.createElement('div');
            row.className = `spotmate-track-row spotmate-track-${track.status}`;
            row.setAttribute('data-track-id', track.id);

            // Track selection checkbox.
            const checkboxLabel = doc.createElement('label');
            checkboxLabel.className = 'spotmate-checkbox-container';

            const checkbox = doc.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('data-track-id', track.id);
            checkbox.setAttribute('aria-label', `Select track ${track.id}`);
            checkbox.checked = Boolean(track.selected);
            if (track.selected) {
              checkbox.setAttribute('checked', 'true');
            }
            if (isRunning) {
              checkbox.disabled = true;
              checkbox.setAttribute('disabled', 'true');
            }

            checkbox.addEventListener('change', (event) => {
              if (!isTrustedUserEvent(event)) {
                event.preventDefault?.();
                checkbox.checked = Boolean(track.selected);
                return;
              }
              currentSession = setTrackSelected(currentSession, track.id, checkbox.checked);
              render();
            });

            checkboxLabel.appendChild(checkbox);
            row.appendChild(checkboxLabel);

            // Track name.
            const nameSpan = doc.createElement('span');
            nameSpan.className = 'spotmate-track-name';
            nameSpan.textContent = `Track ${track.id}`;
            row.appendChild(nameSpan);

            // Text status.
            const statusSpan = doc.createElement('span');
            statusSpan.className = 'spotmate-track-status';
            statusSpan.setAttribute('data-status', track.status);
            statusSpan.textContent = STATUS_LABELS[track.status] || track.status;
            row.appendChild(statusSpan);

            // Accessible progress bar.
            const progress = doc.createElement('progress');
            const progressVal = String(track.progressPercent || 0);
            progress.setAttribute('max', '100');
            progress.setAttribute('value', progressVal);
            progress.setAttribute('aria-label', `Progress for track ${track.id}`);
            progress.setAttribute('aria-valuemin', '0');
            progress.setAttribute('aria-valuemax', '100');
            progress.setAttribute('aria-valuenow', progressVal);
            progress.value = track.progressPercent || 0;
            row.appendChild(progress);

            // Show an individual download button when a successful result has a URL.
            const volatileUrl = volatileDownloads.get(track.id);
            if (track.status === 'success' && (volatileUrl || typeof onDownloadTrack === 'function')) {
              const downloadBtn = makeButton({
                label: `Download ${track.id}`,
                action: 'download-track',
                trackId: track.id,
                onClick: async (event) => {
                  if (typeof onDownloadTrack === 'function') {
                    await onDownloadTrack(track.id, event);
                  } else if (volatileUrl && isFinalHttpsUrl(volatileUrl)) {
                    const a = doc.createElement('a');
                    a.href = volatileUrl;
                    a.download = `${track.id}.mp3`;
                    a.style.display = 'none';
                    targetHost.appendChild(a);
                    a.click();
                    a.remove();
                  }
                }
              });
              row.appendChild(downloadBtn);
            }

            trackList.appendChild(row);
          }

          panel.appendChild(trackList);
        }

        targetHost.appendChild(panel);
        syncStateAnnouncements();
        restoreFocusKey(focusKey);

        return panel;
      };

      const getSession = () => currentSession;

      const setSession = (newSession) => {
        currentSession = newSession;
        if (currentSession && Array.isArray(currentSession.tracks)) {
          const activeIds = new Set(currentSession.tracks.map((t) => t.id));
          for (const id of previousTrackStates.keys()) {
            if (!activeIds.has(id)) {
              previousTrackStates.delete(id);
            }
          }
          for (const id of volatileDownloads.keys()) {
            if (!activeIds.has(id)) {
              volatileDownloads.delete(id);
            }
          }
        } else {
          previousTrackStates.clear();
          volatileDownloads.clear();
        }
        return render();
      };

      const setVolatileUrl = (trackId, url) => {
        if (typeof trackId === 'string' && typeof url === 'string') {
          volatileDownloads.set(trackId, url);
          render();
        }
      };

      // Initial render
      render();

      const controller = {
        render,
        destroy,
        getSession,
        setSession,
        setVolatileUrl,
        announce: publishAnnouncement
      };

      Object.defineProperty(controller, 'panel', { enumerable: true, get: () => panel });
      Object.defineProperty(controller, 'liveRegion', { enumerable: true, get: () => liveRegion });

      return Object.freeze(controller);
    };

    /**
     * Legacy playlist view for v1.2 compatibility.
     */
    const createPlaylistView = ({
      documentRef,
      onLoad,
      onStart,
      onCancel,
      onDownloadTrack,
      onDownloadAll
    } = {}) => {
      if (!documentRef || typeof documentRef.createElement !== 'function' || !documentRef.body) {
        throw new TypeError('documentRef is required');
      }

      let panel = null;
      let downloadItems = [];
      let currentStatus = '';

      const remove = () => {
        panel?.remove?.();
        panel = null;
      };

      const invoke = (callback, event, value) => {
        if (!isTrustedUserEvent(event) || typeof callback !== 'function') return undefined;
        return callback(value, event);
      };

      const makeButton = (label, callback, value) => {
        const button = documentRef.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', (event) => invoke(callback, event, value));
        return button;
      };

      const render = () => {
        remove();
        panel = documentRef.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'spotmate-voluntary-panel';
        panel.appendChild(makeButton(LABELS.load, onLoad));
        panel.appendChild(makeButton(LABELS.start, onStart));
        panel.appendChild(makeButton(LABELS.cancel, onCancel));

        const allButton = makeButton(LABELS.downloadAll, async (_value, event) => {
          if (!isTrustedUserEvent(event) || typeof onDownloadAll !== 'function') return;
          allButton.disabled = true;
          try {
            await onDownloadAll(event);
          } finally {
            allButton.disabled = false;
          }
        });
        panel.appendChild(allButton);

        for (const item of downloadItems) {
          const id = typeof item?.id === 'string' && item.id.length > 0 ? item.id : 'track';
          panel.appendChild(makeButton(`Download ${id}`, onDownloadTrack, item));
        }

        if (currentStatus) {
          const statusElement = documentRef.createElement('span');
          statusElement.className = 'spotmate-status';
          statusElement.textContent = currentStatus;
          panel.appendChild(statusElement);
        }

        documentRef.body.appendChild(panel);
        return panel;
      };

      const setDownloadItems = (items) => {
        downloadItems = Array.isArray(items) ? items.slice() : [];
        return render();
      };

      const setStatus = (status) => {
        currentStatus = typeof status === 'string' ? status : '';
        return render();
      };

      const mount = () => render();

      const view = { mount, render, remove, setDownloadItems, setStatus };
      Object.defineProperty(view, 'panel', { enumerable: true, get: () => panel });
      Object.defineProperty(view, 'status', { enumerable: true, get: () => currentStatus });
      return Object.freeze(view);
    };

    return { PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS, mountPlaylistPanel, createPlaylistView };
  })();

  __modules['./index.js'] = (() => {
    const { createConversionRunner } = __require('./conversion-runner.js');
    const { createConversionSession } = __require('./conversion-session.js');
    const { createDownloadAdapter } = __require('./download-adapter.js');
    const { mountPlaylistPanel, createPlaylistView, PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS } = __require('./playlist-view.js');
    const { createSpotmateApiAdapter } = __require('./spotmate-api-adapter.js');
    const { createSpotmatePageAdapter } = __require('./spotmate-page-adapter.js');
    const { isAllowedSpotmatePage } = __require('./policy.js');
    const { TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession } = __require('./track-session.js');
    const { SESSION_STORAGE_KEY, saveSession, loadSession, clearSession } = __require('./session-storage.js');

    const createBrowserCore = ({
      windowRef,
      documentRef,
      fetchImpl,
      URLImpl,
      AbortControllerImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      exposeConversionGlobals = false,
      exposeDownloadGlobals = false
    } = {}) => {
      if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
      if (!documentRef || typeof documentRef !== 'object') throw new TypeError('documentRef is required');
      if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
      if (typeof URLImpl !== 'function') throw new TypeError('URLImpl is required');
      if (typeof AbortControllerImpl !== 'function') throw new TypeError('AbortControllerImpl is required');
      if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
      if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');

      let loadController = null;
      const supported = isAllowedSpotmatePage(windowRef.location);
      if (supported && documentRef) __injectStyles(documentRef);
      if (!supported) return undefined;

      const pageAdapter = createSpotmatePageAdapter({
        windowRef,
        documentRef,
        exposeLegacyGlobals: exposeConversionGlobals
      });
      const apiAdapter = createSpotmateApiAdapter({
        fetchImpl,
        location: windowRef.location,
        readCsrfToken: pageAdapter.readCsrfToken,
        URLImpl,
        setTimeoutImpl,
        clearTimeoutImpl
      });
      const session = createConversionSession({
        pageAdapter,
        apiAdapter,
        exposeLegacyGlobals: exposeConversionGlobals,
        AbortControllerImpl,
        setTimeoutImpl,
        clearTimeoutImpl
      });
      const downloadAdapter = createDownloadAdapter({
        documentRef,
        windowRef,
        exposeLegacyGlobals: exposeDownloadGlobals
      });

      let view = null;

      const onLoad = async () => {
        if (loadController) return;
        loadController = new AbortControllerImpl();
        try {
          view?.setStatus?.('');
          const input = documentRef.querySelector?.('#trackUrl');
          pageAdapter.submitExistingSpotifyForm(input?.value);
          await pageAdapter.waitForTrackInputs(loadController.signal);
        } catch (error) {
          if (error?.name !== 'AbortError') throw error;
        } finally {
          loadController = null;
        }
      };

      const onStart = async () => {
        try {
          view?.setStatus?.('');
          const tracks = pageAdapter.collectTrackInputs();
          const results = await session.run(tracks);
          const downloadResults = results.map((result, index) => ({
            id: tracks[index]?.id,
            ...result
          }));
          downloadAdapter.render(downloadResults);
          return undefined;
        } catch (error) {
          const isKnownInputError = error?.message === 'empty-track-value' || error?.message === 'track-limit';
          const status = isKnownInputError ? 'input_error' : 'error';
          const errorMessage = isKnownInputError ? error.message : 'unexpected-error';
          const result = Object.freeze({
            id: null,
            status,
            success: false,
            pending: false,
            url: null,
            error: errorMessage
          });
          if (exposeConversionGlobals) pageAdapter.publishLegacyConversionResults([result]);
          downloadAdapter.render([]);
          view?.setStatus?.(errorMessage);
          return undefined;
        }
      };

      const onCancel = () => {
        loadController?.abort();
        session.cancel();
      };

      view = createPlaylistView({
        documentRef,
        onLoad,
        onStart,
        onCancel,
        onDownloadTrack: (item, event) => downloadAdapter.downloadTrack(item, event),
        onDownloadAll: (event) => downloadAdapter.downloadAll(event)
      });

      const mount = () => {
        view.mount();
        return runtime;
      };
      const renderDownloads = (results) => downloadAdapter.render(results);
      const runtime = Object.freeze({ mount, view, session, pageAdapter, apiAdapter, downloadAdapter, renderDownloads });
      mount();
      return runtime;
    };

    return { isAllowedSpotmatePage, createBrowserCore, createConversionRunner, createConversionSession, createDownloadAdapter, createPlaylistView, mountPlaylistPanel, PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS, createSpotmateApiAdapter, createSpotmatePageAdapter, TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession, SESSION_STORAGE_KEY, saveSession, loadSession, clearSession };
  })();

  __modules['./entry.js'] = (() => {
    const { createBrowserCore } = __require('./index.js');

    function bootstrapExtensionContent({
      windowRef = globalThis.window,
      documentRef = windowRef?.document ?? globalThis.document,
      URLImpl = windowRef?.URL ?? globalThis.URL,
      AbortControllerImpl = windowRef?.AbortController ?? globalThis.AbortController,
      setTimeoutImpl = windowRef?.setTimeout ?? globalThis.setTimeout,
      clearTimeoutImpl = windowRef?.clearTimeout ?? globalThis.clearTimeout,
      fetchImpl = windowRef?.fetch ?? globalThis.fetch
    } = {}) {
      return createBrowserCore({
        windowRef,
        documentRef,
        URLImpl,
        AbortControllerImpl,
        setTimeoutImpl,
        clearTimeoutImpl,
        fetchImpl,
        exposeConversionGlobals: false,
        exposeDownloadGlobals: false
      });
    }

    function mount(options = {}) {
      return bootstrapExtensionContent(options);
    }

    return { bootstrapExtensionContent, mount };
  })();

  const { mount } = __require('./entry.js');
  mount();
})();
