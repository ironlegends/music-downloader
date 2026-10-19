import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ALLOWED_OUTPUTS = Object.freeze([
  'console-script.js'
]);

const MODULE_ORDER = Object.freeze([
  'policy.js',
  'payload-parser.js',
  'spotmate-page-adapter.js',
  'spotmate-api-adapter.js',
  'conversion-session.js',
  'download-adapter.js',
  'track-session.js',
  'session-storage.js',
  'conversion-runner.js',
  'playlist-view.js',
  'index.js'
]);

const ARTIFACT_MODULES = Object.freeze({
  'console-script.js': MODULE_ORDER,
  'extension/content-script.js': Object.freeze(['policy.js', ...MODULE_ORDER.slice(1)])
});

const ENTRY_MAP = Object.freeze({
  'console-script.js': 'entries/console-script.js',
  'extension/content-script.js': 'entries/extension.js'
});

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major !== 22 && major !== 24) {
    console.error(`Node.js ${process.versions.node} is unsupported. Only versions 22 and 24 are allowed.`);
    process.exit(1);
  }
}

function normalizeLF(text) {
  return text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n');
}

function transformImportsExports(sourceCode, isEntry = false) {
  let transformed = sourceCode;

  // Replace named imports, including multiline imports.
  transformed = transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g,
    (_, specifiers, importPath) => {
      let resolved = importPath;
      if (isEntry && resolved.startsWith('../')) {
        resolved = './' + resolved.slice(3);
      }
      const mapped = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          if (s.includes(' as ')) {
            const [orig, alias] = s.split(/\s+as\s+/);
            return `${orig.trim()}: ${alias.trim()}`;
          }
          return s;
        })
        .join(', ');
      return `const { ${mapped} } = __require('${resolved}');`;
    }
  );

  // Replace named exports.
  transformed = transformed.replace(
    /export\s*\{([^}]+)\};?/g,
    (_, specifiers) => {
      const mapped = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          if (s.includes(' as ')) {
            const [orig, alias] = s.split(/\s+as\s+/);
            return `${alias.trim()}: ${orig.trim()}`;
          }
          return s;
        })
        .join(', ');
      return `return { ${mapped} };`;
    }
  );

  // Remove export default statements.
  transformed = transformed.replace(/export\s+default\s+[^;]+;?/g, '');

  return transformed.trim();
}

function generateHeader(artifactName, version) {
  if (artifactName === 'dist/spotmate.user.js') {
    return [
      '// ==UserScript==',
      '// @name         SpotMate Music Converter',
      '// @namespace    https://github.com/ironlegends/music-converter-open-source',
      `// @version      ${version}`,
      '// @description  Voluntary sequential conversion helper for SpotMate',
      '// @match        https://spotmate.online/en1',
      '// @match        https://spotmate.online/en1/',
      '// @grant        none',
      '// @run-at       document-idle',
      '// ==/UserScript=='
    ].join('\n');
  }

  if (artifactName === 'script2.txt') {
    return '// Script 2: voluntary sequential SpotMate conversions.';
  }

  if (artifactName === 'script3.txt') {
    return '// Script 3: voluntary downloads of HTTPS results only.';
  }

  if (artifactName === 'console-script.js') {
    return '// Complete SpotMate script for voluntary conversion and downloads.';
  }

  if (artifactName === 'extension/content-script.js') {
    return '// Isolated SpotMate Manifest V3 content script.';
  }

  return '';
}

function generateBundle(artifactName, rootDir) {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  const panelCssPath = path.join(rootDir, 'src/browser/panel.css');
  const panelCss = normalizeLF(fs.readFileSync(panelCssPath, 'utf8')).trim();

  const header = generateHeader(artifactName, version);
  const entryRelPath = ENTRY_MAP[artifactName];
  if (!entryRelPath) {
    throw new Error(`Unknown artifact: ${artifactName}`);
  }

  const moduleDefinitions = [];

  // Define the injected CSS and helper.
  moduleDefinitions.push(`  const PANEL_CSS = ${JSON.stringify(panelCss)};

  function __injectStyles(doc) {
    if (!doc || typeof doc.createElement !== 'function') return;
    const id = 'spotmate-panel-styles';
    if (doc.querySelector && doc.querySelector('#' + id)) return;
    if (doc.head && typeof doc.head.appendChild === 'function') {
      const style = doc.createElement('style');
      style.id = id;
      style.textContent = PANEL_CSS;
      doc.head.appendChild(style);
    }
  }`);

  const modulesToInclude = ARTIFACT_MODULES[artifactName] || MODULE_ORDER;

  // Compile the core modules.
  for (const modFile of modulesToInclude) {
    const modPath = path.join(rootDir, 'src/browser', modFile);
    const rawSource = normalizeLF(fs.readFileSync(modPath, 'utf8'));
    let transformed = transformImportsExports(rawSource, false);

    if (modFile === 'index.js') {
      // Call __injectStyles from createBrowserCore when documentRef is available.
      transformed = transformed.replace(
        'const supported = isAllowedSpotmatePage(windowRef.location);',
        'const supported = isAllowedSpotmatePage(windowRef.location);\n  if (supported && documentRef) __injectStyles(documentRef);'
      );
    }

    const key = './' + modFile;
    const indented = transformed.split('\n').map((l) => (l.trim() ? '    ' + l : '')).join('\n');
    moduleDefinitions.push(`  __modules['${key}'] = (() => {\n${indented}\n  })();`);
  }

  // Compile the entry module.
  const entryFullPath = path.join(rootDir, 'src/browser', entryRelPath);
  const rawEntrySource = normalizeLF(fs.readFileSync(entryFullPath, 'utf8'));
  let transformedEntry = transformImportsExports(rawEntrySource, true);
  if (entryRelPath === 'entries/legacy-download.js') {
    transformedEntry = transformedEntry.replace(
      'const supported = isAllowedSpotmatePage(windowRef.location);',
      'const supported = isAllowedSpotmatePage(windowRef.location);\n  if (supported && documentRef) __injectStyles(documentRef);'
    );
  }
  const indentedEntry = transformedEntry.split('\n').map((l) => (l.trim() ? '    ' + l : '')).join('\n');

  moduleDefinitions.push(`  __modules['./entry.js'] = (() => {\n${indentedEntry}\n  })();`);

  const body = [
    '(function () {',
    "  'use strict';",
    '',
    '  const __modules = {};',
    '  function __require(id) {',
    '    if (!__modules[id]) {',
    "      throw new Error('Module not found: ' + id);",
    '    }',
    '    return __modules[id];',
    '  }',
    '',
    moduleDefinitions.join('\n\n'),
    '',
    "  const { mount } = __require('./entry.js');",
    '  mount();',
    '})();'
  ].join('\n');

  const fullContent = (header ? header + '\n' : '') + body + '\n';
  return normalizeLF(fullContent);
}

