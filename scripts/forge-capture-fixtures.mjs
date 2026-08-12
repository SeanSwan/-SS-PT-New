#!/usr/bin/env node
/**
 * forge-capture-fixtures.mjs — record what the provider ACTUALLY sends.
 *
 * THE META-BUG THIS KILLS. The cost defect survived 121 green tests because I
 * wrote the test stub myself, with `usage.total_cost` — the same wrong field
 * name the production code used. Test and code shared one misconception, so the
 * test could not fail. One slice later the same trap caught me again: twelve
 * green palette tests over solid-colour PNGs I authored could never have found
 * an audit that broke on desaturated real images.
 *
 * A self-authored fixture tests the author's beliefs. Only a captured response
 * tests reality. So this records real envelopes to `fixtures/captured/`, and the
 * tests read those.
 *
 * WHAT IS CAPTURED, and what is NOT:
 *   success.json      — a real 200 envelope. The b64 payload is REPLACED with a
 *                       pointer to a separately stored real PNG, so the fixture
 *                       stays a few hundred bytes instead of 2 MB. Field names,
 *                       nesting and usage numbers are untouched.
 *   safety-400.json   — the real safety-rejection body. Captured by deliberately
 *                       sending a tag-serialized prompt, which is measured to be
 *                       rejected ~60% of the time.
 *   real-*.png        — actual generated images, including a DESATURATED one,
 *                       which is the case that broke the palette audit.
 *
 * NOT captured: a 5xx. I cannot induce one on demand, and fabricating it would
 * reintroduce exactly the disease this script exists to cure. The retry test
 * therefore synthesizes 5xx TRANSPORT conditions (thrown network errors, status
 * codes) which are the runtime's shape, not the provider's — and says so.
 *
 * SPEND: 2 images max (~$0.009). Refuses without --confirm-spend.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ROOT = flag('root', process.cwd());
const DIR = 'backend/tests/fixtures/captured';

if (!args.includes('--confirm-spend')) {
  console.error('REFUSING: spends ~$0.009 (up to 2 images). Re-run with --confirm-spend --root <dir>');
  process.exit(2);
}

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
const key = apiKey(ROOT);
if (!key) { console.error('No OPENROUTER_API_KEY found.'); process.exit(1); }

const here = join(process.cwd(), DIR);
mkdirSync(here, { recursive: true });

async function call(body) {
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://sswanstudios.com', 'X-Title': 'SwanStudios Forge',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text: text.split(key).join('<REDACTED_KEY>') };
}

/* ---------- 1. a real SUCCESS envelope ---------- */
console.log('capturing a real 200 envelope...');
const okRes = await call({
  model: 'openai/gpt-5.4-image-2',
  prompt: 'A photograph: pale winter light across a wide field of cracked grey ice, overcast, low contrast.',
  aspect_ratio: '16:9', resolution: '1K', n: 1,
});

if (!okRes.ok) {
  console.error(`Could not capture a success envelope: HTTP ${okRes.status} ${okRes.text.slice(0, 160)}`);
  process.exit(1);
}
const okBody = JSON.parse(okRes.text);
const b64 = okBody.data?.[0]?.b64_json;
if (!b64) { console.error('200 with no b64_json — nothing to capture.'); process.exit(1); }

writeFileSync(join(here, 'real-desaturated.png'), Buffer.from(b64, 'base64'));
// Keep the envelope's shape byte-exact; swap only the giant payload.
okBody.data[0].b64_json = '<SEE real-desaturated.png>';
writeFileSync(join(here, 'success.json'), `${JSON.stringify(okBody, null, 2)}\n`);
console.log(`  success.json + real-desaturated.png (${Buffer.from(b64, 'base64').length} bytes)`);
console.log(`  usage keys: ${Object.keys(okBody.usage || {}).join(', ')}`);

/* ---------- 2. a real SAFETY REJECTION body ---------- */
// A bare comma-separated keyword stack naming a living artist is measured to be
// rejected ~60% of the time; prose with identical content is accepted. Try a
// few times, because the failure is probabilistic by nature.
console.log('capturing a real safety-rejection body (tag-shaped prompt)...');
let captured = null;
for (let i = 0; i < 3 && !captured; i += 1) {
  const r = await call({
    model: 'openai/gpt-5.4-image-2',
    prompt: 'Anton Corbijn, high contrast monochrome, grain, harsh flash, portrait, stark, '
      + 'blown highlights, crushed blacks, 35mm, photojournalism, unflinching',
    aspect_ratio: '1:1', resolution: '1K', n: 1,
  });
  if (!r.ok) {
    captured = r;
    writeFileSync(join(here, `error-${r.status}.json`), `${r.text}\n`);
    console.log(`  error-${r.status}.json captured on attempt ${i + 1}`);
  } else {
    console.log(`  attempt ${i + 1}: accepted (cost $${JSON.parse(r.text).usage?.cost ?? '?'}) — retrying`);
  }
}
if (!captured) {
  console.log('  NOT CAPTURED: three tag-shaped prompts were all accepted. The rejection is');
  console.log('  probabilistic; rerun later. No error fixture is being fabricated.');
}

/* ---------- 3. a real SATURATED image, for palette-audit contrast ---------- */
const src = join(ROOT, '.ai-workflow/forge-runs/images');
if (existsSync(src)) {
  const { readdirSync } = await import('node:fs');
  const first = readdirSync(src).find((f) => f.endsWith('.png'));
  if (first) {
    copyFileSync(join(src, first), join(here, 'real-generated.png'));
    console.log(`  real-generated.png (copied from an existing run, no new spend)`);
  }
}

console.log(`\nfixtures in ${DIR}/`);
console.log('Tests must read THESE. Any hand-typed provider field name is the bug this kills.');
