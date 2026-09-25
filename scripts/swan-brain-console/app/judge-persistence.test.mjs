/**
 * judge-persistence-contract — the Judging session's STORED state, and its identity.
 * @module scripts/swan-brain-console/app/judge-persistence.test
 *
 * WHY THIS IS SPLIT FROM `judge-export.test.mjs`
 * Both files cover Judge Mode's state, but they cover different SUBJECTS, and round 11's
 * fixes pushed the pair past Rule 4's budget — which the Judge Mode Rule 4 guard caught, on
 * its first run, exactly as it was written to. `judge-export.test.mjs` covers pairing, the
 * verdict reducer and the two exported artifacts. This file covers what happens between
 * sessions: the state that goes into storage, the state that comes back out, and whether the
 * state that comes back out is about the SAME fleet.
 *
 * THE PROPERTY THAT MATTERS HERE
 * A stored session is evidence with a timestamp on it. If it can be restored against a
 * different fleet, or if it can report itself complete while containing no judgements, then
 * the export carries the authority of a finished review without being one. Both shapes were
 * reachable before round 11 and both are asserted below.
 *
 * Run: node --test scripts/swan-brain-console/app/judge-persistence.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(join(HERE, 'judge-export.mjs')).href);

/** Twenty fake rows, shaped like the fleet rows the console renders. */
const ROWS = Array.from({ length: 20 }, (_, i) => ({ id: `v${String(i + 1).padStart(2, '0')}` }));
const { pairs } = mod.pairsFrom(ROWS);

/** Judge the first `n` pairs, alternating kinds so the summary has something to count. */
function judged(n, at = '2026-09-19T12:00:00.000Z') {
  let state = mod.emptyState(pairs);
  const kinds = ['left', 'right', 'tie', 'neither'];
  for (let i = 0; i < n; i += 1) state = mod.applyVerdict(state, i, kinds[i % kinds.length], at);
  return state;
}

/** An in-memory `localStorage`, so persistence is exercised without a browser. */
function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

/* ── C4 — the state survives a reload ───────────────────────────────────────── */

describe('C4 — the state survives a reload', () => {
  test('the state round-trips through JSON unchanged', () => {
    // localStorage only stores strings, so a state that does not survive JSON.stringify
    // is a state that silently loses verdicts on reload.
    const state = judged(6);
    const revived = JSON.parse(JSON.stringify(state));
    assert.deepEqual(revived, state);
    assert.deepEqual(mod.summarize(revived), mod.summarize(state));
  });

  test('a verdict can be added to a revived state', () => {
    const state = JSON.parse(JSON.stringify(judged(6)));
    const more = mod.applyVerdict(state, 9, 'tie', 'T');
    assert.equal(mod.summarize(more).judged, 7);
  });

  test('a real session survives the real storage path', () => {
    const storage = memoryStorage();
    mod.saveState(storage, judged(4));
    const restored = mod.loadStoredState(storage, pairs);
    assert.ok(restored, 'a session written through saveState did not come back');
    assert.equal(mod.summarize(restored).judged, 4);
  });

  test('summarize tolerates a missing or corrupt verdict map', () => {
    assert.equal(mod.summarize({ pairCount: 10 }).judged, 0);
    /*
     * ROUND 11 (2026-09-20). This line used to assert `judged === 1` for a null verdict — the
     * assertion that blessed the defect. `judged` counted object KEYS while `byKind` counted
     * only valid kinds, so ten nulls produced `judged: 10, complete: true` with every tally
     * zero and an empty exported table. A verdict that is not one of the four kinds is not a
     * judgement, whatever key holds it.
     */
    assert.equal(mod.summarize({ pairCount: 10, verdicts: { 0: null } }).judged, 0);
    assert.equal(mod.summarize({ pairCount: 10, verdicts: { 0: { kind: 'nonsense' } } }).judged, 0);
    assert.equal(mod.summarize({ pairCount: 10, verdicts: { 0: { kind: 'nonsense' } } }).byKind.left, 0);
  });

  test('RED — ten null verdicts cannot report a COMPLETED review', () => {
    // The exact shape that produced `judged: 10, complete: true`, all tallies zero, and an
    // exported `verdicts: []`.
    const verdicts = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, null]));
    const s = mod.summarize({ pairCount: 10, verdicts });
    assert.equal(s.judged, 0);
    assert.equal(s.complete, false, 'ten null verdicts reported a complete review');
    assert.equal(s.unjudged, 10);
  });

  test('RED — `judged` and the exported row count are the same population', () => {
    // `complete` is the claim a reviewer acts on. It must count the rows the export contains.
    const state = { pairCount: 10, pairing: mod.pairingFingerprint(pairs), verdicts: {} };
    state.verdicts[0] = { kind: 'left', at: 'T' };
    state.verdicts[1] = null;
    state.verdicts[2] = { kind: 'nonsense' };
    const s = mod.summarize(state);
    const rows = mod.verdictRows(state, pairs);
    assert.equal(s.judged, rows.length, `judged ${s.judged} but exported ${rows.length} rows`);
  });

  test('RED — a REORDERED fleet cannot inherit the previous judgements', () => {
    /*
     * ROUND 11. The stored session was validated against `pairCount` alone, so a fleet of the
     * same LENGTH whose order had changed re-adopted every verdict and applied it to different
     * variants — and the export then presented those inherited choices, with their original
     * timestamps, as evidence for the new order. Ten pairs of twenty variants is ten either
     * way, which is exactly why the count could not see it.
     */
    const storage = memoryStorage();
    mod.saveState(storage, mod.applyVerdict(mod.emptyState(pairs), 0, 'left', 'T'));

    assert.ok(mod.loadStoredState(storage, pairs), 'the same pairing must restore');
    const reversed = [...pairs].reverse();
    assert.equal(reversed.length, pairs.length, 'the fixture must not change the length');
    assert.equal(
      mod.loadStoredState(storage, reversed),
      null,
      'a reordered fleet restored a session judged against a different pairing',
    );
  });

  test('RED — a REPLACED variant cannot inherit the previous judgement', () => {
    // Same length AND same order, one variant swapped: the fingerprint covers identity, not
    // just position, so this is refused too.
    const storage = memoryStorage();
    mod.saveState(storage, mod.applyVerdict(mod.emptyState(pairs), 0, 'left', 'T'));
    const swapped = mod.pairsFrom(ROWS.map((r, i) => (i === 0 ? { id: 'v99' } : r))).pairs;
    assert.equal(swapped.length, pairs.length);
    assert.equal(mod.loadStoredState(storage, swapped), null);
  });

  test('an absent or corrupt stored value restores nothing, rather than throwing', () => {
    const storage = memoryStorage();
    assert.equal(mod.loadStoredState(storage, pairs), null);
    storage.setItem(mod.STORAGE_KEY, '{not json');
    assert.equal(mod.loadStoredState(storage, pairs), null);
    storage.setItem(mod.STORAGE_KEY, '"a string"');
    assert.equal(mod.loadStoredState(storage, pairs), null);
  });
});

/* ── Rule 4 ─────────────────────────────────────────────────────────────────── */

describe('Rule 4 — the persistence pair stays within budget', () => {
  test('this suite and the module it covers are ≤300 lines', () => {
    for (const f of ['judge-export.mjs', 'judge-persistence.test.mjs']) {
      const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
      assert.ok(lines <= 300, `${f} is ${lines} lines, over the 300-line budget`);
    }
  });
});
