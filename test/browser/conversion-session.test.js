import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversionSession } from '../../src/browser/conversion-session.js';

function immediateSleep(log) {
  return (delay, signal) => {
    log.push(delay);
    if (signal?.aborted) return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    return Promise.resolve();
  };
}

function sessionDeps(overrides = {}) {
  return {
    pageAdapter: { publishLegacyConversionResults() {} },
    exposeLegacyGlobals: false,
    AbortControllerImpl: AbortController,
    setTimeoutImpl: (callback) => { callback(); return 1; },
    clearTimeoutImpl: () => {},
    ...overrides
  };
}

test('run converts tracks in order, one at a time, with 2000 ms between starts', async () => {
  const starts = [];
  const sleeps = [];
  const session = createConversionSession(sessionDeps({
    apiAdapter: {
      async convertTrack(track) {
        starts.push(track.id);
        return { kind: 'success', url: `https://rapid.dlapi.app/${track.id}` };
      }
    },
    sleep: immediateSleep(sleeps)
  }));
  const results = await session.run([{ id: 'one', value: 'one' }, { id: 'two', value: 'two' }], new AbortController().signal);
  assert.deepEqual(starts, ['one', 'two']);
  assert.deepEqual(sleeps, [2000]);
  assert.deepEqual(results, [
    { kind: 'success', url: 'https://rapid.dlapi.app/one' },
    { kind: 'success', url: 'https://rapid.dlapi.app/two' }
  ]);
});

test('run uses pollTask for task_id, preserves terminal states, and does not retry', async () => {
  const calls = [];
  const session = createConversionSession(sessionDeps({
    apiAdapter: {
      async convertTrack(track) {
        calls.push(`convert:${track.id}`);
        return track.id === 'first'
          ? { kind: 'poll', taskId: 'task-1' }
          : { kind: 'terminal', status: 503, error: 'http-non-ok' };
      },
      async pollTask(taskId) {
        calls.push(`poll:${taskId}`);
        return { kind: 'success', url: 'https://rapid.dlapi.app/first' };
      }
    },
    sleep: async () => {}
  }));
  const results = await session.run([
    { id: 'first', value: 'first' },
    { id: 'second', value: 'second' }
  ], new AbortController().signal);
  assert.deepEqual(calls, ['convert:first', 'poll:task-1', 'convert:second']);
  assert.equal(results[1].error, 'http-non-ok');
});

test('101 tracks are rejected before any API call and an empty value becomes terminal', async () => {
  let calls = 0;
  const session = createConversionSession(sessionDeps({
    apiAdapter: { async convertTrack() { calls += 1; return { kind: 'success', url: 'https://rapid.dlapi.app/x' }; } },
    sleep: async () => {}
  }));
  await assert.rejects(session.run(Array.from({ length: 101 }, (_, index) => ({ id: `${index}`, value: 'x' }))), /track-limit/);
  const results = await session.run([{ id: 'empty', value: '' }]);
  assert.deepEqual(results, [{ kind: 'terminal', status: 'input_error', error: 'empty-track-value' }]);
  assert.equal(calls, 0);
});

