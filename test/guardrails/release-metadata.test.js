import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { checkReleaseMetadata } from '../../tools/check-release-metadata.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const toolScript = path.join(rootDir, 'tools/check-release-metadata.mjs');

function createTempRepo({
  version = '1.1.0',
  packageVersion = version,
  changelogHeading = `## [${version}] - 2026-08-25`,
  readmeBadgeVersion = version,
  userscriptVersion = version,
  includeManifests = false,
  chromeManifestVersion = version
} = {}) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, '.tmp-release-test-'));

  const pkg = {
    name: 'music-converter',
    version: packageVersion,
    private: true,
    license: 'MIT',
    type: 'module'
  };
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  const changelog = [
    '# Changelog',
    '',
    '## [Unreleased]',
    '',
    '- Ongoing changes',
    '',
    changelogHeading,
    '',
    '- Previous release changes',
    '',
    '## [1.0.0] - 2026-08-25',
    '',
    '- Initial release'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(tempDir, 'CHANGELOG.md'), changelog, 'utf8');

  const readme = [
    '# Music Converter',
    '',
    '[![CI](https://github.com/ironlegends/music-downloader/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square)](https://github.com/ironlegends/music-downloader/actions/workflows/ci.yml?query=branch%3Amain)',
    `[![Version ${readmeBadgeVersion}](https://img.shields.io/badge/version-${readmeBadgeVersion}-blue?style=flat-square)](https://github.com/ironlegends/music-downloader/releases)`,
    '[![Node 22 | 24](https://img.shields.io/badge/node-22%20%7C%2024-339933?style=flat-square)](https://nodejs.org/)'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(tempDir, 'README.md'), readme, 'utf8');

  const distDir = path.join(tempDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const userscript = [
    '// ==UserScript==',
    '// @name         SpotMate Music Converter',
    '// @namespace    https://github.com/ironlegends/music-downloader',
    `// @version      ${userscriptVersion}`,
    '// @description  Voluntary sequential conversion helper for SpotMate',
    '// ==/UserScript==',
    '(function () {})();'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(distDir, 'spotmate.user.js'), userscript, 'utf8');

  if (includeManifests) {
    const chromeDir = path.join(tempDir, 'extension/chrome');
    fs.mkdirSync(chromeDir, { recursive: true });
    fs.writeFileSync(path.join(chromeDir, 'manifest.json'), JSON.stringify({ name: 'ext', version: chromeManifestVersion }, null, 2) + '\n', 'utf8');
  }

  return tempDir;
}

test('package.json defines the private MIT-licensed music-converter package', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, 'music-converter');
  assert.equal(packageJson.version, '2.0.0');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.license, 'MIT');
});

