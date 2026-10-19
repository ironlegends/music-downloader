const fs = require('node:fs');

const OPAQUE_LITERAL = /(['"\x60])([A-Za-z0-9+/=_-]{32,})\1/g;
const MIN_ALPHANUMERIC_RATIO = 0.5;

function findOpaqueLiterals(content) {
  return Array.from(String(content).matchAll(OPAQUE_LITERAL))
    .filter((match) => {
      const alphanumericCount = (match[2].match(/[A-Za-z0-9]/g) || []).length;
      return alphanumericCount / match[2].length >= MIN_ALPHANUMERIC_RATIO;
    })
    .map((match) => ({ index: match.index, length: match[2].length }));
}

function assertNoOpaqueLiterals(content, fileName) {
  const matches = findOpaqueLiterals(content);
  if (matches.length > 0) {
    throw new Error(`${fileName} contains ${matches.length} possible opaque secret literal(s).`);
  }
}

function scanFiles(fileNames) {
  if (fileNames.length === 0) throw new Error('Provide at least one file to scan.');

  const violations = [];
  for (const fileName of fileNames) {
    const content = fs.readFileSync(fileName, 'utf8');
    for (const match of findOpaqueLiterals(content)) {
      violations.push(`${fileName}:${match.index} (${match.length} characters)`);
    }
  }
  return violations;
}

if (require.main === module) {
  const fileNames = process.argv.slice(2);
  const violations = scanFiles(fileNames);
  if (violations.length > 0) {
    console.error(`Opaque literals detected:\n${violations.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`SECRET_GUARD_OK files=${fileNames.length}`);
  }
}

module.exports = {
  OPAQUE_LITERAL,
  findOpaqueLiterals,
  assertNoOpaqueLiterals,
  scanFiles
};
