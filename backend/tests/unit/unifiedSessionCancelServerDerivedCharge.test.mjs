/**
 * UnifiedSessionService cancel-session server-derived charge tests
 *
 * The live cancellation path (routes/sessions.mjs -> UnifiedSessionService) stored
 * whatever charge amount the caller sent. routes/sessionRoutes.mjs — which is NOT
 * mounted (core/routes.mjs:286 removed it; sessions.mjs shadows it) — recomputed
 * the full-session amount from the client's real package. That good behaviour never
 * made it into the live service.
 *
 * Consequence: a stale or placeholder frontend figure (e.g. the 175 fallback in
 * useSessionPackagePricing) submitted as chargeType 'full' was recorded verbatim
 * against a client whose real rate is 110.
 *
 * These tests lock the server as the authority for 'full', an upper clamp for the
 * operator-entered types, and — importantly — that the server does NOT substitute
 * its OWN placeholder when it cannot determine the real rate (isFallback).
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
  getClientTrainerAssignment: vi.fn(() => ({}))
}));
vi.mock('../../utils/cancellationPricing.mjs', () => ({
  getClientPackagePricing: vi.fn(),
  computeCancellationCharge: vi.fn(),
  getCancellationPolicy: vi.fn()
}));

const { getClientPackagePricing } = await import('../../utils/cancellationPricing.mjs');
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

describe('UnifiedSessionService.cancelSession server-derived charge amount', () => {
  let service;
  let sessionModel;
  let userModel;

  const runCancel = async (billing) => {
    const client = buildClient({ availableSessions: 3 });
    const session = buildSession({ client });
    sessionModel.findByPk.mockResolvedValue(session);
    userModel.findByPk.mockResolvedValue(client);

    const result = await service.cancelSession(
      77,
      { id: 42, role: 'trainer' },
      'Late cancel',
      billing
    );

    return { session, result };
  };

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

  it('overrides a full-session charge with the real package rate, ignoring the submitted figure', async () => {
    getClientPackagePricing.mockResolvedValue({
      pricePerSession: 110,
      packageName: 'Express 30 10-Pack',
      isFallback: false
    });

    const { session } = await runCancel({
      chargeType: 'full',
      chargeAmount: 175,
      restoreCredit: false
    });

    expect(Number(session.cancellationChargeAmount)).toBe(110);
  });

  it('clamps an operator-entered amount to the real session rate', async () => {
    getClientPackagePricing.mockResolvedValue({
      pricePerSession: 110,
      packageName: 'Express 30 10-Pack',
      isFallback: false
    });

    const { session } = await runCancel({
      chargeType: 'partial',
      chargeAmount: 9999,
      restoreCredit: false
    });

    expect(Number(session.cancellationChargeAmount)).toBe(110);
  });

  it('leaves an amount under the real rate untouched', async () => {
    getClientPackagePricing.mockResolvedValue({
      pricePerSession: 175,
      packageName: 'Signature 60',
      isFallback: false
    });

    const { session } = await runCancel({
      chargeType: 'partial',
      chargeAmount: 55,
      restoreCredit: false
    });

    expect(Number(session.cancellationChargeAmount)).toBe(55);
  });

  it('does NOT substitute its own placeholder when the real rate is unknown', async () => {
    // isFallback means the pricing helper is returning its own hardcoded 175,
    // not this client's package. Overriding here would swap one invented number
    // for another - exactly the defect this whole workstream exists to remove.
    getClientPackagePricing.mockResolvedValue({
      pricePerSession: 175,
      packageName: 'Standard (Fallback)',
      isFallback: true
    });

    const { session } = await runCancel({
      chargeType: 'partial',
      chargeAmount: 40,
      restoreCredit: false
    });

    expect(Number(session.cancellationChargeAmount)).toBe(40);
  });

  it('still cancels when the pricing lookup throws', async () => {
    getClientPackagePricing.mockRejectedValue(new Error('orders table unavailable'));

    const { session } = await runCancel({
      chargeType: 'partial',
      chargeAmount: 40,
      restoreCredit: false
    });

    expect(session.status).toBe('cancelled');
    expect(Number(session.cancellationChargeAmount)).toBe(40);
  });
});
