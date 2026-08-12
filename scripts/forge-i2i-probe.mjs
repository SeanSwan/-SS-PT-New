#!/usr/bin/env node
/**
 * forge-i2i-probe.mjs — can this endpoint take an INPUT image?
 *
 * WHY NOW. The seed probe settled that reproduction cannot be bought with a
 * seed on this model. That leaves exactly one way for a convergence loop's
 * "refine the winner" step to mean anything stronger than "retype the prompt and
 * re-roll": image-to-image from the winning image. `supportsImageInit: true` is
 * DECLARED by this provider and has never once been exercised — the same
 * declared-but-unchecked shape that produced every other defect in this
 * subsystem.
 *
 * COST DISCIPLINE. Candidate parameter names are tried SEQUENTIALLY and the
 * probe STOPS at the first HTTP 200, so a success costs one image (~$0.004) and
 * every rejection is free. Guessing an interface is what caused the wrong-
 * endpoint disaster, so this asks the API instead of assuming a name.
 *
 * Prints structure only — never image bytes, never the key.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { imageDimensions } from '../shared/imageDimensions.mjs';

const args = process.argv.slice(2);
if (!args.includes('--confirm-spend')) {
  console.error('REFUSING: may spend ~$0.005 (stops at the first accepted parameter).');
  console.error('Re-run with --confirm-spend --root <dir>');
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

/* ---- build a real PNG to send, rather than trusting a copy-pasted blob ---- */
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

function makePng(size = 64) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                       // 8-bit, truecolour RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const off = y * (size * 3 + 1);
    raw[off] = 0;                                  // filter: none
    for (let x = 0; x < size; x += 1) {
      const p = off + 1 + x * 3;
      raw[p] = 20; raw[p + 1] = 40; raw[p + 2] = 90;   // Midnight Sapphire-ish
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png = makePng(64);
const selfCheck = imageDimensions(png);
console.log(`built input PNG: ${png.length}B -> own parser reads ${JSON.stringify(selfCheck)}`);
if (!selfCheck || selfCheck.width !== 64) {
  console.error('ABORT: the PNG I built does not parse. Not sending a malformed input.');
  process.exit(1);
}

const key = apiKey(ROOT);
if (!key) { console.error('No OPENROUTER_API_KEY found.'); process.exit(1); }

const b64 = png.toString('base64');
const dataUri = `data:image/png;base64,${b64}`;
const PROMPT = 'Using the supplied image as the starting point, make it warmer and add low winter light.';

/** Ordered by likelihood. Stops at the first 200. */
const CANDIDATES = [
  { name: 'image (data URI)', body: { image: dataUri } },
  { name: 'image (bare b64)', body: { image: b64 } },
  { name: 'init_image', body: { init_image: dataUri } },
  { name: 'image_url', body: { image_url: dataUri } },
  { name: 'input_image', body: { input_image: dataUri } },
];

console.log(`\ntrying ${CANDIDATES.length} candidate parameter names, stopping at first HTTP 200\n`);

let accepted = null;
for (const c of CANDIDATES) {
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Forge',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.4-image-2',
      prompt: PROMPT, aspect_ratio: '1:1', resolution: '1K', n: 1, ...c.body,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (res.ok) {
    const data = await res.json();
    const out = data.data?.[0]?.b64_json;
    const dims = out ? imageDimensions(out) : null;
    console.log(`  ${c.name.padEnd(20)} HTTP 200  ACCEPTED`);
    console.log(`      returned ${dims ? `${dims.width}x${dims.height} ${dims.format}` : 'no parseable image'}`
      + `  cost $${data.usage?.cost ?? '?'}`);
    accepted = c.name;
    break;
  }
  const body = (await res.text()).slice(0, 180).split(key).join('<REDACTED_KEY>');
  console.log(`  ${c.name.padEnd(20)} HTTP ${res.status}  ${body.replace(/\s+/g, ' ')}`);
}

console.log('');
if (accepted) {
  console.log(`VERDICT  the "${accepted}" parameter is ACCEPTED on /api/v1/images (HTTP 200).`);
  console.log('         THAT IS ALL THIS PROVES. Accepted is not honoured -- the seed parameter');
  console.log('         is also accepted on this endpoint and demonstrably does nothing. A 200');
  console.log('         says the request was well-formed, not that the input image influenced');
  console.log('         the output. supportsImageInit stays UNVERIFIED.');
  console.log('');
  console.log('  NEXT   the discriminating test is INFLUENCE, not acceptance: same prompt, two');
  console.log('         inputs of markedly different dominant colour, then compare the average');
  console.log('         colour of the two outputs. If they track their inputs, i2i is real. That');
  console.log('         needs a PNG pixel decoder (inflate + unfilter), which is also what a');
  console.log('         palette-law check would need, so it is worth building once.');
} else {
  console.log('VERDICT  NO candidate parameter was accepted on /api/v1/images.');
  console.log('         Either i2i lives on a different route (chat/completions with image input),');
  console.log('         or this model cannot do it. supportsImageInit: true is UNSUPPORTED by evidence');
  console.log('         and should not be trusted until a route is proven.');
  console.log('         Consequence: "refine" degrades to prompt-edit + re-roll until proven otherwise.');
}
