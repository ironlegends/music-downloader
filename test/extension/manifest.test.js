import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { assertV2Manifest } from '../../tools/manifest-contract.mjs';

const manifestPaths = [
  new URL('../../extension/chrome/manifest.json', import.meta.url)
];

describe('V2 Manifest Contract', () => {
  it('validates the current Chrome manifest because it uses Manifest V3', () => {
    for (const manifestPath of manifestPaths) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assertV2Manifest(manifest, { browser: 'chrome' }); // Must not throw.
    }
  });

  const validManifest = {
    manifest_version: 3,
    name: "Music Converter",
    version: "2.0.0",
    description: "Converter",
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';"
    },
    content_scripts: [{
      matches: ['https://spotmate.online/en1', 'https://spotmate.online/en1/'],
      js: ['content-script.js'],
      css: ['assets/playlist-panel.css'],
      run_at: 'document_idle',
      world: 'ISOLATED'
    }]
  };

  it('rejects all 14 forbidden manifest keys', () => {
    const forbidden = [
      'permissions', 'optional_permissions', 'host_permissions', 'background', 'action',
      'commands', 'scripting', 'tabs', 'downloads', 'nativeMessaging',
      'web_accessible_resources', 'externally_connectable', 'version_name', 'storage'
    ];

    for (const key of forbidden) {
      const mutated = { ...validManifest, [key]: {} };
      assert.throws(() => {
        assertV2Manifest(mutated, { browser: 'chrome' });
      }, new RegExp(`Forbidden key in manifest: ${key}`));
    }
  });

  it('rejects all_frames', () => {
    const mutated = JSON.parse(JSON.stringify(validManifest));
    mutated.content_scripts[0].all_frames = true;
    assert.throws(() => {
      assertV2Manifest(mutated, { browser: 'chrome' });
    }, /all_frames is refused/);
  });

  it('rejects broad origins, wildcards, and localhost', () => {
    const mutatedWildcard = JSON.parse(JSON.stringify(validManifest));
    mutatedWildcard.content_scripts[0].matches = ['https://spotmate.online/*'];
    assert.throws(() => {
      assertV2Manifest(mutatedWildcard, { browser: 'chrome' });
    }, /Invalid matches in content_scripts|localhost or wildcards are forbidden/);

    const mutatedLocalhost = JSON.parse(JSON.stringify(validManifest));
    mutatedLocalhost.content_scripts[0].matches = ['https://localhost/en1', 'https://spotmate.online/en1/'];
    assert.throws(() => {
      assertV2Manifest(mutatedLocalhost, { browser: 'chrome' });
    }, /Invalid matches in content_scripts|localhost or wildcards are forbidden/);
  });
});
