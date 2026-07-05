import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockContext = {
  clientName: 'Client #42',
  criticalDataUnavailable: false,
  criticalFailures: [],
  constraints: {
    nasmPhase: 2,
    recentlyUsedExercises: [],
    compensationTypes: [],
    estimated1RMs: null,
  },
  equipment: [],
  pain: {
    exclusions: [],
    warnings: [{ bodyRegion: 'elbow', painLevel: 4, muscles: ['forearms'] }],
  },
  movement: { compensations: [] },
  variation: { lastSessionType: null, currentPattern: 'standard' },
  workouts: { sessionsLast2Weeks: 5, avgFormRating: 3.2 },
  goals: { primaryGoal: 'strength' },
  body: null,
  baseline: { nasmAssessmentScore: 72 },
  nutrition: null,
  progressLevels: null,
  streak: null,
  activeProgram: null,
  trainingVault: null,
  sourcePolicy: null,
  safety: null,
  health: null,
  specialPopulation: null,
};

const registry = [
  {
    key: 'standing_band_press',
    muscles: ['chest', 'shoulders', 'triceps'],
    category: 'push',
    equipment: ['band'],
    nasmLevel: 2,
    movementPattern: 'push',
  },
  {
    key: 'supported_dumbbell_row',
    muscles: ['back', 'forearms'],
    category: 'pull',
    equipment: ['dumbbell'],
    nasmLevel: 2,
    movementPattern: 'pull',
  },
];

async function loadWorkoutBuilder() {
  vi.resetModules();
  vi.doMock('../../services/clientIntelligenceService.mjs', () => ({
    getClientContext: vi.fn(async () => mockContext),
  }));
  vi.doMock('../../services/variationEngine.mjs', () => ({
    getExerciseRegistry: vi.fn(() => registry),
    getExerciseRegistryFromDB: vi.fn(async () => registry),
    generateSwapSuggestions: vi.fn(() => []),
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
  vi.doMock('../../models/index.mjs', () => ({
    getExercise: () => null,
  }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));

  return import('../../services/workoutBuilderService.mjs');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workoutBuilderService Swan Coach Cortex runtime integration', () => {
  it('passes route readinessCheck input into workout and plan generation services', () => {
    const routes = readFileSync(resolve(process.cwd(), 'routes/workoutBuilderRoutes.mjs'), 'utf8');
    const generateBlock = routes.slice(
      routes.indexOf("router.post('/generate'"),
      routes.indexOf("router.post('/plan'"),
    );
    const planBlock = routes.slice(
      routes.indexOf("router.post('/plan'"),
      routes.indexOf("router.post('/corrective-recommendations'"),
    );

    expect(generateBlock).toMatch(/generateWorkout\(\{[\s\S]*hardcoreMethod: safeTrainingStyle\.method,\s*readinessCheck,/);
    expect(planBlock).toMatch(/generatePlan\(\{[\s\S]*hardcoreMethod: safeTrainingStyle\.method,\s*readinessCheck,/);
  });
  it('attaches readiness policy to generated workouts and applies it to exercise guidance', async () => {
    const { generateWorkout } = await loadWorkoutBuilder();

    const workout = await generateWorkout({
      clientId: 42,
      trainerId: 7,
      category: 'arms',
      exerciseCount: 1,
      primaryGoal: 'strength',
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'density',
      readinessCheck: {
        tightness: 'forearms',
        soreness: 'elbow',
        rangeOfMotion: 'limited',
        recentHeavyTraining: true,
        focusAreas: ['forearms', 'elbow'],
        notes: 'Do not preserve this private free text',
      },
    });

    expect(workout.swanCoachReadiness).toEqual(expect.objectContaining({
      source: 'swan_coach_cortex',
      level: 'yellow',
    }));
    expect(workout.swanCoachReadiness.constraints.avoidAggressiveIntensity).toBe(true);
    expect(workout.explanations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'swan_coach_readiness' }),
    ]));
    expect(workout.rationale.join(' ')).toMatch(/Readiness: yellow/i);
    expect(workout.exercises[0].readinessNote).toMatch(/release|range of motion|controlled/i);
    expect(JSON.stringify(workout)).not.toMatch(/private free text|Marcus|surgery/i);
  });

  it('carries readiness policy into long-horizon plan summaries and populated days', async () => {
    const { generatePlan } = await loadWorkoutBuilder();

    const plan = await generatePlan({
      clientId: 42,
      trainerId: 7,
      durationWeeks: 1,
      sessionsPerWeek: 1,
      primaryGoal: 'strength',
      trainingIntensityMode: 'hardcore',
      hardcoreMethod: 'density',
      readinessCheck: {
        tightness: 'forearms',
        soreness: 'elbow',
        rangeOfMotion: 'limited',
        recentHeavyTraining: true,
        focusAreas: ['forearms', 'elbow'],
      },
      registryOverride: registry,
    });

    expect(plan.swanCoachReadiness).toEqual(expect.objectContaining({
      source: 'swan_coach_cortex',
      level: 'yellow',
    }));
    expect(plan.planSummary.readinessLevel).toBe('yellow');
    expect(plan.rationale.join(' ')).toMatch(/Readiness: yellow/i);
    expect(plan.recommendations).toEqual(expect.arrayContaining([
      expect.stringMatching(/Yellow: Readiness is Yellow/i),
    ]));
    const readinessRecommendationIndex = plan.recommendations.findIndex((recommendation) => (
      /Readiness is Yellow/i.test(recommendation)
    ));
    expect(plan.recommendationDetails[readinessRecommendationIndex]).toEqual(expect.objectContaining({
      type: 'swan_coach_readiness',
    }));
    expect(JSON.stringify(plan)).not.toMatch(/private free text|Marcus|surgery/i);
  });
});
