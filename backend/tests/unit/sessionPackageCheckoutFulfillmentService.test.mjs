/**
 * sessionPackageCheckoutFulfillmentService.test.mjs
 * =================================================
 * Locks direct session-package fulfillment so the Stripe webhook and browser
 * verify-session recovery path share one idempotent session-grant contract.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: { LOCK: { UPDATE: 'UPDATE' } },
  mockOrder: {
    findOne: vi.fn(),
    findOrCreate: vi.fn(),
  },
  mockUserModel: { findByPk: vi.fn() },
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async (callback) => callback(mocks.transaction)),
  },
}));

vi.mock('../../models/Order.mjs', () => ({
  default: mocks.mockOrder,
}));

vi.mock('../../models/User.mjs', () => ({
  default: mocks.mockUserModel,
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/sessionBillingPolicy.mjs', () => ({
  isNonDeductingClient: (user) => user?.clientSource === 'movefitness' || user?.sessionBillingMode === 'no_session_required',
}));

const {
  SESSION_PACKAGE_CHECKOUT_SOURCE,
  fulfillSessionPackageCheckoutSession,
  getSessionPackageFulfillmentKey,
  isSessionPackageCheckoutSession,
} = await import('../../services/sessionPackageCheckoutFulfillmentService.mjs');

function makeSession(overrides = {}) {
  return {
    id: 'cs_test_pkg_123',
    amount_total: 40000,
    client_reference_id: '3',
    payment_intent: 'pi_test_pkg_123',
    metadata: {
      source: SESSION_PACKAGE_CHECKOUT_SOURCE,
      packageId: 'starter',
      sessions: '5',
    },
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    id: 3,
    role: 'user',
    clientSource: 'movefitness',
    increment: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('session package checkout fulfillment service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockOrder.findOne.mockResolvedValue(null);
    mocks.mockOrder.findOrCreate.mockResolvedValue([{ id: 91 }, true]);
  });

  it('detects direct session-package checkout metadata', () => {
    expect(isSessionPackageCheckoutSession(makeSession())).toBe(true);
    expect(isSessionPackageCheckoutSession({ metadata: { cartId: '42' } })).toBe(false);
    expect(getSessionPackageFulfillmentKey('cs_test_pkg_123')).toBe('session-package-webhook:cs_test_pkg_123');
  });

  it('does not classify cart checkout metadata as direct package fulfillment', () => {
    expect(isSessionPackageCheckoutSession(makeSession({
      client_reference_id: '42',
      metadata: {
        source: 'genesis_checkout',
        userId: '3',
        cartId: '42',
        totalSessions: '10',
        packageId: '10',
        sessions: '10',
      },
    }))).toBe(false);
  });

  it('creates one fulfillment order and unlocks client-ready account state', async () => {
    const user = makeUser();
    mocks.mockUserModel.findByPk.mockResolvedValue(user);

    const result = await fulfillSessionPackageCheckoutSession(makeSession());

    expect(result).toEqual({
      alreadyProcessed: false,
      sessionsAdded: 5,
      userId: 3,
      orderId: 91,
    });
    expect(mocks.mockOrder.findOne).toHaveBeenCalledWith({
      where: { idempotencyKey: 'session-package-webhook:cs_test_pkg_123' },
      transaction: mocks.transaction,
    });
    expect(mocks.mockOrder.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'session-package-webhook:cs_test_pkg_123' },
      defaults: expect.objectContaining({
        userId: 3,
        cartId: null,
        orderNumber: 'SS-SP-cs_test_pkg_123',
        totalAmount: 400,
        status: 'completed',
        paymentReference: 'cs_test_pkg_123',
        idempotencyKey: 'session-package-webhook:cs_test_pkg_123',
        completedAt: expect.any(Date),
        paymentAppliedAt: expect.any(Date),
      }),
      transaction: mocks.transaction,
    }));
    expect(user.increment).toHaveBeenCalledWith('availableSessions', {
      by: 5,
      transaction: mocks.transaction,
    });
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      hasPurchasedBefore: true,
      lastPurchaseDate: expect.any(Date),
      role: 'client',
      clientSource: 'swanstudios',
      sessionBillingMode: 'paid_sessions',
    }), { transaction: mocks.transaction });
  });

  it('does not grant sessions again when the fulfillment order already exists', async () => {
    mocks.mockOrder.findOne.mockResolvedValue({ id: 91 });

    const result = await fulfillSessionPackageCheckoutSession(makeSession());

    expect(result).toEqual({
      alreadyProcessed: true,
      sessionsAdded: 0,
      userId: 3,
      orderId: 91,
    });
    expect(mocks.mockUserModel.findByPk).not.toHaveBeenCalled();
    expect(mocks.mockOrder.findOrCreate).not.toHaveBeenCalled();
  });
});
