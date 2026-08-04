/**
 * Fable review pass — SWA-105 Slice 0, 2026-07-31.
 * Nine findings against a suite that was green. Each test here pins one fix so
 * the defect class cannot silently return.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createDayTypeRegistry, SWAN_DAY_TYPES, checkVolumeBudget } from '../dayTypes.mjs';
import { maxStationCards, CARD_HEIGHT_FACTOR, DEFAULT_MAX_STATION_CARDS } from '../phases.mjs';
import { compileTimeline, reconcile, compressRemaining, expandSegments } from '../timeline.mjs';
import { validateClassPlan } from '../classPlan.mjs';
import { ALL_FIXTURES } from '../fixtures.mjs';

const T0 = 1_785_000_000_000;
const registry = createDayTypeRegistry(SWAN_DAY_TYPES);

// F1 — capacity must MATCH the accepted design table, not merely trend with size.
test('F1: card capacity is pinned to the accepted table — 55"->4, 65"->6, 75"->8 at 20ft', () => {
  assert.equal(maxStationCards(55, 20), 4);
  assert.equal(maxStationCards(65, 20), 6);
  assert.equal(maxStationCards(75, 20), 8);
  // The unmeasured default must agree with the worst pinned case.
  assert.equal(DEFAULT_MAX_STATION_CARDS, 4);
  assert.ok(CARD_HEIGHT_FACTOR > 3 && CARD_HEIGHT_FACTOR < 4);
});

// F2 — a nonzero volume share must never round down to an outright ban.
test('F2: a 2-slot full-body class allows one lower-body exercise', () => {
  const fullBody = registry.require('full_body');
  const leg = { primaryRegion: 'lower' };
  assert.equal(checkVolumeBudget(fullBody, [], leg, 2).withinBudget, true, 'first leg slot must be legal');
  assert.equal(checkVolumeBudget(fullBody, [leg], leg, 2).withinBudget, false, 'second must still be capped');
});

test('F2: a zero share is still an outright ban (upper day bans lower)', () => {
  const upper = registry.require('upper_body');
  assert.equal(checkVolumeBudget(upper, [], { primaryRegion: 'lower' }, 12).withinBudget, false);
});

// F3 — the slot->station binding is enforced.
test('F3: a work slot without a stationIndex is rejected in stations shape', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[0].stationIndex = null;
  assert.match(validateClassPlan(plan).join(';'), /does not know its station/);
});

test('F3: slot totals must equal stationCount x exercisesPerStation', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots.pop();
  assert.match(validateClassPlan(plan).join(';'), /work slots, but the plan carries/);
});

test('F3: an uneven station is rejected even when the total is right', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[1].stationIndex = 1; // station 0 -> 1 slot, station 1 -> 3
  assert.match(validateClassPlan(plan).join(';'), /every station needs exactly/);
});

test('F3: a station binding outside station-shaped work is a category error', () => {
  const plan = ALL_FIXTURES.openGymClass();
  plan.blocks[1].slots[0].stationIndex = 0;
  assert.match(validateClassPlan(plan).join(';'), /must be null outside station-shaped/);
});

// F5 — compress is a real, distinct third option.
test('F5: compressRemaining fits all remaining content before the original end', () => {
  const timeline = compileTimeline(ALL_FIXTURES.fullBodyStationClass(), T0);
  const now = T0 + 10 * 60 * 1000;
  const { options } = reconcile(timeline, now, now + 120_000);
  assert.ok(options.compress.feasible, 'a 2-minute gap late in a 28-minute class should be compressible');

  const compressed = compressRemaining(timeline, now + 120_000, options.compress.scale);
  // Ends within rounding distance of the original booking, never after it +1s.
  assert.ok(compressed.endsAt <= timeline.endsAt + 1000, `ends ${compressed.endsAt} vs ${timeline.endsAt}`);
  // Same segment COUNT — compress drops nothing, unlike skipAhead.
  assert.equal(compressed.segments.length, timeline.segments.length);
  // Completed segments are untouched.
  const firstChanged = compressed.segments.findIndex((s, i) => s.endsAt !== timeline.segments[i].endsAt);
  assert.ok(firstChanged > 0, 'segments before the gap must be untouched');
});

test('F5: compress is marked infeasible when the gap ate most of the class', () => {
  const timeline = compileTimeline(ALL_FIXTURES.smallUpperBodyClass(), T0);
  const nearEnd = timeline.endsAt - 60_000;
  const { options } = reconcile(timeline, nearEnd, nearEnd + 50_000);
  assert.equal(options.compress.feasible, false);
});

// F6 — rotation steps are labeled as rotations, never as a station.
test('F6: no work segment label claims everyone is at one station', () => {
  const segments = expandSegments(ALL_FIXTURES.fullBodyStationClass());
  for (const seg of segments) {
    assert.doesNotMatch(seg.label, /station \d/i, seg.label);
  }
});

// F7 — a swap names the slot it targets.
test('F7: a swap without a slotId is rejected', () => {
  const plan = ALL_FIXTURES.relaxedSwapClass();
  delete plan.log[0].slotId;
  assert.match(validateClassPlan(plan).join(';'), /slotId is required for a swap/);
});

test('F7: a swap naming a slot that is not in the plan is rejected', () => {
  const plan = ALL_FIXTURES.relaxedSwapClass();
  plan.log[0].slotId = 'phantom_slot';
  assert.match(validateClassPlan(plan).join(';'), /does not exist in any block/);
});

// F8 — equipment is counts, and counts must be positive integers.
test('F8: the snapshot carries equipment QUANTITIES', () => {
  const snap = ALL_FIXTURES.fullBodyStationClass().snapshot;
  assert.equal(snap.equipmentCounts.eq_kettlebell, 2);
  assert.equal('availableEquipmentRefs' in snap, false, 'the flat presence list is gone — counts are the single source');
});

test('F8: a zero or fractional equipment count is rejected', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.snapshot.equipmentCounts.eq_kettlebell = 0;
  assert.match(validateClassPlan(plan).join(';'), /positive integer/);
});

// F9 — severity bands exist and severe is a subset of total.
test('F9: severe joint flags cannot exceed total joint flags', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.snapshot.severeJointFlagCounts = { knee: 5 }; // total is 3
  assert.match(validateClassPlan(plan).join(';'), /severe band is a subset/);
});

test('F9: the everyday fixture distinguishes mild from severe', () => {
  const snap = ALL_FIXTURES.fullBodyStationClass().snapshot;
  assert.equal(snap.jointFlagCounts.knee, 3);
  assert.equal(snap.severeJointFlagCounts.knee, 1); // 1 contraindication, 2 mild
});
