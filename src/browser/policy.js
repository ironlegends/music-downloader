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

export {
  SPOTMATE_PAGE,
  BROWSER_LIMITS,
  isAllowedSpotmatePage,
  isTrustedUserEvent,
  isFinalHttpsUrl,
  getDocumentedPayloadLayers,
  findTerminalPayloadDecision,
  readPayloadValue
};
