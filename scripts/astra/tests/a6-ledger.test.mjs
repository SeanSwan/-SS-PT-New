/**
 * a6-ledger.test.mjs — slice A6's REJECTION half: the count, and the trend.
 * `T-E-03`, `AC6.3`.
 *
 * SPLIT FROM `a6-drift.test.mjs` ON THE SAME SEAM `core/ledger.mjs` AND `core/ledgerTrend.mjs`
 * USE, and for the same reason: these two halves have different SOURCES (`rejected_all` is
 * Astra's own compile registry; cost is the Forge variant store) and different failure modes.
 * A test file that covered both would be a file where a change to one half's fixtures can
 * redden the other's assertions. Rule 4 forced the split; the seam is why it is a good one.
 *
 * THE DISCRIMINATOR, because it is the reason this file is not just a smoke test: **`T-E-03`
 * counts BATCHES, not WRITES.** `count === 1` after one reject passes against a counter
 * incremented on every POST. So the test rejects the SAME compile twice and requires the count
 * to hold — the direction that fails when the counter counts writes — and then rejects a SECOND
 * compile to prove the count is not simply stuck.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLedger, estimateRule } from '../core/ledger.mjs';
import { rejectedAllTrend, TREND_MIN_REJECTED, REJECTED_ALL } from '../core/ledgerTrend.mjs';
import { compileAndRecord, setOutcome, ledgerEntries, resetRegistry } from '../core/session.mjs';
import { renderLedger } from '../surface/paneLedger.mjs';

/** A brief the compiler accepts, so `compileAndRecord` does not throw. */
const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

// ---------------------------------------------------------------------------
// T-E-03 — a reject moves the count by EXACTLY one
// ---------------------------------------------------------------------------

test('T-E-03 a reject increments the rejected count by exactly one — in both directions', () => {
  resetRegistry();
  const a = compileAndRecord(BRIEF, {});
  const b = compileAndRecord(BRIEF, {});
  const count = () => rejectedAllTrend(ledgerEntries()).rejected;

  // The no-op direction: a count that never moves must fail this, not pass it.
  assert.equal(count(), 0, 'a fresh session has rejected nothing');

  setOutcome(a.compileId, REJECTED_ALL);
  assert.equal(count(), 1, 'one reject is one rejection');

  // THE DOUBLE-COUNT DIRECTION. This is the assertion the test exists for: an implementation
  // that incremented on every POST would read 2 here, and a `count === 1` assertion after a
  // single reject cannot tell the two apart.
  setOutcome(a.compileId, REJECTED_ALL);
  assert.equal(count(), 1, 're-rejecting the same compile is idempotent — the count is of BATCHES, not of writes');

  setOutcome(b.compileId, REJECTED_ALL);
  assert.equal(count(), 2, 'a second batch is a second rejection');
  resetRegistry();
});

test('T-E-03 a reject against an unknown id is refused, and changes no count', () => {
  resetRegistry();
  compileAndRecord(BRIEF, {});
  const before = rejectedAllTrend(ledgerEntries()).rejected;
  assert.throws(() => setOutcome('cmp-does-not-exist-0', REJECTED_ALL), /E_COMPILE_UNKNOWN/,
    'an unknown id must be a NAMED refusal — a silent no-op would look like a successful reject');
  assert.equal(rejectedAllTrend(ledgerEntries()).rejected, before,
    'a refused reject must not have moved the count');
  resetRegistry();
});

test('T-E-03 the registry read the Ledger uses carries the slots and facets, and nothing else', () => {
  resetRegistry();
  const { compileId } = compileAndRecord(BRIEF, {});
  const [entry] = ledgerEntries();
  assert.equal(entry.compileId, compileId);
  assert.equal(entry.outcome, 'pending', 'a fresh compile is pending, which is what the dial needs');
  assert.equal(entry.view.slots.length, 12, 'the trend needs all twelve slots');
  assert.ok(Array.isArray(entry.view.facetsApplied), 'and the applied facets');
  // THE PROJECTION IS NARROW ON PURPOSE. Handing the trend the whole ExplainView would let it
  // start reading `promptText` or `lawChecks` next slice without anyone noticing that the
  // Ledger had become a second Think pane.
  assert.deepEqual(Object.keys(entry.view).sort(), ['facetsApplied', 'slots']);
  assert.equal(entry.view.promptText, undefined, 'the Ledger must not be able to render the prompt');
  assert.equal(entry.view.lawChecks, undefined, 'nor the law table');
  resetRegistry();
});

