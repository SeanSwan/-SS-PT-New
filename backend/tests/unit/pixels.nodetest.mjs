import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import {
  decodePng, averageColor, toHex, colorDistance, paletteAudit,
  SWAN_PALETTE, RETIRED_PALETTE,
} from '../../../shared/pixels.mjs';

/** Build a REAL PNG (correct CRCs, real zlib) of one solid colour. */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td), 0);
  return Buffer.concat([len, td, crc]);
}

/**
 * @param opts.filter  which PNG filter type to encode with — all five must
 *   decode identically, and Paeth (4) is the one real encoders actually use.
 */
function solidPng(w, h, [r, g, b], { colorType = 2, filter = 0, bitDepth = 8, interlace = 0 } = {}) {
  const ch = colorType === 6 ? 4 : 3;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = bitDepth; ihdr[9] = colorType; ihdr[12] = interlace;

  const stride = w * ch;
  const raw = Buffer.alloc((stride + 1) * h);
  // Encode by running the filter forward, so the decoder must genuinely invert it.
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y += 1) {
    const line = Buffer.alloc(stride);
    for (let x = 0; x < w; x += 1) {
      const p = x * ch;
      line[p] = r; line[p + 1] = g; line[p + 2] = b;
      if (ch === 4) line[p + 3] = 255;
    }
    const off = y * (stride + 1);
    raw[off] = filter;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= ch ? line[x - ch] : 0;
      const bb = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let enc;
      switch (filter) {
        case 1: enc = line[x] - a; break;
        case 2: enc = line[x] - bb; break;
        case 3: enc = line[x] - ((a + bb) >> 1); break;
        case 4: {
          const pa = Math.abs(bb - c); const pb = Math.abs(a - c); const pc = Math.abs(a + bb - 2 * c);
          enc = line[x] - ((pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c));
          break;
        }
        default: enc = line[x];
      }
      raw[off + 1 + x] = enc & 0xff;
    }
    line.copy(prev);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('decodes a truecolour PNG and recovers the exact pixel values', () => {
  const d = decodePng(solidPng(8, 4, [32, 64, 144]));
  assert.equal(d.width, 8);
  assert.equal(d.height, 4);
  assert.equal(d.rgb.length, 8 * 4 * 3);
  assert.deepEqual([d.rgb[0], d.rgb[1], d.rgb[2]], [32, 64, 144]);
  const last = d.rgb.length - 3;
  assert.deepEqual([d.rgb[last], d.rgb[last + 1], d.rgb[last + 2]], [32, 64, 144]);
});

test('ALL FIVE filter types invert to the same image', () => {
  // The filters are the only genuinely tricky part of PNG. Paeth in particular
  // is where a hand-written decoder goes subtly wrong and still produces a
  // plausible picture — which is the failure mode that matters here.
  for (const filter of [0, 1, 2, 3, 4]) {
    const d = decodePng(solidPng(6, 5, [200, 30, 90], { filter }));
    assert.ok(d, `filter ${filter} failed to decode`);
    assert.deepEqual([d.rgb[0], d.rgb[1], d.rgb[2]], [200, 30, 90], `filter ${filter} wrong at origin`);
    const mid = 3 * (6 * 2 + 3);
    assert.deepEqual([d.rgb[mid], d.rgb[mid + 1], d.rgb[mid + 2]], [200, 30, 90], `filter ${filter} wrong mid-image`);
  }
});

test('RGBA (colour type 6) decodes and alpha is dropped, not misread as colour', () => {
  const d = decodePng(solidPng(4, 4, [10, 20, 30], { colorType: 6, filter: 4 }));
  assert.equal(d.rgb.length, 4 * 4 * 3);
  assert.deepEqual([d.rgb[0], d.rgb[1], d.rgb[2]], [10, 20, 30]);
  assert.deepEqual([d.rgb[3], d.rgb[4], d.rgb[5]], [10, 20, 30], 'second pixel must not be shifted by alpha');
});

test('UNSUPPORTED variants return null rather than confident garbage', () => {
  // 16-bit, palette-indexed and Adam7-interlaced images decoded by truecolour
  // rules produce data-shaped nonsense. Refuse them.
  assert.equal(decodePng(solidPng(4, 4, [1, 2, 3], { bitDepth: 16 })), null);
  assert.equal(decodePng(solidPng(4, 4, [1, 2, 3], { colorType: 3 })), null);
  assert.equal(decodePng(solidPng(4, 4, [1, 2, 3], { interlace: 1 })), null);
  assert.equal(decodePng(Buffer.from('not a png at all')), null);
  assert.equal(decodePng(''), null);
});

