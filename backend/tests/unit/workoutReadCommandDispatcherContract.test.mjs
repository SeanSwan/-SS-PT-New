import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher(rows, recommendations = [], options = {}) {
  vi.resetModules();

  const findAll = vi.fn(async (options) => rows.slice(0, options.limit));
  const getExerciseRecommendations = vi.fn(async () => recommendations);
  const baselineFindOne = vi.fn(async () => options.baseline ?? null);
  const questionnaireFindOne = vi.fn(async () => options.questionnaire ?? null);
  const movementProfileFindOne = vi.fn(async () => options.movementProfile ?? null);
  const WorkoutSession = { findAll };
  const WorkoutLog = {};
  const ClientBaselineMeasurements = {
    findOne: baselineFindOne,
    selectOPTPhase: vi.fn((_score, primaryGoal = 'general_fitness') => ({
      phase: primaryGoal === 'maximal_strength' ? 4 : 2,
      name: primaryGoal === 'maximal_strength' ? 'Maximal Strength' : 'Strength Endurance',
      focus: primaryGoal === 'maximal_strength' ? 'Heavy loads, low reps' : 'Balanced strength and endurance training',
      repRange: primaryGoal === 'maximal_strength' ? '1-5 reps' : '8-12 reps',
    })),
  };
  const ClientOnboardingQuestionnaire = { findOne: questionnaireFindOne };
  const MovementProfile = { findOne: movementProfileFindOne };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      WorkoutSession,
      WorkoutLog,
      ClientBaselineMeasurements,
      ClientOnboardingQuestionnaire,
      MovementProfile,
    }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    findAll,
    getExerciseRecommendations,
    baselineFindOne,
    questionnaireFindOne,
    movementProfileFindOne,
    selectOPTPhase: ClientBaselineMeasurements.selectOPTPhase,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('Swan Coach workout read command dispatchers', () => {
  it('wires view_last_workout to the workout history read path with a one-session limit', async () => {
    const { dispatch, hasDispatcher, findAll } = await loadDispatcher([
      {
        completedAt: new Date('2026-05-20T15:30:00.000Z'),
        title: 'Upper Strength',
        totalSets: 9,
        totalReps: 72,
      },
      {
        completedAt: new Date('2026-05-18T15:30:00.000Z'),
        title: 'Lower Strength',
        totalSets: 8,
        totalReps: 64,
      },
    ]);

    expect(hasDispatcher('view_last_workout')).toBe(true);

    const result = await dispatch('view_last_workout', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
      order: [['completedAt', 'DESC']],
      limit: 1,
    }));
    expect(result).toEqual({
      count: 1,
      lastSessionDate: '2026-05-20',
      recentTitle: 'Upper Strength',
      totalSets: 9,
      totalReps: 72,
    });
  });

  it('wires view_workout_statistics to real logged workout rows', async () => {
    const { dispatch, hasDispatcher, findAll } = await loadDispatcher([
      {
        completedAt: new Date('2026-05-20T15:30:00.000Z'),
        date: new Date('2026-05-20T15:30:00.000Z'),
        duration: 45,
        intensity: 7,
        logs: [
          { exerciseName: 'Push-up', reps: 12 },
          { exerciseName: 'Push-up', reps: 10 },
          { exerciseName: 'Squat', reps: 15 },
        ],
      },
      {
        completedAt: new Date('2026-05-18T15:30:00.000Z'),
        date: new Date('2026-05-18T15:30:00.000Z'),
        duration: 30,
        intensity: 5,
        logs: [
          { exerciseName: 'Push-up', reps: 8 },
          { exerciseName: 'Lunge', reps: 10 },
        ],
      },
    ]);

    expect(hasDispatcher('view_workout_statistics')).toBe(true);

    const result = await dispatch('view_workout_statistics', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42, status: 'completed' },
      order: [['completedAt', 'DESC']],
      limit: 100,
    }));
    expect(result).toEqual({
      totalWorkouts: 2,
      totalDuration: 75,
      totalSets: 5,
      totalReps: 55,
      averageIntensity: 6,
      lastWorkoutDate: '2026-05-20',
      topExercise: 'Push-up',
      topExerciseSets: 3,
    });
  });

  it('wires view_exercise_recommendations to a flat Coach card result', async () => {
    const { dispatch, hasDispatcher, getExerciseRecommendations } = await loadDispatcher([], [
      { name: 'Goblet Squat' },
      { name: 'Incline Push-up' },
      { name: 'Cable Row' },
    ]);

    expect(hasDispatcher('view_exercise_recommendations')).toBe(true);

    const result = await dispatch('view_exercise_recommendations', {
      clientId: 42,
      goal: 'strength',
      difficulty: 'beginner',
      equipment: ['Dumbbell'],
      muscleGroups: ['legs'],
      muscleGroupNames: ['quads'],
      bodyRegions: ['lower_body'],
      excludeExercises: ['burpee'],
      limit: 3,
      rehabFocus: true,
      optPhase: 2,
    }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(getExerciseRecommendations).toHaveBeenCalledWith(42, {
      goal: 'strength',
      difficulty: 'beginner',
      equipment: ['Dumbbell'],
      muscleGroups: ['legs'],
      muscleGroupNames: ['quads'],
      bodyRegions: ['lower_body'],
      excludeExercises: ['burpee'],
      limit: 3,
      rehabFocus: true,
      optPhase: 2,
    });
    expect(result).toEqual({
      recommendationCount: 3,
      firstRecommendation: 'Goblet Squat',
      topRecommendations: 'Goblet Squat, Incline Push-up, Cable Row',
    });
  });

  it('wires view_nasm_phase to the latest movement profile without leaking client PII', async () => {
    const { dispatch, hasDispatcher, movementProfileFindOne } = await loadDispatcher([], [], {
      movementProfile: {
        nasmPhaseRecommendation: 3,
        totalAnalyses: 7,
        lastAnalysisAt: new Date('2026-05-21T13:00:00.000Z'),
      },
      baseline: {
        nasmAssessmentScore: 88,
        takenAt: new Date('2026-05-18T13:00:00.000Z'),
        medicalClearanceRequired: false,
      },
      questionnaire: { primaryGoal: 'hypertrophy' },
    });

    expect(hasDispatcher('view_nasm_phase')).toBe(true);

    const result = await dispatch('view_nasm_phase', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(movementProfileFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
    });
    expect(result).toEqual({
      clientId: 42,
      phase: 3,
      phaseName: 'Muscular Development',
      source: 'movement_profile',
      nasmAssessmentScore: 88,
      primaryGoal: 'hypertrophy',
      movementScreenStatus: 'completed',
      medicalClearanceRequired: false,
      totalAnalyses: 7,
      lastUpdatedAt: '2026-05-21',
    });
    expect(Object.keys(result)).not.toContain('firstName');
    expect(Object.keys(result)).not.toContain('email');
  });

  it('prefers the selected client over stale NASM command params', async () => {
    const { dispatch, movementProfileFindOne, baselineFindOne, questionnaireFindOne } = await loadDispatcher([], [], {
      movementProfile: {
        nasmPhaseRecommendation: 3,
        totalAnalyses: 7,
        lastAnalysisAt: new Date('2026-05-21T13:00:00.000Z'),
      },
    });

    const result = await dispatch('view_nasm_phase', { clientId: 999 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(movementProfileFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
    });
    expect(baselineFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(questionnaireFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 42 },
    }));
    expect(result.clientId).toBe(42);
  });

  it('falls back to latest NASM baseline score when movement profile has no phase', async () => {
    const { dispatch, baselineFindOne, questionnaireFindOne, selectOPTPhase } = await loadDispatcher([], [], {
      movementProfile: null,
      baseline: {
        nasmAssessmentScore: 91,
        takenAt: new Date('2026-05-22T13:00:00.000Z'),
        medicalClearanceRequired: true,
      },
      questionnaire: { primaryGoal: 'maximal_strength' },
    });

    const result = await dispatch('view_nasm_phase', { clientId: 42 }, {
      user: { id: 7, role: 'trainer' },
      resolvedClient: { id: 42 },
    });

    expect(baselineFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['takenAt', 'DESC']],
    });
    expect(questionnaireFindOne).toHaveBeenCalledWith({
      where: { userId: 42 },
      order: [['createdAt', 'DESC']],
    });
    expect(selectOPTPhase).toHaveBeenCalledWith(91, 'maximal_strength');
    expect(result).toEqual(expect.objectContaining({
      phase: 4,
      phaseName: 'Maximal Strength',
      source: 'baseline_measurement',
      medicalClearanceRequired: true,
      lastUpdatedAt: '2026-05-22',
    }));
  });
});
