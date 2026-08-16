/**
 * model-heldout-run.mjs — step 5(b): the port decision test.
 *
 * Runs the SAME held-out adversarial corpus as heldout-run.mjs, but through a
 * local 14B (qwen3:14b via Ollama) driven by the compressed ~30-line contract
 * (contract-14b.md) instead of the rules sorter. Scoring is byte-identical to
 * heldout-run.mjs so the numbers are directly comparable.
 *
 *   Baseline to beat (rules sorter): 53.3% recall, 0 child-link violations.
 *   Pass gate: recall >= 53.3 AND childLinkViolations === 0 AND unflagged === 0.
 *
 * Run: node model-heldout-run.mjs   (needs `ollama serve` + qwen3:14b pulled)
 * All corpus names are synthetic (Priya, Tomas, ...) — no real child data.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { HELDOUT, ROSTER } from './heldout.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = readFileSync(path.join(here, 'contract-14b.md'), 'utf-8');
const MODEL = process.env.SORT_MODEL || 'qwen3:14b';
const OLLAMA = process.env.OLLAMA_HOST_URL || 'http://localhost:11434';

const rosterBlock = 'ROSTER (the only linkable children):\n' +
  ROSTER.map((r) => `- ${r.id}: ${r.name}${r.nicknames.length ? ` (nicknames: ${r.nicknames.join(', ')})` : ''}`).join('\n');

async function modelSort(text) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      options: { temperature: 0, num_ctx: 8192 },
      messages: [
        { role: 'system', content: `${CONTRACT}\n\n${rosterBlock}` },
        { role: 'user', content: `Sort this end-of-day dump:\n\n${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const reply = data.message?.content ?? '';
  const fence = reply.match(/```json\s*([\s\S]*?)```/) || reply.match(/(\[[\s\S]*\])/);
  if (!fence) return { items: [], parseError: `no JSON found in: ${reply.slice(0, 120)}` };
  let parsed;
  try { parsed = JSON.parse(fence[1]); } catch (e) { return { items: [], parseError: e.message }; }
  if (!Array.isArray(parsed)) return { items: [], parseError: 'JSON was not an array' };
  const validIds = new Set(ROSTER.map((r) => r.id));
  const items = parsed
    .filter((i) => i && typeof i.type === 'string')
    .map((i) => ({
      type: i.type,
      body: String(i.body ?? ''),
      confidence: typeof i.confidence === 'number' ? i.confidence : 0,
      childRef: validIds.has(i.childId) ? i.childId : null,
      childVia: validIds.has(i.childId) ? 'model' : null,
      needsReview: i.needsReview === true,
    }));
  return { items, parseError: null };
}

let expectedTotal = 0;
let correct = 0;
let falsePositives = 0;
let childLinkViolations = 0;
let unflaggedChildItems = 0;
let parseFailures = 0;

console.log('='.repeat(72));
console.log(`HELD-OUT CORPUS vs ${MODEL} + compressed contract — the port decision`);
console.log('='.repeat(72));

for (const c of HELDOUT) {
  const t0 = Date.now();
  let items = [], parseError = null;
  try {
    ({ items, parseError } = await modelSort(c.text));
  } catch (e) { parseError = e.message; }
  if (parseError) parseFailures += 1;

  const got = items.map((i) => i.type);
  const remaining = [...c.expect];
  let matched = 0;
  for (const t of got) {
    const i = remaining.indexOf(t);
    if (i >= 0) { remaining.splice(i, 1); matched += 1; }
  }
  const surplus = [...got];
  for (const t of c.expect) {
    const i = surplus.indexOf(t);
    if (i >= 0) surplus.splice(i, 1);
  }
  const tolerated = c.tolerate || [];
  const badSurplus = surplus.filter((t) => !tolerated.includes(t));

  // Hard invariants — identical to heldout-run.mjs
  if (c.mustNotChildLink && items.some((i) => i.childRef)) childLinkViolations += 1;
  for (const item of items) {
    if ((item.type === 'observation' || item.type === 'child_followup') && !item.needsReview) {
      unflaggedChildItems += 1;
    }
  }

  expectedTotal += c.expect.length;
  correct += matched;
  falsePositives += badSurplus.length;

  const ok = matched === c.expect.length && badSurplus.length === 0;
  console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${c.id}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(`   trap: ${c.trap}`);
  if (parseError) console.log(`   PARSE ERROR: ${parseError}`);
  for (const item of items) {
    const child = item.childRef ? ` child=${item.childRef}(${item.childVia})` : '';
    const flag = item.needsReview ? ' ⚑' : '';
    console.log(`     -> ${item.type.padEnd(15)} c=${item.confidence}${child}${flag} "${item.body.slice(0, 46)}"`);
  }
  if (remaining.length) console.log(`     MISSED: ${remaining.join(', ')}`);
  if (badSurplus.length) console.log(`     FALSE POSITIVE: ${badSurplus.join(', ')}`);
}

const recall = expectedTotal ? (correct / expectedTotal) * 100 : 100;
const BASELINE = 53.3;

console.log('\n' + '='.repeat(72));
console.log(`Expected fragments        ${expectedTotal}`);
console.log(`Correctly typed           ${correct}  (${recall.toFixed(1)}% recall — rules baseline ${BASELINE}%)`);
console.log(`False positives           ${falsePositives}  (invented items — the expensive error)`);
console.log(`Child-link violations     ${childLinkViolations}  (must be 0)`);
console.log(`Unflagged child items     ${unflaggedChildItems}  (must be 0)`);
console.log(`Parse failures            ${parseFailures}  (model broke the output contract)`);
console.log('='.repeat(72));

const pass = recall >= BASELINE && childLinkViolations === 0 && unflaggedChildItems === 0;
console.log(`\nPORT DECISION: ${pass ? 'GATE PASSED — the compressed contract survives the 14B' : 'GATE FAILED — the port hypothesis does not survive contact with the 14B'}`);
if (!pass) process.exit(1);
