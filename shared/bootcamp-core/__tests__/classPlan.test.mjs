/**
 * Slice 0 contract tests — SWA-105.
 * These pin the decisions that were argued for, not just the happy path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createClassPlan, createExerciseSlot, validateClassPlan, assertValidClassPlan,
  CLASS_PLAN_SCHEMA_VERSION, CHIPS,
} from '../classPlan.mjs';
import {
  SWAN_DAY_TYPES, createDayTypeRegistry, checkDayTypeLegality, checkVolumeBudget,
} from '../dayTypes.mjs';
import { normalizeMovement } from '../taxonomy.mjs';
import { ALL_FIXTURES } from '../fixtures.mjs';

const registry = createDayTypeRegistry(SWAN_DAY_TYPES);
const upper = registry.require('upper_body');
const lower = registry.require('lower_body');
const fullBody = registry.require('full_body');

// ── D1: the reported bug ────────────────────────────────────────────────────

test('D1 — a core-tagged squat is ILLEGAL on upper day', () => {
  // This is the exact shape that passes on main today: `.some()` over a muscle
  // list containing `core`, which every rotation shares.
  const gobletSquat = normalizeMovement({
    primaryRegion: 'lower', regions: ['lower', 'core'], pattern: 'squat', loadedJoints: ['knee'],
  });
  const verdict = checkDayTypeLegality(upper, gobletSquat);
  assert.equal(verdict.legal, false);
  // Excluded by pattern, which is the stronger of the two guards.
  assert.equal(verdict.reason, 'excluded_pattern');
});

test('D1 — secondary region involvement never buys admission', () => {
  // No excluded pattern here, so this isolates the primary-region rule itself.
  const carry = normalizeMovement({
    primaryRegion: 'full', regions: ['full', 'upper'], pattern: 'carry',
  });
  const verdict = checkDayTypeLegality(upper, carry);
  assert.equal(verdict.legal, false);
  assert.equal(verdict.reason, 'wrong_primary_region');
});

test('D1 — a genuine upper-body press is legal on upper day', () => {
  const press = normalizeMovement({
    primaryRegion: 'upper', regions: ['upper', 'core'], pattern: 'push_vertical', loadedJoints: ['shoulder'],
  });
  assert.equal(checkDayTypeLegality(upper, press).legal, true);
});

test('D1 — upper-day exclusions reject squat, hinge and lunge by pattern', () => {
  for (const pattern of ['squat', 'hinge', 'lunge']) {
    const m = normalizeMovement({ primaryRegion: 'upper', regions: ['upper'], pattern });
    const verdict = checkDayTypeLegality(upper, m);
    assert.equal(verdict.legal, false, `${pattern} should be excluded from upper day`);
    assert.equal(verdict.reason, 'excluded_pattern');
  }
});

test('D1 — lower day rejects presses and rows', () => {
  const row = normalizeMovement({ primaryRegion: 'lower', regions: ['lower'], pattern: 'pull_horizontal' });
  assert.equal(checkDayTypeLegality(lower, row).legal, false);
});

test('an unclassifiable movement is excluded, never guessed into a day', () => {
  assert.equal(normalizeMovement({ primaryRegion: 'nonsense' }), null);
  assert.equal(checkDayTypeLegality(upper, null).legal, false);
});

// ── D3: full-body must not silently become leg day ──────────────────────────

test('D3 — volume budget caps a region even when every exercise is legal', () => {
  const leg = { primaryRegion: 'lower' };
  const totalSlots = 10; // full_body caps lower at 0.45 => 4
  const selected = [leg, leg, leg, leg];
  const verdict = checkVolumeBudget(fullBody, selected, leg, totalSlots);
  assert.equal(verdict.withinBudget, false);
  assert.equal(verdict.reason, 'volume_budget_exceeded');
});

test('D3 — the same 5th leg exercise is fine on lower day', () => {
  const leg = { primaryRegion: 'lower' };
  const selected = [leg, leg, leg, leg];
  assert.equal(checkVolumeBudget(lower, selected, leg, 10).withinBudget, true);
});

// ── Registry behaviour (Kimi R11) ───────────────────────────────────────────

test('day types are injected config, not a baked-in union', () => {
  const custom = createDayTypeRegistry([
    { id: 'pull_day', label: 'Pull', primaryRegions: ['upper'], excludePatterns: ['push_horizontal'] },
  ]);
  assert.deepEqual(custom.ids(), ['pull_day']);
  assert.equal(custom.has('upper_body'), false, 'a foreign registry must not know Swan day types');
});

test('an unknown day type throws rather than defaulting', () => {
  assert.throws(() => registry.require('leg_day'), /Unknown day type/);
});

test('a malformed day-type config fails at construction', () => {
  assert.throws(
    () => createDayTypeRegistry([{ id: 'x', label: 'X', primaryRegions: ['torso'] }]),
    /unknown region/,
  );
});

// ── Schema validation ───────────────────────────────────────────────────────

test('every fixture validates', () => {
  for (const [name, make] of Object.entries(ALL_FIXTURES)) {
    const problems = validateClassPlan(make());
    assert.deepEqual(problems, [], `${name} should be valid, got: ${problems.join('; ')}`);
  }
});

test('a plan with no work block is rejected', () => {
  const plan = createClassPlan({
    intent: { dayTypeId: 'full_body', targetDurationMin: 45, equipmentProfileId: 'p1', mode: 'strict' },
    blocks: [{ kind: 'warmup', slots: [] }],
  });
  assert.match(validateClassPlan(plan).join(';'), /at least one work block/);
});

test('strict mode requires an equipment profile; open_gym does not', () => {
  const strict = createClassPlan({
    intent: { dayTypeId: 'full_body', targetDurationMin: 45, mode: 'strict', equipmentProfileId: null },
    blocks: [{ kind: 'work', slots: [] }],
  });
  assert.match(validateClassPlan(strict).join(';'), /requires an equipmentProfileId/);
  assert.deepEqual(validateClassPlan(ALL_FIXTURES.openGymClass()), []);
});

// ── P4: no fabricated justifications ────────────────────────────────────────

test('P4 — free-text reasons are rejected; chips are a closed enum', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[0].chips = ['because it looked good'];
  assert.match(validateClassPlan(plan).join(';'), /non-enum value/);
});

test('P4 — at most two chips per slot', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[0].chips = [CHIPS[0], CHIPS[1], CHIPS[2]];
  assert.match(validateClassPlan(plan).join(';'), /max 2/);
});

// ── S5: the dignity rule is structural, not cultural ────────────────────────

test('S5 — a swap event carrying a person identifier is rejected', () => {
  for (const field of ['attendeeId', 'personId', 'clientId']) {
    const plan = ALL_FIXTURES.relaxedSwapClass();
    plan.log[0][field] = 'anything';
    assert.match(
      validateClassPlan(plan).join(';'),
      /no per-person swap/,
      `${field} should be refused`,
    );
  }
});

test('S5 — a swap must name a station', () => {
  const plan = ALL_FIXTURES.relaxedSwapClass();
  delete plan.log[0].stationIndex;
  assert.match(validateClassPlan(plan).join(';'), /stationIndex is required for a swap/);
});

test('Rule 8 — joint flags are counts, never identities', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.snapshot.jointFlagCounts = { knee: 'jane' };
  assert.match(validateClassPlan(plan).join(';'), /counts only, never identities/);
});

// ── Provenance ──────────────────────────────────────────────────────────────

test('a brain-generated plan must name the model', () => {
  const plan = ALL_FIXTURES.openGymClass();
  plan.provenance.brainModel = null;
  assert.match(validateClassPlan(plan).join(';'), /requires brainModel/);
});

test('R6 cannot be a committed slot', () => {
  const plan = ALL_FIXTURES.fullBodyStationClass();
  plan.blocks[1].slots[0].rung = 'R6';
  assert.match(validateClassPlan(plan).join(';'), /cannot be a committed slot/);
});

test('assertValidClassPlan throws with all problems listed', () => {
  assert.throws(() => assertValidClassPlan({ schemaVersion: 99 }), /Invalid ClassPlan/);
});

test('schema version is pinned', () => {
  assert.equal(createClassPlan().schemaVersion, CLASS_PLAN_SCHEMA_VERSION);
  assert.equal(createExerciseSlot().rung, 'R0');
});
