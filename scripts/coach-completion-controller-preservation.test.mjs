// scripts/coach-completion-controller-preservation.test.mjs
//
// R7-02 (Astra Review 7, HIGH): #55 — "the live repair detects only some forms of loss."
//
// WHY THIS IS ITS OWN SUITE. R7-02's verdict was *"Closure must bind the repaired invariant, not one
// selected example."* The earlier fix DID catch the v7→v8 incident shape and was still blind to five
// further mutations, because it tested a per-slice JOIN and the C→S migration has ZERO id overlap
// (active `C0…C5` vs historical `S83…S90`) — so the loop body never ran. A suite built from the one
// example that worked could not see that. This suite is therefore written as a MUTATION MATRIX plus
// the honest control, because a refusal set alone is satisfied by a gate that refuses everything.
//
// Run from ROOT:  node --test scripts/coach-completion-controller-preservation.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { checkControllerMigration } from './coach-completion-checkpoint.mjs';

// ── The two sides ───────────────────────────────────────────────────────────
// `before` is the TRUE predecessor. `origin.state` is the MIGRATION'S CLAIM about it, and the attack
// is that the claim is falsified so it agrees with the migration's own content. Mutating only the
// `before` copy would leave the two consistent and prove nothing — the mistake my first probe made.
const truePred = () => ({
  taskId: 't', sessionId: 's', calls: 12,
  slices: ['S83', 'S84', 'S85', 'S86', 'S87', 'S88a', 'S88b', 'S89', 'S90'].map((id) => ({
    id, status: 'tested', digest: 'digest-value', frozen: { file: 'hash' },
    reviewDisposition: 'accept', allowedFiles: ['a', 'b'],
  })),
  events: Array.from({ length: 216 }, (_, i) => ({ type: `e${i}`, payload: { n: i } })),
  authorization: { cadence: 'final-astra' },
});

const pair = (falsifyClaim) => {
  const claim = JSON.parse(JSON.stringify(truePred()));
  if (falsifyClaim) falsifyClaim(claim);
  return {
    before: truePred(),
    after: {
      taskId: 't', sessionId: 's', calls: 12,
      slices: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5'].map((id) => ({ id, status: 'build' })),
      events: [...claim.events, { type: 'explicit-migration' }],
      origin: { state: claim, events: claim.events },
      authorization: { cadence: 'final-astra' },
    },
  };
};

// ── CONTROL: the honest migration must PASS ─────────────────────────────────
test('CONTROL: an honest C→S vocabulary migration passes (no false positive)', () => {
  assert.deepEqual(checkControllerMigration(pair()), []);
});

test('CONTROL: a purely non-shrinking migration carries origin and is unaffected by R7-02', () => {
  // Same slice set on both sides (no vocabulary change), so the R7-02 content-equality checks have
  // nothing to complain about. `origin` is still required by the LONG-STANDING checks in this gate
  // (the event prefix and the explicit-migration event predate R7-02), so this fixture supplies them
  // and the assertion is that R7-02 adds NO violation on top.
  const s = truePred();
  const after = {
    ...JSON.parse(JSON.stringify(s)),
    calls: 13,
    events: [...s.events, { type: 'explicit-migration' }],
    origin: { state: JSON.parse(JSON.stringify(s)), events: s.events },
  };
  const v = checkControllerMigration({ before: s, after });
  assert.ok(!v.some((m) => /R7-02|does NOT equal the predecessor|active slices are EMPTY/.test(m)), v.join(' | '));
});

