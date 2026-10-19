import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { scanPostBuildArtifact } from '../../tools/post-build-scan.mjs';
import { createDeterministicZipBuffer } from '../../tools/release/zip.mjs';

describe('Post-build scan contract', () => {
  it('detects prohibited patterns in a text artifact', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'post-build-scan-text-'));
    try {
      const txtPath = path.join(tmpDir, 'console-script.js');
      fs.writeFileSync(txtPath, 'const a = "localhost"; console.log(a);');

      assert.throws(() => {
        scanPostBuildArtifact(txtPath);
      }, /localhost/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('accepts a valid Chrome extension ZIP', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'post-build-scan-zip-'));
    try {
      const zipPath = path.join(tmpDir, 'valid.zip');
      const zipBuffer = createDeterministicZipBuffer([
        { name: 'manifest.json', data: '{}' },
        { name: 'content-script.js', data: 'console.log();' },
        { name: 'assets/playlist-panel.css', data: '' },
        { name: 'LICENSE', data: 'MIT License\n' }
      ]);
      fs.writeFileSync(zipPath, zipBuffer);

      const result = scanPostBuildArtifact(zipPath);
      assert.strictEqual(result.success, true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('detects workers, bridges, path traversal, and unexpected files in a ZIP', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'post-build-scan-zip-bad-'));
    try {
      const zipPath = path.join(tmpDir, 'bad.zip');
      const zipBuffer = createDeterministicZipBuffer([
        { name: 'service-worker.js', data: '' },
        { name: 'bridge.js', data: '' },
        { name: 'arbitrary.js', data: '' }
      ]);
      fs.writeFileSync(zipPath, zipBuffer);

      assert.throws(() => {
        scanPostBuildArtifact(zipPath);
      }, /service-worker|bridge|arbitrary\.js/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
