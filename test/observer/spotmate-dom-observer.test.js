import test from 'node:test';
import assert from 'node:assert/strict';
import { SAFE_DOM_OBSERVATION, RESPONSE_CASES } from '../fixtures/safe-diagnostics.js';
import { makeSyntheticRoot, SYNTHETIC_SELECTORS } from '../fixtures/synthetic-dom-root.js';
import { evaluateDiagnosticSnapshot } from '../../src/policy/diagnostic-policy.js';
import { createReadonlyDomCapabilities } from '../../src/observer/readonly-dom-capabilities.js';
import { observeSpotMateDom } from '../../src/observer/spotmate-dom-observer.js';

const duplicateButtonId = Symbol();

test('the observer returns the exact redacted DOM contract', () => {
  const observation = observeSpotMateDom({
    csrfPresent: () => true,
    turnstilePresent: () => true,
    trackRowCount: () => 3,
    buttonIdCount: () => 3,
    opaqueFieldCount: () => 3,
    malformedRowCount: () => 0,
    duplicateIdCount: () => 0
  });

  assert.deepEqual(observation, {
    csrfPresent: true,
    turnstilePresent: true,
    trackRowCount: 3,
    buttonIdCount: 3,
    opaqueFieldCount: 3,
    malformedRowCount: 0,
    duplicateIdCount: 0,
    anomalies: []
  });
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(Object.isFrozen(observation.anomalies), true);
  assert.equal(observation instanceof Promise, false);
});

test('synthetic DOM observations keep aggregates without raw values', () => {
  const observation = observeSpotMateDom(
    createReadonlyDomCapabilities(makeSyntheticRoot(), SYNTHETIC_SELECTORS)
  );

  assert.deepEqual(observation, SAFE_DOM_OBSERVATION);
  assert.doesNotMatch(JSON.stringify(observation), /button-[a-z]/);
  assert.equal(evaluateDiagnosticSnapshot({ observation, response: RESPONSE_CASES.directOnly }).outcome, 'immediate');
});

test('anomalies stay within the contract categories', () => {
  const observation = observeSpotMateDom(
    createReadonlyDomCapabilities(makeSyntheticRoot({
      csrf: false,
      turnstile: false,
      rowCellCounts: [3],
      buttonIds: [duplicateButtonId, duplicateButtonId],
      opaqueFieldCount: 0
    }), SYNTHETIC_SELECTORS)
  );

  assert.deepEqual(observation.anomalies, [
    'csrf-absent',
    'turnstile-absent',
    'track-row-malformed',
    'duplicate-button-id',
    'button-count-mismatch',
    'opaque-field-count-unexpected'
  ]);
});

test('a capability that tries to return a raw value is rejected', () => {
  const capabilities = {
    csrfPresent: () => 'raw',
    turnstilePresent: () => true,
    trackRowCount: () => 3,
    buttonIdCount: () => 3,
    opaqueFieldCount: () => 3,
    malformedRowCount: () => 0,
    duplicateIdCount: () => 0
  };

  assert.throws(() => observeSpotMateDom(capabilities), TypeError);
});

test('redacted presence flags do not trigger policy failure', () => {
  const verdict = evaluateDiagnosticSnapshot({
    observation: SAFE_DOM_OBSERVATION,
    response: RESPONSE_CASES.directOnly
  });
  assert.equal(verdict.outcome, 'immediate');
  assert.equal(verdict.reason, 'immediate-direct-url');
});
