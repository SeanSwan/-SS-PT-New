#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/mutation-gaps.test.mjs
 * PURPOSE: The tests that make the mutation table real — every one of them exists
 *          because a mutation SURVIVED until it was written.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR26)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * HOW THIS FILE CAME TO EXIST:
 *   The repair record's first draft claimed "11/11 mutations killed" while the
 *   document listed six mutations — the claim was not reproducible, and the review
 *   said so (HR26). `mutation-check.mjs` makes the exercise runnable, and running
 *   it the first time left SIX of ten definitions alive. Four of those were
 *   genuine coverage holes: guards that another layer happened to mask, a
 *   constant the rendered contract did not actually use, and one backstop no test
 *   touched. Those are exactly the holes a mutation check exists to find, so each
 *   one is closed HERE, with the mutation id in the test name.
 *
 * A test in this file is not decoration: delete it and `mutation-check.mjs` fails.
 *
 * RUN: node --experimental-test-isolation=none --test scripts/creator-brains/test/mutation-gaps.test.mjs
 * @module creator-brains/test/mutation-gaps
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, makeReviewStore, seedReviewDoc, REVIEW_A, REVIEW_B, REVIEW_VA, tempRoot } from './helpers.mjs';
import { paths, readJsonl } from '../lib/paths.mjs';

// ── kills M2 — the authority check's channel comparison ─────────────────────

test('MG1 (kills M2) a video from another channel is refused even without the discovery binding', async () => {
  const { checkAuthority } = await import('../lib/fetch.mjs');
  const video = { videoId: REVIEW_VA, channelId: REVIEW_A, state: 'pending' };
  const creatorB = { channelId: REVIEW_B, title: 'Beta' };
  const registry = { creators: { [REVIEW_B]: { channelId: REVIEW_B, enabled: true } } };

  // NO `requireDiscovered`: the state-row binding cannot mask the channel check,
  // which is the point — the identity comparison must stand on its own.
  const verdict = checkAuthority(video, creatorB, {
    registry, requireRegistryEntry: true, requireEnabled: true,
  }, null);
  assert.equal(verdict.ok, false, 'the video does not belong to the named creator');
  assert.match(verdict.reason, /belongs to/, 'and the refusal names the mismatch');

  const same = checkAuthority(video, { channelId: REVIEW_A, title: 'Alpha' }, {
    registry: { creators: { [REVIEW_A]: { channelId: REVIEW_A, enabled: true } } },
    requireRegistryEntry: true,
    requireEnabled: true,
  }, null);
  assert.equal(same.ok, true, 'the matching case still passes');
});

// ── kills M3 — the fidelity gate's OWN limit ─────────────────────────────────

test('MG2 (kills M3) the fidelity gate rejects an 8-word shared run, not just the phrase cap', async () => {
  const { checkArtifact, MAX_SHARED_RUN } = await import('../lib/fidelity.mjs');
  assert.equal(MAX_SHARED_RUN, 7, 'the Lane C gate limit is 7 words');

  const source = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
  const eight = 'alpha bravo charlie delta echo foxtrot golf hotel';
  const verdict = checkArtifact(eight, [source]);
  assert.equal(verdict.ok, false, 'a shared run past the limit is refused');
  assert.equal(verdict.limit, MAX_SHARED_RUN, 'and the verdict reports the limit it used');

  const seven = 'alpha bravo charlie delta echo foxtrot golf';
  assert.equal(checkArtifact(seven, [source]).ok, true, 'at the limit is allowed');
});

// ── kills M5 — the ledger's throttle gate, which the phase gate can mask ─────

