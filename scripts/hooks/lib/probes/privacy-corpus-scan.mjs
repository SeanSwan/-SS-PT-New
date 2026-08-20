/**
 * Run the shipped scanner over every LLM-bound artifact that already exists in
 * the tree. Fixtures prove the patterns match what I chose; only the real corpus
 * proves what they do to Sean's actual repo. This gate BLOCKS, and it will run on
 * nearly every closeout turn (Rule 69 emits a memo each time), so a false-positive
 * rate above roughly zero makes it a gate that gets disabled — i.e. no gate.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scanText, isLlmBound } from '../../privacy-boundary-gate.mjs';

const ROOTS = [
  '.ai-workflow/hermes-inbox',
  'docs/ai-workflow/hermes-learning-packets',
  'docs/ai-workflow/brainstorms',
  'docs/ai-workflow/AI-HANDOFF',
  'AI-Village-Documentation',
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

let scanned = 0;
let flagged = 0;
const byKind = new Map();
const samples = [];

for (const root of ROOTS) {
  for (const f of walk(root)) {
    const rel = f.replace(/\\/g, '/');
    if (!isLlmBound(rel)) continue;
    let st;
    try { st = statSync(f); } catch { continue; }
    if (st.size > 2 * 1024 * 1024) continue;
    let text;
    try { text = readFileSync(f, 'utf8'); } catch { continue; }
    scanned += 1;
    const hits = scanText(text);
    if (!hits.length) continue;
    flagged += 1;
    for (const h of hits) byKind.set(h.kind, (byKind.get(h.kind) ?? 0) + h.count);
    if (samples.length < 40) samples.push(`${rel}  ->  ${hits.map((h) => `${h.kind}x${h.count}`).join(', ')}`);
  }
}

console.log(`scanned: ${scanned} LLM-bound artifacts`);
console.log(`flagged: ${flagged} (${scanned ? ((flagged / scanned) * 100).toFixed(1) : 0}%)`);
console.log('by kind:', JSON.stringify(Object.fromEntries(byKind)));
if (samples.length) {
  console.log('\n-- flagged files (paths and pattern classes only; never the matched text) --');
  for (const s of samples) console.log('  ' + s);
}
