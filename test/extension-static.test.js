import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertV2Manifest } from '../tools/manifest-contract.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('extension-static: CSS and Chrome manifest comply with the MV3 contract', () => {
  const cssPath = path.join(rootDir, 'extension', 'assets', 'playlist-panel.css');
  assert.ok(fs.existsSync(cssPath), 'playlist-panel.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // The panel must include accessibility and responsive rules.
  assert.match(css, /@media\s*\(\s*max-width:\s*767px\s*\)/i, 'A mobile media query must be present');
  assert.match(css, /min-height:\s*44px/i, 'Touch targets must be at least 44 px tall');

  // Validate the Chrome manifest against the v2 contract.
  const chromeManifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'extension', 'chrome', 'manifest.json'), 'utf8'));

  assert.doesNotThrow(() => assertV2Manifest(chromeManifest, { browser: 'chrome' }));
});
