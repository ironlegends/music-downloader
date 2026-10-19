import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSyntheticRoot, SYNTHETIC_SELECTORS } from '../fixtures/synthetic-dom-root.js';
import { createReadonlyDomCapabilities } from '../../src/observer/readonly-dom-capabilities.js';

const duplicateButtonId = Symbol();

test('the boundary exposes only seven aggregate readers', () => {
  const capabilities = createReadonlyDomCapabilities(makeSyntheticRoot(), SYNTHETIC_SELECTORS);

  assert.deepEqual(Object.keys(capabilities).sort(), [
    'buttonIdCount', 'csrfPresent', 'duplicateIdCount', 'malformedRowCount',
    'opaqueFieldCount', 'trackRowCount', 'turnstilePresent'
  ]);
  assert.equal(Object.isFrozen(capabilities), true);
  for (const read of Object.values(capabilities)) {
    assert.equal(typeof read, 'function');
    assert.ok(['boolean', 'number'].includes(typeof read()));
  }
});

test('capabilities compute presence flags and counts only', () => {
  const capabilities = createReadonlyDomCapabilities(makeSyntheticRoot(), SYNTHETIC_SELECTORS);

  assert.equal(capabilities.csrfPresent(), true);
  assert.equal(capabilities.turnstilePresent(), true);
  assert.equal(capabilities.trackRowCount(), 3);
  assert.equal(capabilities.buttonIdCount(), 3);
  assert.equal(capabilities.opaqueFieldCount(), 3);
  assert.equal(capabilities.malformedRowCount(), 0);
  assert.equal(capabilities.duplicateIdCount(), 0);
});

test('DOM counts aggregate malformed rows and duplicate IDs', () => {
  const capabilities = createReadonlyDomCapabilities(makeSyntheticRoot({
    rowCellCounts: [4, 3, 5],
    buttonIds: [duplicateButtonId, duplicateButtonId, null, Symbol()]
  }), SYNTHETIC_SELECTORS);

  assert.equal(capabilities.buttonIdCount(), 3);
  assert.equal(capabilities.malformedRowCount(), 2);
  assert.equal(capabilities.duplicateIdCount(), 1);
});
