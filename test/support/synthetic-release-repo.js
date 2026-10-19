import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function createSyntheticReleaseRepo(baseDir) {
  const repoRoot = path.join(baseDir, 'repo');
  const extensionDir = path.join(repoRoot, 'extension');
  fs.mkdirSync(path.join(extensionDir, 'chrome'), { recursive: true });
  fs.mkdirSync(path.join(extensionDir, 'assets'), { recursive: true });

  fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({
    name: 'music-converter',
    version: '2.0.0',
    private: true,
    license: 'MIT',
    type: 'module'
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(repoRoot, 'LICENSE'), 'MIT License\n');
  fs.writeFileSync(path.join(repoRoot, 'console-script.js'), "'use strict';\n// Synthetic console script fixture.\n");
  fs.writeFileSync(path.join(extensionDir, 'content-script.js'), "'use strict';\n// Synthetic extension fixture.\n");
  fs.writeFileSync(path.join(extensionDir, 'chrome', 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'Music Converter',
    version: '2.0.0'
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(extensionDir, 'assets', 'playlist-panel.css'), '/* Synthetic stylesheet fixture. */\n');

  execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.name', 'Synthetic Test'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.email', 'synthetic@example.invalid'], { cwd: repoRoot });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoRoot });
  execFileSync('git', ['config', 'core.hooksPath', path.join(baseDir, 'empty-hooks')], { cwd: repoRoot });
  execFileSync('git', ['add', '--all'], { cwd: repoRoot });
  execFileSync('git', ['commit', '--quiet', '-m', 'synthetic release fixture'], { cwd: repoRoot });
  return repoRoot;
}

export function readZipEntryNames(buffer) {
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('ZIP end-of-directory record not found');

  const count = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const names = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('ZIP central-directory entry not found');
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names.sort();
}
