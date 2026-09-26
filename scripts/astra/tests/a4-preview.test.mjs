/**
 * a4-preview.test.mjs — the tuning preview and its fixture.
 *
 * SPLIT OUT OF a4-tune.test.mjs FOR RULE 4. That file reached 349 lines; test files are
 * held to the same 300-line cap as shipped modules (A2's D14 established that).
 *
 * THE SEAM IS "WRITES" VS "WRITES NOTHING", not "file A" vs "file B". a4-tune.test.mjs
 * covers the write path — atomic commit, byte preservation, revert. This file covers the
 * pure half: `applyPatch`'s refusals (a pure text transform), the fixture, and the preview,
 * which reports what a commit WOULD do and touches no file. A test that cannot write cannot
 * corrupt the engine's tuning, which is why the split falls here rather than by line count.
 *
 * THE FIXTURE'S RECORDED BANDS ARE A CLAIM ABOUT THE LIVE ENGINE, and these tests hold it
 * to that. If `tuning.json` moves, the recorded bands go stale and the calibration test
 * fails with instructions to regenerate rather than to edit the band by hand.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { previewStaged, readPairs } from '../core/tuningPreview.mjs';
import { applyPatch } from '../core/tuningStage.mjs';
import { TUNING_PATH } from '../core/paths.mjs';
import { readFileSync as read } from 'node:fs';

const ORIGINAL = read(TUNING_PATH, 'utf8');

// ---------------------------------------------------------------------------
// The fixture, and the preview's honesty about it
// ---------------------------------------------------------------------------

test('the pairs-12 fixture is calibrated against the LIVE tuning, not a remembered one', () => {
  const pairs = readPairs();
  assert.equal(pairs.length, 12, 'the fixture is named pairs-12 and must hold twelve');
  assert.equal(new Set(pairs.map((p) => p.pairId)).size, 12, 'pair ids must be unique');

  const live = previewStaged({ staged: {} }).current.rows;
  const byId = new Map(live.map((r) => [r.pairId, r]));
  for (const p of pairs) {
    const r = byId.get(p.pairId);
    assert.ok(r, `${p.pairId} missing from the live scoring`);
    assert.equal(p.expectedBand, r.band,
      `${p.pairId}: recorded "${p.expectedBand}" but the live engine says "${r.band}". `
      + 'tuning.json has moved — re-run the fixture generator rather than editing the band.');
    assert.ok(Math.abs(p.measured.S - r.S) < 1e-9, `${p.pairId}: recorded S is stale`);
    assert.ok(Math.abs(p.measured.margin - r.margin) < 1e-9, `${p.pairId}: recorded margin is stale`);
  }
});

test('the fixture is DIAGNOSTIC: it spans the bands and brackets both thresholds', () => {
  const rows = previewStaged({ staged: {} }).current.rows;
  const bands = new Set(rows.map((r) => r.band));
  assert.ok(bands.has('auto') && bands.has('fresh'),
    `the fixture must contain both an auto and a fresh pair, got ${[...bands].join(',')}`);
  // A fixture with no pair near a threshold cannot show a threshold moving.
  const nearAuto = rows.filter((r) => Math.abs(r.S - 0.82) < 0.05);
  const nearFloor = rows.filter((r) => Math.abs(r.S - 0.55) < 0.05);
  assert.ok(nearAuto.length >= 1, 'no pair sits within 0.05 of the auto.S gate');
  assert.ok(nearFloor.length >= 2, 'fewer than two pairs sit within 0.05 of the merge-band floor');
  // And the margin gate must actually be exercised by something.
  assert.ok(rows.some((r) => r.margin < 0.10), 'no pair is blocked by the margin gate');
});

test('a staged weight change moves pairs DOWNWARD and flags the gate family', () => {
  const p = previewStaged({ staged: { 'weights.overlap': 0.1 } });
  assert.ok(p.moves.length > 0, 'halving overlap must move something');
  assert.ok(p.moves.every((m) => m.to === 'fresh' || m.to === 'merge-band'),
    'lowering overlap cannot push a pair UP a band');
  assert.equal(p.blastRadius.find((b) => b.family === 'weights.').gate, true);
  assert.equal(p.wrote, false);
});

test('an ambiguous or unknown key is REFUSED — never a guess about which knob was meant', () => {
  assert.throws(() => applyPatch(ORIGINAL, { 'nope.missing': 1 }), (e) => e.code === 'E_TUNING_KEY_UNKNOWN');
  // Two leaves named `low` would make `"low"` unlocatable; refuse rather than take the first.
  const twoLows = '{\n  "a": { "low": 0.1 },\n  "b": { "low": 0.2 }\n}';
  assert.throws(() => applyPatch(twoLows, { 'a.low': 0.5 }), (e) => e.code === 'E_TUNING_AMBIGUOUS');
  // A patch that would change nothing is refused, so history has no no-op entries.
  assert.throws(() => applyPatch(ORIGINAL, { 'auto.S': 0.82 }), (e) => e.code === 'E_TUNING_NO_CHANGES');
  assert.throws(() => applyPatch(ORIGINAL, {}), (e) => e.code === 'E_TUNING_NO_CHANGES');
});

test('a multi-key patch validates EVERY key before applying ANY of them', () => {
  // One good key and one bad: nothing may be applied. A half-applied config is exactly
  // what the atomic write exists to prevent, one level up.
  assert.throws(() => applyPatch(ORIGINAL, { 'auto.S': 0.5, 'nope.missing': 1 }),
    (e) => e.code === 'E_TUNING_KEY_UNKNOWN');
  const ok = applyPatch(ORIGINAL, { 'auto.S': 0.5, 'novelty.window': 5 });
  assert.match(ok.text, /"S": 0\.5/);
  assert.match(ok.text, /"window": 5/);
  assert.equal(ok.changes.length, 2);
});
