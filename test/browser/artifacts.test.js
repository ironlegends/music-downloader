import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { generateBundle } from '../../tools/build-browser-artifacts.mjs';

test('artifacts: generated console script is valid JavaScript', () => {
  const scriptArt = generateBundle('console-script.js', process.cwd());

  assert.ok(scriptArt);
  assert.doesNotMatch(scriptArt, /userscript/);

  assert.doesNotThrow(() => {
    new vm.Script(scriptArt);
  });
});
