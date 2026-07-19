import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction)
  }
}));

vi.mock('../../models/Session.mjs', () => ({
  default: {
    findByPk: vi.fn()
  }
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findByPk: vi.fn()
  }
}));
vi.mock('../../models/index.mjs', () => ({
  getOrder: vi.fn(() => ({})),
  getOrderItem: vi.fn(() => ({})),
  getStorefrontItem: vi.fn(() => ({})),
  getSessionType: vi.fn(() => ({ findByPk: vi.fn() }))
}));

vi.mock('../../utils/cancellationPricing.mjs', () => ({
  getClientPackagePricing: vi.fn().mockResolvedValue({
    pricePerSession: 100,
    packageName: 'Ten Pack',
    isFallback: false,
    isSpecialPackage: false,
    requiresAdminReview: false
  }),
  computeCancellationCharge: vi.fn().mockReturnValue({
    chargeAmount: 50,
    chargeType: 'late_fee'
  })
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const { default: sequelize } = await import('../../database.mjs');
const { default: Session } = await import('../../models/Session.mjs');
const { default: User } = await import('../../models/User.mjs');
const {
  recordCancellationBillingDecision
} = await import('../../services/sessions/sessionCancellationReviewService.mjs');

const buildSession = (overrides = {}) => ({
  id: 77,
  userId: 301,
  status: 'cancelled',
  sessionDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
  duration: 60,
  sessionDeducted: true,
  creditsDeducted: 2,
  sessionCreditRestored: false,
  cancellationDecision: null,
  cancellationChargeType: null,
  cancellationChargeAmount: null,
  cancellationChargedAt: null,
  cancellationReviewedBy: null,
  cancellationReviewedAt: null,
  cancellationReviewReason: null,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

const buildClient = (overrides = {}) => ({
  id: 301,
  availableSessions: 0,
  clientSource: 'swanstudios',
  sessionBillingMode: 'paid_sessions',
  increment: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('recordCancellationBillingDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(undefined);
    mockTransaction.rollback.mockResolvedValue(undefined);
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('records a waiver and restores the exact deducted paid-credit receipt in a locked transaction', async () => {
    const session = buildSession();
    const client = buildClient();
    Session.findByPk.mockResolvedValue(session);
    User.findByPk.mockResolvedValue(client);

    const result = await recordCancellationBillingDecision({
      sessionId: 77,
      reviewer: { id: 9, role: 'admin' },
      decision: 'waived',
      reason: 'Client emergency',
      chargeType: 'none'
    });

    expect(Session.findByPk).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE
      })
    );
    expect(User.findByPk).toHaveBeenCalledWith(301, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE
    });
    expect(client.increment).toHaveBeenCalledWith('availableSessions', {
      by: 2,
      transaction: mockTransaction
    });
    expect(session.sessionCreditRestored).toBe(true);
    expect(session.cancellationDecision).toBe('waived');
    expect(session.cancellationChargeType).toBe('none');
    expect(Number(session.cancellationChargeAmount)).toBe(0);
    expect(session.cancellationChargedAt).toBeNull();
    expect(session.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({
      sessionId: 77,
      decision: 'waived',
      chargeType: 'none',
      chargeAmount: 0,
      creditRestored: true,
      sessionCreditRestored: true
    });
  });

  it('does not double-restore credits when the cancellation was already reversed', async () => {
    const session = buildSession({ sessionCreditRestored: true });
    const client = buildClient();
    Session.findByPk.mockResolvedValue(session);
    User.findByPk.mockResolvedValue(client);

    const result = await recordCancellationBillingDecision({
      sessionId: 77,
      reviewer: { id: 9, role: 'admin' },
      decision: 'waived',
      reason: 'Already credited',
      chargeType: 'none'
    });

    expect(User.findByPk).not.toHaveBeenCalled();
    expect(client.increment).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({
      creditRestored: false,
      sessionCreditRestored: true
    });
  });

  it('records a charge without restoring a credit', async () => {
    const session = buildSession();
    Session.findByPk.mockResolvedValue(session);

    const result = await recordCancellationBillingDecision({
      sessionId: 77,
      reviewer: { id: 9, role: 'admin' },
      decision: 'charged',
      chargeType: 'late_fee'
    });

    expect(User.findByPk).not.toHaveBeenCalled();
    expect(session.cancellationDecision).toBe('charged');
    expect(session.cancellationChargeType).toBe('late_fee');
    expect(Number(session.cancellationChargeAmount)).toBe(50);
    expect(session.cancellationChargedAt).toBeInstanceOf(Date);
    expect(result.data).toMatchObject({
      decision: 'charged',
      chargeType: 'late_fee',
      chargeAmount: 50,
      creditRestored: false
    });
  });

  it('rejects non-admin reviewers before opening a finance transaction', async () => {
    await expect(recordCancellationBillingDecision({
      sessionId: 77,
      reviewer: { id: 42, role: 'trainer' },
      decision: 'waived',
      reason: 'Trainer cannot waive finance',
      chargeType: 'none'
    })).rejects.toThrow('Admin privileges required');

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });
});
