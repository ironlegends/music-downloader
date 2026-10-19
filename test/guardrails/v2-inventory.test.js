import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { scanV2Inventory } from '../../tools/verify-v2-inventory.mjs';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

describe('V2 Inventory Guardrails', () => {
  it('passes on the current repository', () => {
    const result = scanV2Inventory({ rootDir });

    assert.strictEqual(result.success, true, 'Expected inventory check to pass on current repo');
    assert.ok(result.forbidden.length === 0, 'Should not have found forbidden v1 files');
  });

  it('allows archived v1 documentation but rejects the retired active guide', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2-inventory-test-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'docs/archive/v1'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'docs/archive/v1/pairing.md'), 'test');
      fs.writeFileSync(path.join(tmpDir, 'docs/pairing.md'), 'test');

      const result = scanV2Inventory({ rootDir: tmpDir });

      assert.strictEqual(result.success, false);
      assert.ok(result.forbidden.includes('docs/pairing.md'), 'docs/pairing.md should be forbidden');
      assert.ok(!result.forbidden.includes('docs/archive/v1/pairing.md'), 'docs/archive/v1/pairing.md should be ignored');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
