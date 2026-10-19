import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { generateBundle, normalizeLF } from './build-browser-artifacts.mjs';
import { assertChromeTarget } from './browser-target.mjs';

function createDeterministicZip(entries) {
  // Sort entries strictly by file name.
  const sortedEntries = entries.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  const FIXED_DOS_TIME = 0;
  const FIXED_DOS_DATE = 0x0021; // 1980-01-01

  for (const entry of sortedEntries) {
    const filenameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressedBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 9 });
    const crc = zlib.crc32(uncompressedBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);          // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6);      // General purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8);           // Compression method (Deflate)
    localHeader.writeUInt16LE(FIXED_DOS_TIME, 10);
    localHeader.writeUInt16LE(FIXED_DOS_DATE, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedBuf.length, 18);
    localHeader.writeUInt32LE(uncompressedBuf.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);          // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedBuf);

    // Central directory file header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE((3 << 8) | 20, 4); // Version made by: Unix (3) + Version 2.0 (20)
    centralHeader.writeUInt16LE(20, 6);          // Version needed
    centralHeader.writeUInt16LE(0x0800, 8);      // Bit flag (UTF-8)
    centralHeader.writeUInt16LE(8, 10);          // Deflate
    centralHeader.writeUInt16LE(FIXED_DOS_TIME, 12);
    centralHeader.writeUInt16LE(FIXED_DOS_DATE, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedBuf.length, 20);
    centralHeader.writeUInt32LE(uncompressedBuf.length, 24);
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);          // Extra field length
    centralHeader.writeUInt16LE(0, 32);          // Comment length
    centralHeader.writeUInt16LE(0, 34);          // Disk number start
    centralHeader.writeUInt16LE(0, 36);          // Internal attributes
    centralHeader.writeUInt32LE(0x81a40000, 38); // External attributes (regular file 0644)
    centralHeader.writeUInt32LE(offset, 42);     // Relative offset of local header
    filenameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedBuf.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // EOCD signature
  eocd.writeUInt16LE(0, 4);                   // Disk number
  eocd.writeUInt16LE(0, 6);                   // Disk where CD starts
  eocd.writeUInt16LE(sortedEntries.length, 8); // Records on this disk
  eocd.writeUInt16LE(sortedEntries.length, 10);// Total records
  eocd.writeUInt32LE(centralDirSize, 12);     // Central directory size
  eocd.writeUInt32LE(centralDirOffset, 16);   // Central directory offset
  eocd.writeUInt16LE(0, 20);                  // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
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

function buildExtension({ rootDir, browser, outDir } = {}) {
  browser = assertChromeTarget(browser);
  const resolvedRoot = rootDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const targetOutDir = outDir || path.join(resolvedRoot, 'dist');

  // 1. Read the manifest, CSS, and license.
  const manifestPath = path.join(resolvedRoot, 'extension', browser, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found for ${browser}: ${manifestPath}`);
  }
  const manifestContent = normalizeLF(fs.readFileSync(manifestPath, 'utf8')).trim() + '\n';
  const manifestObj = JSON.parse(manifestContent);
  const version = manifestObj.version || '1.4.0';

  const cssPath = path.join(resolvedRoot, 'extension', 'assets', 'playlist-panel.css');
  if (!fs.existsSync(cssPath)) {
    throw new Error(`CSS asset not found: ${cssPath}`);
  }
  const cssContent = normalizeLF(fs.readFileSync(cssPath, 'utf8')).trim() + '\n';
  const licensePath = path.join(resolvedRoot, 'LICENSE');
  if (!fs.existsSync(licensePath)) {
    throw new Error(`LICENSE file not found: ${licensePath}`);
  }
  const licenseContent = fs.readFileSync(licensePath);
  const contentScriptSource = generateBundle('extension/content-script.js', resolvedRoot);

  // 2. Prepare the canonical archive entries.
  const entries = [
    { name: 'assets/playlist-panel.css', data: Buffer.from(cssContent, 'utf8') },
    { name: 'content-script.js', data: Buffer.from(contentScriptSource, 'utf8') },
    { name: 'LICENSE', data: licenseContent },
    { name: 'manifest.json', data: Buffer.from(manifestContent, 'utf8') }
  ];

  const zipBuffer = createDeterministicZip(entries);
  const sha256Hex = crypto.createHash('sha256').update(zipBuffer).digest('hex');

  const browserDistDir = path.join(targetOutDir, browser);
  fs.mkdirSync(browserDistDir, { recursive: true });

  const extContentScriptPath = path.join(resolvedRoot, 'extension', 'content-script.js');
  fs.mkdirSync(path.dirname(extContentScriptPath), { recursive: true });
  fs.writeFileSync(extContentScriptPath, contentScriptSource, 'utf8');

  const zipName = `music-converter-v${version}.zip`;
  const zipPath = path.join(browserDistDir, zipName);
  const shaPath = path.join(browserDistDir, `${zipName}.sha256`);

  fs.writeFileSync(zipPath, zipBuffer);
  fs.writeFileSync(shaPath, sha256Hex + '\n', 'utf8');

  return {
    browser,
    version,
    zipPath,
    sha256: sha256Hex
  };
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
    const res = buildExtension({ rootDir, browser: parsed.browser, outDir: parsed.outDir });
    console.log(`Extension ${res.browser} v${res.version} generated: ${res.zipPath} (SHA-256: ${res.sha256})`);
    process.exit(0);
  } catch (err) {
    console.error(`Extension build failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export {
  createDeterministicZip,
  buildExtension
};
