#!/usr/bin/env node
/**
 * forge-i2i-influence.mjs — does the input image actually INFLUENCE the output?
 *
 * The acceptance probe already showed an `image` data-URI is accepted (HTTP
 * 200). That proves the request is well-formed and nothing else — the seed
 * parameter is accepted on this same endpoint and is demonstrably inert. So
 * `supportsImageInit` has been sitting at 'claimed'.
 *
 * THE DISCRIMINATING TEST is influence: send ONE prompt with TWO inputs of
 * opposite colour and measure whether the outputs track their inputs. If the
 * blue-seeded output is bluer than the amber-seeded one, the image is being
 * read. If they land in the same place, the parameter is inert like the seed.
 *
 * A control arm runs the same prompt with NO input image, so "the two differ"
 * can be told apart from "any two generations differ" — the lesson from the
 * seed probe, where a two-arm design would have been unfalsifiable.
 *
 * SPEND: 3 images, ~$0.015. Refuses to run without --confirm-spend.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { imageDimensions } from '../shared/imageDimensions.mjs';
import { decodePng, averageColor, toHex, colorDistance } from '../shared/pixels.mjs';

const args = process.argv.slice(2);
if (!args.includes('--confirm-spend')) {
  console.error('REFUSING: spends ~$0.015 (3 images). Re-run with --confirm-spend --root <dir>');
  process.exit(2);
}
const ROOT = args[args.indexOf('--root') + 1] || process.cwd();

function apiKey(root) {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const p of [join(root, '.env'), join(root, '..', '.env')]) {
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, 'utf8').split('\n')) {
      const m = raw.replace(/\r$/, '').match(/^OPENROUTER_API_KEY=(.*)$/);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

/* ---- build real PNGs to send as inputs ---- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => { let c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td), 0);
  return Buffer.concat([len, td, crc]);
}
function solid(size, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const off = y * (size * 3 + 1);
    for (let x = 0; x < size; x += 1) {
      const p = off + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const key = apiKey(ROOT);
if (!key) { console.error('No OPENROUTER_API_KEY found.'); process.exit(1); }

const BLUE = [0, 40, 130];
const AMBER = [210, 140, 20];
const PROMPT = 'A photograph: a wide abstract field of soft light. Preserve the dominant colour of '
  + 'the supplied image exactly; change only the texture.';

async function shot(label, inputRgb) {
  const body = {
    model: 'openai/gpt-5.4-image-2', prompt: PROMPT,
    aspect_ratio: '1:1', resolution: '1K', n: 1,
  };
  if (inputRgb) body.image = `data:image/png;base64,${solid(64, inputRgb).toString('base64')}`;

  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://sswanstudios.com', 'X-Title': 'SwanStudios Forge',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const t = (await res.text()).slice(0, 160).split(key).join('<REDACTED_KEY>');
    return { label, ok: false, note: `HTTP ${res.status} ${t.replace(/\s+/g, ' ')}` };
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  const dims = b64 ? imageDimensions(b64) : null;
  const avg = b64 ? averageColor(decodePng(b64)) : null;
  return {
    label, ok: true, avg, hex: avg ? toHex(avg) : null,
    dims: dims ? `${dims.width}x${dims.height}` : '?',
    cost: data.usage?.cost ?? null, wallMs: Date.now() - t0,
    input: inputRgb ? toHex({ r: inputRgb[0], g: inputRgb[1], b: inputRgb[2] }) : '(none)',
  };
}

console.log(`prompt: ${PROMPT}\narms: BLUE input / AMBER input / NO input (control)\n`);
const B = await shot('BLUE', BLUE);
const A = await shot('AMBER', AMBER);
const C = await shot('CONTROL', null);

for (const r of [B, A, C]) {
  if (r.ok) console.log(`  ${r.label.padEnd(8)} in=${r.input.padEnd(9)} out=${r.hex}  ${r.dims}  $${r.cost ?? '?'}  ${r.wallMs}ms`);
  else console.log(`  ${r.label.padEnd(8)} FAILED  ${r.note}`);
}

console.log('');
if (!B.ok || !A.ok) {
  console.log("VERDICT  inconclusive — an arm failed. supportsImageInit stays 'claimed'.");
  process.exit(0);
}

const toRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const dBlue = Math.round(colorDistance(B.avg, toRgb(toHex({ r: BLUE[0], g: BLUE[1], b: BLUE[2] }))));
const dAmber = Math.round(colorDistance(A.avg, toRgb(toHex({ r: AMBER[0], g: AMBER[1], b: AMBER[2] }))));
const between = Math.round(colorDistance(B.avg, A.avg));

console.log(`  blue output  -> distance to its blue input:   ${dBlue}`);
console.log(`  amber output -> distance to its amber input:  ${dAmber}`);
console.log(`  distance BETWEEN the two outputs:             ${between}`);

/**
 * The test: do the outputs SEPARATE in the direction of their inputs? If the
 * blue-seeded output is nearer blue than the amber-seeded one is, and vice
 * versa, the input is being read. A large `between` alone proves nothing —
 * any two generations differ.
 */
const blueCloserToBlue = colorDistance(B.avg, toRgb('#002882')) < colorDistance(A.avg, toRgb('#002882'));
const amberCloserToAmber = colorDistance(A.avg, toRgb('#d28c14')) < colorDistance(B.avg, toRgb('#d28c14'));
const tracks = blueCloserToBlue && amberCloserToAmber && between > 40;

console.log('');
if (tracks) {
  console.log("VERDICT  supportsImageInit = 'verified' — outputs TRACK their inputs.");
  console.log('         Each output is nearer its own seed colour than the other arm is.');
} else {
  console.log("VERDICT  supportsImageInit = false — outputs do NOT track their inputs.");
  console.log('         The parameter is accepted and inert, exactly like the seed.');
  console.log(`         (tracks-blue=${blueCloserToBlue} tracks-amber=${amberCloserToAmber} separation=${between})`);
}
console.log(`\ncontrol (no input): ${C.ok ? C.hex : C.note}`);
console.log('This verdict is EVIDENCE. Update openrouterModels.mjs by hand.');
