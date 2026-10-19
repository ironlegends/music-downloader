import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export function writeSbom({
  repoRoot,
  outputPath,
  sourceDateEpoch = 0
} = {}) {
  const root = repoRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  const targetPath = outputPath || path.join(root, 'dist-release', 'sbom.spdx.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const sbom = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `Music Converter v${version} SBOM`,
    documentNamespace: `https://github.com/ironlegends/music-converter-open-source/releases/tag/v${version}#sbom`,
    creationInfo: {
      creators: [`Tool: music-converter-write-sbom-${version}`],
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

  fs.writeFileSync(targetPath, JSON.stringify(sbom, null, 2) + '\n', 'utf8');
  return sbom;
}

if (process.argv[1] && process.argv[1].endsWith('write-sbom.mjs')) {
  let outPath = null;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--out') {
      outPath = args[i + 1];
      i += 1;
    }
  }
  const sbom = writeSbom({ outputPath: outPath });
  console.log(`SBOM generated: ${sbom.name}`);
}
