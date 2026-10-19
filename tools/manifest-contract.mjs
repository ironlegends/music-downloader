import { assertChromeTarget } from './browser-target.mjs';

export function assertV2Manifest(manifest, { browser }) {
  assertChromeTarget(browser);

  const allowlist = [
    'manifest_version',
    'name',
    'version',
    'description',
    'content_scripts',
    'content_security_policy'
  ];

  const forbidden = [
    'permissions', 'optional_permissions', 'host_permissions', 'background', 'action',
    'commands', 'scripting', 'tabs', 'downloads', 'nativeMessaging',
    'web_accessible_resources', 'externally_connectable', 'version_name', 'storage'
  ];

  for (const key of Object.keys(manifest)) {
    if (forbidden.includes(key)) {
      throw new Error(`Forbidden key in manifest: ${key}`);
    }
    if (!allowlist.includes(key)) {
      throw new Error(`Key not in allowlist: ${key}`);
    }
  }

  if (!manifest.content_scripts || manifest.content_scripts.length !== 1) {
    throw new Error('Manifest must have exactly one content script');
  }

  const cs = manifest.content_scripts[0];

  if (!cs.matches || cs.matches.length !== 2 ||
      !cs.matches.includes('https://spotmate.online/en1') ||
      !cs.matches.includes('https://spotmate.online/en1/')) {
    throw new Error("Invalid matches in content_scripts");
  }

  if (cs.all_frames === true) {
    throw new Error('all_frames is refused');
  }

  if (!cs.js || cs.js.length !== 1 || cs.js[0] !== 'content-script.js') {
    throw new Error('Invalid js in content_scripts');
  }

  if (!cs.css || cs.css.length !== 1 || cs.css[0] !== 'assets/playlist-panel.css') {
    throw new Error('Invalid css in content_scripts');
  }

  if (cs.run_at !== 'document_idle') {
    throw new Error('run_at must be document_idle');
  }

  if (cs.world !== 'ISOLATED') {
    throw new Error('world must be ISOLATED');
  }

  const manifestStr = JSON.stringify(manifest);
  if (manifestStr.includes('localhost') || manifestStr.includes('*')) {
    throw new Error('localhost or wildcards are forbidden');
  }
}