function generateArtifacts(rootDir) {
  const artifacts = new Map();
  for (const name of ALLOWED_OUTPUTS) {
    artifacts.set(name, generateBundle(name, rootDir));
  }
  return artifacts;
}

function writeArtifactAtomically(targetPath, content) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });

  const tempPath = path.join(dir, `.tmp.${path.basename(targetPath)}.${crypto.randomBytes(6).toString('hex')}`);
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, targetPath);
}

function buildBrowserArtifacts({ rootDir, outDir } = {}) {
  const resolvedRoot = rootDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const targetDir = outDir || resolvedRoot;
  const artifacts = generateArtifacts(resolvedRoot);

  for (const [relPath, content] of artifacts) {
    const destPath = path.join(targetDir, relPath);
    writeArtifactAtomically(destPath, content);
  }
}

function getRelativeFiles(dir, base = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getRelativeFiles(fullPath, base));
    } else if (entry.isFile()) {
      const rel = path.relative(base, fullPath).replace(/\\/g, '/');
      files.push(rel);
    }
  }
  return files;
}

function checkBrowserArtifacts({ rootDir, outDir } = {}) {
  const resolvedRoot = rootDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const targetDir = outDir || resolvedRoot;
  const artifacts = generateArtifacts(resolvedRoot);

  const errors = [];
  for (const [relPath, expectedContent] of artifacts) {
    const destPath = path.join(targetDir, relPath);
    if (!fs.existsSync(destPath)) {
      errors.push(`Missing artifact: ${relPath}`);
      continue;
    }
    const currentBuffer = fs.readFileSync(destPath);
    const expectedBuffer = Buffer.from(expectedContent, 'utf8');
    if (Buffer.compare(currentBuffer, expectedBuffer) !== 0) {
      errors.push(`Content differs (byte-for-byte): ${relPath}`);
    }
  }

  if (targetDir !== resolvedRoot) {
    const allFiles = getRelativeFiles(targetDir);
    for (const rel of allFiles) {
      if (!ALLOWED_OUTPUTS.includes(rel)) {
        errors.push(`Unexpected artifact in output directory: ${rel}`);
      }
    }
  } else {
    const distDir = path.join(targetDir, 'dist');
    if (fs.existsSync(distDir)) {
      const distFiles = getRelativeFiles(distDir, targetDir);
      for (const rel of distFiles) {
        if (!ALLOWED_OUTPUTS.includes(rel) && !rel.startsWith('dist/chrome/')) {
          errors.push(`Unexpected file in dist/: ${rel}`);
        }
      }
    }
    const rootFiles = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const entry of rootFiles) {
      if (entry.isFile() && /^script.*\.txt$/.test(entry.name)) {
        if (entry.name !== 'script1.txt' && !ALLOWED_OUTPUTS.includes(entry.name)) {
          errors.push(`Unexpected root script: ${entry.name}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    return false;
  }
  return true;
}

function parseCliArgs(args) {
  let mode = null;
  let outDir = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--write') {
      if (mode && mode !== 'write') throw new Error('Conflicting modes specified.');
      mode = 'write';
    } else if (arg === '--check') {
      if (mode && mode !== 'check') throw new Error('Conflicting modes specified.');
      mode = 'check';
    } else if (arg === '--out-dir') {
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('--out-dir requires a valid path.');
      }
      outDir = args[i];
    } else {
      throw new Error(`Unknown or unsupported option: ${arg}`);
    }
  }

  if (!mode) {
    throw new Error('A mode (--write or --check) is required.');
  }

  return { mode, outDir };
}

function main() {
  checkNodeVersion();

  const rawArgs = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseCliArgs(rawArgs);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  if (parsed.mode === 'write') {
    buildBrowserArtifacts({ rootDir, outDir: parsed.outDir });
    console.log('Browser artifacts generated successfully.');
    process.exit(0);
  } else if (parsed.mode === 'check') {
    const ok = checkBrowserArtifacts({ rootDir, outDir: parsed.outDir });
    if (ok) {
      console.log('Browser artifact verification succeeded.');
      process.exit(0);
    } else {
      console.error('Browser artifact verification failed.');
      process.exit(1);
    }
  }
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1])) {
  main();
}

export {
  ALLOWED_OUTPUTS,
  generateArtifacts,
  generateBundle,
  normalizeLF,
  buildBrowserArtifacts,
  checkBrowserArtifacts
};
