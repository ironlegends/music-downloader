import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createDeterministicZipBuffer } from './zip.mjs';
import { execSync } from 'node:child_process';

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readNormalizedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.txt', '.ps1', '.yml', '.yaml']);
  if (textExtensions.has(ext)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return Buffer.from(raw.replace(/\r\n/g, '\n'), 'utf8');
  }
  return fs.readFileSync(filePath);
}

export function generateSbom({ version }) {
  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `Music Converter v${version} SBOM`,
    documentNamespace: `https://github.com/ironlegends/music-converter-open-source/releases/tag/v${version}#sbom`,
    creationInfo: {
      creators: [`Tool: music-converter-sbom-generator-${version}`],
      created: '1980-01-01T00:00:00Z'
    },
    packages: [
      {
        name: 'music-converter',
        SPDXID: 'SPDXRef-Package-music-converter',
        versionInfo: version,
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: 'NOASSERTION',
        licenseDeclared: 'MIT',
        copyrightText: 'NOASSERTION'
      }
    ],
    relationships: [
      {
        spdxElementId: 'SPDXRef-DOCUMENT',
        relatedSpdxElement: 'SPDXRef-Package-music-converter',
        relationshipType: 'DESCRIBES'
      }
    ]
  };
}

function getSourceRevision(root) {
  try {
    const rev = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    if (!/^[0-9a-f]{40}$/.test(rev)) {
      throw new Error(`Invalid revision: ${rev}`);
    }
    return rev;
  } catch (err) {
    throw new Error('Unable to read sourceRevision with git rev-parse HEAD.');
  }
}

export async function buildRelease({
  repoRoot,
  outputDir,
  sourceDateEpoch = 0
} = {}) {
  const root = repoRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

  if (!outputDir) {
    throw new Error('outputDir is required. Do not create a persistent dist-release/ directory in the repository.');
  }

  const targetDir = path.resolve(outputDir);
  if (targetDir.startsWith(root) && !targetDir.includes('node_modules') && !targetDir.includes('.git')) {
    // Basic check to discourage in-repo persistence unless it's a known temp structure, but strictly we throw if it's dist-release
    if (path.basename(targetDir) === 'dist-release') {
      throw new Error('Do not create a persistent dist-release/ directory in the repository.');
    }
  }

  if (fs.existsSync(targetDir)) {
    const targetStat = fs.lstatSync(targetDir);
    if (targetStat.isSymbolicLink() || !targetStat.isDirectory()) {
      throw new Error(`Invalid output directory: ${targetDir}`);
    }
    if (fs.readdirSync(targetDir).length > 0) {
      throw new Error(`Refusing non-empty output directory: ${targetDir}`);
    }
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  const sourceRevision = getSourceRevision(root);

  // 1. Chrome extension ZIP.
  const chromeEntries = [
    { name: 'manifest.json', data: readNormalizedFile(path.join(root, 'extension', 'chrome', 'manifest.json')) },
    { name: 'content-script.js', data: readNormalizedFile(path.join(root, 'extension', 'content-script.js')) },
    { name: 'assets/playlist-panel.css', data: readNormalizedFile(path.join(root, 'extension', 'assets', 'playlist-panel.css')) },
    { name: 'LICENSE', data: readNormalizedFile(path.join(root, 'LICENSE')) }
  ];
  const chromeZip = createDeterministicZipBuffer(chromeEntries, { sourceDateEpoch });
  const chromeZipName = `music-converter-v${version}-chrome-extension.zip`;
  fs.writeFileSync(path.join(targetDir, chromeZipName), chromeZip);

  // 2. Console script and standalone license.
  const consoleScriptName = 'console-script.js';
  const consoleScriptData = readNormalizedFile(path.join(root, consoleScriptName));
  fs.writeFileSync(path.join(targetDir, consoleScriptName), consoleScriptData);
  const licenseName = 'LICENSE';
  const licenseData = readNormalizedFile(path.join(root, licenseName));
  fs.writeFileSync(path.join(targetDir, licenseName), licenseData);

  // 3. SBOM.
  const sbomName = 'sbom.spdx.json';
  const sbomObj = generateSbom({ version });
  const sbomBuffer = Buffer.from(JSON.stringify(sbomObj, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(targetDir, sbomName), sbomBuffer);

  // 4. SHA256SUMS checksums.
  const hashablePayloads = [
    chromeZipName,
    consoleScriptName,
    licenseName,
    sbomName
  ].sort();

  const checksumLines = hashablePayloads.map((name) => {
    const fileBuf = fs.readFileSync(path.join(targetDir, name));
    return `${sha256(fileBuf)}  ${name}`;
  });
  const checksumsName = 'SHA256SUMS';
  const checksumsBuffer = Buffer.from(checksumLines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(targetDir, checksumsName), checksumsBuffer);

  // 5. Release manifest.
  const releaseManifestName = 'release-manifest.json';
  const filesArray = hashablePayloads.map((name) => {
    const fileBuf = fs.readFileSync(path.join(targetDir, name));
    return {
      name,
      size: fileBuf.length,
      sha256: sha256(fileBuf)
    };
  });

  const inventory = [
    chromeZipName,
    consoleScriptName,
    licenseName,
    checksumsName,
    sbomName,
    releaseManifestName
  ].sort();

  const releaseManifest = {
    version,
    sourceRevision,
    sourceDateEpoch,
    inventory,
    files: filesArray
  };
  fs.writeFileSync(path.join(targetDir, releaseManifestName), JSON.stringify(releaseManifest, null, 2) + '\n', 'utf8');

  return {
    version,
    outputDir: targetDir,
    manifest: releaseManifest
  };
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  let outDir = null;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--out' || args[i] === '--out-dir') {
      outDir = args[i + 1];
      i += 1;
    }
  }
  const epoch = process.env.SOURCE_DATE_EPOCH ? parseInt(process.env.SOURCE_DATE_EPOCH, 10) : 0;

  if (!outDir) {
    console.error('Error: --out-dir is required.');
    process.exit(1);
  }

  buildRelease({ outputDir: outDir, sourceDateEpoch: epoch }).then((res) => {
    console.log(`Distribution v${res.version} generated successfully in ${res.outputDir}.`);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
