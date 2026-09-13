/**
 * ============================================================================
 * FILE: workoutBuilderStoredPattern.test.mjs — R-H19 clause 2.
 *
 * THE REGISTER'S CRITERION (server contract `13-server-repair-contract.md:297`, S-H19 → R-H19):
 *   "Six requested movement families cannot vanish due to ceil/slice; stored pattern beats
 *    category; recent window contains sessions, not last seven individual exercises"
 * and the register's own subject line for this row: "registry respects stored movement patterns".
 *
 * THE DEFECT THIS PINS, read from `workoutBuilderService.mjs` before anything was written:
 *   :321-322  `registry.filter(ex => movementCats === null || movementCats.includes(ex.category))`
 *             — family membership is decided by the LABEL (`ex.category`) alone, and the STORED
 *             MOVEMENT PATTERN (`ex.movementPattern`) is never consulted, even though the service
 *             reads that field for output mapping at `:239`, `:439` and `:759`.
 *   :112-119  `CATEGORY_MOVEMENT_MAP` maps a day type to a family (legs -> squat); a day whose
 *             `category` is absent from the map falls back to `core` at `:574`.
 * So an exercise whose stored pattern IS a squat is invisible to a squat family when its label says
 * otherwise, and an exercise whose stored pattern is a HINGE is handed to the squat family anyway.
 * The field that describes the real movement loses to the label in both directions.
 *
 * WHY THE FILLER EXERCISE: a registry with no eligible candidate returns an empty selection, and an
 * empty result would be a SETUP-shaped failure rather than an assertion about family membership —
 * which this packet's rules exclude as RED proof. Each fixture therefore carries one unambiguous
 * squat so the workout is always generated, and the assertions are about WHICH keys appear.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** An unambiguous squat: label and stored pattern agree. */
const FILLER = {
  key: 'filler_squat', name: 'Filler Squat', category: 'squat', movementPattern: 'squat',
  muscles: ['quads'], equipment: [], nasmLevel: 2, difficulty: 2,
};

/** Stored pattern says SQUAT while the label says hinge. */
const PATTERN_SQUAT = {
  key: 'pattern_squat', name: 'Pattern Squat', category: 'hinge', movementPattern: 'squat',
  muscles: ['quads'], equipment: [], nasmLevel: 2, difficulty: 2,
};

/** Stored pattern says HINGE while the label says squat. */
const PATTERN_HINGE = {
  key: 'pattern_hinge', name: 'Pattern Hinge', category: 'squat', movementPattern: 'hinge',
  muscles: ['hamstrings'], equipment: [], nasmLevel: 2, difficulty: 2,
};

vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: () => Promise.resolve({
    clientId: 42,
    clientName: 'Stored Pattern Client',
    constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [] },
    pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeEntries: [] },
    movement: { compensations: [] },
    variation: { currentPattern: 'standard', lastSessionType: null },
    workouts: { sessionsLast2Weeks: 0 },
    equipment: [], baseline: {}, nutrition: {}, goals: {}, body: {}, progressLevels: {}, streak: {},
  }),
}));

vi.mock('../models/index.mjs', () => ({
  getModel: () => null,
  default: { sequelize: null },
}));

/**
 * THE REGISTRY IS INJECTED THROUGH `variationEngine`, NOT THROUGH `registryOverride`.
 *
 * `workoutBuilderService` imports `getExerciseRegistryFromDB` from `variationEngine.mjs` (`:24-30`),
 * and `generateWorkout` calls it directly at `:547` — it does NOT accept a `registryOverride`
 * option at all (only `generatePlan` does, at `:1219`). An earlier version of this file therefore
 * passed `registryOverride` and mocked `exerciseRegistryService.mjs`; neither has any effect here,
 * so the real fallback library ran and the assertions were measuring the wrong registry. That is a
 * SETUP defect, and this packet's rules exclude setup failures as RED proof, so the harness now
 * stubs the module the service actually imports and feeds it the fixture.
 */
let currentRegistry = [];

vi.mock('../services/variationEngine.mjs', () => ({
  getExerciseRegistry: () => currentRegistry,
  getExerciseRegistryFromDB: () => Promise.resolve(currentRegistry),
  generateSwapSuggestions: () => null,
  getNextSessionType: () => 'build',
  recordVariation: () => Promise.resolve(),
}));

let generateWorkout;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ generateWorkout } = await import('../services/workoutBuilderService.mjs'));
});

/**
 * A `legs` day resolves through `CATEGORY_MOVEMENT_MAP` to the SQUAT family, so it selects exactly
 * the exercises the registry files under squat. An absent map key would silently route to `core`,
 * which is why the family is named here rather than implied by the day label.
 */
const buildLegsDay = (registry) => {
  // Feed the fixture through the mocked module the service really reads, not through the inert
  // `registryOverride` option that `generateWorkout` ignores.
  currentRegistry = registry;
  return generateWorkout({
    clientId: 42,
    trainerId: 7,
    category: 'legs',
    exerciseCount: 2,
    planningReviewAcknowledged: true,
    planningReviewActorRole: 'trainer',
    planningReviewReason: 'Stored movement pattern check',
  });
};

const keysOf = (workout) => (workout?.exercises ?? []).map((exercise) => exercise.exerciseKey);

describe('R-H19 clause 2 — the stored movement pattern beats the category label', () => {
  it('offers a squat-patterned exercise to the squat family even when its label disagrees', async () => {
    const workout = await buildLegsDay([FILLER, PATTERN_SQUAT]);

    // The stored pattern is the field that describes the movement; the label is a filing convention.
    expect(keysOf(workout)).toContain('pattern_squat');
  });

  it('refuses to offer a hinge-patterned exercise to the squat family on the strength of its label', async () => {
    const workout = await buildLegsDay([FILLER, PATTERN_HINGE]);

    // The converse direction matters just as much: a squat LABEL must not smuggle a hinge movement
    // into the squat family, or the family list the trainer asked for is not what they receive.
    expect(keysOf(workout)).toContain('filler_squat');
    expect(keysOf(workout)).not.toContain('pattern_hinge');
  });
});
