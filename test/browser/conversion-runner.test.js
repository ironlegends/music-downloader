import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrackSession, toPersistedSession, setTrackSelected } from '../../src/browser/track-session.js';
import { createConversionRunner } from '../../src/browser/conversion-runner.js';

test('processes queued, converting, polling, success, and failed states without automatic retries', async () => {
  const calls = [];
  const delays = [];
  const snapshots = [];
  const successes = [];
  const session = createTrackSession(['ok', 'bad'], () => 'session-1');

  const runner = createConversionRunner({
    session,
    convertTrack: async (track, signal, hooks) => {
      calls.push(track.id);
      if (track.id === 'ok') {
        hooks?.onPolling?.(50);
        return { finalAudioUrl: 'https://example.invalid/ok.mp3' };
      }
      return { errorCode: 'http' };
    },
    sleep: async (ms) => {
      delays.push(ms);
    },
    onChange: (snapshot) => {
      snapshots.push(snapshot);
    },
    onSuccess: (trackId, finalAudioUrl) => {
      successes.push({ trackId, finalAudioUrl });
    }
  });

  await runner.startSelected();

  assert.deepEqual(calls, ['ok', 'bad']);
  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[0].progressPercent, 100);
  assert.equal(runner.getSession().tracks[1].status, 'failed');
  assert.equal(runner.getSession().tracks[1].errorCode, 'http');

  // Inter-track delay of 2000 ms
  assert.deepEqual(delays, [2000]);

  // Success callback called for ok track
  assert.deepEqual(successes, [{ trackId: 'ok', finalAudioUrl: 'https://example.invalid/ok.mp3' }]);

  // No pending/completed/error alias states
  assert.equal(runner.getSession().tracks.some((t) => ['pending', 'completed', 'error'].includes(t.status)), false);

  // Snapshots must not contain sensitive URLs
  for (const snapshot of snapshots) {
    const json = JSON.stringify(snapshot);
    assert.equal(json.includes('finalAudioUrl'), false);
    assert.equal(json.includes('https://example.invalid/ok.mp3'), false);
  }
});

test('cancels the active track and never calls the next track', async () => {
  let release;
  const calls = [];
  const delays = [];
  const session = createTrackSession(['a', 'b'], () => 'session-1');

  const runner = createConversionRunner({
    session,
    convertTrack: (track, signal) => {
      calls.push(track.id);
      return new Promise((resolve, reject) => {
        release = () => resolve({ finalAudioUrl: 'https://example.invalid/' + track.id + '.mp3' });
        signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }, { once: true });
      });
    },
    sleep: async (ms) => {
      delays.push(ms);
    },
    onChange: () => {},
    onSuccess: () => {}
  });

  const runPromise = runner.startSelected();
  // Cancel while a is converting
  runner.cancel();
  await runPromise;

  assert.deepEqual(calls, ['a']);
  assert.equal(runner.getSession().tracks[0].status, 'cancelled');
  assert.equal(runner.getSession().tracks[1].status, 'queued');
  assert.equal(delays.length, 0); // No sleep after cancellation
  assert.equal(release !== undefined, true);
});

test('cancel during the 2000 ms delay prevents the next track from starting', async () => {
  const calls = [];
  const session = createTrackSession(['a', 'b'], () => 'session-1');

  const runner = createConversionRunner({
    session,
    convertTrack: async (track) => {
      calls.push(track.id);
      return { finalAudioUrl: 'https://example.invalid/' + track.id + '.mp3' };
    },
    sleep: (ms, signal) => new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      }, { once: true });
    }),
    onChange: () => {},
    onSuccess: () => {}
  });

  const runPromise = runner.startSelected();
  // Wait a tiny tick for a to complete and enter sleep
  await new Promise((r) => setTimeout(r, 10));
  runner.cancel();
  await runPromise;

  assert.deepEqual(calls, ['a']);
  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[1].status, 'queued');
});

test('prevents concurrent runs', async () => {
  const session = createTrackSession(['a'], () => 'session-1');
  let release;

  const runner = createConversionRunner({
    session,
    convertTrack: () => new Promise((resolve) => {
      release = () => resolve({ finalAudioUrl: 'https://example.invalid/a.mp3' });
    }),
    sleep: async () => {},
    onChange: () => {},
    onSuccess: () => {}
  });

  const run1 = runner.startSelected();
  await assert.rejects(() => runner.startSelected(), /runner-active|session-active/);
  await assert.rejects(() => runner.resumeQueued(), /runner-active|session-active/);

  release();
  await run1;

  // After completion, starting again is allowed (though no queued tracks remain)
  await runner.startSelected();
});

test('retryFailedTracks queues only failed tracks without a network request', async () => {
  let calls = 0;
  const snapshots = [];
  const initialSession = createTrackSession(['ok', 'fail1', 'fail2'], () => 'session-1');

  const runner = createConversionRunner({
    session: initialSession,
    convertTrack: async (track) => {
      calls += 1;
      if (track.id === 'ok') return { finalAudioUrl: 'https://example.invalid/ok.mp3' };
      return { errorCode: 'network' };
    },
    sleep: async () => {},
    onChange: (snapshot) => snapshots.push(snapshot),
    onSuccess: () => {}
  });

  await runner.startSelected();
  assert.equal(calls, 3);
  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[1].status, 'failed');
  assert.equal(runner.getSession().tracks[2].status, 'failed');

  // Manual retry
  snapshots.length = 0;
  const networkCallsBeforeRetry = calls;
  runner.retryFailedTracks();

  // No network requests made by retryFailedTracks
  assert.equal(calls, networkCallsBeforeRetry);

  // States updated: success stays success, failed becomes queued
  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[1].status, 'queued');
  assert.equal(runner.getSession().tracks[1].errorCode, null);
  assert.equal(runner.getSession().tracks[2].status, 'queued');
  assert.equal(runner.getSession().tracks[2].errorCode, null);

  // onChange notified
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].tracks[1].status, 'queued');

  // Resume or startSelected processes the requeued tracks
  await runner.resumeQueued();
  assert.equal(calls, networkCallsBeforeRetry + 2);
});

