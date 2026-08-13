import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendRun } from '../../../shared/variantRun.mjs';
import { markWinner, annotateRun } from '../../../shared/variantVerdict.mjs';
import { listRuns, getRun, spendSummary, READ_API_VERSION } from '../../../shared/forgeReadApi.mjs';

/**
 * THE READ CONTRACT the Create-surface UI consumes.
 *
 * Without it that agent scrapes runs.jsonl directly, at which point the ledger's
 * internal fields become someone else's public API and can never change — or
 * they invent their own provenance and this ledger becomes decorative.
 */

const BASE = Object.freeze({
  briefId: 'b_api', runId: 'r_api', provider: 'openai/gpt-5.4-image-2',
  model: 'openai/gpt-5.4-image-2', serializer: 'sentence', status: 'ok',
});
const tmpRoot = () => mkdtempSync(join(tmpdir(), 'forge-api-'));

test('a run is grouped with its options, counts, cost and winner', () => {
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, promptText: 'p', costUsd: 0.004, intent: 'root', imageRef: 'x/a.png', actualWidth: 1536, actualHeight: 864 }, root);
    appendRun({ ...BASE, promptText: 'p', costUsd: 0.004, intent: 'reroll', parentVariantId: a.variantId }, root);
    appendRun({ ...BASE, promptText: 'p', status: 'safety-reject', intent: 'reroll', parentVariantId: a.variantId }, root);
    markWinner(a.variantId, root);

    const { apiVersion, runs, corruptRows } = listRuns(root);
    assert.equal(apiVersion, READ_API_VERSION);
    assert.equal(corruptRows, 0);
    assert.equal(runs.length, 1);

    const run = runs[0];
    assert.equal(run.runId, 'r_api');
    assert.equal(run.options.length, 3);
    assert.equal(run.okCount, 2);
    assert.equal(run.failedCount, 1);
    assert.equal(run.costUsd, 0.008);
    assert.equal(run.winnerId, a.variantId);
    assert.equal(run.options.find((o) => o.id === a.variantId).width, 1536);
    assert.equal(run.options.find((o) => o.rejected).status, 'safety-reject');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the DTO is NARROWER than the ledger — internal fields stay internal', () => {
  // If promptSha or recordVersion leak into the contract, the ledger can never
  // change them without breaking a consumer.
  const root = tmpRoot();
  try {
    appendRun({ ...BASE, promptText: 'p', costUsd: 0.004 }, root);
    const [opt] = listRuns(root).runs[0].options;
    for (const leaked of ['promptSha', 'recordVersion', 'brainVersion', 'seedRequested', 'seedHonored']) {
      assert.equal(Object.hasOwn(opt, leaked), false, `${leaked} must not be in the read contract`);
    }
    assert.ok(Object.hasOwn(opt, 'id') && Object.hasOwn(opt, 'imageRef'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('UNMEASURED stays null and is COUNTED — it never becomes zero', () => {
  // The ledger holds pre-fix rows whose cost was never captured. A chart that
  // renders those as $0 tells the viewer the run was free.
  const root = tmpRoot();
  try {
    appendRun({ ...BASE, promptText: 'p', costUsd: 0.004 }, root);
    appendRun({ ...BASE, promptText: 'p' }, root);           // no cost captured
    const run = listRuns(root).runs[0];
    assert.equal(run.costUsd, 0.004, 'only priced rows are summed');
    assert.equal(run.unpricedCount, 1, 'and the unknown is reported, not hidden');
    assert.equal(run.options.find((o) => o.costUsd === null).costUsd, null);

    const s = spendSummary(root);
    assert.equal(s.totalUsd, 0.004);
    assert.equal(s.pricedCount, 1);
    assert.equal(s.unpricedCount, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a PRUNED image is distinguishable from one that never existed', () => {
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, promptText: 'p', imageRef: 'x/a.png', costUsd: 0.004 }, root);
    appendRun({ ...BASE, promptText: 'p', costUsd: 0.004 }, root);   // never had an image
    annotateRun(a.variantId, { imagePruned: true }, root);

    const opts = listRuns(root).runs[0].options;
    const pruned = opts.find((o) => o.id === a.variantId);
    const never = opts.find((o) => o.id !== a.variantId);
    assert.equal(pruned.imagePruned, true);
    assert.ok(pruned.imageRef, 'it still says WHERE it was');
    assert.equal(never.imagePruned, false);
    assert.equal(never.imageRef, null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a HUMAN REVIEW rides along with the option it is about', () => {
  const root = tmpRoot();
  try {
    const a = appendRun({ ...BASE, promptText: 'p', costUsd: 0.004 }, root);
    annotateRun(a.variantId, { review: { usable: 'with edits', onBrand: 'swan' } }, root);
    const [opt] = listRuns(root).runs[0].options;
    assert.deepEqual(opt.review, { usable: 'with edits', onBrand: 'swan' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('getRun finds one run and returns null rather than throwing on a miss', () => {
  const root = tmpRoot();
  try {
    appendRun({ ...BASE, promptText: 'p', costUsd: 0.004 }, root);
    assert.equal(getRun('r_api', root).runId, 'r_api');
    assert.equal(getRun('r_nope', root), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an EMPTY store is an empty contract, not an error', () => {
  const root = tmpRoot();
  try {
    const r = listRuns(root);
    assert.deepEqual(r.runs, []);
    assert.equal(r.corruptRows, 0);
    assert.equal(spendSummary(root).totalUsd, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
