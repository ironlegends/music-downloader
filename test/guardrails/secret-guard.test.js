import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { findOpaqueLiterals, assertNoOpaqueLiterals, scanFiles } = require('../../tests/secret-guard.cjs');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relNorm = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (['.git', 'node_modules', 'dist'].includes(entry.name) || entry.name.startsWith('.')) {
      continue;
    }
    if (relNorm.startsWith('docs/archive/v1') || relNorm.startsWith('docs/superpowers')) {
      continue;
    }

    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath, relNorm);
    }
  }
}

test('secret-guard: active files contain no secret, token, password, or raw audio URL', () => {
  const prohibitedPatterns = [
    { pattern: /https:\/\/.*(?:audio|cdn\.spotify|spotmate-storage).*\/track/i, name: 'direct audio URL' },
    { pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i, name: 'hard-coded API key or secret' },
    { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, name: 'PEM private key' },
    { pattern: /document\.cookie\s*=/i, name: 'DOM cookie write' },
    { pattern: /chrome\.cookies/i, name: 'chrome.cookies API' }
  ];

  const ignoreFiles = [
    'test/guardrails/secret-guard.test.js'
  ];

  const violations = [];

  const check = (fullPath, relNorm) => {
    if (ignoreFiles.includes(relNorm)) return;

    // Scan only source files, scripts, manifests, docs and tests
    if (!/\.(?:js|mjs|cjs|json|md|html|css|txt|yml|yaml)$/.test(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');
    for (const { pattern, name } of prohibitedPatterns) {
      if (pattern.test(content)) {
        violations.push(`${relNorm}: ${name}`);
      }
    }
  };

  walkDir(path.join(rootDir, 'src'), check);
  walkDir(path.join(rootDir, 'extension'), check);
  walkDir(path.join(rootDir, 'tools'), check);
  walkDir(path.join(rootDir, 'docs'), check);
  walkDir(path.join(rootDir, 'test'), check);
  walkDir(path.join(rootDir, 'tests'), check);

  assert.deepEqual(
    violations,
    [],
    `Prohibited patterns or secrets were found:\n${violations.join('\n')}`
  );
});

test('secret-guard: detects synthetic opaque literals without exposing their value', () => {
  const syntheticValue = `SYNTHETIC_FIXTURE_${'A'.repeat(40)}`;
  const syntheticSource = `const fixture = ${JSON.stringify(syntheticValue)};`;

  assert.equal(findOpaqueLiterals(syntheticSource).length, 1);
  assert.throws(() => assertNoOpaqueLiterals(syntheticSource, 'synthetic fixture'), /possible opaque secret literal/);
  assert.doesNotThrow(() => assertNoOpaqueLiterals('const fixture = "[REDACTED]";', 'redacted fixture'));
});

test('secret-guard: file scanning works outside a Git repository', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-guard-'));
  try {
    const fixturePath = path.join(tempDir, 'redacted-fixture.js');
    const guardPath = path.join(rootDir, 'tests', 'secret-guard.cjs');
    fs.writeFileSync(fixturePath, 'const fixture = "[REDACTED]";\n');
    assert.deepEqual(scanFiles([fixturePath]), []);
    const result = spawnSync(process.execPath, [guardPath, fixturePath], { cwd: tempDir, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SECRET_GUARD_OK files=1/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
