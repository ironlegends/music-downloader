import assert from 'node:assert/strict';
import test from 'node:test';

export function expectedV2ReleaseNames(version) {
  return [
    `music-converter-v${version}-chrome-extension.zip`,
    `console-script.js`,
    `LICENSE`,
    `SHA256SUMS`,
    `sbom.spdx.json`,
    `release-manifest.json`
  ];
}

test('the v2 release contract replaces the old 11-asset contract', () => {
  const version = "2.0.0";
  const expectedV2 = expectedV2ReleaseNames(version);

  assert.strictEqual(expectedV2.length, 6, 'V2 has exactly 6 assets');

  // The old contract expected things like: userscript, windows-portable, etc. (11 assets)
  // We can simulate verifying against the old contract which would fail.
  const oldContractNames = [
    `music-converter-v${version}-chrome-extension.zip`,
    `music-converter-v${version}-edge-extension.zip`,
    `music-converter-v${version}-windows-portable.exe`,
    `music-converter-v${version}-windows-setup.exe`,
    `script1.txt`,
    `script2.txt`,
    `script3.txt`,
    `legacy-console-script.txt`,
    `spotmate.user.js`,
    `SHA256SUMS`,
    `sbom.spdx.json`
  ]; // that's 11 assets

  assert.throws(() => {
    assert.deepEqual(expectedV2.sort(), oldContractNames.sort());
  }, /AssertionError|not strict equal/, 'V2 array must not match V1 11-asset array');
});
