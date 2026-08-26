/**
 * CHARACTERIZATION CONTRACT — cancellation pricing and forfeit recording
 * =====================================================================
 *
 * SWA-216 step 1. This file is the acceptance gate for porting the
 * cancellation/pricing work off a two-month-old branch onto current `main`.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS SEPARATE
 * --------------------------------------------
 * The branch these behaviours were built on split from `main` on 2026-06-28.
 * Since then `main` gained 9 commits to session.service.mjs and 12 to
 * sessions.mjs — including fixes for two CRITICAL session-credit money bugs
 * (double-deduct, double-grant) and several P0 security holes (a trainer could
 * reschedule and steal any session; an unauthenticated endpoint).
 *
 * Porting the branch's file versions over main's would silently revert all of
 * that. It would compile, tsc would pass, and the branch's own test suites would
 * stay green — because they were written against the old base. That is the
 * failure mode this file is built to catch.
 *
 * HOW TO USE IT
 *   1. Run it on the BRANCH TIP. It must pass — that is the known-good baseline.
 *   2. Port the functions onto main's versions (never the file wholesale).
 *   3. Run this same file on the extracted tree. It must pass unchanged.
 *
 * A green run of the ordinary suites on the new base proves the tests pass. This
 * file is what proves the BEHAVIOUR survived the port.
 *
 * PORTABILITY RULES — honour these when editing:
 *   - Assert observable behaviour only. No internal field names beyond the
 *     public contract, no call-order assumptions, no implementation details that
 *     main may legitimately have changed.
 *   - Mock the database. Never let this file open a connection: backend
 *     tests/setup.mjs stubs NODE_ENV and secrets but does NOT set DATABASE_URL,
 *     and local dev resolves it to PRODUCTION.
 *   - Self-contained. It must run on a tree where nothing else from the branch
 *     has landed yet.
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
  getClientPackagePricing: vi.fn(),
  computeCancellationCharge: vi.fn(),
  getCancellationPolicy: vi.fn()
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const { getClientPackagePricing } = await import('../../utils/cancellationPricing.mjs');
const { UnifiedSessionService } = await import('../../services/sessions/session.service.mjs');

const HOURS = 60 * 60 * 1000;

const buildClient = (overrides = {}) => ({
  id: 301,
  availableSessions: 2,
  increment: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

const buildSession = (overrides = {}) => ({
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
  client: buildClient(),
  trainer: { id: 42 },
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('CONTRACT — cancellation pricing and forfeit recording', () => {
  let service;
  let sessionModel;
  let userModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(undefined);
    mockTransaction.rollback.mockResolvedValue(undefined);
    getClientPackagePricing.mockResolvedValue({
      pricePerSession: 175,
      packageName: 'Signature 60',
      isFallback: false
    });

    service = new UnifiedSessionService();
    sessionModel = { findByPk: vi.fn() };
    userModel = { findByPk: vi.fn() };
    service._Session = sessionModel;
    service._User = userModel;
    service.sendCancellationNotifications = vi.fn();
  });

  const cancel = async (actor, billing, sessionOverrides = {}) => {
    const client = buildClient();
    const session = buildSession({ client, ...sessionOverrides });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);
    await service.cancelSession(77, actor, 'contract', billing);
    return { session, client };
  };

  const TRAINER = { id: 42, role: 'trainer' };
  const CLIENT = { id: 301, role: 'client' };

  // ---------------------------------------------------------------- money

  describe('the operator decides the money, the server only advises', () => {
    it('records the operator figure for a full charge, not the derived rate', async () => {
      getClientPackagePricing.mockResolvedValue({
        pricePerSession: 110, packageName: 'Express 30', isFallback: false
      });

      const { session } = await cancel(TRAINER, {
        chargeType: 'full', chargeAmount: 175, restoreCredit: false
      });

      expect(Number(session.cancellationChargeAmount)).toBe(175);
    });

    it('does not clamp an operator figure above the derived rate', async () => {
      getClientPackagePricing.mockResolvedValue({
        pricePerSession: 110, packageName: 'Express 30', isFallback: false
      });

      const { session } = await cancel(TRAINER, {
        chargeType: 'partial', chargeAmount: 9999, restoreCredit: false
      });

      expect(Number(session.cancellationChargeAmount)).toBe(9999);
    });

    it('still performs the rate lookup, inside the caller transaction', async () => {
      await cancel(TRAINER, { chargeType: 'full', chargeAmount: 175, restoreCredit: false });

      expect(getClientPackagePricing).toHaveBeenCalledWith(
        301, expect.any(Object), { transaction: mockTransaction }
      );
    });

    it('rejects a non-positive charge for a charging type', async () => {
      await expect(
        cancel(TRAINER, { chargeType: 'full', chargeAmount: 0, restoreCredit: false })
      ).rejects.toThrow();
    });

    it('rejects a negative charge', async () => {
      await expect(
        cancel(TRAINER, { chargeType: 'partial', chargeAmount: -500, restoreCredit: false })
      ).rejects.toThrow();
    });
  });

  // ------------------------------------------------------------ authority

  describe('who may set billing', () => {
    it('ignores billing fields submitted by the client themselves', async () => {
      const { session } = await cancel(
        CLIENT,
        { chargeType: 'none', chargeAmount: 0, restoreCredit: true },
        { sessionDate: new Date(Date.now() + 48 * HOURS) }
      );

      expect(session.cancellationReviewedBy).toBeNull();
    });

    it('refuses a trainer who is not on the session', async () => {
      await expect(
        cancel({ id: 999, role: 'trainer' }, { chargeType: 'full', chargeAmount: 175 })
      ).rejects.toThrow(/permission/i);
    });

    it('refuses to cancel an already-cancelled session', async () => {
      await expect(
        cancel(TRAINER, { chargeType: 'full', chargeAmount: 175 }, { status: 'cancelled' })
      ).rejects.toThrow(/status/i);
    });
  });

  // -------------------------------------------------------------- forfeit

  describe('late client cancellations are recorded, on-time ones are not', () => {
    it('stamps a zero-amount forfeit when a client loses a prepaid credit', async () => {
      const { session } = await cancel(CLIENT, undefined, {
        sessionDate: new Date(Date.now() + 2 * HOURS)
      });

      expect(session.sessionCreditRestored).toBe(false);
      expect(session.cancellationChargeType).toBe('none');
      expect(Number(session.cancellationChargeAmount)).toBe(0);
      expect(session.cancellationDecision).toBe('forfeited');
      expect(session.cancellationReviewedBy).toBeNull();
    });

    it('records nothing when the client cancels early and keeps the credit', async () => {
      const { session } = await cancel(CLIENT, undefined, {
        sessionDate: new Date(Date.now() + 48 * HOURS)
      });

      expect(session.sessionCreditRestored).toBe(true);
      expect(session.cancellationDecision).toBeNull();
    });

    it('records nothing when no credit was deducted', async () => {
      const { session } = await cancel(CLIENT, undefined, {
        sessionDate: new Date(Date.now() + 2 * HOURS),
        sessionDeducted: false
      });

      expect(session.cancellationDecision).toBeNull();
    });

    it('records nothing when the credit was already restored earlier', async () => {
      const { session } = await cancel(CLIENT, undefined, {
        sessionDate: new Date(Date.now() + 48 * HOURS),
        sessionCreditRestored: true
      });

      expect(session.cancellationDecision).toBeNull();
    });

    it('records nothing when the session date is unusable', async () => {
      const { session } = await cancel(CLIENT, undefined, { sessionDate: null });

      expect(session.cancellationDecision).toBeNull();
    });

    it('leaves an operator decision untouched', async () => {
      const { session } = await cancel(TRAINER, {
        chargeType: 'late_fee', chargeAmount: 55, restoreCredit: false
      }, { sessionDate: new Date(Date.now() + 2 * HOURS) });

      expect(session.cancellationDecision).toBe('charged');
      expect(session.cancellationReviewedBy).toBe(42);
    });
  });

  // ------------------------------------------------------------- boundary

  describe('the 24-hour boundary agrees with what the client was told', () => {
    const cancelAt = async (hoursOut) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'));
      const result = await cancel(CLIENT, undefined, {
        sessionDate: new Date(Date.now() + hoursOut * HOURS)
      });
      vi.useRealTimers();
      return result.session;
    };

    it('restores the credit at exactly 24 hours', async () => {
      // The warning endpoint calls this NOT late (hoursUntilSession < 24 is
      // false) and tells the client their credit will be returned.
      expect((await cancelAt(24)).sessionCreditRestored).toBe(true);
    });

    it('forfeits just inside the window', async () => {
      expect((await cancelAt(23.5)).sessionCreditRestored).toBe(false);
    });
  });
});
