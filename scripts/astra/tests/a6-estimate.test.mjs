/**
 * a6-estimate.test.mjs — `AC6.2`'s ESTIMATE MIRROR, and nothing else.
 *
 * SPLIT OUT OF `a6-drift.test.mjs` ON THE SEAM `core/ledger.mjs` ALREADY USES INTERNALLY: that
 * file holds the mirror (`estimateRule()`, `ESTIMATE_MARKERS`, `MEASURED_FALLBACK_USD`) and the
 * arithmetic that consumes it (`costDrift`). The arithmetic is tested in `a6-drift.test.mjs`;
 * the MIRROR is tested here, and it is a different kind of subject. The arithmetic can only be
 * wrong by being wrong; the mirror can be wrong by being a plausible number that
 * `scripts/forge.mjs` never produced, and proving otherwise means reading that file's own text.
 *
 * It was not a line-count split for its own sake: `a6-drift.test.mjs` reached 298 lines, two
 * under Rule 4's cap, and a file at 298 is a trap laid for the next slice rather than a
 * finished one. A4b and A5 both split preemptively on the same reasoning.
 *
 * THE TWO DISCRIMINATORS, and they are the reason this file is not a smoke test:
 *
 *   1. **THE MIRROR IS CHECKED AGAINST AN INDEPENDENT REIMPLEMENTATION of forge's rule.** A test
 *      that re-used `costDrift`'s own arithmetic would be comparing the module to itself. The
 *      reimplementation below is written from the marker text, and the window-slide case is
 *      included because a fixed-window implementation passes a short-ledger test and fails it.
 *   2. **EVERY MARKER IS AN EXPRESSION, NOT A NAME.** A5's mutation `M2` showed that a marker
 *      which is merely a NAME keeps resolving after the thing it names is deleted. Each marker
 *      is therefore required to carry an operator, so it cannot survive the rule's removal.
 *
 * `estimateRule()` IS GIVEN A FILE, NOT MOCKED. The degradation is exercised by pointing it at a
 * real file that lacks the markers (`paths.mjs`) and at a path that does not exist. A guard that
 * cannot be shown to fail is indistinguishable from one that always passes (A5's `D45`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  costDrift, estimateRule, ESTIMATE_MARKERS, ESTIMATE_WINDOW, MEASURED_FALLBACK_USD,
} from '../core/ledger.mjs';
import { REPO_ROOT } from '../core/paths.mjs';

/**
 * FORGE'S RULE, REIMPLEMENTED FROM THE MARKERS — deliberately NOT by calling `costDrift`.
 *
 * `unitCost(root)` returns the mean of the last twenty priced runs present in the ledger when it
 * is called, or `MEASURED_FALLBACK` when there are none. Forge calls it BEFORE a generation, so
 * the estimate in force for run `i` is a function of runs `0..i-1`. This function encodes exactly
 * that sentence and nothing else, which is what makes agreement a measurement rather than a
 * restatement.
 */
function forgeEstimateAt(runs, i) {
  const before = runs.slice(0, i).filter((r) => r.status === 'ok' && typeof r.costUsd === 'number');
  if (!before.length) return MEASURED_FALLBACK_USD;
  const window = before.slice(-ESTIMATE_WINDOW);
  return window.reduce((s, r) => s + r.costUsd, 0) / window.length;
}

test('AC6.2 the mirrored estimate reproduces the rule for EVERY row, including the window slide', () => {
  // 25 priced runs. Run 0 is an outlier at 100× the others, so the 20-run window holds it for
  // rows 1..20 and drops it from row 21 on. A fixed-window implementation passes a short ledger
  // and fails here.
  const runs = [{ variantId: 'outlier', status: 'ok', costUsd: 0.1 }];
  for (let i = 1; i < 25; i += 1) runs.push({ variantId: `r${i}`, status: 'ok', costUsd: 0.001 });
  // Two runs that must be ignored, so the filter is exercised too.
  runs.push({ variantId: 'failed', status: 'failed', costUsd: 1 });
  runs.push({ variantId: 'unpriced', status: 'ok' });

  const drift = costDrift(runs, { rule: estimateRule() });
  const mismatches = drift.series
    .filter((s) => s.estimatedUsd !== forgeEstimateAt(runs, s.index))
    .map((s) => ({ i: s.index, got: s.estimatedUsd, want: forgeEstimateAt(runs, s.index) }));
  assert.deepEqual(mismatches, [], 'the mirror must reproduce the rule exactly, row by row');

  // The slide is REAL, and this is the assertion that proves the window is not decorative.
  const at20 = drift.series.find((s) => s.index === 20);
  const at21 = drift.series.find((s) => s.index === 21);
  assert.ok(at20.estimatedUsd > at21.estimatedUsd * 2,
    `row 20 still holds the outlier (${at20.estimatedUsd}) and row 21 has dropped it (${at21.estimatedUsd})`);
  // And row 0 has no history at all, so it is the fallback — stated, not implied.
  assert.equal(drift.series[0].estimatedUsd, MEASURED_FALLBACK_USD);
  assert.match(drift.series[0].basis, /fallback/);
  assert.equal(drift.series.length, 25, 'only the 25 priced runs are in the series');
});

test('AC6.2 the live pin resolves, and every marker is an EXPRESSION rather than a name', () => {
  const live = estimateRule();
  assert.equal(live.ok, true, `the live rule must resolve — missing: ${JSON.stringify(live.missing)}`);
  assert.deepEqual(live.missing, []);
  assert.equal(live.source, 'scripts/forge.mjs');
  // A marker that is merely a NAME still resolves after the thing it names is deleted (A5's
  // mutation M2). Each marker here must be a fragment of the rule's own expression.
  for (const m of ESTIMATE_MARKERS) {
    assert.ok(m.marker.length > 12, `${m.what}: a marker that short is a name, not an expression`);
    assert.match(m.marker, /[=().'[\]]/,
      `${m.what}: the marker "${m.marker}" carries no operator — it would survive the rule's deletion`);
  }
  const forge = readFileSync(join(REPO_ROOT, 'scripts/forge.mjs'), 'utf8');
  for (const m of ESTIMATE_MARKERS) {
    assert.ok(forge.includes(m.marker), `${m.what}: "${m.marker}" is not in forge.mjs`);
  }
});

test('AC6.2 an UNREADABLE rule is not an unchanged rule', () => {
  const missing = estimateRule(join(REPO_ROOT, 'scripts/forge-does-not-exist.mjs'));
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /E_LEDGER_RULE_UNREADABLE/,
    'an unreadable file must be a named refusal, not an empty `missing` list that reads as "all present"');
  assert.equal(missing.missing.length, ESTIMATE_MARKERS.length,
    'every marker is unconfirmed when the file cannot be read');
});
