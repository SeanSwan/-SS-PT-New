/**
 * SWA-105 Slice 2 — the relaxation ladder, fact chips, and the validator's
 * insufficiency invariants.
 *
 * The bar these tests hold: it must be impossible to ship a class that bent a
 * rule without saying which one, and impossible to ship one that claims a
 * relaxation it never needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runLadder, pickTop, summarizeRelaxations, rungIndex, STRUCTURAL_OUTS,
} from '../relaxation.mjs';
import { RUNGS, RUNG_CONSTRAINT, RUNG_CHIP, CHIPS } from '../constants.mjs';
import { deriveChips, CHIP_TONE, TONES, untonedChips, toneChips, MAX_CHIPS } from '../chips.mjs';
import { validateClassPlan } from '../validate.mjs';
import { fullBodyStationClass, relaxedSwapClass } from '../fixtures.mjs';

const item = (id, props = {}) => ({ id, ...props });
const ident = (x) => x.id;

// ── the ladder walks in order, one constraint per rung ────────────────

test('R0 is returned when the strict pool already satisfies the need', () => {
  const result = runLadder({
    candidates: [item('a'), item('b'), item('c')],
    need: 2,
    constraints: { pattern_fidelity: () => true },
    identify: ident,
  });
  assert.equal(result.rung, 'R0');
  assert.equal(result.exhausted, false);
  assert.deepEqual(result.relaxedCounts, {});
  assert.deepEqual(result.admitted.map((e) => e.rung), ['R0', 'R0', 'R0']);
});

test('descends only as far as the need requires, and never further', () => {
  // Two clean candidates, one that violates pattern fidelity, one that also
  // violates equipment. Needing 3 must stop at R3, not fall through to R5.
  const result = runLadder({
    candidates: [
      item('clean1'), item('clean2'),
      item('patternBent', { bendsPattern: true }),
      item('kitBent', { bendsPattern: true, bendsKit: true }),
    ],
    need: 3,
    constraints: {
      pattern_fidelity: (i) => !i.bendsPattern,
      equipment: (i) => !i.bendsKit,
    },
    identify: ident,
  });
  assert.equal(result.rung, 'R3');
  assert.deepEqual(result.admitted.map((e) => e.item.id), ['clean1', 'clean2', 'patternBent']);
  assert.equal(result.relaxedCounts.R3, 1);
  assert.equal(result.relaxedCounts.R5, undefined);
});

test('an item entering at R3 is labelled R3 while its clean peers stay R0', () => {
  const result = runLadder({
    candidates: [item('clean'), item('bent', { bendsPattern: true })],
    need: 2,
    constraints: { pattern_fidelity: (i) => !i.bendsPattern },
    identify: ident,
  });
  const byId = Object.fromEntries(result.admitted.map((e) => [e.item.id, e.rung]));
  assert.equal(byId.clean, 'R0');
  assert.equal(byId.bent, 'R3');
});

test('an item violating several constraints enters at its DEEPEST rung', () => {
  const result = runLadder({
    candidates: [item('multi', { stale: true, bendsPattern: true })],
    need: 1,
    constraints: {
      anti_repeat: (i) => !i.stale,          // R1
      pattern_fidelity: (i) => !i.bendsPattern, // R3
    },
    identify: ident,
  });
  assert.equal(result.admitted[0].rung, 'R3');
  assert.deepEqual(result.admitted[0].violated.sort(), ['anti_repeat', 'pattern_fidelity']);
});

test('anti-repeat (R1) yields before pattern fidelity (R3) — the ordering claim', () => {
  const result = runLadder({
    candidates: [item('stale', { stale: true }), item('wrongPattern', { bendsPattern: true })],
    need: 1,
    constraints: {
      anti_repeat: (i) => !i.stale,
      pattern_fidelity: (i) => !i.bendsPattern,
    },
    identify: ident,
  });
  // Repeating a movement from three weeks ago costs less than a squat on
  // upper day, so the stale one is consumed first.
  assert.equal(result.rung, 'R1');
  assert.equal(result.admitted[0].item.id, 'stale');
});

// ── the hard floor is never relaxed ───────────────────────────────────

test('hardFilter rejects at EVERY rung, including R5', () => {
  const result = runLadder({
    candidates: [item('illegal', { legal: false })],
    need: 3,
    hardFilter: (i) => i.legal !== false,
    alwaysLegal: [item('pinnedIllegal', { legal: false }), item('pinnedOk', { legal: true })],
    identify: ident,
  });
  const ids = result.admitted.map((e) => e.item.id);
  assert.deepEqual(ids, ['pinnedOk']);
  assert.equal(result.rejectedByFloor, 1);
});

// ── R5 is a guarantee, not a search ───────────────────────────────────

test('R5 tops up from the pinned set when the pool starves', () => {
  const result = runLadder({
    candidates: [item('only')],
    need: 3,
    alwaysLegal: [item('bw1'), item('bw2'), item('bw3')],
    identify: ident,
  });
  assert.equal(result.rung, 'R5');
  assert.equal(result.exhausted, false);
  assert.equal(result.admitted.length, 4);
  assert.equal(result.relaxedCounts.R5, 3);
});

test('a pinned item already present in the pool keeps its better rung', () => {
  const result = runLadder({
    candidates: [item('push_up')],
    need: 1,
    alwaysLegal: [item('push_up'), item('plank')],
    identify: ident,
  });
  assert.equal(result.rung, 'R0');
  assert.deepEqual(result.admitted.map((e) => e.item.id), ['push_up']);
});

test('R6 reports structural outs rather than an empty state', () => {
  const result = runLadder({ candidates: [item('a')], need: 4, alwaysLegal: [], identify: ident });
  assert.equal(result.rung, 'R6');
  assert.equal(result.exhausted, true);
  assert.equal(result.shortfall, 3);
  assert.deepEqual(result.structuralOuts, STRUCTURAL_OUTS);
  // Still returns what it has — the system never says no.
  assert.equal(result.admitted.length, 1);
});

test('R6 is never stamped on an admitted item', () => {
  const result = runLadder({ candidates: [item('a')], need: 9, identify: ident });
  assert.equal(result.rung, 'R6');
  for (const entry of result.admitted) assert.notEqual(entry.rung, 'R6');
});

test('an empty ask is not an error', () => {
  const result = runLadder({ candidates: [], need: 0, identify: ident });
  assert.equal(result.exhausted, false);
  assert.deepEqual(result.admitted, []);
});

test('pickTop returns the deck size the SwapDeck asks for', () => {
  const result = runLadder({ candidates: [item('a'), item('b'), item('c'), item('d')], need: 3, identify: ident });
  assert.equal(pickTop(result, 3).length, 3);
  assert.deepEqual(pickTop(null, 3), []);
});

// ── the ladder vocabulary is internally consistent ────────────────────

test('every rung except R0 and R6 relaxes exactly one named constraint', () => {
  for (const rung of RUNGS) {
    const constraint = RUNG_CONSTRAINT[rung];
    if (rung === 'R0') assert.equal(constraint, null);
    else assert.equal(typeof constraint, 'string', `${rung} must name a constraint`);
  }
  assert.equal(RUNG_CHIP.R0, undefined);
  assert.equal(RUNG_CHIP.R6, undefined, 'R6 has no item, so it can have no chip');
});

test('every relaxation chip is a member of the closed chip enum', () => {
  for (const chip of Object.values(RUNG_CHIP)) assert.ok(CHIPS.includes(chip), `${chip} missing from CHIPS`);
});

test('rungIndex orders the ladder as written', () => {
  assert.ok(rungIndex('R1') < rungIndex('R3'));
  assert.ok(rungIndex('R3') < rungIndex('R5'));
  assert.equal(rungIndex('nonsense'), -1);
});

// ── chips: derived, capped, tone-total, never purple ──────────────────

test('every chip in the closed enum has a tone', () => {
  assert.deepEqual(untonedChips(), []);
});

test('no chip carries an AI/coach tone — purple is unrepresentable', () => {
  for (const tone of Object.values(CHIP_TONE)) assert.ok(TONES.includes(tone), `unknown tone ${tone}`);
  assert.equal(TONES.includes('ai'), false);
});

test('a relaxed selection ALWAYS leads with the chip naming the bent rule', () => {
  const chips = deriveChips({ lowImpact: true, noSetup: true, jointSafe: true }, { rung: 'R5' });
  assert.equal(chips[0], 'bodyweight_sub');
  assert.equal(chips.length, MAX_CHIPS);
});

test('a clean selection carries no relaxation chip', () => {
  const chips = deriveChips({ lowImpact: true, noSetup: true }, { rung: 'R0' });
  assert.equal(chips.includes('bodyweight_sub'), false);
  assert.deepEqual(chips, ['low_impact', 'no_setup']);
});

test('chips are capped at two and ordered by driving tier', () => {
  const chips = deriveChips({
    wasHere: true, jointSafe: true, lowImpact: true, samePattern: true,
    noSetup: true, sameKit: true, notUsedRecently: true, isNew: true, coachFavorite: true,
  }, { rung: 'R0' });
  assert.equal(chips.length, 2);
  assert.deepEqual(chips, ['was_here', 'joint_safe']);
});

test('unproven facts render nothing — omission never becomes a guess', () => {
  assert.deepEqual(deriveChips({}, { rung: 'R0' }), []);
  assert.deepEqual(deriveChips({ lowImpact: false }, { rung: 'R0' }), []);
});

test('toneChips pairs each chip with its tone and drops unknowns', () => {
  assert.deepEqual(toneChips(['low_impact', 'bodyweight_sub', 'fabricated']), [
    { chip: 'low_impact', tone: 'structural' },
    { chip: 'bodyweight_sub', tone: 'relaxed' },
  ]);
});

// ── the validator makes both lies unrepresentable ─────────────────────

const withSlot = (mutate) => {
  const plan = fullBodyStationClass();
  mutate(plan.blocks[1].slots[0]);
  return validateClassPlan(plan);
};

test('a relaxed slot that does not name its bent rule is INVALID', () => {
  const problems = withSlot((slot) => { slot.rung = 'R3'; slot.chips = ['low_impact']; });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /must name the rule it bent/);
});

test('a clean slot wearing a relaxation chip it did not earn is INVALID', () => {
  const problems = withSlot((slot) => { slot.rung = 'R0'; slot.chips = ['bodyweight_sub']; });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /may not claim a relaxation it did not need/);
});

test('a slot wearing the WRONG relaxation chip is INVALID in both directions', () => {
  const problems = withSlot((slot) => { slot.rung = 'R5'; slot.chips = ['different_pattern']; });
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => /must name the rule it bent/.test(p)));
  assert.ok(problems.some((p) => /did not need/.test(p)));
});

test('a correctly-confessing relaxed slot is VALID', () => {
  const problems = withSlot((slot) => { slot.rung = 'R5'; slot.chips = ['bodyweight_sub', 'low_impact']; });
  assert.deepEqual(problems, []);
});

test('the relaxed fixture confesses its rung', () => {
  assert.deepEqual(validateClassPlan(relaxedSwapClass()), []);
});

// ── the summary is derived, never stored ──────────────────────────────

test('summarizeRelaxations counts by rung and names the constraints in ladder order', () => {
  const summary = summarizeRelaxations([
    { rung: 'R0' }, { rung: 'R5' }, { rung: 'R3' }, { rung: 'R5' }, {},
  ]);
  assert.deepEqual(summary.counts, { R3: 1, R5: 2 });
  assert.equal(summary.deepest, 'R5');
  assert.equal(summary.relaxedSlots, 3);
  assert.deepEqual(summary.constraints, ['pattern_fidelity', 'equipment']);
});

test('a clean class summarizes to nothing relaxed', () => {
  const summary = summarizeRelaxations([{ rung: 'R0' }, { rung: 'R0' }]);
  assert.deepEqual(summary.counts, {});
  assert.equal(summary.relaxedSlots, 0);
  assert.deepEqual(summary.constraints, []);
});

test('summarizeRelaxations reads the Swan field name too, and ignores nonsense', () => {
  const summary = summarizeRelaxations([{ selectionRung: 'R3' }, { rung: 'R99' }, null]);
  assert.deepEqual(summary.counts, { R3: 1 });
});
