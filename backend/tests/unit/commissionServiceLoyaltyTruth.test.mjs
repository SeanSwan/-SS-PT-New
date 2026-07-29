import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignmentFindOne: vi.fn(),
  userFindByPk: vi.fn(),
  trainerCommissionCreate: vi.fn(),
  countCompletedPaidTrainingSessions: vi.fn(),
  Session: { count: vi.fn() },
  DailyWorkoutForm: { count: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mocks.userFindByPk }),
  getModel: (name) => {
    const models = {
      TrainerCommission: { create: mocks.trainerCommissionCreate },
      ClientTrainerAssignment: { findOne: mocks.assignmentFindOne },
      Session: mocks.Session,
      DailyWorkoutForm: mocks.DailyWorkoutForm,
    };
    return models[name] || null;
  },
}));

vi.mock('../../services/creditGrantLoyaltyService.mjs', () => ({
  countCompletedPaidTrainingSessions: mocks.countCompletedPaidTrainingSessions,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { createCommissionForPurchase } = await import('../../services/CommissionService.mjs');

describe('CommissionService loyalty bump truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assignmentFindOne.mockResolvedValue({ trainerId: 22 });
    mocks.userFindByPk.mockImplementation(async (id) => {
      if (id === 22) {
        // 'affiliated' — 'hired' was a phantom value User.trainerType's
        // isIn [['affiliated','independent']] validator would have rejected,
        // so this fixture was asserting behaviour for an unstorable row.
        return { id: 22, trainerType: 'affiliated', firstName: 'Trainer', lastName: 'One' };
      }
      throw new Error('client availableSessions lookup should not drive loyalty');
    });
    mocks.countCompletedPaidTrainingSessions.mockResolvedValue(0);
    mocks.trainerCommissionCreate.mockImplementation(async (attrs) => attrs);
  });

  it('does not award loyalty bump from unused package inventory on Stripe purchases', async () => {
    const record = await createCommissionForPurchase({
      userId: 17,
      orderId: 91,
      grossAmount: 1200,
      taxAmount: 0,
      sessionsGranted: 120,
      storefrontItemId: 3,
      leadSource: 'platform',
    });

    expect(mocks.countCompletedPaidTrainingSessions).toHaveBeenCalledWith(
      17,
      { Session: mocks.Session, DailyWorkoutForm: mocks.DailyWorkoutForm }
    );
    expect(mocks.userFindByPk).toHaveBeenCalledTimes(1);
    expect(mocks.userFindByPk).toHaveBeenCalledWith(22, {
      attributes: ['id', 'trainerType', 'firstName', 'lastName'],
    });
    expect(record.isLoyaltyBump).toBe(false);
    expect(record.commissionRateTrainer).toBe(65);
  });
});
