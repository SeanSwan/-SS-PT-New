import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DB-touching dependencies BEFORE importing the service — same harness
// pattern as the other workoutBuilderService suites.
vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: vi.fn(),
}));
vi.mock('../services/variationEngine.mjs', () => ({
  getExerciseRegistry: vi.fn(),
  getExerciseRegistryFromDB: vi.fn(),
  generateSwapSuggestions: vi.fn(() => null),
  recordVariation: vi.fn(async () => ({ id: 'variation-row' })),
  getNextSessionType: vi.fn((history = [], pattern = 'standard') => {
    const buildCount = pattern === 'aggressive' ? 1 : pattern === 'conservative' ? 3 : 2;
    let consecutiveBuilds = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i]?.sessionType !== 'build') break;
      consecutiveBuilds += 1;
    }
    return consecutiveBuilds >= buildCount ? 'switch' : 'build';
  }),
}));
vi.mock('../services/oneRepMaxService.mjs', () => ({
  getRecommendedWeight: vi.fn(() => null),
}));

const { getClientContext } = await import('../services/clientIntelligenceService.mjs');
const { getExerciseRegistryFromDB, recordVariation } = await import('../services/variationEngine.mjs');
const { generateWorkout } = await import('../services/workoutBuilderService.mjs');

const REGISTRY = [
  { key: 'goblet_squat', name: 'Goblet Squat', muscles: ['quads', 'glutes'], category: 'squat', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'squat' },
  { key: 'romanian_deadlift', name: 'Romanian Deadlift', muscles: ['hamstrings', 'glutes'], category: 'hinge', equipment: ['barbell'], nasmLevel: 2, movementPattern: 'hinge' },
  { key: 'ankle_hops', name: 'Ankle Hops', muscles: ['calves'], category: 'lunge', equipment: [], nasmLevel: 2, movementPattern: 'legs' },
  { key: 'walking_lunge', name: 'Walking Lunge', muscles: ['quads', 'glutes'], category: 'lunge', equipment: [], nasmLevel: 2, movementPattern: 'lunge' },
];

function fakeContext(overrides = {}) {
  return {
    clientName: 'Test Client',
    constraints: {
      nasmPhase: 2,
      excludedMuscles: [],
      compensationTypes: [],
      recentlyUsedExercises: [],
      estimated1RMs: null,
      ...(overrides.constraints || {}),
    },
    pain: overrides.pain ?? { status: 'loaded_no_active_issue', exclusions: [], warnings: [] },
    movement: overrides.movement ?? { compensations: [] },
    variation: overrides.variation ?? { lastSessionType: null, currentPattern: 'standard', sessionHistory: [] },
    equipment: overrides.equipment ?? [],
    workouts: overrides.workouts ?? { sessionsLast2Weeks: 1, avgFormRating: 4, recentExercisePerformance: {} },
    goals: null,
    body: null,
    baseline: null,
    nutrition: null,
    progressLevels: null,
    safety: null,
    health: null,
    clientSource: 'swanstudios',
    sourcePolicy: {
      clientSource: 'swanstudios',
      isFreeTracking: false,
      shouldDeductPaidSessions: true,
      sessionBalancePolicy: 'paid_sessions_deduct_on_billable_training',
    },
    streak: null,
    activeProgram: null,
    trainingVault: null,
    criticalDataUnavailable: false,
    criticalFailures: [],
    ...overrides.rootOverrides,
  };
}

const generate = (extra = {}) => generateWorkout({
  clientId: 42,
  trainerId: 7,
  category: 'full_body',
  exerciseCount: 3,
  ...extra,
});

describe('workoutBuilderService intelligence upgrades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientContext.mockResolvedValue(fakeContext());
    getExerciseRegistryFromDB.mockResolvedValue(REGISTRY);
  });

  it('records rotation history for every delivered generation (write-through)', async () => {
    const workout = await generate();

    expect(workout.sessionType).toBe('build');
    expect(recordVariation).toHaveBeenCalledTimes(1);
    expect(recordVariation).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      trainerId: 7,
      templateCategory: 'full_body',
      sessionType: 'build',
      rotationPattern: 'standard',
    }));
    const recorded = recordVariation.mock.calls[0][0];
    expect(Array.isArray(recorded.exercisesUsed)).toBe(true);
    expect(recorded.exercisesUsed.length).toBeGreaterThan(0);
  });

  it('never fails generation when the history write throws (fail-soft)', async () => {
    recordVariation.mockRejectedValueOnce(new Error('db down'));

    const workout = await generate();

    expect(workout.exercises.length).toBeGreaterThan(0);
    expect(workout.sessionType).toBe('build');
  });

  it('keeps high-impact plyo out of general low-impact strength selection', async () => {
    const workout = await generate({ exerciseCount: 4 });

    const keys = workout.exercises.map((ex) => ex.exerciseKey);
    expect(keys).not.toContain('ankle_hops');
    expect(keys).toContain('goblet_squat');
  });

  it('lets a power phase (NASM 5) opt back into high-impact work', async () => {
    const workout = await generate({ exerciseCount: 4, nasmPhase: 5 });

    const keys = workout.exercises.map((ex) => ex.exerciseKey);
    expect(keys).toContain('ankle_hops');
  });

  it('applies micro-progression targets from the last comparable logged session', async () => {
    getClientContext.mockResolvedValue(fakeContext({
      workouts: {
        sessionsLast2Weeks: 2,
        avgFormRating: 4,
        recentExercisePerformance: {
          goblet_squat: {
            exerciseName: 'Goblet Squat',
            date: '2026-06-28',
            sets: [{ weight: 50, reps: 12, rpe: 7 }],
          },
        },
      },
    }));

    const workout = await generate();

    const goblet = workout.exercises.find((ex) => ex.exerciseKey === 'goblet_squat');
    expect(goblet).toBeDefined();
    expect(goblet.progression).toMatchObject({ action: 'add_load', weight: 55 });
    expect(goblet.recommendedWeightMin).toBe(55);
    expect(workout.explanations.some((e) => e.type === 'micro_progression')).toBe(true);
  });

  it('holds progression instead of loading into reported pain', async () => {
    getClientContext.mockResolvedValue(fakeContext({
      pain: { exclusions: [], warnings: [{ bodyRegion: 'quads', painLevel: 5 }] },
      workouts: {
        sessionsLast2Weeks: 2,
        avgFormRating: 4,
        recentExercisePerformance: {
          goblet_squat: {
            exerciseName: 'Goblet Squat',
            date: '2026-06-28',
            sets: [{ weight: 50, reps: 12, rpe: 7 }],
          },
        },
      },
    }));

    const workout = await generate({ planningReviewAcknowledged: true,
      planningReviewActorRole: 'trainer', planningReviewReason: 'Test fixture reviewed (Cortex P0 gate)' });

    const goblet = workout.exercises.find((ex) => ex.exerciseKey === 'goblet_squat');
    expect(goblet.progression.action).toBe('hold');
    expect(goblet.recommendedWeightMin).toBe(50);
  });
});
