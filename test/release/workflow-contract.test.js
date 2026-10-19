import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

test('GitHub Actions workflows follow security, SHA pinning and least privilege invariants', () => {
  const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
  const releasePath = path.join(root, '.github', 'workflows', 'release.yml');

  assert.equal(fs.existsSync(ciPath), true, 'ci.yml must exist');
  assert.equal(fs.existsSync(releasePath), true, 'release.yml must exist');

  const ciContent = fs.readFileSync(ciPath, 'utf8');
  const releaseContent = fs.readFileSync(releasePath, 'utf8');

  // Permissions least privilege
  assert.match(ciContent, /permissions:\s+contents:\s+read/);
  assert.match(releaseContent, /permissions:\s+contents:\s+write/);

  // SHA pinning on actions
  assert.match(ciContent, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(ciContent, /actions\/setup-node@[0-9a-f]{40}/);
  assert.match(releaseContent, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(releaseContent, /actions\/setup-node@[0-9a-f]{40}/);

  // Release triggers only on manual workflow_dispatch with qa_confirmed
  assert.match(releaseContent, /workflow_dispatch:/);
  assert.match(releaseContent, /qa_confirmed:/);
  assert.match(releaseContent, /id:\s*validate_tag/);
  assert.match(releaseContent, /REQUESTED_TAG:\s*\$\{\{\s*inputs\.tag\s*\}\}/);
  assert.match(releaseContent, /QA_CONFIRMED:/);
  assert.match(releaseContent, /ref:\s*\$\{\{\s*steps\.validate_tag\.outputs\.commit\s*\}\}/);
  assert.match(releaseContent, /node tools\/verify-release-qa\.mjs\s+"qa\/\$\{REQUESTED_TAG\}-extension-checklist\.md"/);

  // No arbitrary secrets or npm publish
  assert.equal(releaseContent.includes('npm publish'), false);
  assert.equal(ciContent.includes('npm publish'), false);
});
