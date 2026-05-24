/**
 * adminClientActivationQueueService.test.mjs
 * ==========================================
 * Verifies the admin paid-client activation queue stays DB-backed and reuses
 * the checkout activation resolver instead of inventing a separate status map.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockShoppingCart: { findAll: vi.fn() },
  mockUser: { findAll: vi.fn() },
  resolvePaidClientActivationStatus: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getShoppingCart: () => mocks.mockShoppingCart,
  getUser: () => mocks.mockUser,
  Op: {
    in: Symbol.for('op.in'),
    ne: Symbol.for('op.ne'),
    or: Symbol.for('op.or'),
  },
}));

vi.mock('../services/paymentActivationStatusService.mjs', () => ({
  resolvePaidClientActivationStatus: mocks.resolvePaidClientActivationStatus,
}));

const { listPaidClientActivationQueue } = await import('../services/adminClientActivationQueueService.mjs');

function makeCart(id, userId, checkoutSessionId) {
  return {
    id,
    userId,
    checkoutSessionId,
    status: 'completed',
    paymentStatus: 'paid',
    sessionsGranted: true,
    total: 500,
    updatedAt: '2026-05-20T12:00:00.000Z',
  };
}

function makeStatus(userId, checkoutSessionId, nextStep, overrides = {}) {
  return {
    sessionId: checkoutSessionId,
    userId,
    cart: {
      id: userId + 40,
      status: 'completed',
      paymentStatus: 'paid',
      sessionsGranted: true,
      total: 500,
      completedAt: '2026-05-20T11:00:00.000Z',
      updatedAt: '2026-05-20T12:00:00.000Z',
    },
    activation: {
      paid: true,
      accountLinked: true,
      waiverComplete: nextStep !== 'complete_waiver',
      onboardingComplete: !['complete_waiver', 'complete_onboarding'].includes(nextStep),
      sessionCreditsAllocated: nextStep !== 'await_session_allocation',
      orderRecorded: true,
      sessionsAvailable: 10,
      scheduledSessionCount: 0,
      forcePasswordChange: false,
      nextStep,
      nextRoute: '/dashboard/client/overview',
      nextAction: 'Continue activation',
      ...overrides.activation,
    },
    nextSession: null,
  };
}

describe('admin client activation queue service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockShoppingCart.findAll.mockResolvedValue([
      makeCart(42, 3, 'cs_test_waiver'),
      makeCart(43, 4, 'cs_test_schedule'),
    ]);
    mocks.mockUser.findAll.mockResolvedValue([
      { id: 3, firstName: 'Ava', lastName: 'Client', email: 'ava@example.test', isActive: true, availableSessions: 10 },
      { id: 4, firstName: 'Ben', lastName: 'Client', email: 'ben@example.test', isActive: true, availableSessions: 8 },
    ]);
    mocks.resolvePaidClientActivationStatus.mockImplementation(({ userId, sessionId }) => {
      if (userId === 3) return makeStatus(userId, sessionId, 'complete_waiver');
      return makeStatus(userId, sessionId, 'schedule_first_session');
    });
  });

  it('returns paid client activation rows with a summary by next step', async () => {
    const result = await listPaidClientActivationQueue({ limit: 25 });

    expect(mocks.mockShoppingCart.findAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 100,
      order: [['updatedAt', 'DESC']],
    }));
    expect(mocks.mockUser.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        role: {
          [Symbol.for('op.in')]: ['client', 'user'],
        },
      }),
    }));
    expect(mocks.resolvePaidClientActivationStatus).toHaveBeenCalledTimes(2);
    expect(result.queue).toHaveLength(2);
    expect(result.queue[0]).toEqual(expect.objectContaining({
      cartId: 42,
      sessionId: 'cs_test_waiver',
      client: expect.objectContaining({
        id: 3,
        firstName: 'Ava',
        email: 'ava@example.test',
      }),
      activation: expect.objectContaining({
        nextStep: 'complete_waiver',
      }),
    }));
    expect(result.summary).toEqual(expect.objectContaining({
      total: 2,
      needsWaiver: 1,
      readyToSchedule: 1,
      byNextStep: {
        complete_waiver: 1,
        schedule_first_session: 1,
      },
    }));
  });

  it('filters by activation next step after resolving canonical status', async () => {
    const result = await listPaidClientActivationQueue({ nextStep: 'schedule_first_session' });

    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].client.id).toBe(4);
    expect(result.summary.byNextStep).toEqual({ schedule_first_session: 1 });
  });

  it('excludes dashboard-complete rows from the default activation queue', async () => {
    mocks.resolvePaidClientActivationStatus.mockImplementation(({ userId, sessionId }) => {
      if (userId === 3) return makeStatus(userId, sessionId, 'dashboard');
      return makeStatus(userId, sessionId, 'schedule_first_session');
    });

    const result = await listPaidClientActivationQueue();

    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].client.id).toBe(4);
    expect(result.summary).toEqual(expect.objectContaining({
      total: 1,
      readyToSchedule: 1,
      byNextStep: { schedule_first_session: 1 },
    }));
  });

  it('scans extra paid carts so dashboard-complete rows do not crowd out pending users', async () => {
    mocks.mockShoppingCart.findAll.mockResolvedValue([
      makeCart(50, 9, 'cs_test_complete'),
      makeCart(51, 10, 'cs_test_pending'),
    ]);
    mocks.mockUser.findAll.mockResolvedValue([
      { id: 9, firstName: 'Done', lastName: 'User', email: 'done@example.test', isActive: true, availableSessions: 0 },
      { id: 10, firstName: 'New', lastName: 'Buyer', email: 'new@example.test', isActive: true, availableSessions: 10 },
    ]);
    mocks.resolvePaidClientActivationStatus.mockImplementation(({ userId, sessionId }) => {
      if (userId === 9) return makeStatus(userId, sessionId, 'dashboard');
      return makeStatus(userId, sessionId, 'complete_waiver');
    });

    const result = await listPaidClientActivationQueue({ limit: 1 });

    expect(mocks.mockShoppingCart.findAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 4,
    }));
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].client.id).toBe(10);
    expect(result.summary.byNextStep).toEqual({ complete_waiver: 1 });
  });
});
