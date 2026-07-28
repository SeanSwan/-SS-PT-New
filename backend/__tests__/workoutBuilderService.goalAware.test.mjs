import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all DB-touching dependencies BEFORE importing the service.
// This keeps these tests as pure logic tests around goal/phase plumbing.
vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: vi.fn(),
}));
vi.mock('../services/variationEngine.mjs', () => ({
  getExerciseRegistry: vi.fn(),
  getExerciseRegistryFromDB: vi.fn(),
  generateSwapSuggestions: vi.fn(() => null),
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
const { getExerciseRegistryFromDB, getNextSessionType } = await import('../services/variationEngine.mjs');
const { generateWorkout, generatePlan } = await import('../services/workoutBuilderService.mjs');

// Canned client context fixture - covers everything the service reads.
function fakeContext(overrides = {}) {
  return {
    clientName: 'Test Client',
    constraints: {
      nasmPhase: overrides.nasmPhase ?? 2,
      excludedMuscles: [],
      compensationTypes: [],
      recentlyUsedExercises: [],
      estimated1RMs: null,
    },
    pain: overrides.pain ?? { exclusions: [], warnings: [] },
    movement: overrides.movement ?? { compensations: [] },
    variation: overrides.variation ?? { lastSessionType: null, currentPattern: 'standard', sessionHistory: [] },
    equipment: overrides.equipment ?? [],
    goals: overrides.goals ?? null,
    body: overrides.body ?? null,
    baseline: overrides.baseline ?? null,
    nutrition: overrides.nutrition ?? null,
    progressLevels: overrides.progressLevels ?? null,
    safety: overrides.safety ?? null,
    health: overrides.health ?? null,
    clientSource: overrides.clientSource ?? 'swanstudios',
    sourcePolicy: overrides.sourcePolicy ?? {
      clientSource: 'swanstudios',
      isFreeTracking: false,
      shouldDeductPaidSessions: true,
      sessionBalancePolicy: 'paid_sessions_deduct_on_billable_training',
    },
    streak: null,
    activeProgram: null,
    trainingVault: overrides.trainingVault ?? null,
    workouts: { sessionsLast2Weeks: 0, avgFormRating: null },
    criticalDataUnavailable: overrides.criticalDataUnavailable ?? false,
    criticalFailures: overrides.criticalFailures ?? [],
  };
}

// Canned registry fixture - small but covers the movement categories + NASM levels.
function fakeRegistry() {
  return [
    { key: 'bench_press',     name: 'Bench Press',     muscles: ['chest'],     category: 'push',  equipment: ['barbell'],    nasmLevel: 3 },
    { key: 'pushup',          name: 'Pushup',          muscles: ['chest'],     category: 'push',  equipment: ['bodyweight'], nasmLevel: 1 },
    { key: 'overhead_press',  name: 'Overhead Press',  muscles: ['shoulders'], category: 'push',  equipment: ['barbell'],    nasmLevel: 4 },
    { key: 'pullup',          name: 'Pullup',          muscles: ['back'],      category: 'pull',  equipment: ['bodyweight'], nasmLevel: 3 },
    { key: 'row',             name: 'Row',             muscles: ['back'],      category: 'pull',  equipment: ['barbell'],    nasmLevel: 2 },
    { key: 'squat',           name: 'Squat',           muscles: ['quads'],     category: 'squat', equipment: ['barbell'],    nasmLevel: 4 },
    { key: 'goblet_squat',    name: 'Goblet Squat',    muscles: ['quads'],     category: 'squat', equipment: ['dumbbell'],   nasmLevel: 2 },
    { key: 'deadlift',        name: 'Deadlift',        muscles: ['back'],      category: 'hinge', equipment: ['barbell'],    nasmLevel: 4 },
    { key: 'lunge',           name: 'Lunge',           muscles: ['quads'],     category: 'lunge', equipment: ['bodyweight'], nasmLevel: 2 },
    { key: 'plank',           name: 'Plank',           muscles: ['core'],      category: 'core',  equipment: ['bodyweight'], nasmLevel: 1 },
    { key: 'bird_dog',        name: 'Bird Dog',        muscles: ['core'],      category: 'core',  equipment: ['bodyweight'], nasmLevel: 1 },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  getExerciseRegistryFromDB.mockResolvedValue(fakeRegistry());
});

describe('generateWorkout - variation rotation policy', () => {
  it('standard rotation keeps the second consecutive workout as BUILD and switches after two BUILD sessions', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({
      variation: {
        lastSessionType: 'build',
        currentPattern: 'standard',
        sessionHistory: [{ sessionType: 'build' }],
      },
    }));

    const secondBuild = await generateWorkout({
      clientId: 1,
      trainerId: 99,
      category: 'full_body',
      rotationPattern: 'standard',
    });

    expect(secondBuild.sessionType).toBe('build');
    expect(getNextSessionType).toHaveBeenLastCalledWith([{ sessionType: 'build' }], 'standard');

    getClientContext.mockResolvedValueOnce(fakeContext({
      variation: {
        lastSessionType: 'build',
        currentPattern: 'standard',
        sessionHistory: [{ sessionType: 'build' }, { sessionType: 'build' }],
      },
    }));

    const switchWorkout = await generateWorkout({
      clientId: 1,
      trainerId: 99,
      category: 'full_body',
      rotationPattern: 'standard',
    });

    expect(switchWorkout.sessionType).toBe('switch');
    expect(getNextSessionType).toHaveBeenLastCalledWith(
      [{ sessionType: 'build' }, { sessionType: 'build' }],
      'standard',
    );
  });
});
describe('generatePlan - goal-driven phase progression', () => {
  it('all six goals produce DISTINCT mesocycle sequences for identical input', async () => {
    const goals = ['general_fitness', 'hypertrophy', 'strength', 'fat_loss', 'athletic_performance', 'golf_performance'];
    const sequences = [];

    for (const goal of goals) {
      getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
      const plan = await generatePlan({
        clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3, primaryGoal: goal,
      });
      const phases = plan.mesocycles.map((m) => m.nasmPhase).join(',');
      sequences.push(phases);
    }

    const unique = new Set(sequences);
    expect(unique.size).toBe(goals.length);
  });

  it('hypertrophy holds Phase 3 in the back half of a 24-week plan', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3, primaryGoal: 'hypertrophy',
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    const backHalf = phases.slice(3);
    expect(backHalf.every((p) => p === 3)).toBe(true);
  });

  it('strength reaches Phase 4 and holds it', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3, primaryGoal: 'strength',
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    expect(phases).toContain(4);
    expect(phases.slice(-2).every((p) => p === 4)).toBe(true);
  });

  it('athletic_performance reaches Phase 5 by the final mesocycle', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 20, sessionsPerWeek: 3, primaryGoal: 'athletic_performance',
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    expect(phases[phases.length - 1]).toBe(5);
  });

  it('general_fitness preserves legacy linear ramp [1,1,2,2,3,3]', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3, primaryGoal: 'general_fitness',
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    expect(phases).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('emits a rationale array describing how goal+phase shaped the plan', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3, primaryGoal: 'hypertrophy',
    });
    expect(Array.isArray(plan.rationale)).toBe(true);
    expect(plan.rationale.length).toBeGreaterThan(0);
    const joined = plan.rationale.join(' ').toLowerCase();
    expect(joined).toMatch(/hypertrophy|muscle/);
  });

  it('marks generated plans as Swan Coach planning with data coverage', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({
      nasmPhase: 2,
      goals: { primaryGoal: 'strength' },
      pain: { exclusions: [{ bodyRegion: 'knee' }], warnings: [] },
      trainingVault: {
        defaultHorizonKey: 'six_month',
        filledHorizonKeys: ['six_month'],
        todayAssignment: {
          assignmentType: 'homework',
          isBillable: false,
          shouldDeductSession: false,
        },
        slots: [{ horizonKey: 'six_month', isFilled: true, isPrimary: true }],
      },
    }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 4, primaryGoal: 'strength',
    });

    expect(plan.planningSystem).toBe('swan_coach_planning');
    expect(plan.swanCoachPlanning.createdBy).toBe('swan_coach_planning');
    expect(plan.swanCoachPlanning.identityMode).toBe('client_id_only');
    expect(plan.swanCoachPlanning.horizonWeeks).toBe(24);
    expect(plan.swanCoachPlanning.planInputsUsed.goals).toBe(true);
    expect(plan.swanCoachPlanning.planInputsUsed.painInjury).toBe(true);
    expect(plan.swanCoachPlanning.planInputsUsed.planVault).toBe(true);
    expect(plan.swanCoachPlanning.planInputsUsed.clientSourcePolicy).toBe(true);
    expect(plan.clientIntelligence.trainingVault.filledHorizonKeys).toEqual(['six_month']);
    expect(plan.clientIntelligence.sourcePolicy).toEqual(expect.objectContaining({
      clientSource: 'swanstudios',
      shouldDeductPaidSessions: true,
    }));
    expect(plan.swanCoachPlanning.nasmDomainsApplied).toEqual(expect.arrayContaining([
      'OPT',
      'Corrective Exercise',
      'Performance Enhancement',
      'Behavior Change',
    ]));
  });

  it('surfaces a safety recommendation when critical client context is unavailable', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({
      nasmPhase: 1,
      criticalDataUnavailable: true,
      criticalFailures: ['pain_entries'],
    }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3, primaryGoal: 'general_fitness',
    });

    expect(plan.recommendations).toContain(
      'Pain/injury data could not be loaded. Review this plan carefully before assigning.',
    );
    expect(plan.recommendationDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'safety_warning',
        sourceCitation: 'context.criticalFailures',
      }),
    ]));
    expect(plan.swanCoachPlanning.safetyGate.reviewRequiredSignals).toContain('source_data_unavailable');
  });

  it('carries medical and special-population review signals into plan output', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({
      nasmPhase: 1,
      baseline: { medicalClearanceRequired: true },
      safety: { referralRecommended: true },
      health: { specialPopulationFlags: ['older_adult'] },
    }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3, primaryGoal: 'general_fitness',
    });

    expect(plan.swanCoachPlanning.safetyGate).toEqual(expect.objectContaining({
      status: 'review_required',
      reviewRequiredSignals: expect.arrayContaining([
        'medical_clearance_required',
        'special_population_review_required',
        'referral_review_recommended',
      ]),
    }));
    expect(JSON.stringify(plan.swanCoachPlanning.safetyGate)).not.toMatch(/older_adult/i);
  });

  it('applies goal bias to mesocycle set/rep/rest targets inside NASM bounds', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3, primaryGoal: 'hypertrophy',
    });
    const phase3 = plan.mesocycles.find((m) => m.nasmPhase === 3);
    expect(phase3.params.sets).toBe('4-5');
    expect(phase3.params.reps).toBe('9-12');
    expect(phase3.params.rest).toBe('0-30s');
    expect(phase3.params.intensityBias).toBe('mid');
  });
});

