import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function isSemver(version) {
  return typeof version === 'string' && SEMVER_REGEX.test(version.trim());
}

function isAtLeastV14(version) {
  if (typeof version !== 'string') return false;
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  return major > 1 || (major === 1 && minor >= 4);
}

function parseCliArgs(args) {
  let expectedVersion = null;
  let rootDir = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--version') {
      if (expectedVersion !== null) {
        throw new Error('Option --version was provided more than once.');
      }
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error('--version requires a SemVer version.');
      }
      expectedVersion = args[i].trim();
    } else if (arg.startsWith('--version=')) {
      if (expectedVersion !== null) {
        throw new Error('Option --version was provided more than once.');
      }
      expectedVersion = arg.slice('--version='.length).trim();
    } else if (arg === '--root' || arg === '--root-dir') {
      if (rootDir !== null) {
        throw new Error(`Option ${arg} was provided more than once.`);
      }
      i += 1;
      if (i >= args.length || args[i].startsWith('--')) {
        throw new Error(`${arg} requires a directory path.`);
      }
      rootDir = args[i].trim();
    } else if (arg.startsWith('--root=')) {
      if (rootDir !== null) {
        throw new Error('Option --root was provided more than once.');
      }
      rootDir = arg.slice('--root='.length).trim();
    } else if (arg.startsWith('--root-dir=')) {
      if (rootDir !== null) {
        throw new Error('Option --root-dir was provided more than once.');
      }
      rootDir = arg.slice('--root-dir='.length).trim();
    } else {
      throw new Error(`Unknown or unsupported option: ${arg}`);
    }
  }

  return { expectedVersion, rootDir };
}

function inspectPackageJson(resolvedRoot, expectedVersion) {
  const filePath = path.join(resolvedRoot, 'package.json');
  if (!fs.existsSync(filePath)) {
    return { observed: null, expected: expectedVersion, match: false, error: 'package.json not found.' };
  }
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const observed = typeof content.version === 'string' ? content.version.trim() : null;
    if (!observed) {
      return { observed: null, expected: expectedVersion, match: false, error: 'package.json version field is missing.' };
    }
    const match = observed === expectedVersion;
    return {
      observed,
      expected: expectedVersion,
      match,
      ...(match ? {} : { error: `package.json version '${observed}' does not match '${expectedVersion}'.` })
    };
  } catch {
    return { observed: null, expected: expectedVersion, match: false, error: 'package.json contains invalid JSON.' };
  }
}

