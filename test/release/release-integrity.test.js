import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildRelease } from '../../tools/release/build.mjs';
import { checkArtifacts } from '../../tools/release/check-artifacts.mjs';
import { createSyntheticReleaseRepo } from '../support/synthetic-release-repo.js';

test('release-integrity rejects modified and missing assets', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-int-'));
  try {
    const repoRoot = createSyntheticReleaseRepo(tmp);
    const outputDir = path.join(tmp, 'release');
    await buildRelease({ repoRoot, outputDir });

    const res = await checkArtifacts(outputDir);
    assert.equal(res.success, true);

    const script = path.join(outputDir, 'console-script.js');
    const origScript = fs.readFileSync(script);
    fs.appendFileSync(script, ' ');
    assert.equal((await checkArtifacts(outputDir)).success, false);
    fs.writeFileSync(script, origScript);

    const manifest = path.join(outputDir, 'release-manifest.json');
    const origManifest = fs.readFileSync(manifest);
    fs.rmSync(manifest);
    assert.equal((await checkArtifacts(outputDir)).success, false);
    fs.writeFileSync(manifest, origManifest);

    const manData = JSON.parse(origManifest.toString('utf8'));
    manData.sourceRevision = '1234';
    fs.writeFileSync(manifest, JSON.stringify(manData));
    assert.equal((await checkArtifacts(outputDir)).success, false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
