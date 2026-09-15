#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/review-repairs.test.mjs
 * PURPOSE: One regression per hostile-review finding (HR01–HR25), asserted at
 *          the REAL boundary the reviewer used.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * EVERY TEST HERE IS RED AGAINST THE REVIEWED REVISION. The review packet is at
 * docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/, and its
 * `reproduce.mjs` reported 20/20 violations plus 4 transport violations against
 * the code these tests now guard.
 *
 * These are deliberately NOT copies of the reviewer's script. Where the contract
 * legitimately changed, the test asserts the NEW contract and says so — e.g. a
 * corrupt store now THROWS rather than substituting an empty map, so the
 * assertion is "refuses and preserves the bytes", not "returns a value".
 *
 * RUN: node --test scripts/creator-brains/test/review-repairs.test.mjs
 * @module creator-brains/test/review-repairs
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  fakeDeps, makeClock, tempRoot, json3,
  makeReviewStore as makeStore,
  reviewDeps as deps,
  seedReviewDoc as seedDoc,
  rebuildBrain as rebuild,
  REVIEW_TEXT as TEXT, REVIEW_A as A, REVIEW_B as B, REVIEW_VA as VA, REVIEW_VB as VB,
} from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore } from '../lib/store.mjs';

test('HR01 a rolling-hour cap is shared across invocations, not reset per run', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  // TWO videos, so the second run has real work and no budget for it. With one
  // video the second run simply has no candidates, which proves nothing about
  // whether the cap survived.
  const r = await makeStore('hr01', { videos: [[VA, A], [VB, A]] });
  const clock = makeClock();

  const one = await runDaily({
    r, clock, deps: deps(), only: ['fetch'], budget: { perHour: 2 }, lock: false,
  });
  // One video costs TWO transport operations (probe + fetch), so a cap of 2
  // admits exactly one video and the second run must be refused.
  assert.equal(one.counts.fetched, 1, 'the first run fetches one video');

  const two = await runDaily({
    r, clock, deps: deps(), only: ['fetch'], budget: { perHour: 2 }, lock: false,
  });
  assert.equal(two.counts.fetched, 0, 'the second run must NOT get a fresh budget');
  assert.ok(two.counts.deferred > 0, 'and it reports the deferral');
  assert.match(two.counts.deferredReason, /budget/i);

  // The reservation journal is the shared record across processes.
  const journal = readFileSync(paths(r).reservations, 'utf-8').trim().split('\n');
  assert.ok(journal.length >= 2, `expected shared reservations, got ${journal.length}`);
});

test('HR01b a malformed cap is REFUSED, not coerced into "unlimited"', async () => {
  const { validateCap, BudgetError } = await import('../lib/ledger.mjs');
  for (const bad of [0, -1, Infinity, NaN, 1.5]) {
    assert.throws(() => validateCap(bad), BudgetError, `cap ${bad} must be refused`);
  }
  assert.equal(validateCap(undefined), 60, 'absent falls back to the default');
  assert.equal(validateCap(5), 5);
});

// ── HR02 / HR03 ─────────────────────────────────────────────────────────────
test('HR02 fetch <id> touches ONLY that creator', async () => {
  const cli = await import('../cli.mjs');
  const r = await makeStore('hr02', {
    creators: [
      { channelId: A, title: 'Alpha', enabled: true },
      { channelId: B, title: 'Beta', enabled: true },
    ],
    videos: [[VA, A], [VB, B]],
  });
  const probed = [];
  const { runDaily } = await import('../lib/run.mjs');
  await runDaily({
    r,
    onlyCreators: [A],
    only: ['fetch'],
    deps: deps({ probeSubs: (id) => { probed.push(id); return { ok: false, kind: 'failed', error: 'synthetic' }; } }),
    lock: false,
  });
  assert.ok(!probed.includes(VB), `Beta's video must not be probed, got ${probed.join(',')}`);
});

test('HR02b a disabled creator cannot be selected for fetching', async () => {
  const { selectCreators } = await import('../lib/pipeline.mjs');
  const enabled = [{ channelId: A, title: 'Alpha' }];
  const res = selectCreators(enabled, [B]);
  assert.equal(res.selected.length, 0);
  assert.equal(res.rejected.length, 1);
  assert.match(res.rejected[0].reason, /not an enabled creator/);
});