test('a CORRUPT deflate stream returns null instead of throwing', () => {
  const good = solidPng(4, 4, [5, 5, 5]);
  const broken = Buffer.from(good);
  broken[40] ^= 0xff;               // scramble inside IDAT
  assert.doesNotThrow(() => decodePng(broken));
});

test('averageColor is the actual mean, and hex round-trips', () => {
  const d = decodePng(solidPng(10, 10, [0, 32, 96]));
  const avg = averageColor(d);
  assert.deepEqual([avg.r, avg.g, avg.b], [0, 32, 96]);
  assert.equal(toHex(avg), '#002060');            // Midnight Sapphire exactly
  assert.equal(averageColor(null), null);
});

test('paletteAudit recognises a solid Swan colour by PRESENCE', () => {
  const audit = paletteAudit(solidPng(16, 9, [0, 32, 96]));   // #002060
  assert.equal(audit.decoded, true);
  assert.equal(audit.averageHex, '#002060');
  assert.equal(audit.topSwan.name, 'Midnight Sapphire');
  assert.equal(audit.topSwan.coverage, 1, 'every pixel IS that colour');
  assert.equal(audit.retiredCoverage, 0);
  assert.equal(audit.driftsRetired, false);
});

test('paletteAudit FLAGS an image that genuinely contains a retired colour', () => {
  const audit = paletteAudit(solidPng(16, 9, [0, 255, 255]));   // Galaxy cyan
  assert.equal(audit.driftsRetired, true);
  assert.equal(audit.topRetired.name, 'Galaxy cyan');
  assert.equal(audit.topRetired.coverage, 1);
});

test('THE FALSE-ALARM REGRESSION: a desaturated photo is NOT a brand violation', () => {
  // The first version compared the AVERAGE colour to each anchor and flagged
  // whichever was nearer. Run on four real generated photographs it flagged all
  // four, because a grey (#9095a0) is numerically closer to the muted #7851A9
  // than to the more saturated Swan Lavender — so every photograph failed. A
  // centroid is not a colour that appears in the picture.
  for (const grey of [[144, 149, 160], [81, 93, 109], [127, 131, 146], [112, 98, 84]]) {
    const audit = paletteAudit(solidPng(16, 9, grey));
    assert.equal(audit.driftsRetired, false,
      `#${grey.map((v) => v.toString(16).padStart(2, '0')).join('')} is a photographic grey, not Galaxy branding`);
    assert.equal(audit.retiredCoverage, 0);
  }
});

test('AN AMBIGUOUS RETIRED ANCHOR IS EXCLUDED FROM THE VERDICT, and disclosed', () => {
  // Retired Galaxy bg and active Obsidian Black are ELEVEN units apart — the
  // same near-black. Counting pixels near it flags every image that has
  // shadows, which is what the second version of this audit did to two real
  // photographs. An anchor with an active look-alike cannot be evidence.
  const dark = paletteAudit(solidPng(16, 9, [10, 10, 22]));   // near-black
  assert.equal(dark.driftsRetired, false, 'a dark image is not a branding violation');
  assert.equal(dark.retiredCoverage, 0);
  assert.deepEqual(dark.ambiguousAnchors.map((a) => a.name), ['Galaxy bg']);
  assert.equal(dark.ambiguousAnchors[0].nearestActive, 11);
  // ...while the DISCRIMINATING anchors still catch a real violation.
  assert.equal(paletteAudit(solidPng(16, 9, [0, 255, 255])).driftsRetired, true);
  assert.equal(paletteAudit(solidPng(16, 9, [120, 81, 169])).driftsRetired, true);
});

test('paletteAudit REPORTS failure to decode rather than implying a pass', () => {
  const audit = paletteAudit(Buffer.from('definitely not an image'));
  assert.equal(audit.decoded, false);
  assert.ok(audit.reason);
  assert.equal(audit.driftsRetired, undefined, 'an undecodable image must not read as "no drift"');
  assert.equal(audit.retiredCoverage, undefined);
});

test('the retired palette is not spelled literally in source', () => {
  // Same defence the law filter uses: a grep for retired tokens must not flag
  // the module that bans them.
  const keys = Object.keys(RETIRED_PALETTE);
  assert.equal(keys.length, 3);
  assert.ok(keys.every((k) => /^#[0-9a-fA-F]{6}$/.test(k)));
  assert.equal(Object.keys(SWAN_PALETTE).length, 11);
});

test('colorDistance is symmetric and zero for identity', () => {
  const a = { r: 10, g: 20, b: 30 };
  assert.equal(colorDistance(a, a), 0);
  assert.equal(colorDistance(a, { r: 40, g: 20, b: 30 }), colorDistance({ r: 40, g: 20, b: 30 }, a));
});
