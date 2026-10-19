import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(fileURLToPath(new URL('../..', import.meta.url)));

test('the v2.0.0 QA checklist is present and includes the required Chrome checks', () => {
  const filepath = join(rootDir, 'qa/v2.0.0-extension-checklist.md');
  assert.equal(existsSync(filepath), true, 'qa/v2.0.0-extension-checklist.md must exist');
  const content = readFileSync(filepath, 'utf8');
  assert.match(content, /PENDING/);
  assert.match(content, /Chrome/i);
  assert.match(content, /Load unpacked/i);
  assert.match(content, /Turnstile/i);
  assert.match(content, /voluntary/i);
});