// ── THE MUTATION MATRIX — each one was ADMITTED ([]) before the fix ─────────
test('R7-02 M1: a claimed snapshot whose allowedFiles array SHRANK is refused', () => {
  const v = checkControllerMigration(pair((c) => { c.slices[0].allowedFiles = ['a']; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

test('R7-02 M2: a claimed snapshot whose `frozen` object was EMPTIED is refused', () => {
  // The key SURVIVES, so a key-presence check cannot see this. Only content equality can.
  const v = checkControllerMigration(pair((c) => { c.slices[0].frozen = {}; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

test('R7-02 M3: a claimed snapshot whose `digest` was NULLED is refused', () => {
  const v = checkControllerMigration(pair((c) => { c.slices[0].digest = null; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

test('R7-02 M4: a REPLACED predecessor slice at the same count is refused', () => {
  // Count is identical, so a length check cannot see the swap.
  const v = checkControllerMigration(pair((c) => { c.slices[0] = { id: 'SXX-FABRICATED', status: 'tested' }; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

test('R7-02 M5: equal-count replacement of EVENT BODIES is refused (prefix, deep)', () => {
  // The length is preserved exactly. A `.length` comparison is blind to it by construction.
  const v = checkControllerMigration(pair((c) => { c.events = c.events.map((e, i) => (i === 0 ? { type: 'TAMPERED', payload: { n: 0 } } : e)); }));
  assert.ok(v.some((m) => /origin\.events preserved 0 of 216/.test(m)), v.join(' | '));
});

test('R7-02 M6: a predecessor GUTTED to almost-empty is refused', () => {
  const v = checkControllerMigration(pair((c) => { c.slices = []; c.events = []; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

test('R7-02 M7: a REWRITTEN authorization in the claimed snapshot is refused', () => {
  // The migration rewrote the past to make `final-fable` look like it was always the cadence.
  const v = checkControllerMigration(pair((c) => { c.authorization = { cadence: 'final-fable' }; }));
  assert.ok(v.some((m) => /does NOT equal the predecessor/.test(m)), v.join(' | '));
});

// ── The structural additions ────────────────────────────────────────────────
test('R7-02: a MISSING origin.state is refused, not skipped', () => {
  const p = pair();
  delete p.after.origin.state;
  const v = checkControllerMigration(p);
  assert.ok(v.some((m) => /origin\.state is MISSING/.test(m)), v.join(' | '));
});

test('R7-02: an ACTIVE state emptied while the predecessor had slices is refused', () => {
  const p = pair();
  p.after.slices = [];
  const v = checkControllerMigration(p);
  assert.ok(v.some((m) => /active slices are EMPTY/.test(m)), v.join(' | '));
});

test('R7-02: a declared scopeCorrection naming a non-predecessor id is refused', () => {
  const p = pair();
  p.after.origin.scopeCorrections = [{ from: 'NOT-A-SLICE', to: 'C0' }];
  assert.ok(checkControllerMigration(p).some((m) => /which is NOT a predecessor slice id/.test(m)));
  const q = pair();
  q.after.origin.scopeCorrections = [{ from: 'S83', to: 'NOT-ACTIVE' }];
  assert.ok(checkControllerMigration(q).some((m) => /which is NOT an active slice id/.test(m)));
  const r = pair();
  r.after.origin.scopeCorrections = [{ from: 'S83' }];
  assert.ok(checkControllerMigration(r).some((m) => /entry is incomplete/.test(m)));
});

// ── THE REAL STATE — the control that caught my OWN over-refusal ────────────
test('R7-02 REAL: the supported v9 state passes against its DECLARED predecessor', () => {
  // This test exists because my first version of the R7-02 fix MANDATED a top-level `scopeMapping`
  // field and thereby REFUSED the real, correct migration (1 violation). The control caught it.
  // Note the correct predecessor is what v9 DECLARES (`origin.state`, 216 events / 9 slices) — NOT
  // `workflow-state-v8.json` on disk, which is a LATER snapshot (219 events / 10 slices) and would
  // measure the probe's mistake rather than the gate's behaviour.
  const rel = 'tmp/coach-completion-20260921/workflow-state-v9.json';
  if (!existsSync(rel)) { assert.ok(true, 'v9 state absent in this checkout — control not applicable'); return; }
  const v9 = JSON.parse(readFileSync(rel, 'utf8'));
  assert.ok(v9.origin?.state, 'v9 must declare its predecessor');
  assert.deepEqual(checkControllerMigration({ before: v9.origin.state, after: v9 }), []);
});
