import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConversionPayload, parsePollingPayload } from '../../src/browser/payload-parser.js';

const buildHttps = (path) => ['https:', '//', 'rapid', '.', 'dlapi', '.', 'app', '/', path].join('');
const buildToken = () => ['ta', 'sk_', 'demo', '_', '000'].join('');
const buildTaskId = () => ['t', 'a', 's', 'k', '-', '9', '9'].join('');
const jsonContent = 'application/json; charset=utf-8';

const conversionMeta = (overrides = {}) => Object.freeze({
  ok: true,
  status: 200,
  ...overrides
});

const pollingMeta = (overrides = {}) => Object.freeze({
  ok: true,
  status: 200,
  ...overrides
});

const assertNoSecrets = (result) => {
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'cookie'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'token'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'header'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'rawBody'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'body'), false);
};

test('parseConversionPayload accepts a valid direct URL in the top-level payload', () => {
  const url = buildHttps('download/track-direct');
  const result = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { url }
  );
  assert.equal(result.kind, 'success');
  assert.equal(result.url, url);
  assert.equal(Object.isFrozen(result), true);
  assertNoSecrets(result);
});

test('parseConversionPayload accepts an HTTPS URL in a nested object', () => {
  const url = buildHttps('download/track-nested');
  const result = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { data: { result: { downloadUrl: url } } }
  );
  assert.equal(result.kind, 'success');
  assert.equal(result.url, url);
});

test('parseConversionPayload accepts non-empty task_id and taskId values', () => {
  const taskFromSnake = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { task_id: buildTaskId() }
  );
  assert.equal(taskFromSnake.kind, 'poll');
  assert.equal(taskFromSnake.taskId, buildTaskId());
  assert.equal(Object.isFrozen(taskFromSnake), true);

  const taskFromCamel = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { taskId: ` ${buildTaskId()} ` }
  );
  assert.equal(taskFromCamel.kind, 'poll');
  assert.equal(taskFromCamel.taskId, buildTaskId());
});

test('parseConversionPayload rejects an empty task ID after trimming', () => {
  const result = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { task_id: '   ', taskId: '' }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error.includes('schema-missing') || result.error.includes('invalid-url'), true);
});

test('parseConversionPayload prioritizes a terminal state over a URL', () => {
  const url = buildHttps('download/track-terminal');
  const token = buildToken();
  const result = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { url, status: 'failed', message: `with-${token}`, task_id: buildTaskId() }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error.includes('failed'), true);
  assert.equal(result.error.includes(token), false);
});

test('parseConversionPayload prioritizes payload.error over a URL', () => {
  const token = buildToken();
  const url = buildHttps('download/track-error');
  const result = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    { error: true, message: `ko ${token}`, url }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error, 'payload-error');
  assert.equal(result.error.includes(token), false);
});

test('parseConversionPayload rejects non-JSON content without parsing the body', () => {
  const url = buildHttps('download/track-text');
  const result = parseConversionPayload(
    conversionMeta({ contentType: 'text/plain' }),
    { url }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error, 'invalid-content-type');
});

test('parseConversionPayload treats non-OK responses as terminal', () => {
  const result = parseConversionPayload(
    conversionMeta({ ok: false, status: 429, contentType: 'text/plain' }),
    { url: buildHttps('download/track-should-not-parse') }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 429);
  assert.equal(result.error, 'http-non-ok');
});

test('parseConversionPayload rejects malformed structures and non-HTTPS URLs', () => {
  const url = ['http:', '//rapid.dlapi.app/download/track-http'].join('');
  assert.equal(parseConversionPayload(conversionMeta({ contentType: 'application/json' }), {}).kind, 'terminal');
  const missingResult = parseConversionPayload(conversionMeta({ contentType: 'application/json' }), { url });
  assert.equal(missingResult.kind, 'terminal');
  assert.equal(missingResult.status, 200);
  assert.equal(missingResult.error.includes('schema-missing') || missingResult.error.includes('invalid-url'), true);
});

test('parseConversionPayload detects network errors first', () => {
  const result = parseConversionPayload(
    conversionMeta({ ok: true, status: undefined, error: new Error('network') }),
    { url: buildHttps('download/track-network') }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 'network_error');
  assert.equal(result.error, 'network-error');
});

