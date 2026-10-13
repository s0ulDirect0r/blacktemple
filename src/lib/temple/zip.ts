// Uncompressed ZIP, streamed entry-by-entry. No third-party archive runtime.
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(bytes: Uint8Array) { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export async function* zip(entries: AsyncIterable<{ name: string; bytes: Buffer }>) {
  let offset = 0;
  const directory: Buffer[] = [];
  for await (const entry of entries) {
    const name = Buffer.from(entry.name), size = entry.bytes.length, crc = crc32(entry.bytes);
    if (entry.name.includes('..') || entry.name.startsWith('/') || directory.length >= 65535 || offset + size > 0xffffffff) throw new Error('Archive limit exceeded');
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20,4); header.writeUInt16LE(0x800,6); header.writeUInt16LE(0x21,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(size,18); header.writeUInt32LE(size,22); header.writeUInt16LE(name.length,26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(0x800,8); central.writeUInt16LE(0x21,14); central.writeUInt32LE(crc,16); central.writeUInt32LE(size,20); central.writeUInt32LE(size,24); central.writeUInt16LE(name.length,28); central.writeUInt32LE(offset,42);
    directory.push(Buffer.concat([central,name])); offset += header.length + name.length + size;
    yield header; yield name; yield entry.bytes;
  }
  const centralSize = directory.reduce((n,b) => n+b.length,0);
  for (const item of directory) yield item;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(directory.length,8); end.writeUInt16LE(directory.length,10); end.writeUInt32LE(centralSize,12); end.writeUInt32LE(offset,16); yield end;
}
