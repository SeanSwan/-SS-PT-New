import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  loggerWarnMock,
  subscriptionCreateMock,
  subscriptionFindOneMock,
  userFindByPkMock,
} = vi.hoisted(() => ({
  loggerWarnMock: vi.fn(),
  subscriptionCreateMock: vi.fn(),
  subscriptionFindOneMock: vi.fn(),
  userFindByPkMock: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: loggerWarnMock,
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(async (callback) => callback({})),
  },
}));

vi.mock('../../models/Subscription.mjs', () => ({
  default: {
    findOne: subscriptionFindOneMock,
    create: subscriptionCreateMock,
  },
}));

vi.mock('../../models/User.mjs', () => ({
  default: {
    findByPk: userFindByPkMock,
    update: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 501, role: 'user' };
    return next();
  },
  adminOnly: (_req, _res, next) => next(),
}));

import subscriptionRoutes from '../../routes/subscriptionRoutes.mjs';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/subscriptions', subscriptionRoutes);
  return app;
};

describe('subscription status fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionFindOneMock.mockResolvedValue(null);
    subscriptionCreateMock.mockRejectedValue(new Error('column "cumulativeDonationAmount" does not exist'));
    userFindByPkMock.mockResolvedValue({
      aiMessagesUsedThisMonth: 3,
      aiGenerationsUsedThisMonth: 2,
      aiUsageResetDate: '2026-06-01',
    });
  });

  it('returns a transient free trial status when the read path cannot persist auto-created trial data', async () => {
    const response = await request(createApp()).get('/api/subscriptions/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.subscription).toMatchObject({
      tier: 'free',
      status: 'trial',
      hasFullAIAccess: false,
      isInTrial: true,
      cumulativeDonationAmount: 0,
      crystallinePromoEligible: false,
    });
    expect(response.body.subscription.trialDaysRemaining).toBeGreaterThan(0);
    expect(response.body.usage).toMatchObject({
      aiMessagesUsed: 3,
      aiGenerationsUsed: 2,
      resetDate: '2026-06-01',
    });
    expect(subscriptionCreateMock).toHaveBeenCalledTimes(1);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      '[Subscription] Trial auto-create failed; returning transient status.',
      { errorName: 'Error' },
    );
  });
});
