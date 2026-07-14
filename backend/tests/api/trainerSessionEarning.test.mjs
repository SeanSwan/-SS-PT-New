/**
 * Employed-Trainer Flat Session Earning Tests
 * ===========================================
 * Mode (b) of the trainer revenue model: per_session_flat assignments
 * accrue a TrainerCommission earning row per completed session.
 * Guards: revenue_share assignments accrue NOTHING (zero-delta default),
 * accrual is idempotent per session, misconfigured rate accrues nothing,
 * and failures never throw into the completion path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockCommissionModel, mockAssignmentModel } = vi.hoisted(() => ({
  mockCommissionModel: { findOne: vi.fn(), create: vi.fn() },
  mockAssignmentModel: { findOne: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => {
    if (name === 'TrainerCommission') return mockCommissionModel;
    if (name === 'ClientTrainerAssignment') return mockAssignmentModel;
    return null;
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { accrueFlatSessionEarning } = await import('../../services/trainerSessionEarningService.mjs');

const flatAssignment = (rate = '50.00') => ({
  id: 7,
  clientId: 101,
  trainerId: 202,
  status: 'active',
  compensationMode: 'per_session_flat',
  flatSessionRate: rate,
});

const session = { id: 555, userId: 101, trainerId: 202 };

beforeEach(() => {
  vi.clearAllMocks();
  mockCommissionModel.findOne.mockResolvedValue(null);
  mockCommissionModel.create.mockImplementation(async (row) => ({ id: 9001, ...row }));
});

describe('accrueFlatSessionEarning', () => {
  it('creates a $rate session_flat earning row for a per_session_flat assignment', async () => {
    mockAssignmentModel.findOne.mockResolvedValue(flatAssignment('50.00'));

    const record = await accrueFlatSessionEarning({ session });

    expect(record).not.toBeNull();
    expect(mockCommissionModel.create).toHaveBeenCalledTimes(1);
    const row = mockCommissionModel.create.mock.calls[0][0];
    expect(row).toMatchObject({
      orderId: null,
      sessionId: 555,
      earningType: 'session_flat',
      trainerId: 202,
      clientId: 101,
      sessionsGranted: 1,
      sessionsConsumed: 1,
      trainerCut: 50,
      businessCut: 0,
      grossAmount: 50,
      netAfterTax: 50,
      commissionRateTrainer: 100,
      commissionRateBusiness: 0,
    });
  });

  it('accrues NOTHING for revenue_share assignments (default mode, zero delta)', async () => {
    mockAssignmentModel.findOne.mockResolvedValue({
      ...flatAssignment(),
      compensationMode: 'revenue_share',
    });

    const record = await accrueFlatSessionEarning({ session });

    expect(record).toBeNull();
    expect(mockCommissionModel.create).not.toHaveBeenCalled();
  });

  it('accrues NOTHING when no active assignment matches the session trainer', async () => {
    mockAssignmentModel.findOne.mockResolvedValue(null);

    const record = await accrueFlatSessionEarning({ session });

    expect(record).toBeNull();
    expect(mockCommissionModel.create).not.toHaveBeenCalled();
  });

  it('is idempotent: skips when the session already has an earning row', async () => {
    mockAssignmentModel.findOne.mockResolvedValue(flatAssignment());
    mockCommissionModel.findOne.mockResolvedValue({ id: 42, sessionId: 555 });

    const record = await accrueFlatSessionEarning({ session });

    expect(record).toBeNull();
    expect(mockCommissionModel.create).not.toHaveBeenCalled();
  });

  it('treats a unique-constraint race as already-accrued (no throw, no retry)', async () => {
    mockAssignmentModel.findOne.mockResolvedValue(flatAssignment());
    const err = new Error('duplicate');
    err.name = 'SequelizeUniqueConstraintError';
    mockCommissionModel.create.mockRejectedValue(err);

    await expect(accrueFlatSessionEarning({ session })).resolves.toBeNull();
  });

  it('refuses to accrue on a misconfigured rate (null, zero, negative, NaN)', async () => {
    for (const rate of [null, '0.00', '-5.00', 'banana']) {
      vi.clearAllMocks();
      mockCommissionModel.findOne.mockResolvedValue(null);
      mockAssignmentModel.findOne.mockResolvedValue(flatAssignment(rate));

      const record = await accrueFlatSessionEarning({ session });

      expect(record).toBeNull();
      expect(mockCommissionModel.create).not.toHaveBeenCalled();
    }
  });

  it('never throws into the completion path on unexpected errors', async () => {
    mockAssignmentModel.findOne.mockRejectedValue(new Error('db down'));

    await expect(accrueFlatSessionEarning({ session })).resolves.toBeNull();
  });

  it('returns null on incomplete session identity (no silent misattribution)', async () => {
    for (const bad of [
      { id: null, userId: 101, trainerId: 202 },
      { id: 555, userId: null, trainerId: 202 },
      { id: 555, userId: 101, trainerId: null },
      null,
    ]) {
      const record = await accrueFlatSessionEarning({ session: bad });
      expect(record).toBeNull();
    }
    expect(mockCommissionModel.create).not.toHaveBeenCalled();
  });

  it('rounds the accrued amount to cents from a decimal-string rate', async () => {
    mockAssignmentModel.findOne.mockResolvedValue(flatAssignment('47.505'));

    await accrueFlatSessionEarning({ session });

    const row = mockCommissionModel.create.mock.calls[0][0];
    expect(row.trainerCut).toBe(47.51);
    expect(row.grossAmount).toBe(47.51);
    expect(row.netAfterTax).toBe(47.51);
  });
});
