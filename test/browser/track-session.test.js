import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACK_STATES,
  ERROR_CODES,
  createTrackSession,
  setTrackSelected,
  setAllSelected,
  getSelectedQueuedTrackIds,
  getFailedTrackIds,
  requeueFailedTracks,
  transitionTrack,
  toPersistedSession
} from '../../src/browser/track-session.js';

test('TRACK_STATES is frozen and contains exactly the six allowed states', () => {
  assert.equal(Object.isFrozen(TRACK_STATES), true);
  assert.deepEqual(Array.from(TRACK_STATES), [
    'queued',
    'converting',
    'polling',
    'success',
    'failed',
    'cancelled'
  ]);
  assert.equal(TRACK_STATES.includes('pending'), false);
  assert.equal(TRACK_STATES.includes('completed'), false);
  assert.equal(TRACK_STATES.includes('error'), false);
});

test('ERROR_CODES contains only normalized error codes', () => {
  assert.equal(Object.isFrozen(ERROR_CODES), true);
  assert.deepEqual(Array.from(ERROR_CODES), [
    'network',
    'http',
    'schema',
    'poll_timeout',
    'input'
  ]);
});

test('creates at most 100 selected queued tracks', () => {
  const session = createTrackSession(['a', 'b'], () => 'session-1');
  assert.equal(session.schemaVersion, 1);
  assert.equal(session.sessionId, 'session-1');
  assert.equal(session.activeTrackId, null);
  assert.deepEqual(session.tracks, [
    { id: 'a', selected: true, status: 'queued', progressPercent: 0, errorCode: null },
    { id: 'b', selected: true, status: 'queued', progressPercent: 0, errorCode: null }
  ]);
  assert.equal(Object.isFrozen(session), true);
  assert.equal(Object.isFrozen(session.tracks), true);
  assert.equal(Object.isFrozen(session.tracks[0]), true);

  assert.throws(
    () => createTrackSession(Array.from({ length: 101 }, (_, i) => String(i)), () => 'x'),
    /100/
  );
});

test('rejects invalid, empty, or duplicate IDs', () => {
  assert.throws(() => createTrackSession('non-array'), /array/i);
  assert.throws(() => createTrackSession([]), /empty|at least 1/i);
  assert.throws(() => createTrackSession(['']), /empty/i);
  assert.throws(() => createTrackSession(['   ']), /empty/i);
  assert.throws(() => createTrackSession([null]), /string/i);
  assert.throws(() => createTrackSession(['a', 'a']), /duplicate/i);
  assert.throws(() => createTrackSession(['a', 'b', 'a']), /duplicate/i);
});

test('individual, select-all, and deselect-all operations are independent and immutable', () => {
  const initial = createTrackSession(['a', 'b'], () => 'session-1');
  const one = setTrackSelected(initial, 'a', false);
  assert.notEqual(initial, one);
  assert.deepEqual(getSelectedQueuedTrackIds(one), ['b']);
  assert.deepEqual(getSelectedQueuedTrackIds(setAllSelected(one, true)), ['a', 'b']);
  assert.deepEqual(getSelectedQueuedTrackIds(setAllSelected(one, false)), []);
  assert.deepEqual(initial.tracks.map((track) => track.selected), [true, true]);
});

test('getSelectedQueuedTrackIds filters out unselected and non-queued tracks', () => {
  const session = createTrackSession(['a', 'b', 'c'], () => 's-1');
  const s2 = transitionTrack(session, 'a', 'converting');
  const s3 = setTrackSelected(s2, 'b', false);
  assert.deepEqual(getSelectedQueuedTrackIds(s3), ['c']);
});

test('getFailedTrackIds and requeueFailedTracks support manual retry of failed tracks only', () => {
  const s1 = createTrackSession(['a', 'b', 'c'], () => 's-1');
  const s2 = transitionTrack(s1, 'a', 'converting');
  const s3 = transitionTrack(s2, 'a', 'failed', { errorCode: 'http' });
  const s4 = transitionTrack(s3, 'b', 'converting');
  const s5 = transitionTrack(s4, 'b', 'success', { progressPercent: 100 });
  const s6 = transitionTrack(s5, 'c', 'converting');
  const s7 = transitionTrack(s6, 'c', 'cancelled');

  assert.deepEqual(getFailedTrackIds(s7), ['a']);

  const requeued = requeueFailedTracks(s7);
  assert.notEqual(requeued, s7);
  assert.equal(requeued.tracks[0].id, 'a');
  assert.equal(requeued.tracks[0].status, 'queued');
  assert.equal(requeued.tracks[0].progressPercent, 0);
  assert.equal(requeued.tracks[0].errorCode, null);

  // Successful and canceled tracks stay unchanged.
  assert.equal(requeued.tracks[1].status, 'success');
  assert.equal(requeued.tracks[2].status, 'cancelled');
  assert.deepEqual(getFailedTrackIds(requeued), []);
});

