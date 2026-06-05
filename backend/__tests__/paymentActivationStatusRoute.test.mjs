/**
 * paymentActivationStatusRoute.test.mjs
 * =====================================
 * Locks the paid-client activation resolver used after Stripe checkout.
 * The resolver must be DB-owned, user-scoped, and independent from live
 * Stripe availability so the success page can show the next required action.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockShoppingCart: { findOne: vi.fn() },
  mockUser: { findByPk: vi.fn() },
  mockWaiverRecord: { findOne: vi.fn() },
  mockOrder: { findOne: vi.fn() },
  mockSession: {
    findOne: vi.fn(),
    count: vi.fn(),
  },
  mockClientOnboardingQuestionnaire: { findOne: vi.fn() },
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 3),
      role: req.get('x-test-role') || 'client',
    };
    next();
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../models/index.mjs', () => ({
  getShoppingCart: () => mocks.mockShoppingCart,
  getCartItem: () => ({}),
  getStorefrontItem: () => ({}),
  getUser: () => mocks.mockUser,
  getWaiverRecord: () => mocks.mockWaiverRecord,
  getOrder: () => mocks.mockOrder,
  getSession: () => mocks.mockSession,
  getModel: (modelName) => {
    if (modelName === 'ClientOnboardingQuestionnaire') {
      return mocks.mockClientOnboardingQuestionnaire;
    }
    throw new Error(`Unexpected model lookup: ${modelName}`);
  },
  Op: {
    in: Symbol.for('op.in'),
    gte: Symbol.for('op.gte'),
    or: Symbol.for('op.or'),
  },
}));

vi.mock('../services/SessionGrantService.mjs', () => ({
  calculateCartSessionCredits: vi.fn(() => 10),
  getStorefrontSessionCredits: vi.fn(() => 10),
  grantSessionsForCart: vi.fn(),
}));

delete process.env.STRIPE_SECRET_KEY;

const { default: paymentRoutes } = await import('../routes/v2PaymentRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/payments', paymentRoutes);
  return app;
}

function makeCart(overrides = {}) {
  return {
    id: 42,
    userId: 3,
    status: 'completed',
    paymentStatus: 'paid',
    sessionsGranted: true,
    checkoutSessionId: 'cs_test_activation',
    total: '500.00',
    completedAt: new Date('2026-05-20T12:00:00Z'),
    updatedAt: new Date('2026-05-20T12:00:00Z'),
    ...overrides,
  };
}

function makeUser(overrides = {}) {
  return {
    id: 3,
    role: 'client',
    availableSessions: 10,
    isOnboardingComplete: false,
    masterPromptJson: null,
    forcePasswordChange: false,
    ...overrides,
  };
}

function primeActivationMocks(overrides = {}) {
  mocks.mockShoppingCart.findOne.mockResolvedValue(Object.hasOwn(overrides, 'cart') ? overrides.cart : makeCart());
  mocks.mockUser.findByPk.mockResolvedValue(Object.hasOwn(overrides, 'user') ? overrides.user : makeUser());
  mocks.mockWaiverRecord.findOne.mockResolvedValue(Object.hasOwn(overrides, 'waiverRecord') ? overrides.waiverRecord : null);
  mocks.mockClientOnboardingQuestionnaire.findOne.mockResolvedValue(Object.hasOwn(overrides, 'questionnaire') ? overrides.questionnaire : null);
  mocks.mockOrder.findOne.mockResolvedValue(Object.hasOwn(overrides, 'order') ? overrides.order : {
    id: 99,
    status: 'completed',
    paymentAppliedAt: new Date('2026-05-20T12:00:00Z'),
  });
  mocks.mockSession.findOne.mockResolvedValue(Object.hasOwn(overrides, 'nextSession') ? overrides.nextSession : null);
  mocks.mockSession.count.mockResolvedValue(Object.hasOwn(overrides, 'scheduledSessionCount') ? overrides.scheduledSessionCount : 0);
}

describe('payment activation status resolver route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('resolves paid checkout to the waiver gate when no linked waiver exists', async () => {
    primeActivationMocks();

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      accountLinked: true,
      waiverComplete: false,
      onboardingComplete: false,
      sessionCreditsAllocated: true,
      sessionsAvailable: 10,
      nextStep: 'complete_waiver',
      nextRoute: '/waiver?source=in_app',
    }));
    expect(response.body.data.order).not.toHaveProperty('idempotencyKey');
    expect(response.body.data.order).not.toHaveProperty('paymentReference');
    expect(mocks.mockShoppingCart.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          checkoutSessionId: 'cs_test_activation',
          userId: 3,
        }),
      }),
    );
  });

  it('resolves direct session-package orders without requiring a shopping cart row', async () => {
    const packageOrder = {
      id: 77,
      status: 'completed',
      paymentAppliedAt: new Date('2026-05-20T12:00:00Z'),
      paymentReference: 'cs_test_activation',
      idempotencyKey: 'session-package-webhook:cs_test_activation',
      totalAmount: '400.00',
      updatedAt: new Date('2026-05-20T12:01:00Z'),
    };

    primeActivationMocks({
      cart: null,
      order: packageOrder,
      user: makeUser({ availableSessions: 5, isOnboardingComplete: true }),
      waiverRecord: { id: 7, status: 'linked', signedAt: new Date('2026-05-20T11:00:00Z') },
      questionnaire: { id: 8, status: 'completed', completedAt: new Date('2026-05-20T11:30:00Z') },
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.cart).toEqual(expect.objectContaining({
      id: null,
      paymentStatus: 'paid',
      sessionsGranted: true,
      total: 400,
    }));
    expect(response.body.data.order).toEqual(expect.objectContaining({
      id: 77,
      status: 'completed',
    }));
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      sessionCreditsAllocated: true,
      sessionsAvailable: 5,
      nextStep: 'schedule_first_session',
      nextRoute: '/dashboard/client/schedule',
    }));
    expect(mocks.mockShoppingCart.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          checkoutSessionId: 'cs_test_activation',
          userId: 3,
        }),
      }),
    );
    expect(mocks.mockOrder.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentReference: 'cs_test_activation',
          userId: 3,
        }),
      }),
    );
  });

  it('returns 400 for a missing sessionId', async () => {
    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('SESSION_ID_REQUIRED');
    expect(mocks.mockShoppingCart.findOne).not.toHaveBeenCalled();
  });

  it('routes waiver-complete clients to the real client onboarding route', async () => {
    primeActivationMocks({
      waiverRecord: { id: 7, status: 'linked', signedAt: new Date('2026-05-20T11:00:00Z') },
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      waiverComplete: true,
      onboardingComplete: false,
      nextStep: 'complete_onboarding',
      nextRoute: '/dashboard/client/onboarding',
    }));
  });

  it('routes a fully activated client with credits but no upcoming session to scheduling', async () => {
    primeActivationMocks({
      user: makeUser({ isOnboardingComplete: true }),
      waiverRecord: { id: 7, status: 'linked', signedAt: new Date('2026-05-20T11:00:00Z') },
      questionnaire: { id: 8, status: 'completed', completedAt: new Date('2026-05-20T11:30:00Z') },
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      waiverComplete: true,
      onboardingComplete: true,
      sessionsAvailable: 10,
      nextStep: 'schedule_first_session',
      nextRoute: '/dashboard/client/schedule',
    }));
  });

  it('holds a paid checkout at allocation when the webhook has not granted credits yet', async () => {
    primeActivationMocks({
      cart: makeCart({ sessionsGranted: false }),
      user: makeUser({ availableSessions: 0, isOnboardingComplete: true }),
      waiverRecord: { id: 7, status: 'linked', signedAt: new Date('2026-05-20T11:00:00Z') },
      questionnaire: { id: 8, status: 'completed', completedAt: new Date('2026-05-20T11:30:00Z') },
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      sessionCreditsAllocated: false,
      sessionsAvailable: 0,
      nextStep: 'await_session_allocation',
      nextRoute: '/dashboard/client/overview',
    }));
  });

  it('does not mark an already granted zero-balance client as allocation pending', async () => {
    primeActivationMocks({
      user: makeUser({ availableSessions: 0, isOnboardingComplete: true }),
      waiverRecord: { id: 7, status: 'linked', signedAt: new Date('2026-05-20T11:00:00Z') },
      questionnaire: { id: 8, status: 'completed', completedAt: new Date('2026-05-20T11:30:00Z') },
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      sessionCreditsAllocated: true,
      sessionsAvailable: 0,
      nextStep: 'dashboard',
      nextRoute: '/dashboard/client/overview',
    }));
  });

  it('routes a fully activated client with an upcoming session to the dashboard', async () => {
    primeActivationMocks({
      user: makeUser({ isOnboardingComplete: true }),
      waiverRecord: { id: 7, status: 'linked' },
      questionnaire: { id: 8, status: 'completed' },
      nextSession: {
        id: 55,
        sessionDate: new Date('2026-05-21T15:00:00Z'),
        status: 'scheduled',
        trainerId: 2,
      },
      scheduledSessionCount: 1,
    });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      nextStep: 'dashboard',
      nextRoute: '/dashboard/client/overview',
    }));
    expect(response.body.data.nextSession).toEqual(expect.objectContaining({
      id: 55,
      status: 'scheduled',
      trainerId: 2,
    }));
  });

  it('does not expose activation status for another user checkout session', async () => {
    primeActivationMocks({ cart: null, order: null });

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ACTIVATION_STATUS_NOT_FOUND');
    expect(mocks.mockUser.findByPk).not.toHaveBeenCalled();
  });

  it('returns paid cart status when optional downstream activation lookups fail', async () => {
    primeActivationMocks();
    mocks.mockOrder.findOne.mockRejectedValue(new Error('orders schema drift'));
    mocks.mockSession.findOne.mockRejectedValue(new Error('sessions schema drift'));

    const response = await request(buildApp())
      .get('/api/v2/payments/activation-status?sessionId=cs_test_activation')
      .set('x-test-user-id', '3');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.activation).toEqual(expect.objectContaining({
      paid: true,
      sessionCreditsAllocated: true,
    }));
    expect(response.body.data.diagnostics).toEqual({
      partial: true,
      unavailable: ['order', 'nextSession'],
    });
  });
});
