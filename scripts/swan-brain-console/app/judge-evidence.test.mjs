/**
 * judge-evidence.test.mjs — the Judge stored-evidence boundary, Astra round 12 (G04, G13).
 *
 * WHY THIS FILE EXISTS
 * Round 11 fixed the Judge export so `judged` counted verdicts rather than object keys. Round
 * 12's hostile review found the same disagreement surviving one level out: a verdict under a
 * key that names no pair was still counted as a judgement, so the export could announce
 * `complete: true` and carry an empty table. And `saveState` returned a success receipt for a
 * store that does not exist, so a session that could not be persisted looked like one that
 * was. Both are "a claim that outruns its evidence", which is this console's whole subject.
 *
 * Every test names the mutation that turns it RED.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pairsFrom, summarize, verdictRows, saveState, loadStoredState, emptyState, STORAGE_KEY,
  pairingFingerprint,
} from './judge-export.mjs';

const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: 'v' + String(i + 1).padStart(2, '0') }));
const { pairs } = pairsFrom(ROWS);

/**
 * A state whose verdicts sit under `keys`, all with a valid kind.
 *
 * `pairing` is included because `loadStoredState` requires it: a state without it is rejected
 * as belonging to a different fleet, which would make the restoration test below pass for the
 * wrong reason. The first draft of this file omitted it and that test failed — the guard was
 * working, and the fixture was wrong.
 */
const withKeys = (keys, kind = 'left') => ({
  pairCount: pairs.length,
  pairing: pairingFingerprint(pairs),
  verdicts: Object.fromEntries(keys.map((k) => [k, { kind, at: '2026-09-21T00:00:00Z' }])),
});

/* ── G04: a verdict that belongs to no pair is not a judgement ────────────── */

test('RED — valid verdicts under keys that name no pair are not judgements (G04)', () => {
  /*
   * Astra's exact reproduction: correct pairing, `pairCount: 10`, ten `left` verdicts under
   * keys 100…109. The shipped `summarize` counted all ten — `kind` was valid — while
   * `verdictRows` emitted none, because it walks `pairs`. The export read
   * `{"judged":10,"unjudged":0,"complete":true,"verdicts":[]}`.
   *
   * MUTATION: delete the `/^(0|[1-9]\d*)$/` filter in `summarize`. `judged` returns to 10 and
   * the first assertion goes RED.
   */
  const state = withKeys([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
  const s = summarize(state);
  assert.equal(s.judged, 0, 'a verdict under key 100 was counted as a judgement');
  assert.equal(s.complete, false, 'the export announced a completed review with no rows');
  assert.equal(verdictRows(state, pairs).length, 0);
  // The invariant the fix exists to guarantee: the two can no longer disagree.
  assert.equal(s.judged, verdictRows(state, pairs).length);
});

test('RED — negative, fractional and non-canonical keys are not judgements (G04)', () => {
  /*
   * `"01"` matters most: `verdictRows` looks up `state.verdicts[p.index]`, and a JS object
   * lookup with the number `1` finds `"1"` but NOT `"01"`. Accepting the numeric value while
   * `verdictRows` looks up the canonical spelling would re-open the same disagreement.
   *
   * MUTATION: relax the filter to `Number.isInteger(Number(key)) && Number(key) < total`.
   * `"01"` then counts and the last assertion goes RED.
   */
  for (const key of ['-1', '1.5', '01', '1.0', ' 1', '+1', 'ten']) {
    const state = withKeys([key]);
    assert.equal(summarize(state).judged, 0, `key ${JSON.stringify(key)} was counted as a judgement`);
  }
});

test('the same verdicts under REAL pair indices still count (G04, control)', () => {
  // MUTATION: make the filter reject everything (`return false`). This goes RED, which is the
  // correct direction — it shows the filter is a boundary, not a blanket refusal.
  const state = withKeys([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const s = summarize(state);
  assert.equal(s.judged, 10);
  assert.equal(s.complete, true);
  assert.equal(verdictRows(state, pairs).length, 10);
});

test('the boundary is pairCount, not the highest key seen (G04)', () => {
  // `pairCount` is what the pairing was built from. A key equal to it is out of range; the
  // last real index is `pairCount - 1`.
  assert.equal(summarize(withKeys([pairs.length - 1])).judged, 1);
  assert.equal(summarize(withKeys([pairs.length])).judged, 0);
});

test('a restored hostile state cannot resurrect the disagreement (G04)', () => {
  // The reachable path: the bad keys come back from storage, and `loadStoredState` accepts
  // them (they are valid JSON with the right pairing). The fix is in `summarize`, so the
  // export is safe even though the stored map is not normalised.
  const stored = JSON.stringify(withKeys([100, 101]));
  const storage = { getItem: (k) => (k === STORAGE_KEY ? stored : null), setItem: () => {} };
  const restored = loadStoredState(storage, pairs);
  assert.notEqual(restored, null, 'the hostile state should still load');
  assert.equal(summarize(restored).judged, 0, 'a restored out-of-range key was counted');
  assert.equal(summarize(restored).complete, false);
});

/* ── G13: a save that did not happen is not a success ─────────────────────── */

test('RED — a missing store is a failure, not a success receipt (G13)', () => {
  /*
   * `storage?.setItem(...)` short-circuits on a null store, so the whole write was skipped and
   * `true` was returned. Astra executed it.
   *
   * MUTATION: restore `storage?.setItem(...)` and `return true`.
   */
  assert.equal(saveState(null, emptyState(pairs)), false);
  assert.equal(saveState(undefined, emptyState(pairs)), false);
  assert.equal(saveState({}, emptyState(pairs)), false, 'an object with no setItem cannot store');
});

test('a refused write is reported as a failure (G13)', () => {
  // Quota exhaustion is the ordinary real-world case. MUTATION: `catch { return true; }`.
  const denied = {
    setItem() { throw new Error('QuotaExceededError'); },
    getItem() { return null; },
  };
  assert.equal(saveState(denied, emptyState(pairs)), false);
});

test('a working store is still reported as success (G13, control)', () => {
  // MUTATION: `return false` unconditionally. This goes RED.
  let wrote = null;
  const ok = { setItem: (k, v) => { wrote = { k, v }; }, getItem: () => null };
  assert.equal(saveState(ok, emptyState(pairs)), true);
  assert.equal(wrote.k, STORAGE_KEY);
});
