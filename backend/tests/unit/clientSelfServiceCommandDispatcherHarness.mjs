import { vi } from 'vitest';

// fallow-ignore-file unused-file

export async function loadDispatcher() {
  vi.resetModules();

  const activePlan = {
    id: 'plan-1',
    title: 'Private plan title',
    currentWeek: 2,
    currentDay: 1,
    durationWeeks: 26,
    status: 'active',
    metadata: { planHorizon: 'six_month' },
    planData: {
      weeks: [
        { focus: 'prep', days: [{ dayLabel: 'Day 1', exercises: [] }] },
        {
          focus: 'stability',
          days: [{
            dayLabel: 'Day 1',
            assignmentType: 'homework',
            exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10' }],
          }],
        },
      ],
    },
    toJSON() {
      return { ...this };
    },
  };
  const workoutRows = [
    { totalSets: 12, totalReps: 120, totalWeight: 5400, duration: 45, completedAt: new Date('2026-05-30T12:00:00Z') },
    { totalSets: 8, totalReps: 80, totalWeight: 3200, duration: 30, completedAt: new Date('2026-05-28T12:00:00Z') },
  ];
  const measurement = {
    measurementDate: new Date('2026-05-20T12:00:00Z'),
    weight: '185.5',
    bodyFatPercentage: '14.2',
    naturalWaist: '32.5',
  };
  const gamificationRecord = {
    level: 7,
    experience: 400,
    totalXP: 3400,
    streakCount: 9,
    longestStreak: 14,
    currentTier: 'silver',
    nextTierProgress: 62.5,
    totalWorkouts: 22,
    streakFreezes: 1,
    badges: ['founder', 'streak_7'],
  };

  const WorkoutPlan = {
    findOne: vi.fn(async () => activePlan),
    findAll: vi.fn(async () => [activePlan]),
  };
  const WorkoutSession = { findAll: vi.fn(async () => workoutRows) };
  const BodyMeasurement = { findOne: vi.fn(async () => measurement) };
  const Gamification = { findOne: vi.fn(async () => gamificationRecord) };
  const UserAchievement = {
    // Keyed on the REAL column: "new" = earned but not yet notified. The previous stub keyed on
    // `options.where.isNew`, a column that does not exist in "UserAchievements" — so this harness
    // was modelling a query that always threw in production (rule 58, verified 2026-07-29).
    count: vi.fn(async (options = {}) => (options.where?.notificationSent === false ? 1 : 5)),
  };
  const painEntryRows = [
    { id: 11, bodyRegion: 'lower_back', painLevel: 8, createdAt: new Date('2026-05-31T12:00:00Z') },
    { id: 12, bodyRegion: 'right_knee', painLevel: 4, createdAt: new Date('2026-05-30T12:00:00Z') },
  ];
  const createdPainEntry = {
    id: 19,
    userId: 17,
    bodyRegion: 'lower back',
    painLevel: 7,
    isActive: true,
  };
  const ClientPainEntry = {
    findAll: vi.fn(async () => painEntryRows),
    create: vi.fn(async () => createdPainEntry),
  };
  const ClientTrainerAssignment = {
    findOne: vi.fn(async () => ({ id: 801, clientId: 17, trainerId: 70, status: 'active' })),
  };
  const ClientNote = {
    create: vi.fn(async (payload) => ({
      id: 330,
      ...payload,
      createdAt: new Date('2026-05-31T12:00:00Z'),
    })),
  };
  const createMacroEntries = vi.fn(async () => ({
    mealsLogged: 1,
    date: '2026-05-31',
    totalCalories: 450,
    totalProtein: 28,
    totalCarbs: 32,
    totalFat: 18,
  }));
  const availableSlots = [
    { startTime: '2026-06-02T16:00:00.000Z', endTime: '2026-06-02T16:45:00.000Z' },
    { startTime: '2026-06-02T17:00:00.000Z', endTime: '2026-06-02T17:45:00.000Z' },
  ];
  const availabilityService = {
    getAvailableSlots: vi.fn(async () => availableSlots),
  };

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({
      WorkoutPlan,
      WorkoutSession,
      BodyMeasurement,
      Gamification,
      UserAchievement,
      ClientPainEntry,
      ClientTrainerAssignment,
      ClientNote,
    }),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));
  vi.doMock('../../services/nutrition/macroLogService.mjs', () => ({
    createMacroEntries,
  }));
  vi.doMock('../../services/availabilityService.mjs', () => ({
    default: availabilityService,
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    WorkoutPlan,
    WorkoutSession,
    BodyMeasurement,
    Gamification,
    UserAchievement,
    ClientPainEntry,
    ClientTrainerAssignment,
    ClientNote,
    createMacroEntries,
    availabilityService,
  };
}
