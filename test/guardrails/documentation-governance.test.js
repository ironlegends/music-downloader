import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(fileURLToPath(new URL('../..', import.meta.url)));

function readRepoFile(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test('README displays exactly the three baseline flat-square badges', () => {
  const readme = readRepoFile('README.md');
  const badgeLines = readme.split(/\r?\n/).filter((line) => line.includes('style=flat-square'));

  assert.equal(badgeLines.length, 3, 'README must display exactly three flat-square badges.');
  assert.match(readme, /github\.com\/ironlegends\/music-downloader\/actions\/workflows\/ci\.yml\/badge\.svg\?branch=main/);
  const pkg = JSON.parse(readRepoFile('package.json'));
  const escapedVersion = pkg.version.replace(/\./g, '\\.');
  assert.match(readme, new RegExp(`version[-_ ]${escapedVersion}`, 'i'));
  assert.match(readme, /node[-_ ]22(?:%20|\s+)\|(?:%20|\s+)24/i);
  assert.doesNotMatch(readme, /\[!\[[^\]]*(license|licence)/i);
});

test('README and architecture describe the SpotMate v2.0.0 safety contract', () => {
  for (const file of ['README.md', 'docs/architecture.md']) {
    const content = readRepoFile(file);
    assert.match(content, /https:\/\/spotmate\.online\/en1/);
    assert.match(content, /Turnstile[^\n]*manual/i);
    assert.match(content, /event\.isTrusted|trusted (?:user )?click/i);
    assert.match(content, /(?:automatic download|download automatically|background download)/i);
  }
});

test('GitHub templates request evidence, redaction, and release gates', () => {
  const templatePaths = [
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/PULL_REQUEST_TEMPLATE.md'
  ];
  const requiredPatterns = [
    /reproduct|reproduction/i,
    /expected behavior/i,
    /environment/i,
    /token|cookie|audio URL|sensitive data|sensitive/i,
    /test|tests/i,
    /SemVer|version/i
  ];

  for (const file of templatePaths) {
    const content = readRepoFile(file);
    for (const pattern of requiredPatterns) {
      assert.match(content, pattern, `${file} must request ${pattern}.`);
    }
  }
});

test('active documentation does not publish sensitive audio values', () => {
  for (const file of ['README.md', 'docs/architecture.md']) {
    const content = readRepoFile(file);
    assert.doesNotMatch(content, /finalAudioUrl/);
  }
});