test('resumeQueued processes only selected queued tracks', async () => {
  const calls = [];
  let session = createTrackSession(['t1', 't2', 't3'], () => 'session-1');
  session = setTrackSelected(session, 't2', false);

  const runner = createConversionRunner({
    session,
    convertTrack: async (track) => {
      calls.push(track.id);
      return { finalAudioUrl: 'https://example.invalid/' + track.id + '.mp3' };
    },
    sleep: async () => {},
    onChange: () => {},
    onSuccess: () => {}
  });

  await runner.resumeQueued();

  // t2 was not selected, so only t1 and t3 were processed
  assert.deepEqual(calls, ['t1', 't3']);
  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[1].status, 'queued');
  assert.equal(runner.getSession().tracks[2].status, 'success');
});

test('treats unexpected convertTrack errors as failed', async () => {
  const session = createTrackSession(['err'], () => 'session-1');

  const runner = createConversionRunner({
    session,
    convertTrack: async () => {
      throw new Error('Network error');
    },
    sleep: async () => {},
    onChange: () => {},
    onSuccess: () => {}
  });

  await runner.startSelected();
  assert.equal(runner.getSession().tracks[0].status, 'failed');
  assert.equal(runner.getSession().tracks[0].errorCode, 'network');
});

test('onChange receives a safe toPersistedSession projection without leaking secrets', async () => {
  const session = createTrackSession(['s1'], () => 'session-secret-check');
  const snapshots = [];

  const runner = createConversionRunner({
    session,
    convertTrack: async () => ({
      finalAudioUrl: 'https://cdn.example.invalid/secret-audio-stream.mp3?token=SUPER_SECRET_123'
    }),
    sleep: async () => {},
    onChange: (snapshot) => snapshots.push(snapshot),
    onSuccess: () => {}
  });

  await runner.startSelected();

  assert.equal(snapshots.length >= 2, true);
  for (const snap of snapshots) {
    assert.equal(snap.schemaVersion, 1);
    assert.equal(snap.sessionId, 'session-secret-check');
    assert.equal(typeof snap.tracks[0].id, 'string');
    assert.equal(typeof snap.tracks[0].status, 'string');
    // Ensure no audio URL in snapshot
    const text = JSON.stringify(snap);
    assert.equal(text.includes('SUPER_SECRET_123'), false);
    assert.equal(text.includes('secret-audio-stream'), false);
    assert.equal(text.includes('finalAudioUrl'), false);
  }
});

test('validates required arguments during construction', () => {
  assert.throws(() => createConversionRunner({}), /session is required/);
  assert.throws(() => createConversionRunner({ session: {} }), /session is required/);
  const session = createTrackSession(['t1'], () => 's1');
  assert.throws(() => createConversionRunner({ session }), /convertTrack must be a function/);
  assert.throws(() => createConversionRunner({ session, convertTrack: 'not-a-func' }), /convertTrack must be a function/);
});

test('retryFailedTracks leaves canceled and successful tracks unchanged', async () => {
  let release;
  const session = createTrackSession(['s_ok', 'c_canc', 'f_fail'], () => 'session-mix');
  const runner = createConversionRunner({
    session,
    convertTrack: (track, signal) => {
      if (track.id === 's_ok') return Promise.resolve({ finalAudioUrl: 'https://example.invalid/ok.mp3' });
      if (track.id === 'c_canc') {
        return new Promise((resolve, reject) => {
          release = () => resolve({ finalAudioUrl: 'https://example.invalid/c.mp3' });
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          }, { once: true });
        });
      }
      return Promise.resolve({ errorCode: 'network' });
    },
    sleep: async () => {},
    onChange: () => {},
    onSuccess: () => {}
  });

  const runPromise = runner.startSelected();
  // Wait a tick so s_ok completes and c_canc starts
  await new Promise((r) => setTimeout(r, 10));
  runner.cancel();
  await runPromise;

  assert.equal(runner.getSession().tracks[0].status, 'success');
  assert.equal(runner.getSession().tracks[1].status, 'cancelled');
  assert.equal(runner.getSession().tracks[2].status, 'queued');

  // Let f_fail fail by resuming queued
  const runner2 = createConversionRunner({
    session: runner.getSession(),
    convertTrack: async () => ({ errorCode: 'http' }),
    sleep: async () => {},
    onChange: () => {},
    onSuccess: () => {}
  });
  await runner2.startSelected();

  assert.equal(runner2.getSession().tracks[0].status, 'success');
  assert.equal(runner2.getSession().tracks[1].status, 'cancelled');
  assert.equal(runner2.getSession().tracks[2].status, 'failed');

  // Retry failed tracks
  runner2.retryFailedTracks();
  assert.equal(runner2.getSession().tracks[0].status, 'success');
  assert.equal(runner2.getSession().tracks[1].status, 'cancelled');
  assert.equal(runner2.getSession().tracks[2].status, 'queued');
});

test('is exported from src/browser/index.js', async () => {
  const mod = await import('../../src/browser/index.js');
  assert.equal(typeof mod.createConversionRunner, 'function');
});
