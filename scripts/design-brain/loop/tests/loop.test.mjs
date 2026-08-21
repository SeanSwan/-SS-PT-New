/**
 * loop.test.mjs — S1 acceptance tests (DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21 §S1).
 * ====================================================================================
 * These are the panel's demands as executable assertions:
 *   T1  fail-loudly: a deleted profile / disabled stage halts AT THE NAMED STATE
 *   T2  receipt gate + artifact chain locks (no RENDER without gated lineage)
 *   T3  taste consumer: flipping a profile lever changes the SELECTED SKELETON,
 *       the IR hash, and the RENDERED HTML hash (artifact delta, not brief text)
 *   T4  killed-direction memory: a ledger kill is never blindly re-proposed
 *   T5  LEARN emits a session the CANONICAL validator accepts, ledger-appended
 *   T6  round-trip: tampering with the rendered file breaks VERIFY
 *   T7  contrast meter: a seeded low-contrast token fails INSPECT, REVISE fixes
 *       it on the auto-apply whitelist, VERIFY passes clean
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runLoop, StateError, hash } from '../state-machine.mjs';
import { DEFAULT_STAGES, loadProfile } from '../run.mjs';
import { validate } from '../../log-atelier-session.mjs';
import { TOKENS } from '../stages/render.mjs';
import { verifyStage } from '../stages/verify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BRIEF = JSON.parse(readFileSync(join(HERE, '..', 'briefs', 'storefront-hero.json'), 'utf8'));

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'loop-'));
  return { runRoot: join(dir, 'runs'), ledgerPath: join(dir, 'ledger.jsonl') };
};
// browserInspect:false — these suites test loop mechanics; the browser lane has
// its own dedicated suite (browser.test.mjs) plus the real CLI run.
const baseArgs = () => ({ brief: BRIEF, stages: { ...DEFAULT_STAGES }, profile: loadProfile(), browserInspect: false, ...fresh() });

test('T1a fail-loudly: missing taste profile halts at STRUCTURE', async () => {
  await assert.rejects(
    runLoop({ ...baseArgs(), profile: null }),
    (err) => err instanceof StateError && err.state === 'STRUCTURE',
  );
});

test('T1b fail-loudly: disabled MATERIALS stage halts at MATERIALS, not later', async () => {
  const args = baseArgs();
  delete args.stages.MATERIALS;
  await assert.rejects(runLoop(args), (err) => err instanceof StateError && err.state === 'MATERIALS');
});

test('T1c fail-loudly: a critic stubbed to emit nothing halts at CRITIQUE', async () => {
  const args = baseArgs();
  args.stages.CRITIQUE = () => null;
  await assert.rejects(runLoop(args), (err) => err instanceof StateError && err.state === 'CRITIQUE');
});

test('T2 receipt gate: full run closes with a hash-pinned receipt covering all 10 states', async () => {
  const { receipt, ctx } = await runLoop(baseArgs());
  assert.equal(receipt.state_log.length, 10);
  assert.ok(receipt.taste_profile_hash.length >= 8);
  assert.ok(readFileSync(join(ctx.runDir, 'RECEIPT.json'), 'utf8').includes(receipt.run_id));
});

test('T2b chain lock: a render whose lineage does not match the gated IR is refused', async () => {
  const args = baseArgs();
  const realRender = args.stages.RENDER;
  args.stages.RENDER = async (ctx) => ({ ...(await realRender(ctx)), layout_ir_id: 'ir-FORGED' });
  await assert.rejects(runLoop(args), (err) => err instanceof StateError && err.state === 'RENDER');
});

test('T3 taste consumer: flipping levers changes skeleton, IR hash, AND html hash', async () => {
  const a = await runLoop(baseArgs());
  const flipped = loadProfile();
  for (const lever of flipped.levers) {
    if (lever.lever === 'asymmetric_composition') { lever.polarity = 'negative'; lever.confidence = 0.9; }
    if (lever.lever === 'data_forward_surfaces') { lever.confidence = 0.95; }
  }
  const b = await runLoop({ ...baseArgs(), profile: flipped });
  assert.notEqual(a.ctx.artifacts.ir.skeleton_id, b.ctx.artifacts.ir.skeleton_id, 'lever flip must change the selected skeleton');
  assert.notEqual(hash(a.ctx.artifacts.ir), hash(b.ctx.artifacts.ir));
  assert.notEqual(a.ctx.artifacts.render.html_hash, b.ctx.artifacts.render.html_hash, 'the delta must reach the rendered artifact — not just a brief');
});

test('T3b null delta: identical profile produces an identical skeleton selection', async () => {
  const a = await runLoop(baseArgs());
  const b = await runLoop(baseArgs());
  assert.equal(a.ctx.artifacts.ir.skeleton_id, b.ctx.artifacts.ir.skeleton_id);
});

test('T4 killed-direction memory: a ledger kill excludes that skeleton next run', async () => {
  const args = baseArgs();
  const killedSession = {
    ts: new Date().toISOString(),
    brief_id: BRIEF.brief_id,
    archetype_ids: [BRIEF.archetype],
    plate_pack_id: 'pack-test',
    variants: [
      { id: 'v1', skeleton_id: 'SF1-split-ledger', outcome: 'killed', kill_rank: 1, reason_code: 'structure' },
      { id: 'v2', skeleton_id: 'SF4-kpi-strip', outcome: 'winner' },
    ],
    null_winner: false,
    rounds: 1,
    wave2_used: false,
    cost_usd: 0,
    wall_s: 0,
  };
  assert.deepEqual(validate(killedSession), [], 'test fixture must satisfy the canonical schema');
  appendFileSync(args.ledgerPath, JSON.stringify(killedSession) + '\n');

  const { ctx } = await runLoop(args);
  assert.notEqual(ctx.artifacts.ir.skeleton_id, 'SF1-split-ledger', 'a killed direction must not be re-proposed');
  assert.equal(ctx.artifacts.ir.selection.killed_excluded[0].skeleton_id, 'SF1-split-ledger', 'the kill record must surface in the IR');
});

test('T5 LEARN: the appended session passes the canonical validator and lands pending', async () => {
  const args = baseArgs();
  const { ctx } = await runLoop(args);
  assert.equal(ctx.artifacts.learn.session_appended, true);
  const lines = readFileSync(args.ledgerPath, 'utf8').trim().split('\n');
  const session = JSON.parse(lines.at(-1));
  assert.deepEqual(validate(session), []);
  assert.equal(session.pending, true, 'the loop never claims Sean\'s verdict');
  assert.equal(session.scope.domain, 'swan_product', 'scope rides on every event from day one');
});

test('T6 round-trip: tampering with the rendered file after RENDER breaks VERIFY', async () => {
  const { ctx } = await runLoop(baseArgs());
  const finalRender = ctx.artifacts.revise ?? ctx.artifacts.render;
  const tampered = readFileSync(finalRender.html_path, 'utf8')
    .replace(`data-skeleton="${ctx.artifacts.ir.skeleton_id}"`, 'data-skeleton="SK-FORGED"');
  writeFileSync(finalRender.html_path, tampered);
  const v = await verifyStage(ctx);
  assert.equal(v.skeleton_roundtrip_ok, false, 'IR-A/code-B forgery must be caught from the file on disk');
});

test('T7 contrast: seeded low-contrast token fails INSPECT, auto-fix clears it, VERIFY passes', async () => {
  TOKENS.dim = ['--text-dim', '#405060'];
  try {
    const args = baseArgs();
    args.renderOpts = { textToken: 'dim' };
    const { ctx } = await runLoop(args);
    const failed = ctx.artifacts.inspect.meters.filter((m) => m.meter.startsWith('contrast:') && !m.pass);
    assert.ok(failed.length >= 1, 'the seeded pair must fail the WCAG meter');
    assert.match(ctx.artifacts.revise.revision, /contrast-token-swap/);
    assert.equal(ctx.artifacts.verify.all_meters_pass, true, 'the whitelisted fix must verify clean');
  } finally {
    delete TOKENS.dim;
  }
});
