/**
 * a6-drift.test.mjs — slice A6's COST half: `T-I-06` and `AC6.2`.
 *
 * SPLIT FROM `a6-ledger.test.mjs` ON THE SAME SEAM `core/ledger.mjs` AND `core/ledgerTrend.mjs`
 * USE. This half's source is the FORGE VARIANT STORE, not Astra's compile registry, and its
 * failure mode is different in kind: the rejection count can only be wrong by miscounting,
 * while a cost estimate can be wrong by being a plausible number that forge never produced.
 *
 * THE DISCRIMINATOR, because it is the reason this file is not just a smoke test: **`T-I-06`
 * renders the ROWS, not the MEAN.** `AC6.2`'s stated failure mode is *"averaging the two into one
 * number"*. A test asserting "the drift appears somewhere" passes against a mean. So this file
 * builds a set whose mean is near zero while its rows are not, and asserts the RENDERED pane
 * carries one delta cell per priced run with two distinct signs.
 *
 * THE ESTIMATE MIRROR IS NOT TESTED HERE — it moved to `a6-estimate.test.mjs`. The mirror is a
 * different kind of subject (it can be wrong by being a plausible number forge never produced,
 * and checking it means reading `scripts/forge.mjs`'s own text), and `core/ledger.mjs` already
 * holds it in a separate function from the arithmetic this file tests. Splitting on that seam is
 * also why this file is no longer at 298 of Rule 4's 300 lines.
 *
 * WHAT REMAINS HERE IS THE RENDERING, and the four hostile-round regressions that live in it:
 * a store that could not be read, a store whose every line was corrupt, a table longer than the
 * pane shows, and a banner that must not name a summary that was not drawn.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { buildLedger, costDrift, estimateRule } from '../core/ledger.mjs';
import { renderLedger } from '../surface/paneLedger.mjs';
import { REPO_ROOT } from '../core/paths.mjs';

/** The delta cells the pane rendered, in document order. Format-independent on purpose. */
const deltaCells = (html) => [...html.matchAll(/class="ledger-delta"><b>([^<]*)<\/b>/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------
// T-I-06 — the drift is visible, never averaged away
// ---------------------------------------------------------------------------

test('T-I-06 every priced run keeps its OWN delta; the mean is shown BESIDE them', () => {
  // Two runs whose deltas have opposite signs. The estimate for the first is the measured
  // fallback (no history); for the second it is the mean of what came before — so the second is
  // under-estimated and the first slightly over. Their mean is close to zero, which is the
  // condition `AC6.2` names as the failure mode.
  const runs = [
    { variantId: 'a', status: 'ok', costUsd: 0.004 },
    { variantId: 'b', status: 'ok', costUsd: 0.001 },
  ];
  const drift = costDrift(runs, { rule: estimateRule() });
  assert.equal(drift.series.length, 2, 'one row per priced run — a summary would be one row');

  const [d0, d1] = drift.series.map((s) => s.deltaUsd);
  assert.ok(d0 > 0, `the first run cost more than the fallback estimate (delta ${d0})`);
  assert.ok(d1 < 0, `the second cost less than the first (delta ${d1})`);
  assert.notEqual(Math.sign(d0), Math.sign(d1), 'the two deltas disagree in direction');

  const html = renderLedger({
    ledger: buildLedger({ compiles: [], variantRuns: runs, rule: estimateRule() }),
    compiles: [],
  });
  const cells = deltaCells(html);
  assert.equal(cells.length, 2,
    'THE REQUIREMENT: one delta cell per priced run. A pane that averaged the two would render ONE.');
  assert.equal(new Set(cells).size, 2, `the two deltas must render differently, got ${JSON.stringify(cells)}`);
  const signs = new Set(cells.map((c) => (c.includes('+') ? '+' : c.includes('−') ? '−' : '0')));
  assert.equal(signs.size, 2, `both directions must be visible on screen, got ${JSON.stringify(cells)}`);
  // And the mean is still there — "beside", not "instead of".
  assert.match(html, /mean drift/, 'the summary must still report the mean, beside the rows');
  assert.match(html, /over <b>1<\/b>/, 'the summary must report how many runs went over');
  assert.match(html, /under <b>1<\/b>/, 'and how many went under');
});

test('T-I-06 an unpriced run is EXCLUDED from the series, and the exclusion is counted', () => {
  const runs = [
    { variantId: 'ok', status: 'ok', costUsd: 0.002 },
    { variantId: 'failed', status: 'failed', costUsd: 9 },   // priced only by status
    { variantId: 'noprice', status: 'ok' },                   // priced only by costUsd
  ];
  const drift = costDrift(runs, { rule: estimateRule() });
  assert.equal(drift.priced, 1, 'only one run satisfies both halves of the priced filter');
  assert.equal(drift.total, 3, 'and the total is still reported, so the exclusion is visible');
  assert.deepEqual(drift.series.map((s) => s.variantId), ['ok']);
});

test('T-I-06 an absent estimate yields a NULL delta, never a zero', () => {
  const runs = [{ variantId: 'a', status: 'ok', costUsd: 0.004 }];
  const rule = estimateRule(join(REPO_ROOT, 'scripts/astra/core/paths.mjs')); // markers absent
  assert.equal(rule.ok, false, 'a file without the markers must not confirm the rule');
  const drift = costDrift(runs, { rule });
  assert.equal(drift.series[0].estimatedUsd, null, 'the estimate is withheld');
  assert.equal(drift.series[0].deltaUsd, null,
    'NULL, not 0 — a drift of zero and an absent estimate are different facts');
  assert.equal(drift.summary, null, 'no deltas means no summary, not a summary of zeroes');

  const html = renderLedger({ ledger: buildLedger({ compiles: [], variantRuns: runs, rule }), compiles: [] });
  assert.match(html, /E_LEDGER_ESTIMATE_WITHHELD/, 'the degradation must be NAMED on the pane');
  assert.doesNotMatch(html, /est ¢/, 'the withheld column must not be rendered at all');
  assert.match(html, /actual ¢/, 'the actuals stay — they are a fact about the store, not a reconstruction');
});

test('T-I-06 an unreadable variant store is a PARTIAL, never a complete-looking zero', () => {
  const runsError = { code: 'E_VARIANT_STORE_UNREADABLE', message: 'boom' };
  const ledger = buildLedger({ compiles: [], variantRuns: [{ variantId: 'a', status: 'ok', costUsd: 0.004 }], runsError });
  const html = renderLedger({ ledger, compiles: [] });
  assert.match(html, /E_VARIANT_STORE_UNREADABLE/,
    '"no generations yet" and "the store could not be read" are different facts');
  assert.match(html, /NOT complete/, 'and the pane must say the numbers are incomplete');
});

test('T-I-06 a store with SKIPPED lines is a PARTIAL too — a short list is not a full one', () => {
  // The other half of incompleteness, and the one that is easy to miss: `readRuns()` skips a
  // corrupt line and REPORTS the skip, so the run list is short rather than absent. A pane that
  // rendered it without saying so would present a floor as a total.
  const ledger = buildLedger({
    compiles: [], variantRuns: [{ variantId: 'a', status: 'ok', costUsd: 0.004 }], runsSkipped: 3,
  });
  assert.equal(ledger.runsSkipped, 3, 'the count must survive the assembly');
  const html = renderLedger({ ledger, compiles: [] });
  assert.match(html, /3 line\(s\) in the variant store could not be parsed and were SKIPPED/);
  assert.match(html, /a floor, not a total/, 'the consequence must be stated, not just the count');
  // And a clean store must NOT carry the banner — an always-on warning is not a warning.
  const clean = renderLedger({ ledger: buildLedger({ compiles: [], variantRuns: [] }), compiles: [] });
  assert.doesNotMatch(clean, /were SKIPPED/);
});

test('HOSTILE (A6) an UNREADABLE store with an EMPTY run list is a failure, never an empty store', () => {
  // THE CASE THE FIRST VERSION COULD NOT REACH, and the reason it matters. The read fails, so
  // the caller holds NO runs, so `drift.total === 0`, so the empty branch returned "no
  // generations recorded" — and the named error it had been handed was never drawn. That is the
  // exact misreading `variants.mjs` returns a named error instead of an empty array to prevent,
  // and the two facts are on opposite sides of the same word: "empty" versus "unreadable".
  const runsError = { code: 'E_VARIANT_STORE_UNREADABLE', message: 'boom' };
  const ledger = buildLedger({ compiles: [], variantRuns: [], runsError });
  assert.equal(ledger.drift.total, 0, 'the fixture must land in the empty branch, or it tests nothing');
  const html = renderLedger({ ledger, compiles: [] });
  assert.match(html, /E_VARIANT_STORE_UNREADABLE/, 'the failure must be NAMED on screen');
  assert.match(html, /NOT an empty store/, 'and it must say which of the two it is');
  assert.doesNotMatch(html, /no generations recorded/,
    'the empty-store claim is what the failure exists to prevent — the two must not both be drawn');
});

test('HOSTILE (A6) a store whose EVERY line was corrupt is not an empty store either', () => {
  // The other half, and the one that hides better: `readRuns()` SKIPS a corrupt line and REPORTS
  // it, so a store with no readable lines yields an empty run list — the same list an empty
  // store yields, from a completely different cause.
  const ledger = buildLedger({ compiles: [], variantRuns: [], runsSkipped: 7 });
  assert.equal(ledger.drift.total, 0, 'every line skipped leaves an empty list — that is the trap');
  const html = renderLedger({ ledger, compiles: [] });
  // The count and the fact are asserted SEPARATELY. As one adjacency-dependent pattern
  // (`/7 line\(s\) could not be parsed/`) this reddened when the copy gained the words
  // "in the variant store" — a wording change, not a behaviour change. A test that pins word
  // order in a sentence is testing the sentence, and this one exists to test the count.
  assert.match(html, /7 line\(s\)/, 'the skip count must survive to the screen');
  assert.match(html, /could not be parsed/, 'and what happened to those lines must be stated');
  assert.match(html, /not an empty history; it is an unreadable one/,
    'and the pane must distinguish the two, because the operator acts differently on each');
  assert.doesNotMatch(html, /no generations recorded/, 'the empty-store claim must not be drawn here either');
});

test('HOSTILE (A6) a drift table longer than the pane shows DISCLOSES its truncation', () => {
  // `batchSection` has always said when it shows a prefix; the drift table sliced `series` and
  // said nothing, so forty runs rendered as twenty-five beneath a summary computed over all
  // forty. A reader who adds up the table gets a different answer from the mean above it.
  const runs = Array.from({ length: 40 },
    (_, i) => ({ variantId: `v${i}`, status: 'ok', costUsd: 0.001 + i / 100000 }));
  const ledger = buildLedger({ compiles: [], variantRuns: runs, rule: estimateRule() });
  assert.equal(ledger.drift.priced, 40, 'the fixture must exceed DRIFT_SHOWN, or it tests nothing');
  const html = renderLedger({ ledger, compiles: [] });
  assert.equal(deltaCells(html).length, 25, 'the pane shows the most recent DRIFT_SHOWN rows');
  assert.match(html, /PARTIAL/, 'and it must SAY so — a silent prefix is a table claiming to be the set');
  assert.match(html, /25 of 40 shown/, 'with both numbers, so the reader knows the size of the omission');
  assert.match(html, /the mean is not the mean of this table/,
    'and the consequence, which is the part that would mislead a reader who summed the column');
  // A table inside the limit must NOT carry the banner — an always-on notice is not a notice.
  const short = renderLedger({
    ledger: buildLedger({ compiles: [], variantRuns: runs.slice(0, 5), rule: estimateRule() }), compiles: [],
  });
  assert.doesNotMatch(short, /the mean is not the mean of this table/);
});

test('HOSTILE (A6) the truncation banner does not point at a summary that was not drawn', () => {
  // C8 — THE FIX FOR C7 COMMITTED THE DEFECT THE ROUND IS ABOUT. The banner asserted
  // *"the summary above covers every priced run"* unconditionally. When the estimate is
  // WITHHELD, `costDrift` returns `summary: null` and no summary is drawn at all, so the
  // banner pointed at nothing and claimed a mean that did not exist on the page.
  const runs = Array.from({ length: 40 },
    (_, i) => ({ variantId: `v${i}`, status: 'ok', costUsd: 0.001 + i / 100000 }));
  const rule = estimateRule(join(REPO_ROOT, 'scripts/astra/core/paths.mjs')); // markers absent
  const ledger = buildLedger({ compiles: [], variantRuns: runs, rule });
  assert.equal(ledger.drift.summary, null, 'the fixture must have NO summary, or it tests nothing');
  const html = renderLedger({ ledger, compiles: [] });
  assert.match(html, /E_LEDGER_ESTIMATE_WITHHELD/, 'the withheld column is named');
  assert.doesNotMatch(html, /mean drift/, 'and there is no summary on the page');
  assert.doesNotMatch(html, /The summary above covers every priced run/,
    'so the banner must NOT name a summary — that is the C8 defect');
  assert.match(html, /There is no summary above/,
    'and it must say what is actually true instead');
  // The truncation is still disclosed — the fix is the COPY, not the disclosure.
  assert.match(html, /25 of 40 shown/);
});

test('HOSTILE (A6) an unreadable store AND skipped lines are two facts, and both are drawn', () => {
  // C10 — the C1 fix returned on `unreadable` alone, silently dropping the skip count. Not
  // reachable from `variantRuns()` today (it sets `skipped: 0` on its error path), which is
  // exactly why it is worth a test: the branch was correct only because of a property of
  // ANOTHER module, and nothing here would notice that property changing.
  const ledger = buildLedger({
    compiles: [], variantRuns: [], runsSkipped: 5,
    runsError: { code: 'E_VARIANT_STORE_UNREADABLE', message: 'boom' },
  });
  assert.equal(ledger.drift.total, 0, 'the fixture must land in the empty branch');
  const html = renderLedger({ ledger, compiles: [] });
  assert.match(html, /E_VARIANT_STORE_UNREADABLE/, 'the read failure is named');
  assert.match(html, /5 line\(s\) in the variant store could not be parsed/,
    'and the skip count is named too — one early return must not swallow the other fact');
  assert.doesNotMatch(html, /The drift below is computed over what was readable/,
    'nor may it point at a table that this branch does not draw');
  assert.doesNotMatch(html, /no generations recorded/, 'and the store is still not called empty');
});
