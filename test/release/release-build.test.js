import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildRelease } from '../../tools/release/build.mjs';
import { createSyntheticReleaseRepo, readZipEntryNames } from '../support/synthetic-release-repo.js';

test('release-build writes the exact Chrome-only release inventory', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-build-'));
  try {
    const repoRoot = createSyntheticReleaseRepo(tempDir);
    const epoch = 1718000000;
    const outputDir = path.join(tempDir, 'release-one');
    await buildRelease({ repoRoot, outputDir, sourceDateEpoch: epoch });

    const expectedInventory = [
      'music-converter-v2.0.0-chrome-extension.zip',
      'console-script.js',
      'LICENSE',
      'SHA256SUMS',
      'sbom.spdx.json',
      'release-manifest.json'
    ].sort();
    assert.deepEqual(fs.readdirSync(outputDir).sort(), expectedInventory);

    const chromeZipName = 'music-converter-v2.0.0-chrome-extension.zip';
    assert.deepEqual(readZipEntryNames(fs.readFileSync(path.join(outputDir, chromeZipName))), [
      'LICENSE',
      'assets/playlist-panel.css',
      'content-script.js',
      'manifest.json'
    ]);

    const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'release-manifest.json'), 'utf8'));
    assert.equal(manifest.version, '2.0.0');
    assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$/);
    assert.equal(manifest.sourceDateEpoch, epoch);
    assert.deepEqual(manifest.inventory, expectedInventory);
    assert.deepEqual(manifest.files.map((file) => file.name).sort(), [
      chromeZipName,
      'console-script.js',
      'LICENSE',
      'sbom.spdx.json'
    ].sort());

    const secondOutputDir = path.join(tempDir, 'release-two');
    await buildRelease({ repoRoot, outputDir: secondOutputDir, sourceDateEpoch: epoch });
    for (const name of expectedInventory) {
      assert.deepEqual(fs.readFileSync(path.join(outputDir, name)), fs.readFileSync(path.join(secondOutputDir, name)));
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
