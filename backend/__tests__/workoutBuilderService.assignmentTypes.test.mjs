/**
 * Workout builder assignment-type contracts.
 *
 * Locks the SwanStudios off-day homework path at generation time so plans
 * created by Swan Coach carry explicit solo/non-billable assignment metadata
 * before dashboard, logger, PDF, or Coach read models consume them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const { generatePlan } = await import('../services/workoutBuilderService.mjs');

const context = {
  clientName: 'Test Client',
  constraints: { nasmPhase: 2, excludedMuscles: [], compensationTypes: [], recentlyUsedExercises: [] },
  pain: { exclusions: [], warnings: [] },
  movement: { compensations: [] },
  variation: { lastSessionType: null, currentPattern: 'BUILD/SWITCH' },
  equipment: [],
  goals: null,
  body: null,
  baseline: { nasmAssessmentScore: 70 },
  nutrition: null,
  progressLevels: null,
  safety: null,
  health: null,
  streak: null,
  activeProgram: null,
  workouts: { sessionsLast2Weeks: 4 },
  criticalDataUnavailable: false,
  criticalFailures: [],
};

const registry = [
  { key: 'pushup', name: 'Pushup', muscles: ['chest'], category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'row', name: 'Row', muscles: ['back'], category: 'pull', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'squat', name: 'Squat', muscles: ['quads'], category: 'squat', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'hinge', name: 'Hip Hinge', muscles: ['hamstrings'], category: 'hinge', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'lunge', name: 'Lunge', muscles: ['quads'], category: 'lunge', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'plank', name: 'Plank', muscles: ['core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'bike', name: 'Bike Flush', muscles: ['legs'], category: 'cardio', equipment: ['bike'], nasmLevel: 1 },
  { key: 'mobility', name: 'Hip Mobility', muscles: ['hips'], category: 'corrective', equipment: ['bodyweight'], nasmLevel: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  getClientContext.mockResolvedValue(context);
  getExerciseRegistryFromDB.mockResolvedValue(registry);
});

describe('generatePlan assignment metadata', () => {
  it('marks generated training days as solo non-billable homework and recovery days as active recovery', async () => {
    const plan = await generatePlan({
      clientId: 11,
      trainerId: 99,
      durationWeeks: 4,
      sessionsPerWeek: 6,
      primaryGoal: 'general_fitness',
    });

    const weekOneDays = plan.weeks[0].days;
    expect(weekOneDays[0]).toMatchObject({
      assignmentType: 'homework',
      sessionType: 'solo',
      isBillable: false,
      shouldDeductSession: false,
    });
    expect(weekOneDays[5]).toMatchObject({
      dayType: 'active_recovery',
      assignmentType: 'active_recovery',
      sessionType: 'solo',
      isBillable: false,
      shouldDeductSession: false,
    });

    const deloadTrainingDay = plan.weeks[3].days.find((day) => day.dayType === 'deload');
    if (deloadTrainingDay) {
      expect(deloadTrainingDay).toMatchObject({
        assignmentType: 'homework',
        sessionType: 'solo',
        isBillable: false,
        shouldDeductSession: false,
      });
    }
  });
});
