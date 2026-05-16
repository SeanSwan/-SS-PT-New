import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
const mockUserModel = { findByPk: vi.fn() };
const mockSettings = { findOne: vi.fn() };
const mockPointTransaction = {
  count: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
};
const mockMilestone = { findAll: vi.fn() };
const mockUserMilestone = { create: vi.fn() };
const mockWorkoutSession = {
  count: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
};
const mockEventBus = { safeEmit: vi.fn() };
const mockCreateWorkoutAutoPost = vi.fn();
const mockCreateStreakAutoPost = vi.fn();

vi.mock('../../models/User.mjs', () => ({ default: mockUserModel }));
vi.mock('../../models/GamificationSettings.mjs', () => ({ default: mockSettings }));
vi.mock('../../models/PointTransaction.mjs', () => ({ default: mockPointTransaction }));
vi.mock('../../models/Milestone.mjs', () => ({ default: mockMilestone }));
vi.mock('../../models/UserMilestone.mjs', () => ({ default: mockUserMilestone }));
vi.mock('../../models/WorkoutSession.mjs', () => ({ default: mockWorkoutSession }));
vi.mock('../../services/eventBus.mjs', () => ({ default: mockEventBus }));
vi.mock('../../services/socialAutoPost.mjs', () => ({
  createWorkoutAutoPost: mockCreateWorkoutAutoPost,
  createStreakAutoPost: mockCreateStreakAutoPost,
}));
vi.mock('../../services/gamificationComboService.mjs', () => ({
  detectCombos: vi.fn(() => ({ combos: [], bestMultiplier: 1, comboBonus: 0 })),
  sumExerciseXP: vi.fn(() => 0),
}));
vi.mock('sequelize', () => ({
  Op: {
    between: 'between',
    gt: 'gt',
    gte: 'gte',
    lte: 'lte',
    ne: 'ne',
    startsWith: 'startsWith',
  },
}));

const { awardWorkoutXP } = await import('../../services/awardWorkoutXP.mjs');

describe('awardWorkoutXP progression sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPointTransaction.findOne.mockResolvedValue(null);
    mockPointTransaction.create.mockResolvedValue({});
    mockWorkoutSession.findOne.mockResolvedValue(null);
    mockWorkoutSession.count.mockResolvedValue(0);
    mockMilestone.findAll.mockResolvedValue([]);
    mockSettings.findOne.mockResolvedValue({
      pointsPerWorkout: 50,
      pointsPerExercise: 0,
      pointsMultiplier: 1,
    });
  });

  it('updates level and tier when workout XP crosses a level threshold', async () => {
    const user = {
      id: 42,
      points: 350,
      level: 1,
      tier: 'bronze_forge',
      totalWorkouts: 0,
      totalExercises: 0,
      streakDays: 0,
      lastActivityDate: null,
      update: vi.fn(async () => {}),
    };
    mockUserModel.findByPk.mockResolvedValue(user);

    const result = await awardWorkoutXP({
      userId: 42,
      workoutId: 'workout-abc',
      duration: 30,
      exercisesCompleted: 0,
      workoutDate: '2026-05-15T12:00:00.000Z',
      awardedBy: 1,
    }, mockTransaction);

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        points: 400,
        level: 2,
        tier: 'bronze_forge',
      }),
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 50,
      newBalance: 400,
      totalWorkouts: 1,
    }));
  });
});
