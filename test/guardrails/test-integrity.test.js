import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testDir = path.join(rootDir, 'test');

function walkTestFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        files = files.concat(walkTestFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

test("no active test may be a trivial placeholder or contain test('pass')", () => {
  const testFiles = walkTestFiles(testDir);
  assert.ok(testFiles.length > 0, 'At least one test file must exist.');

  const violations = [];

  for (const filePath of testFiles) {
    if (filePath.endsWith('test-integrity.test.js')) continue;

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (/test\(\s*['"]pass['"]|it\(\s*['"]pass['"]/.test(fileContent)) {
      violations.push(`${relPath}: contains a trivial test named 'pass'`);
    }

    if (/\(\s*\)\s*=>\s*assert\.ok\(\s*true\s*\)/.test(fileContent) || /assert\.ok\(\s*true\s*\)\s*;?\s*\}\s*\)/.test(fileContent)) {
      violations.push(`${relPath}: contains an assert.ok(true) placeholder`);
    }

    if (/assert\.(?:ok|equal)\(\s*1\s*===\s*1\s*\)|assert\.notEqual\(\s*['"]a['"]\s*,\s*['"]b['"]\s*\)|assert\.notEqual\(\s*['"]test['"]\s*,\s*['"]fail['"]\s*\)/.test(fileContent)) {
      violations.push(`${relPath}: contains a trivial placeholder assertion (1===1, etc.)`);
    }

    if (fileContent.trim().split(/\r?\n/).length <= 2 && fileContent.includes('assert.ok(true)')) {
      violations.push(`${relPath}: is an empty test stub`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Test files contain forbidden placeholders:\n${violations.join('\n')}`
  );
});
