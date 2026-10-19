import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBundle } from '../../tools/build-browser-artifacts.mjs';

test('surface-contract-parity: shared runtime invariants', () => {
  const contentScript = generateBundle('console-script.js', process.cwd());
  const contentExt = generateBundle('extension/content-script.js', process.cwd());

  assert.ok(contentScript);
  assert.ok(contentExt);

  assert.match(contentScript, /["\']use strict["\']/);
  assert.match(contentExt, /["\']use strict["\']/);

  assert.match(contentScript, /100/);
  assert.match(contentExt, /100/);

  assert.match(contentScript, /2000/);
  assert.match(contentExt, /2000/);

  assert.match(contentScript, /4500/);
  assert.match(contentExt, /4500/);

  assert.match(contentScript, /event\.isTrusted === true/);
  assert.match(contentExt, /event\.isTrusted === true/);

  assert.match(contentScript, /credentials: \'same-origin\'/);
  assert.match(contentExt, /credentials: \'same-origin\'/);
});
