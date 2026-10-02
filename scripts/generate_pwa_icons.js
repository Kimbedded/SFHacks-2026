import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(2, 9); // Color type 2: RGB
  ihdrData.writeUInt8(0, 10); // Compression method
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: height lines, each line starts with filter byte 0, followed by width * 3 bytes
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * scanlineLength;
    rawData[lineOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = lineOffset + 1 + x * 3;
      // Border or circle pattern
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < width * 0.45) {
        // Gold / purple emblem
        if (dist > width * 0.38 && dist < width * 0.42) {
          rawData[pxOffset] = 245;     // R (Gold)
          rawData[pxOffset + 1] = 158; // G
          rawData[pxOffset + 2] = 11;  // B
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
        }
      } else {
        rawData[pxOffset] = 76;   // Outer purple #4c1d95
        rawData[pxOffset + 1] = 29;
        rawData[pxOffset + 2] = 149;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const header = Buffer.alloc(4);
  header.writeUInt32BE(length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);

  const crc = crc32(body);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([header, body, crcBuffer]);
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, 33, 16, 66));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, 33, 16, 66));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, 76, 29, 149));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, 76, 29, 149));
console.log('PWA PNG icons generated successfully!');
