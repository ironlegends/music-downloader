import {
  isFinalHttpsUrl,
  findTerminalPayloadDecision,
  readPayloadValue
} from './policy.js';

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

export { parseConversionPayload, parsePollingPayload };