test('MG3 (kills M5) an ACTIVE cooldown refuses a reservation at the ledger, not only at the phase', async () => {
  const r = tempRoot('cb-mg3');
  const { openBudget, reserveCost } = await import('../lib/ledger.mjs');
  const { tripThrottle } = await import('../lib/throttle.mjs');
  const now = () => Date.parse('2026-09-13T06:30:00Z');

  const budget = openBudget({ r, cap: 60, now });
  assert.equal(reserveCost(budget, { op: 'probe' }).ok, true, 'a reservation is allowed while traffic is open');

  tripThrottle(r, { kind: 'rate_limit', reason: 'HTTP Error 429', now: now(), cooldownHours: 6 });
  const refused = reserveCost(budget, { op: 'probe' });
  assert.equal(refused.ok, false, 'the ledger refuses once the cooldown is active');
  assert.equal(refused.deferredReason, 'deferred_throttle', 'and it is a deferral with a reason, not a failure');
  assert.ok(refused.retryAfterMs > 0, 'with the time to wait');

  const entries = (await import('../lib/paths.mjs'), readJsonl(paths(r).reservations));
  assert.equal(entries.length, 1, 'a refused reservation is NOT journaled — nothing was spent');
});

// ── kills M6 — the admission wrapper every transport operation passes ───────

test('MG4 (kills M6) the admission wrapper refuses when the run work bound is spent', async () => {
  const r = tempRoot('cb-mg4');
  const { openBudget } = await import('../lib/ledger.mjs');
  const { openBounds } = await import('../lib/bounds.mjs');
  const { makeReserve } = await import('../lib/passes.mjs');
  const now = () => Date.parse('2026-09-13T06:30:00Z');

  const budgetObj = openBudget({ r, cap: 60, now });
  const boundObj = openBounds({ now, maxMinutes: 45, maxOps: 1, opsUsed: () => budgetObj.spent });
  const reserve = makeReserve({ budgetObj, boundObj });

  assert.equal(reserve('probe', 'run-1', REVIEW_VA).ok, true, 'the first operation fits the bound');

  boundObj.charge(1); // the canary or an enumeration walk spends the rest
  const refused = reserve('fetch', 'run-1', REVIEW_VA);
  assert.equal(refused.ok, false, 'the wrapper refuses once the bound is spent');
  assert.equal(refused.deferredReason, 'deferred_run_bound', 'as a deferral that names the bound');
  assert.match(String(refused.reason), /run work bound/, 'and says which bound stopped it');
});

// ── kills M10 — one label, one meaning, on every surface ────────────────────

test('MG5 (kills M10) the rendered contract uses the SAME candidate label the extractor names', async () => {
  const { CLAIM_VALIDATION, buildBrain } = await import('../lib/extract.mjs');
  const { renderRules } = await import('../lib/render.mjs');
  const { listDocsChecked } = await import('../lib/store.mjs');

  const r = await makeReviewStore('mg5');
  await seedReviewDoc(r, REVIEW_A, REVIEW_VA);
  const { valid, invalid } = listDocsChecked(r, REVIEW_A);
  const brain = buildBrain({ channelId: REVIEW_A, title: 'Alpha' }, { docs: valid, invalidDocs: invalid });
  const rows = renderRules(brain).trim().split('\n').map((l) => JSON.parse(l));

  assert.equal(CLAIM_VALIDATION, 'candidate', 'the extractor names the label once');
  assert.ok(rows.length > 0, 'there are rendered rows');
  for (const row of rows) {
    assert.equal(row.validation, CLAIM_VALIDATION,
      'a consumer reading rules.jsonl sees the same label the extractor declares — '
      + 'the renderer carries its own literal, so this assertion is what keeps the two from drifting');
  }
});

// The harness itself must not rot: its definitions are validated, not trusted.
//
// IT STANDS DOWN DURING A MUTATION RUN. The harness mutates a file and then runs
// this file as a killer; if this check ran too, a broken anchor would make the
// file fail for a reason that has nothing to do with the invariant under test —
// and the harness would score a FALSE KILL. A mutation is only ever allowed to be
// killed by a genuine assertion.
test('MG6 the mutation definitions still match the code they describe', async () => {
  if (process.env.CREATOR_BRAINS_MUTATION_RUN === '1') {
    return; // inert while a mutation is applied; validated on every normal run
  }
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { join, dirname } = await import('node:path');
  const engine = join(dirname(fileURLToPath(import.meta.url)), '..');
  const stdout = execFileSync(process.execPath, [join(engine, 'mutation-check.mjs'), '--check'], {
    encoding: 'utf8', cwd: join(engine, '..', '..'),
  });
  assert.match(stdout, /every mutation matches exactly once/, `mutation anchors drifted:\n${stdout}`);
});
