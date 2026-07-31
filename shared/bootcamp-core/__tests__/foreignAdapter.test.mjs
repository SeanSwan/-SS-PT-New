/**
 * THE PORTABILITY PROOF — SWA-105 Slice 0.
 *
 * Kimi K3 (R11) rejected "zero SwanStudios imports" as a DoD: it is a lint rule,
 * and you can have zero imports with total semantic coupling. The real test it
 * prescribed:
 *
 *   "A tiny in-memory demo app that implements all the ports with fake data and
 *    runs a full class end-to-end. If the fake app needs to know what a board
 *    is, the seam failed."
 *
 * So this file is a deliberately FOREIGN app — a fictional climbing-gym
 * conditioning tool. It shares no vocabulary with SwanStudios:
 *   - its own day types (`power`, `endurance`), NOT Sean's four rotations
 *   - its own anatomy (`fingers`, `pulling_chain`), mapped at the boundary
 *   - no Board 1/2/3, no NASM, no Swan palette, no equipment profiles
 *
 * If any Swan concept is load-bearing in core, this file cannot be written.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createClassPlan, createExerciseSlot, validateClassPlan } from '../classPlan.mjs';
import { createDayTypeRegistry, checkDayTypeLegality } from '../dayTypes.mjs';
import { normalizeMovement } from '../taxonomy.mjs';
import { compileTimeline, segmentAt } from '../timeline.mjs';
import { stationPresentation } from '../phases.mjs';

// ── A foreign domain, expressed entirely in ITS OWN terms ───────────────────

const CLIMBING_DAY_TYPES = [
  {
    id: 'power',
    label: 'Power',
    primaryRegions: ['upper', 'full'],
    excludePatterns: ['gait'],
    volumeBudget: { core: 0.2 },
  },
  {
    id: 'endurance',
    label: 'Endurance',
    primaryRegions: ['upper', 'lower', 'core', 'full'],
    excludePatterns: [],
  },
];

/** The adapter's own exercise records — nothing here resembles Swan's schema. */
const CLIMBING_LIBRARY = [
  { id: 'hangboard_repeaters', title: 'Hangboard Repeaters', bodyArea: 'pulling_chain', motion: 'pull_vertical', stress: ['elbow'], gear: ['board'] },
  { id: 'campus_ladder', title: 'Campus Ladder', bodyArea: 'pulling_chain', motion: 'pull_vertical', stress: ['shoulder', 'elbow'], gear: ['campus_rungs'] },
  { id: 'ring_row', title: 'Ring Row', bodyArea: 'pulling_chain', motion: 'pull_horizontal', stress: ['elbow'], gear: ['rings'] },
  { id: 'front_lever_hold', title: 'Front Lever Hold', bodyArea: 'trunk', motion: 'isometric', stress: [], gear: ['bar'] },
  { id: 'treadmill_intervals', title: 'Treadmill Intervals', bodyArea: 'legs', motion: 'gait', stress: ['knee'], gear: ['treadmill'] },
];

/**
 * The ONLY coupling point: the adapter translates its anatomy into core's
 * minimal region/pattern taxonomy. Core never learns the word "pulling_chain".
 */
const AREA_TO_REGION = { pulling_chain: 'upper', trunk: 'core', legs: 'lower', whole: 'full' };

function toCoreMovement(record) {
  return normalizeMovement({
    primaryRegion: AREA_TO_REGION[record.bodyArea],
    regions: [AREA_TO_REGION[record.bodyArea]],
    pattern: record.motion,
    loadedJoints: record.stress,
    impact: 'low',
  });
}

/**
 * NOTE — the trap a real integrator hits, and the reason core rejects it:
 * `slotId` is an OCCURRENCE id, `exerciseRef` is the EXERCISE id. Ring Row
 * appears in both the warmup and the work block below, so reusing the exercise
 * id as the slot id would make "swap this slot" ambiguous. The adapter mints an
 * occurrence-scoped id; core caught the naive version.
 */
function toSlot(record, occurrence) {
  return createExerciseSlot({
    slotId: `${occurrence}:${record.id}`,
    exerciseRef: record.id,
    displayName: record.title,
    movement: toCoreMovement(record),
    equipmentRefs: record.gear,
  });
}

