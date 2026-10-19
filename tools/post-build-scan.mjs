import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function readZipEntries(zipBuffer) {
  const entries = [];
  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      // Local file header
      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const filenameLength = zipBuffer.readUInt16LE(offset + 26);
      const extraLength = zipBuffer.readUInt16LE(offset + 28);
      const name = zipBuffer.toString('utf8', offset + 30, offset + 30 + filenameLength);
      const dataOffset = offset + 30 + filenameLength + extraLength;
      const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);
      let data;
      if (compressionMethod === 8) {
        data = zlib.inflateRawSync(compressedData);
      } else if (compressionMethod === 0) {
        data = compressedData;
      } else {
        throw new Error(`Unsupported compression method: ${compressionMethod} (${name})`);
      }
      entries.push({ name, data });
      offset = dataOffset + compressedSize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      // Central directory header or EOCD, local headers finished
      break;
    } else {
      offset += 1;
    }
  }
  return entries;
}

export function scanPostBuildArtifact(artifactPath) {
  const errors = [];
  const entries = [];
  const forbiddenMotifs = ['service-worker', 'bridge', 'server.js', 'localhost'];

  const ext = path.extname(artifactPath).toLowerCase();

  if (ext === '.zip') {
    try {
      const zipBuffer = fs.readFileSync(artifactPath);
      const zipEntries = readZipEntries(zipBuffer);

      const allowedEntries = ['manifest.json', 'content-script.js', 'assets/playlist-panel.css', 'LICENSE'];

      for (const entry of zipEntries) {
        const normalizedName = entry.name.replace(/\\/g, '/');
        entries.push(normalizedName);

        if (normalizedName.includes('..') || path.isAbsolute(normalizedName) || normalizedName.startsWith('/')) {
          errors.push(`Path traversal detected: ${normalizedName}`);
        }

        if (!allowedEntries.includes(normalizedName)) {
          errors.push(`Unexpected file: ${normalizedName}`);
        }

        const content = entry.data.toString('utf8');
        for (const motif of forbiddenMotifs) {
          if (content.includes(motif)) {
            errors.push(`Forbidden pattern (${motif}) found in ${normalizedName}`);
          }
        }
      }

      const observedEntries = [...entries].sort();
      const expectedEntries = [...allowedEntries].sort();
      if (JSON.stringify(observedEntries) !== JSON.stringify(expectedEntries)) {
        errors.push(`ZIP entries do not match the required set: observed ${JSON.stringify(observedEntries)}`);
      }
    } catch (err) {
      errors.push(`Artifact extraction or scan failed: ${err.message}`);
    }
  } else if (ext === '.txt' || ext === '.js') {
    try {
      const content = fs.readFileSync(artifactPath, 'utf8');
      entries.push(path.basename(artifactPath));
      for (const motif of forbiddenMotifs) {
        if (content.includes(motif)) {
          errors.push(`Forbidden pattern (${motif}) found in ${artifactPath}`);
        }
      }
    } catch (e) {
      errors.push(`Text artifact read failed: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return { success: true, entries };
}
