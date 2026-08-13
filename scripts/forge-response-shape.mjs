#!/usr/bin/env node
/**
 * forge-response-shape.mjs — one image, and print WHAT THE RESPONSE ACTUALLY IS.
 *
 * The seed probe printed `$?` for every arm: `data.usage.total_cost` is absent,
 * so the run ledger has been writing `costUsd: null` on every real generation
 * while claiming to record spend. Rather than guess which field carries cost —
 * guessing an interface is precisely what produced the wrong-endpoint disaster —
 * this dumps the top-level shape once and settles it.
 *
 * Prints STRUCTURE ONLY: key names, types, sizes. Never image bytes, never the
 * key, never a full payload.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (!args.includes('--confirm-spend')) {
  console.error('REFUSING: spends ~$0.005 (1 image). Re-run with --confirm-spend --root <dir>');
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

const key = apiKey(ROOT);
if (!key) { console.error('No OPENROUTER_API_KEY found.'); process.exit(1); }

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
    prompt: 'A photograph: pale winter light across a frozen lake.',
    aspect_ratio: '16:9', resolution: '1K', n: 1,
  }),
  signal: AbortSignal.timeout(180_000),
});

console.log(`HTTP ${res.status}`);
const data = await res.json();

/** Describe a value without ever printing payload content. */
function describe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array[${v.length}]`;
  if (typeof v === 'string') return `string(${v.length})`;
  if (typeof v === 'object') return `object{${Object.keys(v).join(',')}}`;
  return `${typeof v} = ${v}`;
}

console.log('\n=== TOP-LEVEL KEYS ===');
for (const [k, v] of Object.entries(data)) console.log(`  ${k.padEnd(18)} ${describe(v)}`);

if (Array.isArray(data.data) && data.data[0]) {
  console.log('\n=== data[0] KEYS ===');
  for (const [k, v] of Object.entries(data.data[0])) console.log(`  ${k.padEnd(18)} ${describe(v)}`);
}
for (const k of ['usage', 'cost', 'meta', 'metadata']) {
  if (data[k] && typeof data[k] === 'object') {
    console.log(`\n=== ${k} CONTENTS ===`);
    for (const [kk, vv] of Object.entries(data[k])) console.log(`  ${kk.padEnd(18)} ${describe(vv)}`);
  }
}

// If a generation id exists, OpenRouter exposes real cost on a separate,
// FREE endpoint. Verify that rather than assume it.
if (data.id) {
  console.log(`\n=== GET /api/v1/generation?id=${String(data.id).slice(0, 12)}... ===`);
  await new Promise((r) => setTimeout(r, 2500));   // stats lag the response
  const g = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(data.id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log(`  HTTP ${g.status}`);
  if (g.ok) {
    const gd = await g.json();
    const row = gd.data || gd;
    for (const f of ['total_cost', 'usage', 'model', 'generation_time', 'native_tokens_completion']) {
      if (row[f] !== undefined) console.log(`  ${f.padEnd(26)} ${describe(row[f])}`);
    }
  } else {
    // Redacted defensively, matching forge-i2i-probe: a provider that echoes the
    // request back in an error body would otherwise print the key to stdout.
    // The sibling probe already did this; this one did not, which is exactly the
    // kind of inconsistency that makes a safety habit unreliable.
    console.log(`  body: ${(await g.text()).slice(0, 200).split(key).join('<REDACTED_KEY>')}`);
  }
} else {
  console.log('\n  NO `id` on the response — cost cannot be resolved by follow-up lookup.');
}