// ── The proof ───────────────────────────────────────────────────────────────

test('FOREIGN: a non-Swan app can define its own day types', () => {
  const registry = createDayTypeRegistry(CLIMBING_DAY_TYPES);
  assert.deepEqual(registry.ids(), ['power', 'endurance']);
  assert.equal(registry.has('upper_body'), false, 'Swan day types must not be baked into core');
});

test('FOREIGN: the day-type contract works on a foreign taxonomy', () => {
  const registry = createDayTypeRegistry(CLIMBING_DAY_TYPES);
  const power = registry.require('power');

  const hangboard = CLIMBING_LIBRARY.find((e) => e.id === 'hangboard_repeaters');
  assert.equal(checkDayTypeLegality(power, toCoreMovement(hangboard)).legal, true);

  // Treadmill is `gait`, which this foreign app excludes from Power day.
  const treadmill = CLIMBING_LIBRARY.find((e) => e.id === 'treadmill_intervals');
  const verdict = checkDayTypeLegality(power, toCoreMovement(treadmill));
  assert.equal(verdict.legal, false);
  assert.equal(verdict.reason, 'excluded_pattern');
});

test('FOREIGN: a full class builds, validates and runs end-to-end', () => {
  const registry = createDayTypeRegistry(CLIMBING_DAY_TYPES);
  const power = registry.require('power');

  const legal = CLIMBING_LIBRARY
    .filter((r) => checkDayTypeLegality(power, toCoreMovement(r)).legal)
    .map((r, i) => toSlot(r, `work${i}`));
  assert.ok(legal.length >= 3, 'foreign library should yield legal power-day work');

  const plan = createClassPlan({
    planId: 'climb_power_01',
    name: 'Power session',
    intent: {
      dayTypeId: 'power',
      targetDurationMin: 40,
      headcount: 6,
      equipmentProfileId: 'wall_a',
      mode: 'strict',
    },
    structure: {
      shape: 'stations',
      stationCount: 2,
      exercisesPerStation: 2,
      rounds: 3,
      workSec: 30,
      restSec: 30,
      stationTransitionSec: 60,
      roundBreakSec: 0,
    },
    blocks: [
      { kind: 'warmup', slots: [toSlot(CLIMBING_LIBRARY[2], 'warmup0')] },
      { kind: 'work', slots: legal.slice(0, 4) },
      { kind: 'cooldown', slots: [toSlot(CLIMBING_LIBRARY[3], 'cool0')] },
    ],
    stations: [
      { stationIndex: 0, label: 'Board', equipmentRefs: ['board'] },
      { stationIndex: 1, label: 'Rings', equipmentRefs: ['rings'] },
    ],
    provenance: { generator: 'deterministic' },
  });

  // Structural validity with zero Swan concepts present.
  assert.deepEqual(validateClassPlan(plan), []);

  // And it actually runs on a clock.
  const t0 = 1_785_000_000_000;
  const timeline = compileTimeline(plan, t0);
  assert.ok(timeline.totalSec > 0);
  assert.equal(segmentAt(timeline, t0).status, 'running');
  assert.equal(segmentAt(timeline, timeline.endsAt).status, 'complete');
});

test('FOREIGN: the seam never required a "board", NASM, or an equipment profile', () => {
  // Guard against future leakage: if someone adds a Swan-flavoured required
  // field to core, this file stops compiling or this assertion stops holding.
  const slot = createExerciseSlot({ slotId: 'x', displayName: 'Anything' });
  assert.deepEqual(slot.variants, [], 'variants must default empty — not Board 1/2/3');
  assert.equal('boardNumber' in slot, false);
  assert.equal('nasmPhase' in slot, false);
  assert.equal('kneeMod' in slot, false, 'per-joint mod fields are Swan pedagogy, not core');
});

test('FOREIGN: TV density is derived from hardware, not from Swan config', () => {
  // A climbing gym with a 65" panel gets the same physics.
  assert.equal(stationPresentation(2, 6).mode, 'grid');
  assert.equal(stationPresentation(9, 4).mode, 'rotation_only');
});
