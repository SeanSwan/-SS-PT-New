import { describe, it, expect, beforeEach, vi } from 'vitest';

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
const { getExerciseRegistryFromDB } = await import('../services/variationEngine.mjs');
const { generateWorkout, generatePlan } = await import('../services/workoutBuilderService.mjs');
const { applyTrainingStyleToExercises, normalizeTrainingStyle } = await import('../services/workoutBuilderTrainingStyle.mjs');

function fakeContext(overrides = {}) {
  return {
    clientName: 'Training Style Client',
    constraints: { nasmPhase: 3, excludedMuscles: [], compensationTypes: [], recentlyUsedExercises: [] },
    pain: overrides.pain ?? { exclusions: [], warnings: [{ bodyRegion: 'shoulders', painLevel: 4 }] },
    movement: { compensations: [] },
    variation: { lastSessionType: null, currentPattern: 'BUILD/SWITCH' },
    equipment: [],
    goals: null,
    body: null,
    baseline: null,
    nutrition: null,
    progressLevels: null,
    safety: null,
    health: null,
    clientSource: 'swanstudios',
    sourcePolicy: null,
    streak: null,
    activeProgram: null,
    trainingVault: null,
    workouts: { sessionsLast2Weeks: 0, avgFormRating: null },
    criticalDataUnavailable: false,
    criticalFailures: [],
  };
}

const registry = [
  { key: 'bench_press', name: 'Bench Press', muscles: ['chest'], category: 'push', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'row', name: 'Row', muscles: ['back'], category: 'pull', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'squat', name: 'Squat', muscles: ['quads'], category: 'squat', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'deadlift', name: 'Deadlift', muscles: ['hamstrings'], category: 'hinge', equipment: ['barbell'], nasmLevel: 3 },
  { key: 'calf_raise', name: 'Standing Calf Raise', muscles: ['calves'], category: 'lunge', equipment: ['machine'], nasmLevel: 2 },
  { key: 'plank', name: 'Plank', muscles: ['core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  getClientContext.mockResolvedValue(fakeContext());
  getExerciseRegistryFromDB.mockResolvedValue(registry);
});

describe('workoutBuilder training style policy', () => {
  it('skips hardcore cues for granular shoulder and deltoid muscle labels', () => {
    const style = normalizeTrainingStyle({ trainingIntensityMode: 'hardcore', hardcoreMethod: 'density' });
    const styled = applyTrainingStyleToExercises([
      { name: 'Arnold Press', muscles: ['anterior_deltoid'], category: 'push' },
      { name: 'Lateral Raise', muscles: ['Medial Deltoids'], category: 'push' },
      { name: 'Face Pull', muscles: ['rear-deltoid'], category: 'pull' },
    ], style);

    expect(styled.every(exercise => exercise.intensityMethod === undefined)).toBe(true);
    expect(styled.every(exercise => exercise.trainingStyleGuardrail)).toBe(true);
  });

  it('skips hardcore cues when pain warnings identify a populated muscle field', () => {
    const style = normalizeTrainingStyle({ trainingIntensityMode: 'hardcore', hardcoreMethod: 'pyramid' });
    const styled = applyTrainingStyleToExercises([
      { name: 'Cable Pressdown', muscles: ['triceps'], category: 'push' },
    ], style, [{ bodyRegion: 'upper_arm', muscles: ['triceps'], painLevel: 4 }]);

    expect(styled[0].intensityMethod).toBeUndefined();
    expect(styled[0].trainingStyleGuardrail).toBe('Hardcore method skipped for vulnerable or pain-warning area.');
  });

  it('applies hardcore density cues only to eligible single-workout exercises', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ pain: { exclusions: [], warnings: [] } }));

    const workout = await generateWorkout({
      clientId: 1,
      trainerId: 99,
      category: 'full_body',
      primaryGoal: 'hypertrophy',
      nasmPhase: 3,
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'density',
    });

    expect(workout.trainingStyle).toEqual(expect.objectContaining({
      mode: 'hardcore',
      method: 'density',
    }));
    expect(workout.explanations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'training_style' }),
    ]));
    expect(workout.exercises.some(exercise => exercise.intensityMethod === 'density')).toBe(true);
    expect(workout.exercises
      .filter(exercise => exercise.muscles?.some(muscle => ['calves', 'biceps', 'shoulders'].includes(muscle)))
      .every(exercise => exercise.intensityMethod === undefined)).toBe(true);
  });

  it('keeps base mode on NASM guidance even when a hardcore method is present', async () => {
    const plan = await generatePlan({
      clientId: 1,
      trainerId: 99,
      durationWeeks: 4,
      sessionsPerWeek: 4,
      primaryGoal: 'general_fitness',
      registryOverride: registry,
      trainingIntensityMode: 'base',
      hardcoreMethod: 'descending',
    });

    expect(plan.trainingStyle).toEqual(expect.objectContaining({
      mode: 'base',
      method: 'standard',
    }));
    expect(plan.weeks.flatMap(week => week.days.flatMap(day => day.exercises))
      .every(exercise => exercise.intensityMethod === undefined)).toBe(true);
  });

  it('adds hardcore method metadata and review guidance to long-horizon plans', async () => {
    getClientContext.mockResolvedValueOnce(fakeContext({ pain: { exclusions: [], warnings: [] } }));

    const plan = await generatePlan({
      clientId: 1,
      trainerId: 99,
      durationWeeks: 4,
      sessionsPerWeek: 4,
      primaryGoal: 'hypertrophy',
      registryOverride: registry,
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'pyramid',
    });

    const exercises = plan.weeks.flatMap(week => week.days.flatMap(day => day.exercises));
    expect(plan.trainingStyle).toEqual(expect.objectContaining({
      mode: 'hardcore',
      method: 'pyramid',
    }));
    expect(exercises.some(exercise => exercise.intensityMethod === 'pyramid')).toBe(true);
    expect(plan.recommendationDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'training_style',
        text: expect.stringMatching(/hardcore.*pyramid/i),
      }),
    ]));
  });
});
