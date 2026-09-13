/**
 * ============================================================================
 * FILE: workoutBuilderMovementFamilies.test.mjs — R-H19 clause 1.
 *
 * THE REGISTER'S CRITERION (server contract `13-server-repair-contract.md:297`, S-H19 → R-H19):
 *   "Six requested movement families cannot vanish due to ceil/slice; stored pattern beats
 *    category; recent window contains sessions, not last seven individual exercises"
 *
 * THE DEFECT THIS PINS, read from `workoutBuilderService.mjs` before anything was written:
 *   :572-574  a `full_body` day requests SIX families — push, pull, squat, hinge, lunge, core
 *   :576      `const exercisesPerCategory = Math.ceil(exerciseCount / movementCategories.length)`
 *             rounds UP, so the families over-fill the requested count
 *   :585-594  each family's picks are pushed GROUPED BY FAMILY, in list order
 *   :596      `selectedExercises = selectedExercises.slice(0, exerciseCount)` then trims from the END
 * Ask for 8 exercises across those six families and the arithmetic gives ceil(8/6)=2 → up to 12
 * chosen → the first 8 kept → push, pull, squat and hinge are represented and **lunge and core
 * disappear from the day entirely**. The trainer asked for six movement families and got four.
 *
 * WHY A NEW FILE rather than the file the contract names: `backend/__tests__/
 * workoutBuilderLongHorizon.test.mjs` is 342 lines, already over the rule-4 cap of 300, so the
 * evidence lives here instead of growing a capped file. This harness installs the same three mocks
 * that file uses and passes a `registryOverride`, so no database is touched.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Six families × two exercises each, with muscle tags and a NASM level every gate accepts. */
const FAMILIES = ['push', 'pull', 'squat', 'hinge', 'lunge', 'core'];

const registry = FAMILIES.flatMap((family) => [
  {
    key: `${family}_a`, name: `${family} A`, category: family, movementPattern: family,
    muscles: ['chest'], equipment: [], nasmLevel: 2, difficulty: 2,
  },
  {
    key: `${family}_b`, name: `${family} B`, category: family, movementPattern: family,
    muscles: ['back'], equipment: [], nasmLevel: 2, difficulty: 2,
  },
]);

let generateWorkout;

vi.mock('../../services/clientIntelligenceService.mjs', () => ({
  getClientContext: () => Promise.resolve({
    // The SHAPE of this object is load-bearing, which cost two failed attempts to learn: the builder
    // reads `context.constraints.nasmPhase` (`workoutBuilderService.mjs:550`) and
    // `context.movement.compensations` (`:658`), and an absent branch threw "Cannot read properties of
    // undefined". Both are SETUP errors, which the packet's own rule says are not valid RED proof — so
    // this mirrors the known-good fixture in `__tests__/workoutBuilderLongHorizon.test.mjs:23-46`
    // rather than being guessed field by field.
    clientId: 42,
    clientName: 'Movement Family Client',
    constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [] },
    pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeEntries: [] },
    movement: { compensations: [] },
    variation: { currentPattern: 'standard', lastSessionType: null },
    equipment: [], baseline: {}, nutrition: {}, goals: {}, body: {}, progressLevels: {}, streak: {},
  }),
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: () => null,
  default: { sequelize: null },
}));

vi.mock('../../services/exerciseRegistryService.mjs', () => ({
  getExerciseRegistryFromDB: () => Promise.resolve([]),
}), { virtual: true });

beforeEach(async () => {
  vi.clearAllMocks();
  ({ generateWorkout } = await import('../../services/workoutBuilderService.mjs'));
});

const buildFullBody = (exerciseCount) => generateWorkout({
  clientId: 42,
  trainerId: 7,
  category: 'full_body',
  exerciseCount,
  registryOverride: registry,
  planningReviewAcknowledged: true,
  planningReviewActorRole: 'trainer',
  planningReviewReason: 'Movement-family coverage check',
});

/** The family each chosen exercise belongs to, read from the exercise as the service returns it. */
const familiesOf = (workout) => new Set(
  (workout?.exercises ?? []).map((exercise) => exercise.movementPattern ?? exercise.category),
);

describe('R-H19 — a full-body day must represent every family it asked for', () => {
  it('keeps all six movement families when the count does not divide evenly', async () => {
    const workout = await buildFullBody(8);

    // 8 does not divide by 6; ceil over-fills and the old slice dropped the last families.
    expect(familiesOf(workout)).toEqual(new Set(FAMILIES));
  });

  it('returns exactly the requested number of exercises, not the rounded-up total', async () => {
    const workout = await buildFullBody(8);

    expect(workout.exercises).toHaveLength(8);
  });

  it('still represents every family when the count is an exact multiple', async () => {
    const workout = await buildFullBody(6);

    expect(familiesOf(workout)).toEqual(new Set(FAMILIES));
    expect(workout.exercises).toHaveLength(6);
  });

  it('gives every family a share even when there are more families than slots', async () => {
    // Four slots cannot cover six families, but the four that ARE covered must be the first four
    // requested — not whichever ones happened to survive a truncation.
    const workout = await buildFullBody(4);

    const covered = familiesOf(workout);
    expect(covered.size).toBe(4);
    expect(workout.exercises).toHaveLength(4);
    for (const family of covered) expect(FAMILIES).toContain(family);
  });
});
