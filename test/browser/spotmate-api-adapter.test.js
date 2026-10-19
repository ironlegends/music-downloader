import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotmateApiAdapter } from '../../src/browser/spotmate-api-adapter.js';

const location = { origin: 'https://spotmate.online', pathname: '/en1/' };
const csrf = 'fixture-csrf-token';

function response(payload, { status = 200, contentType = 'application/json' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    async json() { return payload; }
  };
}

function timerLog() {
  const delays = [];
  return {
    delays,
    setTimeoutImpl(callback, delay) {
      delays.push(delay);
      callback();
      return Symbol('timer');
    },
    clearTimeoutImpl() {}
  };
}

test('convertTrack sends one POST /convert request with a body limited to urls', async () => {
  const calls = [];
  let csrfReads = 0;
  const adapter = createSpotmateApiAdapter({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ url: 'https://rapid.dlapi.app/download/track' });
    },
    location,
    readCsrfToken: () => { csrfReads += 1; return csrf; },
    URLImpl: URL,
    ...timerLog()
  });

  const result = await adapter.convertTrack({ id: 'one', value: 'https://open.spotify.com/track/one' }, new AbortController().signal);
  assert.deepEqual(result, { kind: 'success', url: 'https://rapid.dlapi.app/download/track' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://spotmate.online/convert');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(calls[0].options.body), { urls: 'https://open.spotify.com/track/one' });
  assert.deepEqual(Object.keys(JSON.parse(calls[0].options.body)), ['urls']);
  assert.equal(calls[0].options.headers['X-CSRF-TOKEN'], csrf);
  assert.equal(csrfReads, 1);
  assert.equal(calls.some((call) => call.url.includes('/api/queue/start')), false);
});

test('CSRF is read for each request and a direct HTTPS result skips polling', async () => {
  const calls = [];
  let csrfRead = 0;
  const adapter = createSpotmateApiAdapter({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? response({ task_id: 'task/with slash' })
        : response({ url: 'https://rapid.dlapi.app/download/polled' });
    },
    location,
    readCsrfToken: () => `csrf-${++csrfRead}`,
    URLImpl: URL,
    ...timerLog()
  });
  const result = await adapter.convertTrack({ id: 'two', value: 'track-value' }, new AbortController().signal);
  assert.deepEqual(result, { kind: 'poll', taskId: 'task/with slash' });
  assert.equal(calls.length, 1);
  const poll = await adapter.pollTask(result.taskId, new AbortController().signal);
  assert.equal(poll.kind, 'success');
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /\/tasks\/task%2Fwith%20slash$/);
  assert.equal(calls[0].options.headers['X-CSRF-TOKEN'], 'csrf-1');
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-2');
});

test('pollTask waits 4500 ms before each request and stops after 40 polls without retry', async () => {
  const calls = [];
  const timers = timerLog();
  const adapter = createSpotmateApiAdapter({
    fetchImpl: async (url) => {
      calls.push(url);
      return response({ taskId: 'still-running' });
    },
    location,
    readCsrfToken: () => undefined,
    URLImpl: URL,
    ...timers
  });
  const result = await adapter.pollTask('task-id', new AbortController().signal);
  assert.deepEqual(result, { kind: 'terminal', status: 'poll_limit', error: 'poll-limit' });
  assert.equal(calls.length, 40);
  assert.deepEqual(timers.delays, Array(40).fill(4500));
});

test('HTTP, network, content, and payload errors are terminal without another attempt', async () => {
  for (const fixture of [
    { fetch: async () => response({}, { status: 503, contentType: 'text/plain' }), error: 'http-non-ok' },
    { fetch: async () => { throw new Error('network'); }, error: 'network-error' },
    { fetch: async () => response({ url: 'https://rapid.dlapi.app/audio' }, { contentType: 'text/plain' }), error: 'invalid-content-type' },
    { fetch: async () => response({ error: true }), error: 'payload-error' }
  ]) {
    let calls = 0;
    const adapter = createSpotmateApiAdapter({
      fetchImpl: async (...args) => { calls += 1; return fixture.fetch(...args); },
      location,
      readCsrfToken: () => undefined,
      URLImpl: URL,
      ...timerLog()
    });
    const result = await adapter.convertTrack({ id: 'bad', value: 'value' }, new AbortController().signal);
    assert.equal(result.kind, 'terminal');
    assert.equal(result.error, fixture.error);
    assert.equal(calls, 1);
  }
});

test('each API operation fails closed outside an authorized page and does not expose CSRF', async () => {
  const calls = [];
  const adapter = createSpotmateApiAdapter({
    fetchImpl: async (...args) => { calls.push(args); return response({ task_id: 'x' }); },
    location: { origin: 'https://spotmate.online', pathname: '/wrong' },
    readCsrfToken: () => csrf,
    URLImpl: URL,
    ...timerLog()
  });
  await assert.rejects(adapter.convertTrack({ id: 'x', value: 'value' }, new AbortController().signal), /unsupported-page/);
  await assert.rejects(adapter.pollTask('x', new AbortController().signal), /unsupported-page/);
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(adapter).includes(csrf), false);
});

test('the API factory requires an injected URLImpl', () => {
  assert.throws(() => createSpotmateApiAdapter({
    fetchImpl: async () => response({}),
    location,
    setTimeoutImpl: () => 1,
    clearTimeoutImpl: () => {}
  }), /URLImpl/);
});