test('CHANGELOG exists and keeps release sections in order', () => {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  assert.equal(fs.existsSync(changelogPath), true, 'CHANGELOG.md must exist');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.match(changelog, /^## \[2.0.0\] - 2026-08-27$/m);
  assert.match(changelog, /^## \[1\.6\.1\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.6\.0\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.5\.0\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.4\.0\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.3\.0\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.2\.0\] - 2026-08-26$/m);
  assert.match(changelog, /^## \[1\.1\.0\] - 2026-08-25$/m);
  assert.match(changelog, /^## \[1\.0\.0\] - 2026-08-25$/m);
  assert.ok(changelog.indexOf('## [Unreleased]') < changelog.indexOf('## [2.0.0] - 2026-08-27'));
  assert.ok(changelog.indexOf('## [2.0.0] - 2026-08-27') < changelog.indexOf('## [1.6.1] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.6.1] - 2026-08-26') < changelog.indexOf('## [1.6.0] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.6.0] - 2026-08-26') < changelog.indexOf('## [1.5.0] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.5.0] - 2026-08-26') < changelog.indexOf('## [1.4.0] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.4.0] - 2026-08-26') < changelog.indexOf('## [1.3.0] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.3.0] - 2026-08-26') < changelog.indexOf('## [1.2.0] - 2026-08-26'));
  assert.ok(changelog.indexOf('## [1.2.0] - 2026-08-26') < changelog.indexOf('## [1.1.0] - 2026-08-25'));
  assert.ok(changelog.indexOf('## [1.1.0] - 2026-08-25') < changelog.indexOf('## [1.0.0] - 2026-08-25'));
  assert.match(changelog, /voluntary.*helper/i);
});



test('checkReleaseMetadata validates version 2.0.0 in the current repository', () => {
  const result = checkReleaseMetadata({ rootDir, expectedVersion: '2.0.0' });
  assert.equal(result.success, true);
  assert.equal(result.expectedVersion, '2.0.0');
  assert.equal(result.surfaces['package.json'].observed, '2.0.0');
  assert.equal(result.surfaces['CHANGELOG.md'].observed, '2.0.0');
  assert.equal(result.surfaces['README.md'].observed, '2.0.0');
  if (result.surfaces['dist/spotmate.user.js']) {
    assert.equal(result.surfaces['dist/spotmate.user.js'].observed, '2.0.0');
  }
  assert.equal(result.surfaces['extension/chrome/manifest.json'].observed, '2.0.0');
  assert.equal(result.surfaces['extension/edge/manifest.json'], undefined);
  assert.equal(result.errors.length, 0);
});

test('checkReleaseMetadata rejects versions 1.5.0 and 1.7.0 for a 2.0.0 release', () => {
  const result150 = checkReleaseMetadata({ rootDir, expectedVersion: '1.5.0' });
  assert.equal(result150.success, false);
  const result170 = checkReleaseMetadata({ rootDir, expectedVersion: '1.7.0' });
  assert.equal(result170.success, false);
});

test('checkReleaseMetadata detects a mismatch on each release surface', () => {
  // 1. package.json mismatch.
  const dir1 = createTempRepo({ packageVersion: '1.1.1' });
  try {
    const res = checkReleaseMetadata({ rootDir: dir1, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.equal(res.surfaces['package.json'].match, false);
    assert.match(res.errors.join('\n'), /package\.json/);
  } finally {
    fs.rmSync(dir1, { recursive: true, force: true });
  }

  // 2. CHANGELOG mismatch.
  const dir2 = createTempRepo({ changelogHeading: '## [1.0.9] - 2026-08-25' });
  try {
    const res = checkReleaseMetadata({ rootDir: dir2, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.equal(res.surfaces['CHANGELOG.md'].match, false);
    assert.match(res.errors.join('\n'), /CHANGELOG\.md/);
  } finally {
    fs.rmSync(dir2, { recursive: true, force: true });
  }

  // 3. README badge mismatch.
  const dir3 = createTempRepo({ readmeBadgeVersion: '1.0.0' });
  try {
    const res = checkReleaseMetadata({ rootDir: dir3, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.equal(res.surfaces['README.md'].match, false);
    assert.match(res.errors.join('\n'), /README\.md/);
  } finally {
    fs.rmSync(dir3, { recursive: true, force: true });
  }

  // 4. Userscript @version mismatch.
  const dir4 = createTempRepo({ userscriptVersion: '1.0.5' });
  try {
    const res = checkReleaseMetadata({ rootDir: dir4, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.equal(res.surfaces['dist/spotmate.user.js'].match, false);
    assert.match(res.errors.join('\n'), /dist\/spotmate\.user\.js/);
  } finally {
    fs.rmSync(dir4, { recursive: true, force: true });
  }
});

test('Chrome manifests are optional before v1.4.0 and required from v1.4.0 onward', () => {
  // v1.2.0 without a manifest succeeds for the surfaces that exist.
  const dirV12 = createTempRepo({ version: '1.2.0', includeManifests: false });
  try {
    const res = checkReleaseMetadata({ rootDir: dirV12, expectedVersion: '1.2.0' });
    assert.equal(res.success, true);
    assert.equal(res.surfaces['extension/chrome/manifest.json'], undefined);
  } finally {
    fs.rmSync(dirV12, { recursive: true, force: true });
  }

  // v1.4.0 without a manifest fails because manifests are required from v1.4.0 onward.
  const dirV14Missing = createTempRepo({ version: '1.4.0', includeManifests: false });
  try {
    const res = checkReleaseMetadata({ rootDir: dirV14Missing, expectedVersion: '1.4.0' });
    assert.equal(res.success, false);
    assert.match(res.errors.join('\n'), /manifest/i);
  } finally {
    fs.rmSync(dirV14Missing, { recursive: true, force: true });
  }

  // v1.4.0 with a valid Chrome manifest succeeds.
  const dirV14Valid = createTempRepo({ version: '1.4.0', includeManifests: true });
  try {
    const res = checkReleaseMetadata({ rootDir: dirV14Valid, expectedVersion: '1.4.0' });
    assert.equal(res.success, true);
    assert.equal(res.surfaces['extension/chrome/manifest.json'].observed, '1.4.0');
  } finally {
    fs.rmSync(dirV14Valid, { recursive: true, force: true });
  }

  // v1.4.0 with a mismatched Chrome manifest fails.
  const dirV14Mismatch = createTempRepo({ version: '1.4.0', includeManifests: true, chromeManifestVersion: '1.3.9' });
  try {
    const res = checkReleaseMetadata({ rootDir: dirV14Mismatch, expectedVersion: '1.4.0' });
    assert.equal(res.success, false);
    assert.equal(res.surfaces['extension/chrome/manifest.json'].match, false);
  } finally {
    fs.rmSync(dirV14Mismatch, { recursive: true, force: true });
  }
});

test('check-release-metadata CLI reports success and failure without exposing sensitive output', () => {
  // Successful CLI run.
  const dirSuccess = createTempRepo({ version: '1.1.0' });
  try {
    const out = execFileSync(process.execPath, [toolScript, '--version', '1.1.0', '--root', dirSuccess], {
      encoding: 'utf8'
    });
    assert.match(out, /1\.1\.0/);
    assert.doesNotMatch(out, /(?:password|secret|token|cookie|finalAudioUrl|https:\/\/[^\s]+\.mp3)/i);
  } finally {
    fs.rmSync(dirSuccess, { recursive: true, force: true });
  }

  // Failing CLI run.
  const dirFail = createTempRepo({ version: '1.1.0', packageVersion: '1.0.0' });
  try {
    let failed = false;
    try {
      execFileSync(process.execPath, [toolScript, '--version', '1.1.0', '--root', dirFail], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      failed = true;
      assert.equal(err.status, 1);
      const combinedOutput = (err.stdout || '') + (err.stderr || '');
      assert.match(combinedOutput, /package\.json/);
      assert.doesNotMatch(combinedOutput, /(?:password|secret|token|cookie|finalAudioUrl|https:\/\/[^\s]+\.mp3)/i);
    }
    assert.equal(failed, true, 'The CLI must exit with a non-zero status when metadata does not match.');
  } finally {
    fs.rmSync(dirFail, { recursive: true, force: true });
  }

  // Reject duplicate CLI arguments.
  assert.throws(() => {
    execFileSync(process.execPath, [toolScript, '--version', '1.1.0', '--version', '1.2.0'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  }, /--version/i);

  assert.throws(() => {
    execFileSync(process.execPath, [toolScript, '--version', '1.1.0', '--root', '.', '--root', './temp'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  }, /--root/i);
});

test('checkReleaseMetadata rejects invalid dates and duplicate metadata on every surface', () => {
  // 1. CHANGELOG heading without a YYYY-MM-DD date.
  const dirNoDate = createTempRepo({ changelogHeading: '## [1.1.0]' });
  try {
    const res = checkReleaseMetadata({ rootDir: dirNoDate, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.match(res.errors.join('\n'), /CHANGELOG\.md/);
    assert.match(res.errors.join('\n'), /date/i);
  } finally {
    fs.rmSync(dirNoDate, { recursive: true, force: true });
  }

  // 2. Duplicate CHANGELOG headings.
  const dirDupChangelog = createTempRepo({ version: '1.1.0' });
  try {
    const changelogPath = path.join(dirDupChangelog, 'CHANGELOG.md');
    fs.appendFileSync(changelogPath, '\n## [1.1.0] - 2026-08-25\n- duplicate entry\n');
    const res = checkReleaseMetadata({ rootDir: dirDupChangelog, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.match(res.errors.join('\n'), /CHANGELOG\.md.*(duplicate|multiple)/i);
  } finally {
    fs.rmSync(dirDupChangelog, { recursive: true, force: true });
  }

  // 3. Duplicate README version badges.
  const dirDupBadge = createTempRepo({ version: '1.1.0' });
  try {
    const readmePath = path.join(dirDupBadge, 'README.md');
    fs.appendFileSync(readmePath, '\n[![Version 1.1.0](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square)](https://github.com/)\n');
    const res = checkReleaseMetadata({ rootDir: dirDupBadge, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.match(res.errors.join('\n'), /README\.md.*(duplicate|multiple)/i);
  } finally {
    fs.rmSync(dirDupBadge, { recursive: true, force: true });
  }

  // 4. Duplicate userscript @version.
  const dirDupUserscript = createTempRepo({ version: '1.1.0' });
  try {
    const scriptPath = path.join(dirDupUserscript, 'dist/spotmate.user.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    fs.writeFileSync(scriptPath, content.replace('// ==/UserScript==', '// @version 1.1.0\n// ==/UserScript=='), 'utf8');
    const res = checkReleaseMetadata({ rootDir: dirDupUserscript, expectedVersion: '1.1.0' });
    assert.equal(res.success, false);
    assert.match(res.errors.join('\n'), /dist\/spotmate\.user\.js.*(duplicate|multiple)/i);
  } finally {
    fs.rmSync(dirDupUserscript, { recursive: true, force: true });
  }
});
