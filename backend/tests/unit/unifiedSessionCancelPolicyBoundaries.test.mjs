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

  it('records no FEE for a late client cancellation, but does record the forfeit', async () => {
    // RE-ANCHORED: this test previously asserted that NOTHING was recorded, which
    // documented the gap Ox flagged - the client silently lost a paid session and
    // no report could see it. The forfeit is now stamped. Still no fee: whether a
    // client late-cancel should incur one is Sean's policy call, not a code fix.
    // Original note kept for context:
    // normalizeCancellationBillingOptions returns null for a client, so the whole
    // billing block is skipped. The client forfeits the prepaid session, which is
    // a genuine economic penalty — but no chargeType, no amount and no decision is
    // recorded, so the late cancellation is invisible to reporting, and the
    // client-facing warning panel implies a fee that is never applied.
    // Whether a fee SHOULD be charged is Sean's policy call, not a code fix.
    const { session } = arrange({ sessionDate: new Date(Date.now() + 2 * HOURS) });

    await service.cancelSession(77, { id: 301, role: 'client' }, 'Late');

    expect(session.cancellationChargeType).toBe('none');
    expect(Number(session.cancellationChargeAmount)).toBe(0);
    expect(session.cancellationDecision).toBe('forfeited');
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

describe('cancelSession 24-hour boundary agrees with the warning endpoint', () => {
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

  const cancelAt = async (hoursOut) => {
    // Frozen clock, no cushion. An earlier version added +2000ms to avoid
    // flakiness, which put the session 24.0005h out - satisfying BOTH > 24 and
    // >= 24, so the test passed against the very bug it was written to catch.
    // Testing a boundary requires landing exactly ON it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00.000Z'));
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({
      client,
      sessionDate: new Date(Date.now() + hoursOut * HOURS)
    });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);
    await service.cancelSession(77, { id: 301, role: 'client' }, 'boundary');
    vi.useRealTimers();
    return session;
  };

  it('restores the credit at exactly the 24-hour boundary', async () => {
    // The warning endpoint calls this NOT late (hoursUntilSession < 24 is false)
    // and tells the client their credit will be returned. Before this fix the
    // service used > 24 and forfeited it, contradicting what the client was told.
    const session = await cancelAt(24);
    expect(session.sessionCreditRestored).toBe(true);
  });

  it('still forfeits the credit just inside the window', async () => {
    const session = await cancelAt(23.5);
    expect(session.sessionCreditRestored).toBe(false);
  });

  it('restores the credit comfortably outside the window', async () => {
    const session = await cancelAt(48);
    expect(session.sessionCreditRestored).toBe(true);
  });
});

describe('late client cancellations are recorded so reporting can see them', () => {
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

  const clientCancel = async (sessionOverrides = {}) => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({ client, ...sessionOverrides });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);
    await service.cancelSession(77, { id: 301, role: 'client' }, 'Late');
    return session;
  };

  it('stamps a zero-amount forfeit decision when a client loses a prepaid credit', async () => {
    // Previously the whole billing block was skipped for clients, so a late
    // cancellation left chargeType, amount and decision all null and was
    // invisible to any admin report — the client silently lost a paid session
    // and nothing recorded that it had happened.
    const session = await clientCancel({ sessionDate: new Date(Date.now() + 2 * HOURS) });

    expect(session.sessionCreditRestored).toBe(false);
    expect(session.cancellationChargeType).toBe('none');
    expect(Number(session.cancellationChargeAmount)).toBe(0);
    expect(session.cancellationDecision).toBe('forfeited');
    expect(session.cancellationReviewReason).toBe('client_late_cancel_credit_forfeit');
  });

  it('does not attribute the forfeit to a human reviewer', async () => {
    const session = await clientCancel({ sessionDate: new Date(Date.now() + 2 * HOURS) });
    // No operator made this call; stamping an actor would fake an audit trail.
    expect(session.cancellationReviewedBy).toBeNull();
  });

  it('records nothing when the client cancels early and keeps the credit', async () => {
    const session = await clientCancel({ sessionDate: new Date(Date.now() + 48 * HOURS) });

    expect(session.sessionCreditRestored).toBe(true);
    expect(session.cancellationDecision).toBeNull();
    expect(session.cancellationChargeType).toBeNull();
  });

  it('records nothing when no credit was deducted in the first place', async () => {
    const session = await clientCancel({
      sessionDate: new Date(Date.now() + 2 * HOURS),
      sessionDeducted: false
    });

    expect(session.cancellationDecision).toBeNull();
  });

  it('leaves an operator decision untouched', async () => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({ client, sessionDate: new Date(Date.now() + 2 * HOURS) });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);

    await service.cancelSession(77, { id: 42, role: 'trainer' }, 'Charged', {
      chargeType: 'late_fee',
      chargeAmount: 55,
      restoreCredit: false
    });

    expect(session.cancellationDecision).toBe('charged');
    expect(session.cancellationReviewedBy).toBe(42);
  });
});

describe('forfeit stamp must not fire outside the late window', () => {
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

  const clientCancel = async (sessionOverrides) => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({ client, ...sessionOverrides });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);
    await service.cancelSession(77, { id: 301, role: 'client' }, 'reason');
    return session;
  };

  it('does not stamp a forfeit on an EARLY cancel whose credit was already restored', async () => {
    // The credit-restore block is skipped because sessionCreditRestored is already
    // true, so `creditRestored` stays false for a reason that has nothing to do
    // with the late-cancel policy. Keying only on that flag fabricated a penalty
    // event on a perfectly on-time cancellation.
    const session = await clientCancel({
      sessionDate: new Date(Date.now() + 48 * HOURS),
      sessionCreditRestored: true
    });

    expect(session.cancellationDecision).toBeNull();
    expect(session.cancellationReviewReason).toBeNull();
  });

  it('does not stamp a forfeit on an early cancel when the client record is missing', async () => {
    const client = buildClient({ availableSessions: 2 });
    const session = buildSession({
      client,
      sessionDate: new Date(Date.now() + 48 * HOURS)
    });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(null); // restore cannot happen

    await service.cancelSession(77, { id: 301, role: 'client' }, 'reason');

    expect(session.cancellationDecision).toBeNull();
  });

  it('still stamps a genuine late forfeit', async () => {
    const session = await clientCancel({ sessionDate: new Date(Date.now() + 2 * HOURS) });
    expect(session.cancellationDecision).toBe('forfeited');
  });
});
