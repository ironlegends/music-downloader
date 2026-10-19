import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  generateArtifacts,
  generateBundle,
  normalizeLF,
  checkBrowserArtifacts,
  buildBrowserArtifacts
} from '../../tools/build-browser-artifacts.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('build-tool: generateArtifacts creates the required bundles without changing files on disk', () => {
  const artifacts = generateArtifacts(rootDir);
  assert.ok(artifacts instanceof Map);
  assert.ok(artifacts.has('console-script.js'));

  const scriptContent = artifacts.get('console-script.js');
  assert.ok(scriptContent.length > 500);
  assert.match(scriptContent, /['"]use strict['"]/);
});

test('build-tool: checkBrowserArtifacts validates generated files on disk', () => {
  const result = checkBrowserArtifacts({ rootDir });
  assert.equal(result, true);
});

test('build-tool: the loadable extension bundle stays synchronized with source and embedded styles', () => {
  const actual = fs.readFileSync(path.join(rootDir, 'extension/content-script.js'), 'utf8');
  const expected = generateBundle('extension/content-script.js', rootDir);
  assert.ok(normalizeLF(actual) === normalizeLF(expected), 'Regenerate extension/content-script.js with npm run build:extension');
});

test('build-tool: buildBrowserArtifacts writes files to the target directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-tool-test-'));
  try {
    buildBrowserArtifacts({ rootDir, outDir: tmpDir });
    assert.ok(fs.existsSync(path.join(tmpDir, 'console-script.js')));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