test('cancel interrupts active polling and prevents the next track from starting', async () => {
  let convertCalls = 0;
  let pollCalls = 0;
  let rejectPoll;
  const pollStarted = new Promise((resolve) => { rejectPoll = resolve; });
  const session = createConversionSession(sessionDeps({
    apiAdapter: {
      async convertTrack() { convertCalls += 1; return { kind: 'poll', taskId: 'pending' }; },
      async pollTask(taskId, signal) {
        pollCalls += 1;
        await pollStarted;
        if (signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        return { kind: 'success', url: `https://rapid.dlapi.app/${taskId}` };
      }
    },
    sleep: async () => {}
  }));
  const run = session.run([{ id: 'first', value: 'one' }, { id: 'second', value: 'two' }]);
  await Promise.resolve();
  session.cancel();
  rejectPoll();
  const results = await run;
  assert.equal(convertCalls, 1);
  assert.equal(pollCalls, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'cancelled');
});

test('cancel during the 2000 ms gap prevents another track from starting', async () => {
  let convertCalls = 0;
  let releaseGap;
  const gap = new Promise((resolve) => { releaseGap = resolve; });
  const session = createConversionSession(sessionDeps({
    apiAdapter: { async convertTrack() { convertCalls += 1; return { kind: 'success', url: 'https://rapid.dlapi.app/one' }; } },
    sleep: async (delay, signal) => {
      assert.equal(delay, 2000);
      await gap;
      if (signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }
  }));
  const run = session.run([{ id: 'one', value: 'one' }, { id: 'two', value: 'two' }]);
  await Promise.resolve();
  session.cancel();
  releaseGap();
  const results = await run;
  assert.equal(convertCalls, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, 'success');
});

test('the default session delay waits 2000 ms and blocks the next track until released', async () => {
  const starts = [];
  const delays = [];
  const timers = [];
  const session = createConversionSession(sessionDeps({
    apiAdapter: {
      async convertTrack(track) {
        starts.push(track.id);
        return { kind: 'success', url: `https://rapid.dlapi.app/${track.id}` };
      }
    },
    setTimeoutImpl(callback, delay) {
      delays.push(delay);
      timers.push(callback);
      return callback;
    },
    clearTimeoutImpl() {}
  }));
  const run = session.run([{ id: 'one', value: 'one' }, { id: 'two', value: 'two' }]);
  for (let turn = 0; turn < 4 && delays.length === 0; turn += 1) await Promise.resolve();
  assert.deepEqual(starts, ['one']);
  assert.deepEqual(delays, [2000]);
  timers[0]();
  await run;
  assert.deepEqual(starts, ['one', 'two']);
});

test('a second concurrent run fails while cancel still stops the active run', async () => {
  let release;
  let convertCalls = 0;
  const active = new Promise((resolve) => { release = resolve; });
  const session = createConversionSession(sessionDeps({
    apiAdapter: {
      async convertTrack() {
        convertCalls += 1;
        await active;
        return { kind: 'success', url: 'https://rapid.dlapi.app/one' };
      }
    },
    sleep: async () => {}
  }));
  const first = session.run([{ id: 'one', value: 'one' }, { id: 'two', value: 'two' }]);
  await Promise.resolve();
  await assert.rejects(session.run([{ id: 'other', value: 'other' }]), /session-active/);
  session.cancel();
  release();
  const results = await first;
  assert.equal(convertCalls, 1);
  assert.equal(results[0].status, 'cancelled');
});

test('the session requires injected pageAdapter and AbortControllerImpl dependencies', () => {
  assert.throws(() => createConversionSession({ apiAdapter: { convertTrack: async () => ({}) } }), /pageAdapter/);
  assert.throws(() => createConversionSession({ pageAdapter: { publishLegacyConversionResults() {} }, apiAdapter: { convertTrack: async () => ({}) } }), /AbortControllerImpl/);
});

test('disabled userscript mode omits fetchResults and legacy mode publishes ordered results after run', async () => {
  const falsePage = { fetchResults: undefined };
  const falseAdapter = { publishLegacyConversionResults: (results) => { falsePage.fetchResults = results; } };
  const falseSession = createConversionSession(sessionDeps({
    pageAdapter: falseAdapter,
    apiAdapter: { async convertTrack() { return { kind: 'success', url: 'https://rapid.dlapi.app/false-id' }; } }
  }));
  await falseSession.run([{ id: 'false-id', value: 'value' }]);
  assert.equal(falsePage.fetchResults, undefined);

  const legacyPage = { fetchResults: undefined };
  const legacyAdapter = {
    publishLegacyConversionResults(results) { legacyPage.fetchResults = results; }
  };
  const legacySession = createConversionSession(sessionDeps({
    pageAdapter: legacyAdapter,
    exposeLegacyGlobals: true,
    apiAdapter: {
      async convertTrack(track) {
        return track.id === 'success-id'
          ? { kind: 'success', url: 'https://rapid.dlapi.app/success-id' }
          : { kind: 'terminal', status: 503, error: 'http-non-ok' };
      }
    }
  }));
  assert.equal(legacyPage.fetchResults, undefined);
  await legacySession.run([
    { id: 'success-id', value: 'success' },
    { id: 'terminal-id', value: 'terminal' }
  ]);
  assert.deepEqual(legacyPage.fetchResults, [
    { id: 'success-id', status: 'success', success: true, pending: false, url: 'https://rapid.dlapi.app/success-id', error: null },
    { id: 'terminal-id', status: 503, success: false, pending: false, url: null, error: 'http-non-ok' }
  ]);
});
