import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { scanPostBuildArtifact } from '../post-build-scan.mjs';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function expectedArtifactNames(version) {
  return [
    `music-converter-v${version}-chrome-extension.zip`,
    'console-script.js',
    'LICENSE',
    'sbom.spdx.json'
  ].sort();
}

function isPathInside(rootDir, filename) {
  const resolved = path.resolve(rootDir, filename);
  const prefix = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  return resolved !== rootDir && resolved.startsWith(prefix);
}

function isValidSemver(version) {
  return typeof version === 'string'
    && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
}

export async function checkArtifacts(options = {}, maybeVersion) {
  const artifactDir = typeof options === 'string' ? options : options?.artifactDir;
  const expectedVersion = typeof options === 'string' ? maybeVersion : options?.expectedVersion;
  const errors = [];
  if (!artifactDir) {
    return { success: false, errors: ['Artifact directory was not specified.'] };
  }
  const targetDir = path.resolve(artifactDir);

  if (!fs.existsSync(targetDir)) {
    return { success: false, errors: [`Artifact directory not found: ${targetDir}`] };
  }

  const targetStat = fs.lstatSync(targetDir);
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
    return { success: false, errors: [`Invalid artifact directory: ${targetDir}`] };
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const directNames = entries.map((entry) => entry.name).sort();

  // 1. Check release-manifest.json
  const manifestPath = path.join(targetDir, 'release-manifest.json');
  let manifest = null;
  if (!fs.existsSync(manifestPath)) {
    errors.push('release-manifest.json is missing.');
  } else {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (expectedVersion && manifest.version !== expectedVersion) {
        errors.push(`Manifest version (${manifest.version}) does not match the expected version (${expectedVersion}).`);
      }
      if (!/^[0-9a-f]{40}$/.test(manifest.sourceRevision)) {
        errors.push(`sourceRevision is invalid or missing: ${manifest.sourceRevision}`);
      }
    } catch (err) {
      errors.push(`release-manifest.json is invalid: ${err.message}`);
    }
  }

  const manifestVersion = manifest?.version;
  const version = expectedVersion ?? manifestVersion;
  const versionIsValid = isValidSemver(version);
  if (!versionIsValid) {
    errors.push('Release version is missing or invalid (SemVer x.y.z is required).');
  }
  const artifactNames = versionIsValid ? expectedArtifactNames(version) : [];
  const expectedNames = [...artifactNames, 'SHA256SUMS', 'release-manifest.json'].sort();
  const sumsPath = path.join(targetDir, 'SHA256SUMS');

  const sbomPath = path.join(targetDir, 'sbom.spdx.json');
  if (versionIsValid && fs.existsSync(sbomPath)) {
    try {
      const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
      if (sbom.dataLicense !== 'CC0-1.0') {
        errors.push('SBOM dataLicense must be CC0-1.0.');
      }
      const softwarePackage = Array.isArray(sbom.packages)
        ? sbom.packages.find((pkg) => pkg?.name === 'music-converter')
        : null;
      if (!softwarePackage || softwarePackage.licenseDeclared !== 'MIT') {
        errors.push('SBOM must declare MIT for the music-converter package.');
      }
    } catch (err) {
      errors.push(`sbom.spdx.json is invalid: ${err.message}`);
    }
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) errors.push(`Security: symbolic links are not allowed: ${entry.name}`);
    else if (!entry.isFile()) errors.push(`Security: non-regular entry: ${entry.name}`);
  }
  if (versionIsValid && JSON.stringify(directNames) !== JSON.stringify(expectedNames)) {
    const extras = directNames.filter((name) => !expectedNames.includes(name));
    const missing = expectedNames.filter((name) => !directNames.includes(name));
    if (extras.length > 0) errors.push(`Unexpected artifacts: ${extras.join(', ')}`);
    if (missing.length > 0) errors.push(`Missing artifacts: ${missing.join(', ')}`);
  }

  if (manifest && versionIsValid) {
    if (!Array.isArray(manifest.files)) {
      errors.push('release-manifest.json.files must be an array.');
    } else {
      const manifestNames = manifest.files.map((file) => file?.name).sort();
      if (JSON.stringify(manifestNames) !== JSON.stringify(artifactNames)) {
        errors.push('release-manifest.json does not match the expected closed inventory.');
      }
      const seenManifestNames = new Set();
      for (const file of manifest.files) {
        if (!file || typeof file.name !== 'string' || !artifactNames.includes(file.name)) {
          errors.push(`Invalid entry in release-manifest.json: ${JSON.stringify(file)}`);
          continue;
        }
        if (seenManifestNames.has(file.name)) {
          errors.push(`Duplicate entry in release-manifest.json: ${file.name}`);
          continue;
        }
        seenManifestNames.add(file.name);
        if (!Number.isInteger(file.size) || file.size < 0 || !/^[0-9a-f]{64}$/.test(file.sha256 || '')) {
          errors.push(`Invalid metadata in release-manifest.json: ${file.name}`);
          continue;
        }
        const filePath = path.join(targetDir, file.name);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
        const fileBuf = fs.readFileSync(filePath);
        if (fileBuf.length !== file.size) errors.push(`Size mismatch in release-manifest.json for ${file.name}.`);
        if (sha256(fileBuf) !== file.sha256) errors.push(`Hash mismatch in release-manifest.json for ${file.name}.`);
      }
    }
  }

  // 2. Check SHA256SUMS
  if (!fs.existsSync(sumsPath)) {
    errors.push('SHA256SUMS is missing.');
  } else {
    const sumsContent = fs.readFileSync(sumsPath, 'utf8').trim();
    const lines = sumsContent ? sumsContent.split('\n') : [];
    const checksumNames = [];

    for (const line of lines) {
      const match = line.match(/^([0-9a-f]{64})  (.+)$/);
      if (!match) {
        errors.push(`Invalid line in SHA256SUMS: ${line}`);
        continue;
      }
      const [_, expectedHash, filename] = match;
      const cleanName = filename;
      checksumNames.push(cleanName);

      if (!isPathInside(targetDir, cleanName)) {
        errors.push(`Security: path traversal detected in ${cleanName}.`);
        continue;
      }

      const filePath = path.resolve(targetDir, cleanName);

      if (versionIsValid && !artifactNames.includes(cleanName)) {
        errors.push(`Unexpected file in SHA256SUMS: ${cleanName}`);
        continue;
      }

      if (!fs.existsSync(filePath)) {
        errors.push(`File listed in SHA256SUMS not found: ${cleanName}`);
        continue;
      }

      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink()) {
        errors.push(`Security: symbolic link is not allowed: ${cleanName}`);
        continue;
      }

      if (!stat.isFile()) {
        errors.push(`Security: non-regular file listed in SHA256SUMS: ${cleanName}`);
        continue;
      }

      const fileBuf = fs.readFileSync(filePath);
      const computedHash = sha256(fileBuf);
      if (computedHash !== expectedHash) {
        errors.push(`SHA-256 mismatch for ${cleanName}: expected ${expectedHash}, calculated ${computedHash}.`);
      }
    }

    if (versionIsValid && JSON.stringify([...checksumNames].sort()) !== JSON.stringify(artifactNames)) {
      errors.push('SHA256SUMS does not match the expected artifacts exactly.');
    }
  }

  // 3. Scan for forbidden strings
  const forbiddenSubstrings = ['.env', 'client_secret', 'session_secret', 'private_key', 'BEGIN RSA PRIVATE KEY'];
  const allEntries = entries;
  for (const entry of allEntries) {
    if (!entry.isFile()) continue;
    const f = entry.name;
    if (f.endsWith('.json') || f.endsWith('.js') || f.endsWith('.txt') || f === 'SHA256SUMS') {
      const content = fs.readFileSync(path.join(targetDir, f), 'utf8');
      for (const forbidden of forbiddenSubstrings) {
        if (content.includes(forbidden)) {
          errors.push(`Forbidden string found in ${f}: ${forbidden}`);
        }
      }
    }
  }

  // 4. Run the post-build scan on the artifacts.
  if (versionIsValid) {
    for (const name of artifactNames) {
      if (name.endsWith('.zip') || name === 'console-script.js') {
        const artifactPath = path.join(targetDir, name);
        if (fs.existsSync(artifactPath)) {
          try {
            scanPostBuildArtifact(artifactPath);
          } catch (err) {
            errors.push(`Post-build scan failed for ${name}: ${err.message}`);
          }
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

if (process.argv[1] && process.argv[1].endsWith('check-artifacts.mjs')) {
  let targetDir = process.argv[2];
  let version = null;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--version') {
      version = args[i + 1];
      i += 1;
    } else if (!args[i].startsWith('--') && !targetDir) {
      targetDir = args[i];
    }
  }

  if (!version) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
      version = pkg.version;
    } catch {
      // Fallback to manifest version
    }
  }

  if (!targetDir) {
    console.error('Usage: node tools/release/check-artifacts.mjs <dist-dir> [--version <x.y.z>]');
    console.error('');
    console.error('  <dist-dir>          Directory containing the built release artifacts.');
    console.error('  --version <x.y.z>   Expected semver version string (defaults to package.json).');
    process.exit(1);
  }

  checkArtifacts({ artifactDir: targetDir, expectedVersion: version }).then((res) => {
    if (res.success) {
      console.log('RELEASE_ARTIFACTS_OK');
    } else {
      console.error('RELEASE_ARTIFACTS_FAILED:');
      for (const err of res.errors) {
        console.error(` - ${err}`);
      }
      process.exit(1);
    }
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
