import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMilestone = { findAll: vi.fn() };
const mockUserMilestone = { create: vi.fn() };

vi.mock('../../models/PointTransaction.mjs', () => ({ default: {} }));
vi.mock('../../models/WorkoutSession.mjs', () => ({ default: {} }));
vi.mock('../../models/Milestone.mjs', () => ({ default: mockMilestone }));
vi.mock('../../models/UserMilestone.mjs', () => ({ default: mockUserMilestone }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/eventBus.mjs', () => ({ default: { safeEmit: vi.fn() } }));
vi.mock('../../services/socialAutoPost.mjs', () => ({
  createWorkoutAutoPost: vi.fn(),
  createStreakAutoPost: vi.fn(),
}));
vi.mock('../../services/gamificationComboService.mjs', () => ({
  detectCombos: vi.fn(() => ({ combos: [], bestMultiplier: 1, comboBonus: 0 })),
  sumExerciseXP: vi.fn(() => 0),
}));
vi.mock('sequelize', () => ({
  Op: {
    gte: 'gte',
    lte: 'lte',
    ne: 'ne',
  },
}));

const { collectWorkoutMilestones } = await import('../../services/awardWorkoutXPSupport.mjs');

describe('awardWorkoutXPSupport milestone bonus hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects array milestone bonus values before awarding XP', async () => {
    const transaction = { id: 'tx-milestone' };
    const milestone = {
      id: 9,
      name: 'First 500 XP',
      bonusPoints: ['500'],
      userMilestones: [],
    };
    mockMilestone.findAll.mockResolvedValue([milestone]);
    mockUserMilestone.create.mockResolvedValue({});

    const result = await collectWorkoutMilestones({
      userId: 42,
      currentPoints: 500,
      transaction,
    });

    expect(mockUserMilestone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        milestoneId: 9,
        bonusPointsAwarded: 0,
      }),
      { transaction }
    );
    expect(result).toEqual({
      awardedMilestones: [milestone],
      totalMilestoneBonus: 0,
    });
  });
});
