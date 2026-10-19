import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('CLI entry points run through linked directories and preserve validation gates', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-cli-'));
  const linkedRoot = path.join(tempDir, 'source');
  const outputDir = path.join(tempDir, 'output');
  fs.symlinkSync(rootDir, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const cases = [
      ['build-extension.mjs', ['--browser', 'edge', '--out-dir', outputDir], 1, /chrome/i],
      ['verify-extension.mjs', ['--browser', 'edge', '--out-dir', outputDir], 1, /chrome/i],
      ['build-browser-artifacts.mjs', ['--check'], 0, /verification succeeded/i],
      ['check-release-metadata.mjs', [], 0, /verification succeeded/i],
      ['verify-release-qa.mjs', [path.join(linkedRoot, 'qa', 'v2.0.0-extension-checklist.md')], 1, /QA status must be PASS/i]
    ];
    for (const [name, args, status, message] of cases) {
      const result = spawnSync(process.execPath, [path.join(linkedRoot, 'tools', name), ...args], {
        cwd: linkedRoot,
        encoding: 'utf8'
      });
      assert.ifError(result.error);
      assert.equal(result.status, status, `${name}: ${result.stderr}`);
      assert.match(result.stdout + result.stderr, message, `${name} must execute its CLI handler`);
    }
    assert.equal(fs.existsSync(outputDir), false, 'Rejected targets must not create output files');
  } finally {
    fs.unlinkSync(linkedRoot);
    fs.rmdirSync(tempDir);
  }
});
