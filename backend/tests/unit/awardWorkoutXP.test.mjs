import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
const mockUserModel = { findByPk: vi.fn() };
const mockSettings = { findOne: vi.fn() };
const mockPointTransaction = {
  count: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
};
const mockGamificationPointsService = {
  recordLedgerEntry: vi.fn(),
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
const mockAwardWorkoutAchievementsBestEffort = vi.fn();

const makeUser = (overrides = {}) => ({
  id: 42,
  points: 0,
  level: 1,
  tier: 'bronze_forge',
  totalWorkouts: 0,
  totalExercises: 0,
  streakDays: 0,
  lastActivityDate: null,
  update: vi.fn(async () => {}),
  ...overrides,
});

vi.mock('../../models/User.mjs', () => ({ default: mockUserModel }));
vi.mock('../../models/GamificationSettings.mjs', () => ({ default: mockSettings }));
vi.mock('../../models/PointTransaction.mjs', () => ({ default: mockPointTransaction }));
vi.mock('../../services/gamification/GamificationPointsService.mjs', () => ({
  default: mockGamificationPointsService,
}));
vi.mock('../../services/gamification/workoutAchievementAwardStep.mjs', () => ({
  awardWorkoutAchievementsBestEffort: mockAwardWorkoutAchievementsBestEffort,
}));
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
    mockAwardWorkoutAchievementsBestEffort.mockResolvedValue({ awarded: [], pointsAwarded: 0 });
    mockPointTransaction.create.mockResolvedValue({});
    mockWorkoutSession.findOne.mockResolvedValue(null);
    mockWorkoutSession.count.mockResolvedValue(0);
    mockMilestone.findAll.mockResolvedValue([]);
    mockGamificationPointsService.recordLedgerEntry.mockResolvedValue({
      pointsAwarded: 50,
      newBalance: 400,
    });
    mockSettings.findOne.mockResolvedValue({
      pointsPerWorkout: 50,
      pointsPerExercise: 0,
      pointsMultiplier: 1,
    });
  });

  it('updates level and tier when workout XP crosses a level threshold', async () => {
    const user = makeUser({
      points: 350,
    });
    mockUserModel.findByPk.mockResolvedValue(user);
    // HR-008-F1: the central ledger is the level/tier AUTHORITY — the service
    // adopts newLevel/newTier from the ledger result (lifetime-XP-derived).
    mockGamificationPointsService.recordLedgerEntry.mockResolvedValue({
      pointsAwarded: 50,
      newBalance: 400,
      newLevel: 3,
      newTier: 'first_flight',
    });

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
        level: 3,
        tier: 'first_flight',
      }),
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 50,
      newBalance: 400,
      totalWorkouts: 1,
    }));
    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        points: 50,
        transactionType: 'earn',
        source: 'workout_completion',
        sourceId: null,
        idempotencyKey: 'workout:42:workout-abc',
        metadata: expect.objectContaining({ workoutId: 'workout-abc' }),
      }),
      mockTransaction
    );
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects malformed settings numbers before workout XP math', async () => {
    const user = makeUser();
    mockUserModel.findByPk.mockResolvedValue(user);
    mockSettings.findOne.mockResolvedValue({
      pointsPerWorkout: ['500'],
      pointsPerExercise: ['20'],
      pointsMultiplier: ['5'],
    });
    mockGamificationPointsService.recordLedgerEntry.mockImplementation(async ({ points }) => (
      { pointsAwarded: points, newBalance: points }
    ));

    await awardWorkoutXP({
      userId: 42, workoutId: 'malformed-settings', duration: 30,
      exercisesCompleted: 3, workoutDate: '2026-05-15T12:00:00.000Z', awardedBy: 1,
    }, mockTransaction);

    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ points: 50 }),
      mockTransaction
    );
  });

  it('records base workout XP before streak bonus through the central ledger', async () => {
    const user = makeUser({
      points: 700,
      totalWorkouts: 4,
      streakDays: 6,
      lastActivityDate: '2026-05-14T12:00:00.000Z',
    });
    let balance = 700;
    mockUserModel.findByPk.mockResolvedValue(user);
    mockSettings.findOne.mockResolvedValue({
      pointsPerWorkout: 50,
      pointsPerExercise: 0,
      pointsPerStreak: 20,
      pointsMultiplier: 1,
    });
    mockGamificationPointsService.recordLedgerEntry.mockImplementation(async ({ points }) => {
      balance += points;
      return { pointsAwarded: points, newBalance: balance };
    });

    const result = await awardWorkoutXP({
      userId: 42,
      workoutId: 'workout-streak',
      duration: 30,
      exercisesCompleted: 0,
      workoutDate: '2026-05-15T12:00:00.000Z',
      awardedBy: 1,
    }, mockTransaction);

    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        points: 50,
        transactionType: 'earn',
        source: 'workout_completion',
        idempotencyKey: 'workout:42:workout-streak',
      }),
      mockTransaction
    );
    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        points: 20,
        transactionType: 'bonus',
        source: 'streak_bonus',
        idempotencyKey: 'streak:42:7:2026-05-15',
      }),
      mockTransaction
    );
    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({ points: 770 }),
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 70,
      newBalance: 770,
      streakDays: 7,
    }));
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
  });

  it('updates level and tier from the final streak-adjusted ledger balance', async () => {
    const user = makeUser({
      points: 350,
      totalWorkouts: 4,
      streakDays: 6,
      lastActivityDate: '2026-05-14T12:00:00.000Z',
    });
    let balance = 350;
    mockUserModel.findByPk.mockResolvedValue(user);
    mockSettings.findOne.mockResolvedValue({
      pointsPerWorkout: 30,
      pointsPerExercise: 0,
      pointsPerStreak: 20,
      pointsMultiplier: 1,
    });
    mockGamificationPointsService.recordLedgerEntry.mockImplementation(async ({ points }) => {
      balance += points;
      // HR-008-F1: ledger authority reports the lifetime-derived level/tier.
      return { pointsAwarded: points, newBalance: balance, newLevel: 3, newTier: 'first_flight' };
    });

    const result = await awardWorkoutXP({
      userId: 42,
      workoutId: 'workout-level-streak',
      duration: 30,
      exercisesCompleted: 0,
      workoutDate: '2026-05-15T12:00:00.000Z',
      awardedBy: 1,
    }, mockTransaction);

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        points: 400,
        level: 3,
        tier: 'first_flight',
      }),
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 50,
      newBalance: 400,
      streakDays: 7,
    }));
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
  });

  it('includes newly earned achievement XP and the ledger balance in the workout receipt', async () => {
    const user = makeUser({ points: 350 });
    mockUserModel.findByPk.mockResolvedValue(user);
    mockGamificationPointsService.recordLedgerEntry.mockResolvedValue({
      pointsAwarded: 50,
      newBalance: 400,
    });
    mockAwardWorkoutAchievementsBestEffort.mockResolvedValue({
      awarded: [{ achievementId: 7, name: 'Five Workouts', xpReward: 25 }],
      pointsAwarded: 25,
      newBalance: 425,
    });

    const result = await awardWorkoutXP({
      userId: 42,
      workoutId: 'workout-achievement',
      duration: 30,
      exercisesCompleted: 0,
      workoutDate: '2026-05-15T12:00:00.000Z',
      awardedBy: 1,
    }, mockTransaction);

    expect(mockAwardWorkoutAchievementsBestEffort).toHaveBeenCalledWith({
      userId: 42,
      workoutId: 'workout-achievement',
      awardedBy: 1,
      transaction: mockTransaction,
    });
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 75,
      newBalance: 425,
      awardedAchievements: [{ achievementId: 7, name: 'Five Workouts', xpReward: 25 }],
    }));
  });

  it('records milestone bonus XP through the central ledger after workout XP', async () => {
    const user = makeUser({
      points: 490,
    });
    let balance = 490;
    const milestone = {
      id: 9,
      name: 'First 500 XP',
      bonusPoints: 25,
      userMilestones: [],
    };
    mockUserModel.findByPk.mockResolvedValue(user);
    mockMilestone.findAll.mockResolvedValue([milestone]);
    mockGamificationPointsService.recordLedgerEntry.mockImplementation(async ({ points }) => {
      balance += points;
      return { pointsAwarded: points, newBalance: balance };
    });

    const result = await awardWorkoutXP({
      userId: 42,
      workoutId: 'workout-milestone',
      duration: 30,
      exercisesCompleted: 0,
      workoutDate: '2026-05-15T12:00:00.000Z',
      awardedBy: 1,
    }, mockTransaction);

    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        points: 50,
        source: 'workout_completion',
        idempotencyKey: 'workout:42:workout-milestone',
      }),
      mockTransaction
    );
    expect(mockGamificationPointsService.recordLedgerEntry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        points: 25,
        transactionType: 'bonus',
        source: 'milestone_reached',
        idempotencyKey: 'milestone:award-workout-xp:42:9',
      }),
      mockTransaction
    );
    expect(user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ points: 565 }),
      { transaction: mockTransaction }
    );
    expect(result).toEqual(expect.objectContaining({
      pointsAwarded: 75,
      newBalance: 565,
      awardedMilestones: [milestone],
    }));
    expect(mockPointTransaction.create).not.toHaveBeenCalled();
  });
});
