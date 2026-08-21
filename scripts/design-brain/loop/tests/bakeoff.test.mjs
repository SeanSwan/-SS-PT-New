/**
 * bakeoff.test.mjs — S5 acceptance tests for the paid image-model bake-off.
 * =========================================================================
 * Split out of vault.test.mjs to stay under the 300-line file cap (Rule 4).
 * Every test here runs at ZERO spend: `generate` is injected, so the harness is
 * exercised end-to-end without a provider ever being called.
 *
 *   V10 refuses to generate without confirmSpend, naming the worst case
 *   V11 doctrine-adjective lint refuses a slop-pathway prompt
 *   V12 blind sheet withholds the model, key.json carries it, costs recorded
 *   V13 halts at the hard cap instead of finishing the grid
 *   V14 a generation error is recorded and skipped, never retried
 *   V20 the spend gate and the adjective list are CONTRACTS, asserted directly
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runBakeoff, estimateSpend, adjectiveDefects, blindOrder, DOCTRINE_ADJECTIVES, PLATE_BRIEFS } from '../bakeoff.mjs';

const fresh = () => ({ dir: mkdtempSync(join(tmpdir(), 'bakeoff-')) });

test('V10 bakeoff refuses to generate without confirmSpend, naming the worst case', async () => {
  const { dir } = fresh();
  await assert.rejects(
    runBakeoff({ models: ['m1', 'm2'], generate: async () => { throw new Error('must not be called'); }, outDir: join(dir, 'bo'), root: dir }),
    (err) => /REFUSING to generate without confirmSpend/.test(err.message) && /Worst case \$/.test(err.message),
  );
  const est = estimateSpend({ models: ['m1', 'm2'], root: dir });
  assert.equal(est.images, 2 * PLATE_BRIEFS.length);
  assert.ok(est.worst_case_usd > 0);
});

test('V11 a doctrine adjective in a generator prompt is refused', async () => {
  assert.deepEqual(adjectiveDefects('a granite ridgeline at first light'), []);
  assert.match(adjectiveDefects('a cinematic glacier')[0], /doctrine adjective "cinematic"/);
  const { dir } = fresh();
  await assert.rejects(
    runBakeoff({
      models: ['m1', 'm2'], briefs: [{ id: 'bad', text: 'a premium ethereal glacier', intent: 'hero', surfaceClass: 'marketing', aspect: '16:9' }],
      generate: async () => ({}), outDir: join(dir, 'bo'), root: dir, confirmSpend: true, capUsd: 5,
    }),
    /brief bad — doctrine adjective/,
  );
});

test('V12 bakeoff with a stubbed generator: blind sheet withholds the model, key.json carries it', async () => {
  const { dir } = fresh();
  let calls = 0;
  const generate = async () => { calls += 1; return { costUsd: 0.004, imageRef: null }; };
  const briefs = PLATE_BRIEFS.slice(0, 3);
  const out = join(dir, 'bo');
  const r = await runBakeoff({ models: ['model-alpha', 'model-beta'], briefs, generate, outDir: out, root: dir, confirmSpend: true, capUsd: 5 });

  assert.equal(calls, 6, 'every model x brief cell fired exactly once — no retries');
  assert.equal(r.byModel.length, 2);
  for (const m of r.byModel) {
    assert.equal(m.ok, 3);
    assert.ok(m.cost_usd > 0, 'cost recorded per model');
    assert.equal(typeof m.median_ms, 'number', 'latency recorded per model');
  }
  const ranking = readFileSync(join(out, 'RANKING-SHEET.md'), 'utf8');
  assert.doesNotMatch(ranking, /model-alpha|model-beta/, 'the blind sheet must not name a model');
  assert.match(ranking, /\| A01 \|/);
  const key = JSON.parse(readFileSync(join(out, 'key.json'), 'utf8'));
  assert.ok(key.map.some((e) => e.model === 'model-alpha'), 'the sealed key carries the mapping');
  assert.equal(key.map.length, 6);
  assert.equal(new Set(key.map.map((e) => e.label)).size, 6, 'labels are unique');
});

test('V12b the blind order is deterministic (replayable, no Math.random)', () => {
  assert.deepEqual(blindOrder(8, 'seed-a'), blindOrder(8, 'seed-a'));
  assert.notDeepEqual(blindOrder(8, 'seed-a'), blindOrder(8, 'seed-b'));
  assert.deepEqual([...blindOrder(6, 's')].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test('V13 bakeoff halts at the hard cap instead of finishing the grid', async () => {
  const { dir } = fresh();
  let calls = 0;
  const generate = async () => { calls += 1; return { costUsd: 0.05, imageRef: null }; };
  const r = await runBakeoff({
    models: ['m1', 'm2'], briefs: PLATE_BRIEFS.slice(0, 4), generate,
    outDir: join(dir, 'bo'), root: dir, confirmSpend: true, capUsd: 0.12,
  });
  assert.ok(r.halted, 'the run records that it halted');
  assert.match(r.halted, /hard cap/);
  assert.ok(calls < 8, `halted early (${calls} of 8 cells fired)`);
  assert.ok(r.spend_usd <= 0.15, `spend stayed near the cap ($${r.spend_usd})`);
});

test('V14 a generation error is recorded and skipped, never retried', async () => {
  const { dir } = fresh();
  let calls = 0;
  const generate = async () => { calls += 1; throw new Error('provider 500'); };
  const r = await runBakeoff({
    models: ['m1', 'm2'], briefs: PLATE_BRIEFS.slice(0, 2), generate,
    outDir: join(dir, 'bo'), root: dir, confirmSpend: true, capUsd: 5,
  });
  assert.equal(calls, 4, 'one call per cell — a retry would be an unbudgeted second charge');
  assert.equal(r.spend_usd, 0);
  assert.ok(r.byModel.every((m) => m.failed === 2 && m.ok === 0));
  assert.ok(r.key.map.every((e) => e.error === 'provider 500'));
});

test('V20 the spend gate and the adjective list are CONTRACTS, not conventions', () => {
  // Every fixed brief must itself be clean — a doctrine adjective baked into the
  // constant set would poison every bake-off run before any lint could help.
  for (const b of PLATE_BRIEFS) {
    assert.deepEqual(adjectiveDefects(b.text), [], `PLATE_BRIEFS.${b.id} carries a doctrine adjective`);
  }
  assert.equal(PLATE_BRIEFS.length, 10, 'blueprint §S5 fixes the grid at 10 briefs');
  assert.equal(new Set(PLATE_BRIEFS.map((b) => b.id)).size, 10, 'brief ids are unique');
  for (const a of ['cinematic', 'crystalline', 'premium', 'awe']) {
    assert.ok(DOCTRINE_ADJECTIVES.includes(a), `"${a}" must stay banned from generator prompts`);
  }
  assert.throws(() => { DOCTRINE_ADJECTIVES.push('x'); }, 'the ban list is frozen');
});

test('V21 a bake-off of one model is refused — that is just a generation', async () => {
  const { dir } = fresh();
  await assert.rejects(
    runBakeoff({ models: ['only-one'], generate: async () => ({}), outDir: join(dir, 'bo'), root: dir, confirmSpend: true }),
    /2\+ models required/,
  );
});