test('parsePollingPayload accepts a direct final HTTPS URL', () => {
  const url = buildHttps('download/poll-direct');
  const result = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    { data: { url } }
  );
  assert.equal(result.kind, 'success');
  assert.equal(result.url, url);
  assert.equal(Object.isFrozen(result), true);
  assertNoSecrets(result);
});

test('parsePollingPayload accepts task_id/taskId for continued polling', () => {
  const pollSnake = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    { task_id: buildTaskId() }
  );
  assert.equal(pollSnake.kind, 'poll');
  assert.equal(pollSnake.taskId, buildTaskId());

  const pollCamel = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    { taskId: ` ${buildTaskId()} ` }
  );
  assert.equal(pollCamel.kind, 'poll');
  assert.equal(pollCamel.taskId, buildTaskId());
});

test('parsePollingPayload prioritizes a terminal status or state over a URL', () => {
  const url = buildHttps('download/poll-terminal');
  const result = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    { url, state: 'error', message: 'failed state' }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error.includes('error'), true);
});

test('parsePollingPayload rejects non-JSON content and ends the operation', () => {
  const result = parsePollingPayload(
    pollingMeta({ contentType: 'application/xml' }),
    { state: 'running', taskId: buildTaskId() }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error, 'invalid-content-type');
});

test('parsePollingPayload rejects a response with no usable structure', () => {
  const result = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    { token: buildToken(), state: 'queued' }
  );
  assert.equal(result.kind, 'terminal');
  assert.equal(result.status, 200);
  assert.equal(result.error, 'schema-missing');
});

test('parseConversionPayload and parsePollingPayload do not freeze the payload or its documented layers', () => {
  const payload = {
    status: 'running',
    data: {
      result: {
        status: 'queued',
        downloadUrl: buildHttps('download/mutability')
      },
      data: {
        result: {
          status: 'running',
          url: buildHttps('download/nested')
        }
      }
    },
    result: {
      result: {
        status: 'queued'
      },
      task_id: buildTaskId()
    },
    task_id: buildTaskId()
  };

  assert.equal(Object.isFrozen(payload), false);
  assert.equal(Object.isFrozen(payload.data), false);
  assert.equal(Object.isFrozen(payload.data.data), false);
  assert.equal(Object.isFrozen(payload.data.result), false);

  const conversionResult = parseConversionPayload(
    conversionMeta({ contentType: jsonContent }),
    payload
  );
  const pollingResult = parsePollingPayload(
    pollingMeta({ contentType: jsonContent }),
    payload
  );

  assert.equal(Object.isFrozen(payload), false);
  assert.equal(Object.isFrozen(payload.data), false);
  assert.equal(Object.isFrozen(payload.data.data), false);
  assert.equal(Object.isFrozen(payload.data.result), false);

  assert.equal(conversionResult.kind, 'success');
  assert.equal(pollingResult.kind, 'success');

  payload.mutableCheck = { touched: true };
  payload.data.mutableLayer = { marker: 'parser-did-not-lock-this' };
  payload.data.result.mutableLayer = 'added';
  payload.data.data.result.mutableLayer = 42;
  assert.equal(payload.mutableCheck.touched, true);
  assert.equal(payload.data.mutableLayer.marker, 'parser-did-not-lock-this');
  assert.equal(payload.data.result.mutableLayer, 'added');
  assert.equal(payload.data.data.result.mutableLayer, 42);
});

test('parser results do not include retry fields', () => {
  const samples = [
    parseConversionPayload(conversionMeta({ contentType: jsonContent }), { url: buildHttps('download/frozen') }),
    parseConversionPayload(conversionMeta({}), { task_id: buildTaskId() }),
    parseConversionPayload(conversionMeta({ ok: false, status: 500 }), {}),
    parsePollingPayload(pollingMeta(), { task_id: buildTaskId() }),
    parsePollingPayload(pollingMeta({ ok: false, status: 503 }), { url: buildHttps('download/poll') })
  ];
  for (const sample of samples) {
    assert.equal(Object.isFrozen(sample), true);
    assert.equal(Object.prototype.hasOwnProperty.call(sample, 'retry'), false);
    assert.equal(Array.isArray(sample), false);
  }
});
