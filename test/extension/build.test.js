import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildExtension } from '../../tools/build-extension.mjs';
import { verifyExtension } from '../../tools/verify-extension.mjs';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '../..');

function makeBuildFixture(parentDir) {
  const fixtureRoot = path.join(parentDir, 'fixture');
  fs.mkdirSync(fixtureRoot);

  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(fixtureRoot, 'package.json'));
  fs.cpSync(path.join(rootDir, 'src', 'browser'), path.join(fixtureRoot, 'src', 'browser'), { recursive: true });
  fs.cpSync(path.join(rootDir, 'extension', 'chrome', 'manifest.json'), path.join(fixtureRoot, 'extension', 'chrome', 'manifest.json'));
  fs.cpSync(path.join(rootDir, 'extension', 'assets', 'playlist-panel.css'), path.join(fixtureRoot, 'extension', 'assets', 'playlist-panel.css'));

  const toolsDir = path.join(fixtureRoot, 'tools');
  fs.mkdirSync(toolsDir);
  for (const name of ['build-extension.mjs', 'build-browser-artifacts.mjs', 'browser-target.mjs', 'manifest-contract.mjs', 'verify-extension.mjs']) {
    fs.copyFileSync(path.join(rootDir, 'tools', name), path.join(toolsDir, name));
  }

  const licensePath = path.join(rootDir, 'LICENSE');
  if (fs.existsSync(licensePath)) fs.copyFileSync(licensePath, path.join(fixtureRoot, 'LICENSE'));
  return fixtureRoot;
}

function readZipEntryNames(buffer) {
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  assert.notEqual(eocdOffset, -1, 'The ZIP archive must have an end-of-directory record');

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names = [];
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'Each ZIP entry must have a central-directory header');
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names.sort();
}

describe('Extension build', () => {
  it('builds and verifies the Chrome package with the required files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extension-build-'));
    try {
      const fixtureRoot = makeBuildFixture(tempDir);
      const build = buildExtension({ rootDir: fixtureRoot, browser: 'chrome', outDir: path.join(tempDir, 'dist') });
      const verification = verifyExtension({ rootDir: fixtureRoot, browser: 'chrome', outDir: path.join(tempDir, 'dist') });

      assert.equal(verification.success, true);
      assert.deepEqual(readZipEntryNames(fs.readFileSync(build.zipPath)), [
        'LICENSE',
        'assets/playlist-panel.css',
        'content-script.js',
        'manifest.json'
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects non-Chrome programmatic builds before reading or writing files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extension-browser-check-'));
    try {
      const missingRoot = path.join(tempDir, 'missing-root');
      const outDir = path.join(tempDir, 'output');
      for (const browser of ['edge', 'firefox']) {
        assert.throws(
          () => buildExtension({ rootDir: missingRoot, browser, outDir }),
          /chrome/i,
          `buildExtension should reject ${browser} with a Chrome-only error`
        );
        assert.throws(
          () => verifyExtension({ rootDir: missingRoot, browser, outDir }),
          /chrome/i,
          `verifyExtension should reject ${browser} with a Chrome-only error`
        );
      }
      assert.equal(fs.existsSync(missingRoot), false);
      assert.equal(fs.existsSync(outDir), false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects Edge on the CLI before generating the content script or output files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extension-cli-check-'));
    try {
      const fixtureRoot = makeBuildFixture(tempDir);
      const outDir = path.join(tempDir, 'dist');
      const cliPath = path.join(fixtureRoot, 'tools', 'build-extension.mjs');
      const result = spawnSync(process.execPath, [cliPath, '--browser', 'edge', '--out-dir', outDir], {
        cwd: fixtureRoot,
        encoding: 'utf8'
      });

      assert.notEqual(result.status, 0, 'The Edge build must exit with an error');
      assert.match(result.stderr, /chrome/i, 'The error must explain that only Chrome is supported');
      assert.equal(fs.existsSync(path.join(fixtureRoot, 'extension', 'content-script.js')), false);
      assert.equal(fs.existsSync(outDir), false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