test('transitions only follow the exact state graph', () => {
  const queued = createTrackSession(['a'], () => 'session-1');
  const converting = transitionTrack(queued, 'a', 'converting', { activeTrackId: 'a' });
  assert.equal(converting.activeTrackId, 'a');
  assert.equal(converting.tracks[0].status, 'converting');

  const polling = transitionTrack(converting, 'a', 'polling', { progressPercent: 25 });
  assert.equal(polling.tracks[0].status, 'polling');
  assert.equal(polling.tracks[0].progressPercent, 25);

  const success = transitionTrack(polling, 'a', 'success', { progressPercent: 100 });
  assert.equal(success.tracks[0].status, 'success');
  assert.equal(success.tracks[0].progressPercent, 100);
  assert.equal(success.activeTrackId, null);

  // Disallowed transitions.
  assert.throws(() => transitionTrack(success, 'a', 'polling'), /transition/i);
  assert.throws(() => transitionTrack(success, 'a', 'queued'), /transition/i);
  assert.throws(() => transitionTrack(queued, 'a', 'pending'), /state/i);
  assert.throws(() => transitionTrack(queued, 'a', 'success'), /transition/i);
  assert.throws(() => transitionTrack(queued, 'a', 'polling'), /transition/i);
  assert.throws(() => transitionTrack(queued, 'a', 'cancelled'), /transition/i);
});

test('supports converting -> success, converting -> failed, polling -> failed, and converting/polling -> canceled transitions', () => {
  const s0 = createTrackSession(['a', 'b', 'c', 'd'], () => 's-1');

  // converting -> success (conversion directe)
  const convA = transitionTrack(s0, 'a', 'converting');
  const succA = transitionTrack(convA, 'a', 'success');
  assert.equal(succA.tracks[0].status, 'success');

  // converting -> failed
  const convB = transitionTrack(s0, 'b', 'converting');
  const failB = transitionTrack(convB, 'b', 'failed', { errorCode: 'network' });
  assert.equal(failB.tracks[1].status, 'failed');
  assert.equal(failB.tracks[1].errorCode, 'network');

  // polling -> failed
  const convC = transitionTrack(s0, 'c', 'converting');
  const pollC = transitionTrack(convC, 'c', 'polling');
  const failC = transitionTrack(pollC, 'c', 'failed', { errorCode: 'poll_timeout' });
  assert.equal(failC.tracks[2].status, 'failed');
  assert.equal(failC.tracks[2].errorCode, 'poll_timeout');

  // converting -> cancelled et polling -> cancelled
  const convD = transitionTrack(s0, 'd', 'converting');
  const cancD = transitionTrack(convD, 'd', 'cancelled');
  assert.equal(cancD.tracks[3].status, 'cancelled');

  const pollD = transitionTrack(convD, 'd', 'polling');
  const cancPollD = transitionTrack(pollD, 'd', 'cancelled');
  assert.equal(cancPollD.tracks[3].status, 'cancelled');
});

test('rejects disallowed errorCodes and bounds progress to [0, 100]', () => {
  const session = createTrackSession(['a'], () => 's-1');
  const converting = transitionTrack(session, 'a', 'converting');

  assert.throws(() => transitionTrack(converting, 'a', 'failed', { errorCode: 'random_error' }), /errorCode/i);

  const poll1 = transitionTrack(converting, 'a', 'polling', { progressPercent: -10 });
  assert.equal(poll1.tracks[0].progressPercent, 0);

  const poll2 = transitionTrack(converting, 'a', 'polling', { progressPercent: 150 });
  assert.equal(poll2.tracks[0].progressPercent, 100);
});

test('toPersistedSession keeps only plain fields without leaking secrets or URLs', () => {
  const session = createTrackSession(['a'], () => 's-1');
  const dirty = {
    ...session,
    extraSecret: 'token-1234',
    url: 'https://spotmate.online/api/secret',
    tracks: [
      {
        ...session.tracks[0],
        downloadUrl: 'https://cdn.example.invalid/audio.mp3',
        rawError: 'Internal server error at line 42'
      }
    ]
  };

  const persisted = toPersistedSession(dirty);
  assert.deepEqual(persisted, {
    schemaVersion: 1,
    sessionId: 's-1',
    tracks: [
      {
        id: 'a',
        selected: true,
        status: 'queued',
        progressPercent: 0,
        errorCode: null
      }
    ],
    activeTrackId: null
  });
  assert.equal('extraSecret' in persisted, false);
  assert.equal('url' in persisted, false);
  assert.equal('downloadUrl' in persisted.tracks[0], false);
  assert.equal('rawError' in persisted.tracks[0], false);
});
