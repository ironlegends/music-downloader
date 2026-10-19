import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRetryPolicy } from '../../src/policy/retry-policy.js';

for (const [status, potentiallyRetryable, reason] of [
  [403, false, 'forbidden'],
  [422, false, 'unprocessable'],
  [429, true, 'rate-limited'],
  [500, true, 'server-error']
]) {
  test(`POST ${status} remains informational and is never automatically retried`, () => {
    assert.deepEqual(assessRetryPolicy({ method: 'POST', status }), {
      potentiallyRetryable,
      autoRetryAllowed: false,
      reason
    });
  });
}

test('a missing status remains unknown and is never automatically retried', () => {
  assert.deepEqual(assessRetryPolicy({ method: 'POST', status: null }), {
    potentiallyRetryable: false,
    autoRetryAllowed: false,
    reason: 'unknown-status'
  });
});

test('a known status outside the retryable categories remains non-retryable', () => {
  assert.deepEqual(assessRetryPolicy({ method: 'POST', status: 200 }), {
    potentiallyRetryable: false,
    autoRetryAllowed: false,
    reason: 'not-retryable'
  });
});

test('each retry assessment is frozen', () => {
  for (const status of [null, 200, 403, 422, 429, 500]) {
    assert.equal(Object.isFrozen(assessRetryPolicy({ method: 'POST', status })), true);
  }
});
