/**
 * imageDimensions.mjs — read the real width/height out of image bytes.
 *
 * WHY: the provider is ground truth; a declaration is a claim. `generate()` sent
 * `aspect_ratio: '16:9'` and recorded `aspectRequested: '16:9'` — and never once
 * looked at what came back. Gemini returns 1376x768 (1.792) for a 1.778 request;
 * GPT returns 1536x864 (1.778 exactly). A 1376x768 image is perfectly usable. A
 * SILENT 1376x768 is a lie, and it is the same 'claimed'-treated-as-'verified'
 * disease that produced every other defect in this subsystem.
 *
 * WHY NO DEPENDENCY: reading a header is ~80 lines and adding a package to parse
 * four magic numbers is a supply-chain surface for no gain.
 *
 * THE RULE THAT SHAPES THIS FILE: return `null` for anything not positively
 * identified. A previous version applied PNG offsets to a JPEG and reported
 * "65536 x 4293722192" without complaint. Nothing downstream questioned it,
 * because a number looks like an answer. An admitted gap is strictly better than
 * a confident wrong number.
 */

/** Decode base64 (with or without a data: URI prefix) to a Buffer. */
export function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  const s = String(input ?? '');
  if (!s) return Buffer.alloc(0);
  const comma = s.startsWith('data:') ? s.indexOf(',') : -1;
  const b64 = comma >= 0 ? s.slice(comma + 1) : s;
  try { return Buffer.from(b64, 'base64'); } catch { return Buffer.alloc(0); }
}

function png(b) {
  // 89 P N G \r \n 1a \n, then an IHDR chunk whose w/h are big-endian at 16/20.
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), format: 'png' };
}

function jpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  // Walk the segment chain to a Start-Of-Frame marker. Dimensions do NOT live at
  // a fixed offset in a JPEG — that assumption is what produced the bogus number
  // this module was written to prevent.
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xda || marker === 0xd9) return null;         // hit image data, no SOF
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    // SOF0..SOF15, excluding DHT(c4), JPG(c8) and DAC(cc), which are not frames.
    const isSOF = marker >= 0xc0 && marker <= 0xcf
      && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      if (i + 9 >= b.length) return null;
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), format: 'jpeg' };
    }
    i += 2 + len;
  }
  return null;
}

function gif(b) {
  if (b.length < 10) return null;
  const sig = b.toString('ascii', 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8), format: 'gif' };
}

function webp(b) {
  // RIFF....WEBP, then one of three chunk layouts. All three are handled because
  // providers pick between them by content and a caller cannot predict which.
  if (b.length < 30) return null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    if (b.length < 30) return null;
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, format: 'webp' };
  }
  if (chunk === 'VP8L') {
    if (b.length < 25) return null;
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
  }
  if (chunk === 'VP8X') {
    if (b.length < 30) return null;
    const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { width: w, height: h, format: 'webp' };
  }
  return null;
}

/**
 * @returns {{width:number,height:number,format:string}|null}
 *   null when the format is not positively identified, or the header is
 *   truncated. Never a guess.
 */
export function imageDimensions(input) {
  const b = toBuffer(input);
  if (b.length < 10) return null;
  const hit = png(b) || jpeg(b) || gif(b) || webp(b);
  if (!hit) return null;
  // A zero or absurd dimension means the header was misread; refuse it rather
  // than pass it on. 65535 is the JPEG ceiling; PNG's spec ceiling is 2^31-1 but
  // no real generated image approaches it, so this is a sanity bound, not a spec bound.
  if (!hit.width || !hit.height || hit.width > 100_000 || hit.height > 100_000) return null;
  return hit;
}
