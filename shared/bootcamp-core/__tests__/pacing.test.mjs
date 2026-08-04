/**
 * SWA-105 Slice 3 — pacing (amrap/emom/tabata) as schema, not folklore.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { validateClassPlan, createExerciseSlot } from '../classPlan.mjs';
import { expandSegments, compileTimeline } from '../timeline.mjs';
import { validatePacing, isPacedBlock, PACING_MODES } from '../pacing.mjs';
import { ALL_FIXTURES } from '../fixtures.mjs';

const T0 = 1_785_000_000_000;

const pacedSlot = (name) => createExerciseSlot({
  slotId: name.toLowerCase().replace(/\s+/g, '_'),
  exerciseRef: `ex_${name.toLowerCase().replace(/\s+/g, '_')}`,
  displayName: name,
  movement: { primaryRegion: 'full', regions: ['full'], pattern: null, joints: [], impact: 'moderate' },
});

/** A stations-shaped plan gains a tabata finisher block — the real-world case. */
function planWithFinisherBlock(pacing) {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks.splice(2, 0, {
    kind: 'work',
    pacing,
    slots: [pacedSlot('Fast Feet'), pacedSlot('Step-Out Jacks')],
  });
  return plan;
}

test('the modes are the ratified four', () => {
  assert.deepEqual([...PACING_MODES], ['interval', 'amrap', 'emom', 'tabata']);
});

test('a tabata finisher block inside a stations class validates', () => {
  const plan = planWithFinisherBlock({ mode: 'tabata', rounds: 8 });
  assert.deepEqual(validateClassPlan(plan), []);
});

test('tabata expands to rounds x work with rests between (classic 8x20/10 = 230s)', () => {
  const plan = planWithFinisherBlock({ mode: 'tabata', rounds: 8 });
  const paced = expandSegments(plan).filter((s) => s.pacingMode === 'tabata');
  const work = paced.filter((s) => s.phase === 'work');
  const rest = paced.filter((s) => s.phase === 'rest');
  assert.equal(work.length, 8);
  assert.equal(rest.length, 7); // no trailing rest
  assert.equal(paced.reduce((sum, s) => sum + s.durationSec, 0), 8 * 20 + 7 * 10);
  assert.equal(work[0].slotId, 'fast_feet');
  assert.notEqual(work[1].slotId, work[0].slotId, 'consecutive rounds alternate the pair');
});

test('tabata cycles its slots', () => {
  const plan = planWithFinisherBlock({ mode: 'tabata', rounds: 4 });
  const work = expandSegments(plan).filter((s) => s.pacingMode === 'tabata' && s.phase === 'work');
  assert.equal(new Set(work.map((s) => s.slotId)).size, 2);
});

test('emom expands to one 60s slot-bound segment per minute', () => {
  const plan = planWithFinisherBlock({ mode: 'emom', rounds: 6 });
  const work = expandSegments(plan).filter((s) => s.pacingMode === 'emom');
  assert.equal(work.length, 6);
  assert.ok(work.every((s) => s.durationSec === 60 && s.slotId));
});

test('amrap is ONE window bound to no slot — the menu, not a sequence', () => {
  const plan = planWithFinisherBlock({ mode: 'amrap', blockMin: 6 });
  const paced = expandSegments(plan).filter((s) => s.pacingMode === 'amrap');
  assert.equal(paced.length, 1);
  assert.equal(paced[0].durationSec, 360);
  assert.equal(paced[0].slotId, null);
});

test('a paced block never enters the circuit math', () => {
  const base = ALL_FIXTURES.fullBodyStationClass();
  const withBlock = planWithFinisherBlock({ mode: 'amrap', blockMin: 4 });
  const circuit = (p) => expandSegments(p).filter((s) => s.phase === 'work' && !s.pacingMode).length;
  assert.equal(circuit(withBlock), circuit(base), 'circuit work count must be unchanged');
  // and the compiled total grows by exactly the window
  const dt = compileTimeline(withBlock, T0).totalSec - compileTimeline(base, T0).totalSec;
  assert.equal(dt, 240);
});

test('slots inside a paced block must not carry a stationIndex', () => {
  const plan = planWithFinisherBlock({ mode: 'emom', rounds: 4 });
  plan.blocks[2].slots[0].stationIndex = 0;
  assert.match(validateClassPlan(plan).join(';'), /synchronized; everyone works together/);
});

test('a paced block with no slots is rejected', () => {
  const plan = planWithFinisherBlock({ mode: 'amrap', blockMin: 5 });
  plan.blocks[2].slots = [];
  assert.match(validateClassPlan(plan).join(';'), /timed window over nothing/);
});

test('mode-specific requirements are enforced', () => {
  assert.match(validatePacing({ pacing: { mode: 'amrap' } }, 'b').join(';'), /blockMin/);
  assert.match(validatePacing({ pacing: { mode: 'emom' } }, 'b').join(';'), /rounds/);
  assert.match(validatePacing({ pacing: { mode: 'tabata', rounds: 0 } }, 'b').join(';'), /rounds/);
  assert.match(validatePacing({ pacing: { mode: 'yoga_flow' } }, 'b').join(';'), /must be one of/);
  assert.deepEqual(validatePacing({ pacing: { mode: 'interval' } }, 'b'), []);
  assert.equal(isPacedBlock({ pacing: { mode: 'interval' } }), false);
});

test('overrun accounting includes paced blocks', () => {
  const plan = planWithFinisherBlock({ mode: 'amrap', blockMin: 90 }); // absurd window
  assert.match(validateClassPlan(plan).join(';'), /overrun|exceeds/);
});
