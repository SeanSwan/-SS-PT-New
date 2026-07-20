/**
 * UnifiedSessionService cancel-session billing option tests
 *
 * Locks the admin/trainer cancellation path so the charge/waive controls in
 * the schedule modal persist to the Session audit fields and credit balance.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../../models/Session.mjs', () => ({ default: {} }));
vi.mock('../../models/User.mjs', () => ({ default: {} }));
vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction)
  }
}));
vi.mock('../../services/automationService.mjs', () => ({
  triggerSequence: vi.fn().mockResolvedValue({ success: true })
}));
vi.mock('../../services/realTimeScheduleService.mjs', () => ({
  default: {
    emitSessionUpdate: vi.fn(),
    broadcastScheduleUpdate: vi.fn()
  }
}));
vi.mock('../../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn()
}));
vi.mock('../../utils/notification.mjs', () => ({
  sendEmailNotification: vi.fn(),
  sendSmsNotification: vi.fn(),
  notifySessionBooked: vi.fn(),
  notifyAdminSessionBooked: vi.fn(),
  notifySessionCancelled: vi.fn(),
  processSessionDeduction: vi.fn(),
  sendDeductionNotification: vi.fn(),
  notifyLowSessionsRemaining: vi.fn(),
  sendSessionReminder: vi.fn()
}));
vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(() => ({})),
  getOrder: vi.fn(() => ({})),
  getOrderItem: vi.fn(() => ({})),
  getStorefrontItem: vi.fn(() => ({})),
  getSession: vi.fn(() => ({})),
  getSessionType: vi.fn(() => ({})),
  getFinancialTransaction: vi.fn(() => ({})),
  getClientTrainerAssignment: vi.fn(() => ({})),
  getDailyWorkoutForm: vi.fn(() => ({}))
}));

const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

const buildClient = (overrides = {}) => ({
  id: 301,
  availableSessions: 0,
  increment: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

const buildSession = (overrides = {}) => {
  const client = overrides.client || buildClient();
  return {
    id: 77,
    userId: 301,
    trainerId: 42,
    status: 'scheduled',
    sessionDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    sessionDeducted: true,
    creditsDeducted: 2,
    sessionCreditRestored: false,
    cancellationChargeType: null,
    cancellationChargeAmount: null,
    cancellationChargedAt: null,
    cancellationDecision: null,
    cancellationReviewedBy: null,
    cancellationReviewedAt: null,
    cancellationReviewReason: null,
    client,
    trainer: { id: 42 },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
};

describe('UnifiedSessionService.cancelSession cancellation billing choices', () => {
  let service;
  let sessionModel;
  let userModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(undefined);
    mockTransaction.rollback.mockResolvedValue(undefined);

    service = new UnifiedSessionService();
    sessionModel = { findByPk: vi.fn() };
    userModel = { findByPk: vi.fn() };
    service._Session = sessionModel;
    service._User = userModel;
    service.sendCancellationNotifications = vi.fn();
  });

  it('lets admin/trainer waive a late cancellation and restore a deducted credit', async () => {
    const client = buildClient({ availableSessions: 0 });
    const session = buildSession({ client });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);

    const result = await service.cancelSession(
      77,
      { id: '42', role: 'trainer' },
      'Client emergency',
      { chargeType: 'none', restoreCredit: true }
    );

    expect(session.status).toBe('cancelled');
    expect(session.cancellationChargeType).toBe('none');
    expect(Number(session.cancellationChargeAmount)).toBe(0);
    expect(session.cancellationDecision).toBe('waived');
    expect(session.cancellationReviewedBy).toBe(42);
    expect(session.cancellationReviewedAt).toBeInstanceOf(Date);
    expect(session.sessionCreditRestored).toBe(true);
    expect(client.availableSessions).toBe(2);
    expect(client.increment).toHaveBeenCalledWith('availableSessions', { by: 2, transaction: mockTransaction });
    expect(client.save).not.toHaveBeenCalled();
    expect(sessionModel.findByPk).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE
      })
    );
    expect(userModel.findByPk).toHaveBeenCalledWith(
      session.userId,
      {
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE
      }
    );
    expect(result.data).toMatchObject({
      chargeType: 'none',
      chargeAmount: 0,
      creditRestored: true,
      decision: 'waived'
    });
  });

  it('records a trainer-entered cancellation charge without restoring credit', async () => {
    const client = buildClient({ availableSessions: 3 });
    const session = buildSession({ client });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);

    const result = await service.cancelSession(
      77,
      { id: 42, role: 'trainer' },
      'Late cancel',
      { chargeType: 'partial', chargeAmount: 55, restoreCredit: false }
    );

    expect(session.cancellationChargeType).toBe('partial');
    expect(Number(session.cancellationChargeAmount)).toBe(55);
    expect(session.cancellationChargedAt).toBeInstanceOf(Date);
    expect(session.cancellationDecision).toBe('charged');
    expect(session.sessionCreditRestored).toBe(false);
    expect(client.availableSessions).toBe(3);
    expect(client.save).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({
      chargeType: 'partial',
      chargeAmount: 55,
      creditRestored: false,
      decision: 'charged'
    });
  });

  it('does not convert absent route billing fields into a waiver decision', async () => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({
      client,
      sessionDeducted: false
    });
    sessionModel.findByPk.mockResolvedValue(session);

    const result = await service.cancelSession(
      77,
      { id: 42, role: 'trainer' },
      'Plain cancellation',
      { chargeType: undefined, chargeAmount: undefined, restoreCredit: undefined }
    );

    expect(session.cancellationChargeType).toBeNull();
    expect(session.cancellationChargeAmount).toBeNull();
    expect(session.cancellationDecision).toBeNull();
    expect(session.cancellationReviewedBy).toBeNull();
    expect(result.data).toMatchObject({
      chargeType: null,
      chargeAmount: 0,
      creditRestored: false,
      decision: null
    });
  });
});