describe('generatePlan - startingPhaseOverride', () => {
  it('uses valid trainer override (1-5) instead of client baseline', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3,
      primaryGoal: 'general_fitness', startingPhaseOverride: 3,
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    // Override 3 means every phase should be >= 3.
    expect(phases.every((p) => p >= 3)).toBe(true);
    expect(plan.planSummary.startingPhase).toBe(3);
  });

  it('falls back to client context phase when override is missing', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3,
      primaryGoal: 'general_fitness',
    });
    expect(plan.planSummary.startingPhase).toBe(2);
  });

  it('falls back to client context phase when override is out of range', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3,
      primaryGoal: 'general_fitness', startingPhaseOverride: 99,
    });
    expect(plan.planSummary.startingPhase).toBe(2);
  });

  it('valid override floors all mesocycle phases at the override value', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 24, sessionsPerWeek: 3,
      primaryGoal: 'hypertrophy', startingPhaseOverride: 4,
    });
    const phases = plan.mesocycles.map((m) => m.nasmPhase);
    expect(phases.every((p) => p >= 4)).toBe(true);
  });
});

describe('generateWorkout - goal-aware single workout', () => {
  it('accepts primaryGoal and nasmPhase override and uses them in the response', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'strength', nasmPhase: 4,
    });
    expect(workout.nasmPhase).toBe(4);
  });

  it('exposes raw OPT phase bands for Phase 2 smoke verification', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 1 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'hypertrophy', nasmPhase: 2,
    });
    expect(workout.phaseParams.reps).toBe('8-12');
    expect(workout.phaseParams.rest).toBe('0-60s');
    expect(workout.primaryGoal).toBe('hypertrophy');
    expect(workout.goalBias.exerciseBias).toEqual(['compound', 'isolation']);
  });

  it('falls back to client context phase when nasmPhase override is absent', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 3 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'hypertrophy',
    });
    expect(workout.nasmPhase).toBe(3);
  });

  it('falls back to general_fitness when primaryGoal is unknown', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'powerlifting', // not in allowlist
    });
    expect(workout.primaryGoal).toBe('general_fitness');
  });

  it('emits a primaryGoal field on the response so the frontend knows what was applied', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'fat_loss',
    });
    expect(workout.primaryGoal).toBe('fat_loss');
  });

  it('produces different exercise selections for hypertrophy vs strength at same phase', async () => {
    // Two calls with same client + same explicit phase but different goals.
    getClientContext.mockResolvedValue(fakeContext({ nasmPhase: 3 }));
    const hypertrophyWorkout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'hypertrophy', nasmPhase: 3,
    });
    const strengthWorkout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'strength', nasmPhase: 3,
    });
    // The exercise pools and / or the bias annotations on the response must differ.
    // We assert the goalBias annotation differs - exercise pool may overlap if registry is small.
    expect(hypertrophyWorkout.goalBias).toBeDefined();
    expect(strengthWorkout.goalBias).toBeDefined();
    expect(hypertrophyWorkout.goalBias).not.toEqual(strengthWorkout.goalBias);
    expect(hypertrophyWorkout.exercises[0].reps).toBe('9-12');
    expect(strengthWorkout.exercises[0].reps).toBe('6-9');
    expect(hypertrophyWorkout.exercises[0].rest).toBe('0-30s');
    expect(strengthWorkout.exercises[0].rest).toBe('30-60s');
  });

  it('emits a rationale describing how goal+phase shaped the workout', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'athletic_performance', nasmPhase: 5,
    });
    expect(Array.isArray(workout.rationale)).toBe(true);
    expect(workout.rationale.length).toBeGreaterThan(0);
  });

  it('marks single workouts as Swan Coach planning with data coverage', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({
      nasmPhase: 2,
      goals: { primaryGoal: 'fat_loss' },
      baseline: { nasmAssessmentScore: 61 },
    }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
      primaryGoal: 'fat_loss',
    });

    expect(workout.planningSystem).toBe('swan_coach_planning');
    expect(workout.swanCoachPlanning.createdBy).toBe('swan_coach_planning');
    expect(workout.swanCoachPlanning.identityMode).toBe('client_id_only');
    expect(workout.swanCoachPlanning.horizonWeeks).toBe(1);
    expect(workout.swanCoachPlanning.planInputsUsed.goals).toBe(true);
    expect(workout.swanCoachPlanning.planInputsUsed.baselineReadiness).toBe(true);
  });
});

describe('regression - existing behavior preserved', () => {
  it('generateWorkout still works without primaryGoal/nasmPhase (legacy callers)', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const workout = await generateWorkout({
      clientId: 1, trainerId: 99, category: 'full_body',
    });
    expect(workout.nasmPhase).toBe(2);
    expect(workout.exercises).toBeDefined();
    expect(Array.isArray(workout.exercises)).toBe(true);
  });

  it('generatePlan still works without startingPhaseOverride (legacy callers)', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ nasmPhase: 2 }));
    const plan = await generatePlan({
      clientId: 1, trainerId: 99, durationWeeks: 12, sessionsPerWeek: 3,
      primaryGoal: 'general_fitness',
    });
    expect(plan.mesocycles).toBeDefined();
    expect(plan.mesocycles.length).toBe(3);
  });
});
