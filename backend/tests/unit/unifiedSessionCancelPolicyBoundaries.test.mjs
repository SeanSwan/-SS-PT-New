/**
 * UnifiedSessionService.cancelSession — policy boundary tests
 *
 * Answers the three questions the 2026-08-25 six-seat panel raised but could not
 * settle from the review packet (SWA-212):
 *
 *   Q1 What charge applies when a CLIENT cancels? normalizeCancellationBillingOptions
 *      returns null for non-admin/trainer, and GLM rated an unenforced late-fee
 *      policy a P1 revenue leak.
 *   Q2 Can a double-submit double-charge?
 *   Q3 Can trainer A cancel/bill trainer B's client (IDOR)?
 *
 * These are service-level tests against the real logic with mocked models — the
 * same fidelity as the existing cancellation suites. They do NOT exercise HTTP,
 * Express middleware, or a real transaction against Postgres.
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
  default: { transaction: vi.fn().mockResolvedValue(mockTransaction) }
}));
vi.mock('../../services/automationService.mjs', () => ({
  triggerSequence: vi.fn().mockResolvedValue({ success: true })
}));
vi.mock('../../services/realTimeScheduleService.mjs', () => ({
  default: { emitSessionUpdate: vi.fn(), broadcastScheduleUpdate: vi.fn() }
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
  getClientTrainerAssignment: vi.fn(() => ({}))
}));
vi.mock('../../utils/cancellationPricing.mjs', () => ({
  getClientPackagePricing: vi.fn().mockResolvedValue({
    pricePerSession: 175,
    packageName: 'Signature 60',
    isFallback: false
  }),
  computeCancellationCharge: vi.fn(),
  getCancellationPolicy: vi.fn()
}));

const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

const HOURS = 60 * 60 * 1000;

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
    sessionDate: new Date(Date.now() + 2 * HOURS),
    sessionDeducted: true,
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

describe('cancelSession policy boundaries', () => {
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

  const arrange = (sessionOverrides = {}) => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({ client, ...sessionOverrides });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);
    return { client, session };
  };

  // ---------------- Q3: IDOR ----------------

  it('refuses a trainer who is not the trainer on the session', async () => {
    arrange();

    await expect(
      service.cancelSession(77, { id: 999, role: 'trainer' }, 'poking around', {
        chargeType: 'full',
        chargeAmount: 175
      })
    ).rejects.toThrow(/permission/i);
  });

  it('allows the trainer who owns the session', async () => {
    const { session } = arrange();

    await service.cancelSession(77, { id: 42, role: 'trainer' }, 'Legit', {
      chargeType: 'none',
      restoreCredit: true
    });

    expect(session.status).toBe('cancelled');
  });

  // ---------------- Q2: double-submit ----------------

  it('refuses to cancel a session that is already cancelled', async () => {
    // The row is read under LOCK.UPDATE inside the transaction, so a second
    // submit serialises behind the first and then sees status 'cancelled'.
    arrange({ status: 'cancelled' });

    await expect(
      service.cancelSession(77, { id: 42, role: 'trainer' }, 'double submit', {
        chargeType: 'full',
        chargeAmount: 175
      })
    ).rejects.toThrow(/Cannot cancel a session with status: cancelled/);
  });

  it('does not double-restore a credit that was already restored', async () => {
    const { client } = arrange({ sessionCreditRestored: true });

    await service.cancelSession(77, { id: 42, role: 'trainer' }, 'Waive', {
      chargeType: 'none',
      restoreCredit: true
    });

    expect(client.increment).not.toHaveBeenCalled();
  });

  // ---------------- Q1: client-initiated cancellation ----------------

  it('restores the credit when a CLIENT cancels outside the 24h window', async () => {
    const { client, session } = arrange({ sessionDate: new Date(Date.now() + 48 * HOURS) });

    await service.cancelSession(77, { id: 301, role: 'client' }, 'Something came up');

    expect(session.status).toBe('cancelled');
    expect(session.sessionCreditRestored).toBe(true);
    expect(client.increment).toHaveBeenCalled();
  });

  it('forfeits the credit when a CLIENT cancels inside the 24h window', async () => {
    const { client, session } = arrange({ sessionDate: new Date(Date.now() + 2 * HOURS) });

    await service.cancelSession(77, { id: 301, role: 'client' }, 'Late');

    expect(session.status).toBe('cancelled');
    expect(session.sessionCreditRestored).toBe(false);
    expect(client.increment).not.toHaveBeenCalled();
  });

  it('records NO fee for a late client cancellation — the forfeited credit is the only penalty', async () => {
    // DOCUMENTS CURRENT BEHAVIOUR, and it is a real gap (SWA-212, GLM P1):
    // normalizeCancellationBillingOptions returns null for a client, so the whole
    // billing block is skipped. The client forfeits the prepaid session, which is
    // a genuine economic penalty — but no chargeType, no amount and no decision is
    // recorded, so the late cancellation is invisible to reporting, and the
    // client-facing warning panel implies a fee that is never applied.
    // Whether a fee SHOULD be charged is Sean's policy call, not a code fix.
    const { session } = arrange({ sessionDate: new Date(Date.now() + 2 * HOURS) });

    await service.cancelSession(77, { id: 301, role: 'client' }, 'Late');

    expect(session.cancellationChargeType).toBeNull();
    expect(session.cancellationChargeAmount).toBeNull();
    expect(session.cancellationDecision).toBeNull();
  });

  it('ignores billing fields a client sends on their own cancellation', async () => {
    const { session } = arrange({ sessionDate: new Date(Date.now() + 48 * HOURS) });

    await service.cancelSession(77, { id: 301, role: 'client' }, 'Nice try', {
      chargeType: 'none',
      chargeAmount: 0,
      restoreCredit: true
    });

    // A client cannot self-waive into a recorded decision: the billing block is
    // skipped entirely regardless of what they submit.
    expect(session.cancellationChargeType).toBeNull();
    expect(session.cancellationReviewedBy).toBeNull();
  });
});