test('HR03 the CLI exit code follows the verdict, never the printed line', async () => {
  const { verdictExit, EXIT } = await import('../cli.mjs');
  const failed = {
    ok: false,
    counts: { deferred: 0, failed: 2 },
    phases: [{ name: 'fetch', ok: true }],
  };
  assert.equal(verdictExit(failed), EXIT.FAILED, 'a run with failures exits nonzero');
  assert.equal(verdictExit({ ok: true, counts: {}, phases: [] }), EXIT.OK);
  assert.equal(
    verdictExit({ ok: false, counts: { deferred: 5, failed: 0 }, phases: [{ name: 'fetch', ok: true }] }),
    EXIT.DEFERRED,
    'a deferred run is distinguishable from a failed one',
  );
  assert.equal(
    verdictExit({ ok: false, counts: {}, phases: [{ name: 'preflight', ok: false }] }),
    EXIT.REFUSED,
  );
});

// ── HR04 / HR05 ─────────────────────────────────────────────────────────────
test('HR04 malformed state is PRESERVED and blocks the run', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const r = await makeStore('hr04');
  writeFileSync(paths(r).state, 'null', 'utf-8');

  const res = await runDaily({ r, deps: deps(), only: ['fetch'], lock: false });
  assert.equal(res.ok, false, 'a run over malformed state must not report ok');
  assert.equal(readFileSync(paths(r).state, 'utf-8'), 'null', 'the damaged bytes are untouched');
});

test('HR04b direct discovery REFUSES corrupt state instead of replacing it', async () => {
  const { discoverChannel } = await import('../lib/discover.mjs');
  const r = await makeStore('hr04b');
  writeFileSync(paths(r).state, '{bad', 'utf-8');
  // The refusal is RETURNED, not thrown — every boundary in this engine reports
  // an outcome object, and a caller forced to use try/catch to tell "no work"
  // from "cannot read the store" is a caller that will forget to.
  const refused = await discoverChannel({ channelId: A, title: 'Alpha' }, { r, deps: deps(), now: makeClock() });
  assert.equal(refused.ok, false, 'the strict reader must refuse');
  assert.match(refused.reason, /corrupt/);
  assert.deepEqual(refused.newIds, [], 'and nothing is discovered');
  assert.equal(readFileSync(paths(r).state, 'utf-8'), '{bad', 'and the bytes are left alone');
});

test('HR05 a corrupt registry blocks the run AND cannot be overwritten by add', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { addCreator } = await import('../lib/registry.mjs');
  const r = await makeStore('hr05');
  writeFileSync(paths(r).registry, '{bad', 'utf-8');

  const res = await runDaily({ r, deps: deps(), only: ['fetch'], lock: false });
  assert.equal(res.ok, false, 'a damaged catalog is not an empty catalog');

  const add = await addCreator({ r, ref: B, deps: { resolveCreator: () => ({ channelId: B, title: 'Beta', url: 'x' }) } });
  assert.equal(add.ok, false, 'add refuses rather than replacing owner state');
  assert.equal(readFileSync(paths(r).registry, 'utf-8'), '{bad', 'registry bytes preserved');
});

// ── HR06 ────────────────────────────────────────────────────────────────────
test('HR06 always/never keep opposite polarity and never merge into one doctrine', async () => {
  const { claimFromCue } = await import('../lib/lexicon.mjs');
  const { buildBrain } = await import('../lib/extract.mjs');

  const pos = claimFromCue('always blur the tear trough crease before retouching portraits');
  const neg = claimFromCue('never blur the tear trough crease before retouching portraits');
  assert.equal(pos.polarity, 'affirm');
  assert.equal(neg.polarity, 'negate');
  assert.notEqual(pos.statement, neg.statement, 'the statements must differ');

  const r = await makeStore('hr06');
  await seedDoc(r, A, VA, 'always blur the tear trough crease before retouching portraits');
  await seedDoc(r, A, VB, 'never blur the tear trough crease before retouching portraits');
  const { listDocsChecked } = await import('../lib/store.mjs');
  const { valid } = listDocsChecked(r, A);
  const brain = buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid });

  const polarities = new Set(brain.claims.map((c) => c.polarity));
  assert.equal(polarities.size, 2, 'both polarities are represented');
  for (const d of brain.doctrine) {
    const samePhrase = brain.doctrine.filter((x) => x.phrase.toLowerCase() === d.phrase.toLowerCase());
    assert.equal(new Set(samePhrase.map((x) => x.polarity)).size > 1, false,
      'a doctrine must not mix polarities under one key');
  }
});

test('HR06b a contradiction is reported only for opposite polarity on the SAME assertion', async () => {
  const { queryBrains } = await import('../lib/query.mjs');
  const r = await makeStore('hr06b');
  await seedDoc(r, A, VA, 'always blur the tear trough crease before retouching portraits');
  await seedDoc(r, A, VB, 'never blur the tear trough crease before retouching portraits');
  await rebuild(r, A);
  const res = queryBrains('tear trough', { r });
  assert.ok(res.hits.length >= 2, 'both sides are returned');
  assert.ok(res.contradictions.length >= 1, 'opposite polarity on one phrase IS a contradiction');
});