function inspectChangelog(resolvedRoot, expectedVersion) {
  const filePath = path.join(resolvedRoot, 'CHANGELOG.md');
  if (!fs.existsSync(filePath)) {
    return { observed: null, expected: expectedVersion, match: false, error: 'CHANGELOG.md not found.' };
  }
  const content = fs.readFileSync(filePath, 'utf8');

  const headingMatches = Array.from(content.matchAll(/^[ \t]*##[ \t]+\[([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\]/gm));
  const seenVersions = new Set();
  for (const match of headingMatches) {
    const v = match[1];
    if (seenVersions.has(v)) {
      return { observed: null, expected: expectedVersion, match: false, error: `CHANGELOG.md contains duplicate release headings for '${v}'.` };
    }
    seenVersions.add(v);
  }

  const unreleasedIndex = content.indexOf('## [Unreleased]');
  if (unreleasedIndex === -1) {
    return { observed: null, expected: expectedVersion, match: false, error: 'CHANGELOG.md section ## [Unreleased] is missing.' };
  }

  const afterUnreleased = content.slice(unreleasedIndex + '## [Unreleased]'.length);
  const firstHeadingMatch = afterUnreleased.match(/^[ \t]*##[ \t]+\[([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\]([^\n]*)/m);

  if (!firstHeadingMatch) {
    return { observed: null, expected: expectedVersion, match: false, error: 'CHANGELOG.md first release heading below [Unreleased] was not found.' };
  }

  const observed = firstHeadingMatch[1].trim();
  const restOfLine = firstHeadingMatch[2].trim();
  const dateMatch = restOfLine.match(/^-\s*(\d{4}-\d{2}-\d{2})$/);

  if (!dateMatch) {
    return {
      observed,
      expected: expectedVersion,
      match: false,
      error: `CHANGELOG.md first heading for '${observed}' is missing the required YYYY-MM-DD date.`
    };
  }

  const match = observed === expectedVersion;
  return {
    observed,
    expected: expectedVersion,
    match,
    ...(match ? {} : { error: `CHANGELOG.md version '${observed}' does not match '${expectedVersion}'.` })
  };
}

function inspectReadmeBadge(resolvedRoot, expectedVersion) {
  const filePath = path.join(resolvedRoot, 'README.md');
  if (!fs.existsSync(filePath)) {
    return { observed: null, expected: expectedVersion, match: false, error: 'README.md not found.' };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const rawMatches = Array.from(content.matchAll(/img\.shields\.io\/badge\/version-([^?)\s]+)/g)).map((m) => m[1]);

  if (rawMatches.length === 0) {
    return { observed: null, expected: expectedVersion, match: false, error: 'README.md version badge not found.' };
  }

  if (rawMatches.length > 1) {
    return { observed: null, expected: expectedVersion, match: false, error: `README.md contains duplicate version badges (${rawMatches.length} found).` };
  }

  const rawVal = rawMatches[0].trim();
  const colorMatch = rawVal.match(/^(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+?)?)(?:-[a-zA-Z0-9]+)$/);
  const observed = (colorMatch ? colorMatch[1] : rawVal).trim();
  const match = observed === expectedVersion;
  return {
    observed,
    expected: expectedVersion,
    match,
    ...(match ? {} : { error: `README.md version badge '${observed}' does not match '${expectedVersion}'.` })
  };
}

function inspectUserscript(resolvedRoot, expectedVersion) {
  const filePath = path.join(resolvedRoot, 'dist/spotmate.user.js');
  if (!fs.existsSync(filePath)) {
    return { observed: null, expected: expectedVersion, match: false, error: 'dist/spotmate.user.js not found.' };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const allVersions = Array.from(content.matchAll(/\/\/\s*@version\s+([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)/g));

  if (allVersions.length === 0) {
    return { observed: null, expected: expectedVersion, match: false, error: 'dist/spotmate.user.js @version metadata not found.' };
  }

  if (allVersions.length > 1) {
    return { observed: null, expected: expectedVersion, match: false, error: `dist/spotmate.user.js contains duplicate @version metadata (${allVersions.length} found).` };
  }

  const observed = allVersions[0][1].trim();
  const match = observed === expectedVersion;
  return {
    observed,
    expected: expectedVersion,
    match,
    ...(match ? {} : { error: `dist/spotmate.user.js @version '${observed}' does not match '${expectedVersion}'.` })
  };
}

function inspectManifest(resolvedRoot, relPath, expectedVersion) {
  const filePath = path.join(resolvedRoot, relPath);
  if (!fs.existsSync(filePath)) {
    return { observed: null, expected: expectedVersion, match: false, error: `${relPath} not found.` };
  }
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const observed = typeof content.version === 'string' ? content.version.trim() : null;
    if (!observed) {
      return { observed: null, expected: expectedVersion, match: false, error: `${relPath} version field is missing.` };
    }
    const match = observed === expectedVersion;
    return {
      observed,
      expected: expectedVersion,
      match,
      ...(match ? {} : { error: `${relPath} version '${observed}' does not match '${expectedVersion}'.` })
    };
  } catch {
    return { observed: null, expected: expectedVersion, match: false, error: `${relPath} contains invalid JSON.` };
  }
}

function checkReleaseMetadata({ rootDir, expectedVersion } = {}) {
  const resolvedRoot = rootDir
    ? path.resolve(rootDir)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  let targetVersion = expectedVersion;
  if (!targetVersion) {
    const pkgPath = path.join(resolvedRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        targetVersion = typeof pkg.version === 'string' ? pkg.version.trim() : null;
      } catch {
        targetVersion = null;
      }
    }
  }

  const errors = [];
  if (!targetVersion || !isSemver(targetVersion)) {
    return {
      success: false,
      expectedVersion: targetVersion ?? 'unknown',
      surfaces: {},
      errors: [`Target version is invalid or not SemVer: '${targetVersion}'.`]
    };
  }

  const surfaces = {};

  surfaces['package.json'] = inspectPackageJson(resolvedRoot, targetVersion);
  surfaces['CHANGELOG.md'] = inspectChangelog(resolvedRoot, targetVersion);
  surfaces['README.md'] = inspectReadmeBadge(resolvedRoot, targetVersion);

  const major = parseInt((targetVersion.trim().match(/^(\d+)/) || [])[1] || '0', 10);
  if (major < 2 && fs.existsSync(path.join(resolvedRoot, 'dist/spotmate.user.js'))) {
    surfaces['dist/spotmate.user.js'] = inspectUserscript(resolvedRoot, targetVersion);
  }

  if (isAtLeastV14(targetVersion)) {
    surfaces['extension/chrome/manifest.json'] = inspectManifest(resolvedRoot, 'extension/chrome/manifest.json', targetVersion);
  }

  for (const [surfaceName, result] of Object.entries(surfaces)) {
    if (!result.match) {
      errors.push(result.error || `Version mismatch on surface: ${surfaceName}`);
    }
  }

  return {
    success: errors.length === 0,
    expectedVersion: targetVersion,
    surfaces,
    errors
  };
}

function main() {
  const rawArgs = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseCliArgs(rawArgs);
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  const result = checkReleaseMetadata({
    rootDir: parsed.rootDir,
    expectedVersion: parsed.expectedVersion
  });

  if (result.success) {
    console.log(`Release metadata verification succeeded (expected version: ${result.expectedVersion}).`);
    for (const [name, res] of Object.entries(result.surfaces)) {
      console.log(`- ${name}: ${res.observed} (OK)`);
    }
    process.exit(0);
  } else {
    console.error(`Release metadata verification failed (expected version: ${result.expectedVersion}).`);
    for (const [name, res] of Object.entries(result.surfaces)) {
      const status = res.match ? 'OK' : 'MISMATCH';
      console.error(`- ${name}: ${res.observed ?? 'not found'} (${status})`);
    }
    console.error('\nErrors:');
    for (const err of result.errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export {
  checkReleaseMetadata,
  parseCliArgs,
  isSemver,
  isAtLeastV14
};
