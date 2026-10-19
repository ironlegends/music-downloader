import test from 'node:test';
import assert from 'node:assert/strict';
import { SAFE_DOM_OBSERVATION, RESPONSE_CASES } from '../fixtures/safe-diagnostics.js';
import {
  evaluateDiagnosticSnapshot,
  evaluateResponseMetadata,
  validateExpurgatedObservation
} from '../../src/policy/diagnostic-policy.js';

const cases = [
  ['directOnly', 'immediate', 'immediate-direct-url'],
  ['taskOnly', 'queued', 'queued-task-id'],
  ['directAndTask', 'failed-closed', 'ambiguous-direct-and-task'],
  ['missingShape', 'failed-closed', 'missing-result-shape'],
  ['unknownErrorFlag', 'failed-closed', 'ambiguous-metadata'],
  ['errorDeclared', 'failed-closed', 'error-flag'],
  ['html', 'failed-closed', 'html-body'],
  ['empty', 'failed-closed', 'empty-body'],
  ['unknownBody', 'failed-closed', 'unknown-body'],
  ['unknownStatus', 'failed-closed', 'unknown-status'],
  ['forbidden', 'failed-closed', 'http-403'],
  ['unprocessable', 'failed-closed', 'http-422'],
  ['rateLimited', 'failed-closed', 'http-429'],
  ['serverError', 'failed-closed', 'http-500']
];

for (const [name, outcome, reason] of cases) {
  test(`${name} produces the expected terminal verdict`, () => {
    const verdict = evaluateDiagnosticSnapshot({
      observation: SAFE_DOM_OBSERVATION,
      response: RESPONSE_CASES[name]
    });
    assert.equal(verdict.outcome, outcome);
    assert.equal(verdict.reason, reason);
    assert.equal(verdict.terminal, true);
    assert.deepEqual(verdict.effects, []);
  });
}

test('accepts a redacted observation with aggregated sensitive-presence flags', () => {
  assert.deepEqual(validateExpurgatedObservation(SAFE_DOM_OBSERVATION), { ok: true });
});

test('rejects anomalies outside the allowlist', () => {
  const observation = { ...SAFE_DOM_OBSERVATION, anomalies: ['unknown-anomaly'] };
  assert.equal(validateExpurgatedObservation(observation).reason, 'ambiguous-dom-observation');
});

test('classifies a DOM key that could carry a raw value', () => {
  const observation = { ...SAFE_DOM_OBSERVATION, taskId: 'opaque' };
  assert.equal(validateExpurgatedObservation(observation).reason, 'raw-value-leak');
});

test('rejects an observation with an invalid count', () => {
  const observation = { ...SAFE_DOM_OBSERVATION, trackRowCount: -1 };
  assert.equal(validateExpurgatedObservation(observation).reason, 'ambiguous-dom-observation');
});

test('metadata verdicts never retain raw values', () => {
  const verdict = evaluateResponseMetadata(RESPONSE_CASES.directOnly);
  assert.deepEqual(verdict, {
    terminal: true,
    outcome: 'immediate',
    reason: 'immediate-direct-url',
    effects: []
  });
});

test('serialized fixtures remain synthetic and redacted', () => {
  const serialized = JSON.stringify({ SAFE_DOM_OBSERVATION, RESPONSE_CASES });
  assert.doesNotMatch(serialized, /https?:\/\//i);
  assert.doesNotMatch(serialized, /<[^>]+>/);
  assert.doesNotMatch(serialized, /(?:token|task[_-]?id|csrf|url|value|content|html)\s*[:=]/i);
  assert.doesNotMatch(serialized, /[A-Za-z0-9_-]{32,}/);
});
