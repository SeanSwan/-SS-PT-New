import test from 'node:test';
import assert from 'node:assert/strict';
import { imageDimensions, toBuffer } from '../../../shared/imageDimensions.mjs';

/** Minimal but REAL headers — not mocks. Each is what the format actually says. */

function pngHeader(w, h) {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

/** A JPEG with an APP0 segment BEFORE the frame — the whole point of the walker. */
function jpegHeader(w, h) {
  const app0 = Buffer.alloc(18);
  app0.writeUInt16BE(0xffd8, 0);          // SOI
  app0.writeUInt16BE(0xffe0, 2);          // APP0
  app0.writeUInt16BE(14, 4);              // length
  app0.write('JFIF\0', 6, 'ascii');
  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);           // SOF0
  sof.writeUInt16BE(17, 2);               // length
  sof.writeUInt8(8, 4);                   // precision
  sof.writeUInt16BE(h, 5);                // height FIRST — the order that trips people
  sof.writeUInt16BE(w, 7);
  return Buffer.concat([app0, sof, Buffer.alloc(8)]);
}

function gifHeader(w, h) {
  const b = Buffer.alloc(13);
  b.write('GIF89a', 0, 'ascii');
  b.writeUInt16LE(w, 6);
  b.writeUInt16LE(h, 8);
  return b;
}

function webpVP8X(w, h) {
  const b = Buffer.alloc(32);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(26, 4);
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  b.writeUInt32LE(10, 16);
  b.writeUInt32LE(0, 20);
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
}

test('PNG dimensions are read from IHDR', () => {
  assert.deepEqual(imageDimensions(pngHeader(1536, 864)), { width: 1536, height: 864, format: 'png' });
});

test('JPEG dimensions are found by WALKING to the frame marker', () => {
  // This is the regression that named the module. A previous version applied PNG
  // offsets to JPEG bytes and confidently reported "65536 x 4293722192". Nothing
  // downstream questioned it, because a number looks like an answer.
  const got = imageDimensions(jpegHeader(1536, 864));
  assert.deepEqual(got, { width: 1536, height: 864, format: 'jpeg' });
  assert.notEqual(got.width, 65536);
  assert.notEqual(got.height, 4293722192);
});

test('GIF and WebP(VP8X) are read correctly', () => {
  assert.deepEqual(imageDimensions(gifHeader(800, 600)), { width: 800, height: 600, format: 'gif' });
  assert.deepEqual(imageDimensions(webpVP8X(1920, 1080)), { width: 1920, height: 1080, format: 'webp' });
});

test('base64 and data: URIs decode the same as raw bytes', () => {
  const raw = pngHeader(1024, 1024);
  assert.deepEqual(imageDimensions(raw.toString('base64')), { width: 1024, height: 1024, format: 'png' });
  assert.deepEqual(imageDimensions(`data:image/png;base64,${raw.toString('base64')}`),
    { width: 1024, height: 1024, format: 'png' });
});

test('an UNIDENTIFIED format returns null, never a guess', () => {
  // The governing rule of this module: an admitted gap beats a confident wrong
  // number. Everything here is a plausible-looking buffer that is not an image.
  assert.equal(imageDimensions(Buffer.from('not an image at all, just prose')), null);
  assert.equal(imageDimensions(Buffer.alloc(64)), null);          // all zeroes
  assert.equal(imageDimensions(''), null);
  assert.equal(imageDimensions(null), null);
  assert.equal(imageDimensions('https://example.com/image.png'), null); // a URL, not bytes
});

test('a TRUNCATED header returns null rather than reading past the end', () => {
  assert.equal(imageDimensions(pngHeader(100, 100).subarray(0, 18)), null);
  assert.equal(imageDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), null);
});

test('a JPEG that reaches image data with no frame marker returns null', () => {
  const b = Buffer.alloc(24);
  b.writeUInt16BE(0xffd8, 0);
  b.writeUInt16BE(0xffda, 2);   // SOS — scan data, no SOF was ever seen
  b.writeUInt16BE(12, 4);
  assert.equal(imageDimensions(b), null);
});

test('a zero or absurd dimension is refused as a misread header', () => {
  assert.equal(imageDimensions(pngHeader(0, 864)), null);
  assert.equal(imageDimensions(pngHeader(1536, 0)), null);
  assert.equal(imageDimensions(pngHeader(4_000_000, 10)), null);
});

test('toBuffer never throws on hostile input', () => {
  for (const v of [undefined, null, '', 'zzz!!!not-base64', {}, 42]) {
    assert.ok(Buffer.isBuffer(toBuffer(v)));
  }
});
