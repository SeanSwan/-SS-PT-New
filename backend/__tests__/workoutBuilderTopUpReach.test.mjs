/**
 * ============================================================================
 * FILE: workoutBuilderTopUpReach.test.mjs — R-H19 clause 1, the top-up loop's reach.
 *
 * THE DEFECT THIS PINS, confirmed by reading `workoutBuilderService.mjs:644`:
 *   `const picked = takeFrom(moveCat, 1).filter((exercise) => !chosenKeys.has(exercise.key));`
 * The count is applied INSIDE `takeFrom(moveCat, 1)`, so selection is bounded BEFORE the
 * already-chosen filter runs. A family whose rank-0 pick is already in `chosenKeys` therefore returns
 * nothing, and the next `while` iteration asks the SAME family and receives THE SAME rank-0 pick,
 * deterministically. **A family whose top pick is taken can never contribute its deeper ranks.**
 * The day comes up short even though the pool holds exercises it never asked for.
 *
 * FOUND BY the round-191 hostile review of the R-H19 changes, which proposed the scenario this file
 * executes; the mechanism was settled by reading the line, and this pins it as a test.
 *
 * THE FIXTURE is built to make the starvation unambiguous: five families can supply exactly one
 * exercise each and one family (core) can supply three, while the other family is EMPTY. A
 * `full_body` day asking for 8 cannot reach 8 - the pool holds 7 - but it must reach SEVEN, because
 * every one of those seven is eligible. Before the fix it reaches five: core's rank-1 and rank-2 are
 * unreachable, and the four single-exercise families are exhausted.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const ex = (key, category) => ({
  key, name: key, category, movementPattern: category,
  muscles: ['chest'], equipment: [], nasmLevel: 2, difficulty: 2,
});

/** Five families with ONE exercise each, one EMPTY family, and one family with THREE. */
const REGISTRY = [
  ex('push_only', 'push'),
  ex('pull_only', 'pull'),
  ex('squat_only', 'squat'),
  ex('hinge_only', 'hinge'),
  ex('core_a', 'core'), ex('core_b', 'core'), ex('core_c', 'core'),
];

let currentRegistry = REGISTRY;

vi.mock('../services/variationEngine.mjs', () => ({
  getExerciseRegistry: () => currentRegistry,
  getExerciseRegistryFromDB: () => Promise.resolve(currentRegistry),
  generateSwapSuggestions: () => null,
  getNextSessionType: () => 'build',
  recordVariation: () => Promise.resolve(),
}));

vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: () => Promise.resolve({
    clientId: 42,
    clientName: 'Top-Up Reach Client',
    constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [] },
    pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeEntries: [] },
    movement: { compensations: [] },
    variation: { currentPattern: 'standard', lastSessionType: null },
    workouts: { sessionsLast2Weeks: 0 },
    equipment: [], baseline: {}, nutrition: {}, goals: {}, body: {}, progressLevels: {}, streak: {},
  }),
}));

vi.mock('../models/index.mjs', () => ({ getModel: () => null, default: { sequelize: null } }));

let generateWorkout;
beforeEach(async () => {
  currentRegistry = REGISTRY;
  vi.clearAllMocks();
  ({ generateWorkout } = await import('../services/workoutBuilderService.mjs'));
});

describe('R-H19 clause 1 — the top-up loop must reach a family past its rank-0 pick', () => {
  it('asks for 8 from a pool of 7, and gets all SEVEN rather than stranding deeper ranks', async () => {
    const workout = await generateWorkout({
      clientId: 42,
      trainerId: 7,
      category: 'full_body',
      exerciseCount: 8,
      planningReviewAcknowledged: true,
      planningReviewActorRole: 'trainer',
      planningReviewReason: 'Top-up reach check',
    });

    const keys = (workout?.exercises ?? []).map((exercise) => exercise.exerciseKey);
    // The pool holds exactly these seven. Every one is eligible, so every one must appear.
    expect(keys).toHaveLength(7);
    expect(new Set(keys)).toEqual(new Set(['push_only', 'pull_only', 'squat_only', 'hinge_only', 'core_a', 'core_b', 'core_c']));
  });

  // ROUND 200: the FIRST fix (asking for the shortfall) was not enough at scale, because
  // `selectExercises` ranks a family from the TOP on every call - so re-asking returns the picks
  // already taken, the filter discards them all, and deeper ranks stay unreachable however deep the
  // pool is. Measured: with one family EMPTY, the loss equalled that family's quota at every count up
  // to 50 (6->5, 8->7, 12->10, 20->17, 30->25, 40->34, 50->42) while the pool held 58 eligible.
  it('fills the day from the OTHER families when one family is empty and depth exists', async () => {
    const deep = [];
    for (const fam of ['push', 'pull', 'squat', 'hinge', 'core']) {
      for (let i = 0; i < 6; i += 1) deep.push(ex(fam + '_' + i, fam));
    }
    currentRegistry = deep;   // 30 eligible across five families; LUNGE IS EMPTY

    const workout = await generateWorkout({
      clientId: 42,
      trainerId: 7,
      category: 'full_body',
      exerciseCount: 12,
      planningReviewAcknowledged: true,
      planningReviewActorRole: 'trainer',
      planningReviewReason: 'Depth redistribution check',
    });

    const keys = (workout?.exercises ?? []).map((exercise) => exercise.exerciseKey);
    // Twelve from a pool of thirty across five families is trivially available.
    expect(keys).toHaveLength(12);
    expect(new Set(keys).size).toBe(12);
  });
});