test('T-E-03 an outcome outside the vocabulary is counted, not folded into `pending`', () => {
  const compiles = [
    { compileId: 'c1', outcome: 'pending', view: { slots: [], facetsApplied: [] } },
    { compileId: 'c2', outcome: 'a_fifth_outcome', view: { slots: [], facetsApplied: [] } },
  ];
  const trend = rejectedAllTrend(compiles);
  assert.equal(trend.byOutcome.a_fifth_outcome, 1,
    'a new outcome appearing is a fact the operator needs to see, not a row to swallow');
  assert.equal(trend.byOutcome.pending, 1, 'and it must not be counted as pending');
  assert.equal(trend.n, 2, 'the total is the number of rows measured');
});

// ---------------------------------------------------------------------------
// AC6.3 — the trend, by slot and by facet
// ---------------------------------------------------------------------------

const slot = (key, value) => ({ key, value, empty: value === '', emptyReason: null });
const compile = (id, outcome, slots, facets) => ({
  compileId: id, outcome, view: { slots, facetsApplied: facets },
});

test('AC6.3 the trend is readable by slot AND by facet, from the same rows', () => {
  const compiles = [
    compile('c1', REJECTED_ALL, [slot('subject', 'a lake'), slot('light', '')], ['Form>Abstract']),
    compile('c2', REJECTED_ALL, [slot('subject', 'a lake'), slot('light', 'dusk')], ['Form>Abstract', 'Temperature>Arctic']),
    compile('c3', 'accepted', [slot('subject', 'a lake'), slot('light', 'dusk')], ['Temperature>Arctic']),
  ];
  const trend = rejectedAllTrend(compiles);

  const subject = trend.bySlot.find((s) => s.key === 'subject');
  assert.deepEqual({ rejected: subject.rejected, all: subject.all }, { rejected: 2, all: 3 },
    'subject was populated in all three and rejected in two');
  // THE VALUE HISTOGRAM IS THE ACTIONABLE HALF, and it is keyed to the REJECTED rows only.
  assert.deepEqual(subject.values, [{ value: 'a lake', count: 2 }]);

  // PRESENCE, NOT ATTRIBUTION: an EMPTY slot says a facet emptied it, not that taste
  // rejected it — so `light` counts once, not three times.
  const light = trend.bySlot.find((s) => s.key === 'light');
  assert.deepEqual({ rejected: light.rejected, all: light.all }, { rejected: 1, all: 2 },
    'an empty slot must not count toward the population');

  const arctic = trend.byFacet.find((f) => f.facet === 'Temperature>Arctic');
  assert.deepEqual({ rejected: arctic.rejected, all: arctic.all }, { rejected: 1, all: 2 });
  const abstract = trend.byFacet.find((f) => f.facet === 'Form>Abstract');
  assert.deepEqual({ rejected: abstract.rejected, all: abstract.all }, { rejected: 2, all: 2 },
    'a facet applied only in rejected batches reads 2 of 2');
  // Sorted by the rejection count, so the loudest facet is first.
  assert.equal(trend.byFacet[0].facet, 'Form>Abstract');

  // The precondition the `share` guard documents: every row has a denominator.
  for (const row of [...trend.bySlot, ...trend.byFacet]) {
    assert.ok(row.all >= 1, `${row.key ?? row.facet} has no denominator — the guard would have fired`);
  }
});

test('AC6.3 a "trend" below the threshold counts but does NOT read', () => {
  const below = rejectedAllTrend([
    compile('c1', REJECTED_ALL, [], []), compile('c2', 'accepted', [], []),
  ]);
  assert.equal(below.sufficient, false);
  assert.equal(below.minRejected, TREND_MIN_REJECTED);
  assert.match(below.note, /Below 3/);
  assert.match(below.note, /withheld/,
    'the copy must say the reading is withheld, not merely that the count is low');

  const at = rejectedAllTrend(['c1', 'c2', 'c3'].map((id) => compile(id, REJECTED_ALL, [], [])));
  assert.equal(at.sufficient, true, `at ${TREND_MIN_REJECTED} the reading is given`);
  assert.doesNotMatch(at.note, /withheld/);
  // Even when it IS given, the pane must not imply causation — the note says "direction".
  assert.match(at.note, /direction/);
  assert.match(at.note, /not enough to read a cause/);
});

test('AC6.3 an empty registry is a NAMED empty state, not a table of zeroes', () => {
  const trend = rejectedAllTrend([]);
  assert.equal(trend.n, 0);
  assert.deepEqual(trend.bySlot, []);
  assert.deepEqual(trend.byFacet, []);
  const html = renderLedger({ ledger: buildLedger({ compiles: [], variantRuns: [], rule: estimateRule() }), compiles: [] });
  assert.match(html, /no compiles yet/);
  assert.match(html, /go to Compose/, 'the empty state must name the way out, per §2.6');
  assert.doesNotMatch(html, /data-control="ledger\.markRejectedAll"/,
    'an empty Ledger must offer NO control — there is nothing to decide');
});
