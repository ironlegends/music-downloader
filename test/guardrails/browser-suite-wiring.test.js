import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as browserIndex from '../../src/browser/index.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browserDir = path.join(rootDir, 'src', 'browser');

test('browser-suite-wiring: core modules are exported and integrated', () => {
  const files = fs.readdirSync(browserDir)
    .filter(f => f.endsWith('.js') && f !== 'index.js');

  assert.ok(files.length >= 5, 'At least five essential modules must exist in src/browser.');

  // Check the single-source-of-truth exports from index.js.
  assert.ok(typeof browserIndex.createBrowserCore === 'function');
  assert.ok(typeof browserIndex.createTrackSession === 'function');
  assert.ok(typeof browserIndex.createConversionRunner === 'function');
  assert.ok(typeof browserIndex.mountPlaylistPanel === 'function');
  assert.ok(Array.isArray(browserIndex.TRACK_STATES) || typeof browserIndex.TRACK_STATES === 'object');
  assert.ok(Array.isArray(browserIndex.ERROR_CODES) || typeof browserIndex.ERROR_CODES === 'object');

  // No legacy bridge or USB modules may remain in src/browser.
  const forbiddenModules = ['bridge-client.js', 'bridge-panel.js', 'bridge-auth.js'];
  for (const mod of forbiddenModules) {
    assert.equal(fs.existsSync(path.join(browserDir, mod)), false, `Found forbidden module: ${mod}`);
  }
});
