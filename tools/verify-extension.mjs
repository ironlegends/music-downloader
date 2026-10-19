import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildExtension } from './build-extension.mjs';
import { assertV2Manifest } from './manifest-contract.mjs';
import { assertChromeTarget } from './browser-target.mjs';

function parseZipEntries(buffer) {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP structure: EOCD signature not found.');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  const entries = [];
  let currentOffset = cdOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(currentOffset) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry at offset ${currentOffset}.`);
    }
    const nameLen = buffer.readUInt16LE(currentOffset + 28);
    const extraLen = buffer.readUInt16LE(currentOffset + 30);
    const commentLen = buffer.readUInt16LE(currentOffset + 32);
    const name = buffer.toString('utf8', currentOffset + 46, currentOffset + 46 + nameLen);
    entries.push(name);
    currentOffset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function parseCliArgs(args) {
  let browser = null;
  let outDir = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--browser') {
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('--browser requires a target (chrome).');
      }
      browser = assertChromeTarget(args[i]);
    } else if (arg === '--out-dir') {
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('--out-dir requires a path.');
      }
      outDir = args[i];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!browser) {
    throw new Error('--browser is required (chrome).');
  }

  return { browser, outDir };
}

function verifyExtension({ rootDir, browser, outDir } = {}) {
  browser = assertChromeTarget(browser);
  const resolvedRoot = rootDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const targetOutDir = outDir || path.join(resolvedRoot, 'dist');

  const manifestPath = path.join(resolvedRoot, 'extension', browser, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version || '2.0.0';

  const zipName = `music-converter-v${version}.zip`;
  const zipPath = path.join(targetOutDir, browser, zipName);
  const shaPath = path.join(targetOutDir, browser, `${zipName}.sha256`);

  if (!fs.existsSync(zipPath)) {
    throw new Error(`ZIP archive not found: ${zipPath}`);
  }
  if (!fs.existsSync(shaPath)) {
    throw new Error(`SHA-256 file not found: ${shaPath}`);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const calculatedSha = crypto.createHash('sha256').update(zipBuffer).digest('hex');
  const publishedSha = fs.readFileSync(shaPath, 'utf8').trim();

  if (calculatedSha !== publishedSha) {
    throw new Error(`SHA-256 mismatch: expected ${publishedSha}, calculated ${calculatedSha}.`);
  }

  // 1. Verify the ZIP entries (exactly four files).
  const entries = parseZipEntries(zipBuffer);
  const baseEntries = ['assets/playlist-panel.css', 'content-script.js', 'LICENSE', 'manifest.json'];
  if (JSON.stringify(entries.sort()) !== JSON.stringify(baseEntries.sort())) {
    throw new Error(`Invalid ZIP contents: observed entries ${JSON.stringify(entries)}.`);
  }

  // 2. Verify the manifest.
  assertV2Manifest(manifest, { browser });

  if (manifest.version !== version) {
    throw new Error(`Manifest version (${manifest.version}) does not match package.json (${version}).`);
  }

  // 3. Verify that content-script.js contains no forbidden strings.
  const scriptPath = path.join(resolvedRoot, 'extension', 'content-script.js');
  if (fs.existsSync(scriptPath)) {
    const content = fs.readFileSync(scriptPath, 'utf8');
    for (const forbidden of ['document.cookie', 'Set-Cookie', 'localhost', '127.0.0.1', 'chrome.storage', 'chrome.runtime.sendMessage', 'service-worker', 'bridge']) {
      if (content.includes(forbidden)) {
        throw new Error(`content-script.js contains the forbidden pattern: ${forbidden}`);
      }
    }
  }

  // 4. Rebuild in a temporary directory and verify strict binary equality.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-ext-'));
  try {
    const rebuild = buildExtension({ rootDir: resolvedRoot, browser, outDir: tempDir });
    const rebuildBuffer = fs.readFileSync(rebuild.zipPath);
    if (Buffer.compare(zipBuffer, rebuildBuffer) !== 0) {
      throw new Error('Binary reproducibility failed: the rebuilt ZIP differs.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return { success: true, browser, sha256: calculatedSha };
}

function main() {
  const rawArgs = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseCliArgs(rawArgs);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const res = verifyExtension({ rootDir, browser: parsed.browser, outDir: parsed.outDir });
    console.log(`Verification succeeded for ${res.browser} (SHA-256: ${res.sha256}).`);
    process.exit(0);
  } catch (err) {
    console.error(`Extension verification failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export {
  verifyExtension
};
