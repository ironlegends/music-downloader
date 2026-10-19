import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function dosDateTimeFromEpoch(epochSeconds) {
  const d = epochSeconds ? new Date(epochSeconds * 1000) : new Date('1980-01-01T00:00:00Z');
  const year = Math.max(1980, d.getUTCFullYear());
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const seconds = Math.floor(d.getUTCSeconds() / 2);

  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = (hours << 11) | (minutes << 5) | seconds;

  return { dosDate, dosTime };
}

export function createDeterministicZipBuffer(entries, { sourceDateEpoch = 0 } = {}) {
  const { dosDate, dosTime } = dosDateTimeFromEpoch(sourceDateEpoch);

  const sortedEntries = entries
    .map((e) => ({
      name: e.name.replace(/\\/g, '/').replace(/^\/+/, ''),
      data: Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8')
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of sortedEntries) {
    const filenameBuf = Buffer.from(entry.name, 'utf8');
    const uncompressedBuf = entry.data;
    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 9 });
    const crc = zlib.crc32(uncompressedBuf);

    // Local header (30 bytes + name)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);          // Version 2.0
    localHeader.writeUInt16LE(0x0800, 6);      // UTF-8 flag
    localHeader.writeUInt16LE(8, 8);           // Deflate
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedBuf.length, 18);
    localHeader.writeUInt32LE(uncompressedBuf.length, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedBuf);

    // Central header (46 bytes + name)
    const centralHeader = Buffer.alloc(46 + filenameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE((3 << 8) | 20, 4); // Unix OS (3) + Version 2.0 (20)
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedBuf.length, 20);
    centralHeader.writeUInt32LE(uncompressedBuf.length, 24);
    centralHeader.writeUInt16LE(filenameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0x81a40000, 38); // 0644 regular file
    centralHeader.writeUInt32LE(offset, 42);
    filenameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedBuf.length;
  }

  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
  const centralDirOffset = offset;

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(sortedEntries.length, 8);
  eocd.writeUInt16LE(sortedEntries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
