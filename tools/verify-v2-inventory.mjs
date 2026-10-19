import fs from 'node:fs';
import path from 'node:path';

export function scanV2Inventory({ rootDir }) {
  const allowlist = [
    'extension/assets/playlist-panel.css',
    'extension/chrome/manifest.json',
    'extension/content-script.js',
    'console-script.js',
    'LICENSE'
  ];

  const forbiddenPatterns = [
    /^server\.js$/,
    /^public\//,
    /^src\/bridge-.*\.js$/,
    /^src\/browser\/bridge-.*\.js$/,
    /^src\/downloader\.js$/,
    /^src\/queue-manager\.js$/,
    /^src\/safe-https-client\.js$/,
    /^src\/spotify-extractor\.js$/,
    /^src\/spotmate-client\.js$/,
    /^src\/windows-usb\.js$/,
    /^packaging\/windows\//,
    /^extension\/service-worker\.js$/,
    /^extension\/message-adapter\.js$/,
    /^script1\.txt$/,
    /^script2\.txt$/,
    /^script3\.txt$/,
    /^src\/browser\/entries\/userscript\.js$/,
    /^src\/browser\/entries\/legacy-.*\.js$/,
    /^dist\/spotmate\.user\.js$/,
    /^dist\/chrome\/.*\.zip$/,
    /^dist\/edge\/.*\.zip$/,
    /^docs\/guides\/(?:pairing|usb-downloads|windows-launcher)\.md$/,
    /^docs\/diagnostics-(?:evidence|runbook)\.md$/,
    /^docs\/releases\/v1\..*\.md$/,
    /^docs\/security\/.*usb.*\.md$/,
    /^docs\/pairing\.md$/,
    /^qa\/v1\..*\.md$/
  ];

  const ignoreDirs = ['.git', 'node_modules', 'docs/archive/v1'];

  let errors = [];
  let forbidden = [];
  let active = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (ignoreDirs.includes(relPath) || ignoreDirs.some(id => relPath.startsWith(id + '/'))) {
          continue;
        }
        if (entry.name.startsWith('.tmp') || entry.name.startsWith('temp_')) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        let isForbidden = false;

        for (const pattern of forbiddenPatterns) {
          if (pattern.test(relPath)) {
            isForbidden = true;
            break;
          }
        }

        if (isForbidden) {
          forbidden.push(relPath);
          errors.push(`Forbidden file found: ${relPath}`);
        } else if (allowlist.includes(relPath)) {
          active.push(relPath);
        }
      }
    }
  }

  walk(rootDir);

  return {
    success: errors.length === 0,
    errors,
    forbidden,
    active
  };
}
