import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const {
  commissionFindAllMock,
  commissionUpdateMock,
  userFindAllMock,
} = vi.hoisted(() => ({
  commissionFindAllMock: vi.fn(),
  commissionUpdateMock: vi.fn(),
  userFindAllMock: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization !== 'Bearer valid') {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    req.user = {
      id: Number(req.headers['x-test-user-id'] || 42),
      role: req.headers['x-test-role'] || 'admin',
    };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role === 'admin') {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Admin only' });
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (req.user?.role === 'trainer' || req.user?.role === 'admin') {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Trainer or admin only' });
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (modelName) => {
    if (modelName === 'TrainerCommission') {
      return {
        findAll: commissionFindAllMock,
        update: commissionUpdateMock,
      };
    }
    return {};
  },
  getUser: () => ({
    findAll: userFindAllMock,
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import commissionRoutes from '../../routes/commissionRoutes.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/commissions', commissionRoutes);
  return app;
}

describe('commission routes guard contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commissionFindAllMock.mockResolvedValue([]);
    commissionUpdateMock.mockResolvedValue([0]);
    userFindAllMock.mockResolvedValue([]);
  });

  it('rejects malformed trainer IDs before trainer commission lookup', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/commissions/trainer/42abc')
      .set('Authorization', 'Bearer valid');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid trainerId');
    expect(commissionFindAllMock).not.toHaveBeenCalled();
  });

  it('blocks trainers from reading another trainer commission history', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/commissions/trainer/9')
      .set('Authorization', 'Bearer valid')
      .set('x-test-role', 'trainer')
      .set('x-test-user-id', '42');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Access denied');
    expect(commissionFindAllMock).not.toHaveBeenCalled();
  });

  it('allows trainers to read their own commission history with parsed IDs', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/commissions/trainer/42')
      .set('Authorization', 'Bearer valid')
      .set('x-test-role', 'trainer')
      .set('x-test-user-id', '42');

    expect(response.status).toBe(200);
    expect(response.body.trainerId).toBe(42);
    expect(commissionFindAllMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { trainerId: 42 },
      limit: 100,
    }));
  });

  it('rejects malformed commission IDs before marking commissions paid', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/commissions/mark-paid')
      .set('Authorization', 'Bearer valid')
      .send({ commissionIds: [12, '13abc'], payoutMethod: 'check' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('commissionIds must be positive integers');
    expect(commissionUpdateMock).not.toHaveBeenCalled();
  });

  it('rejects malformed payout report trainer IDs before querying commissions', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/commissions/payout-report?startDate=2026-01-01&endDate=2026-01-31&trainerId=9abc')
      .set('Authorization', 'Bearer valid');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid trainerId');
    expect(commissionFindAllMock).not.toHaveBeenCalled();
  });

  it('rejects impossible payout report calendar dates before querying commissions', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/commissions/payout-report?startDate=2026-02-31&endDate=2026-03-31')
      .set('Authorization', 'Bearer valid');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('startDate and endDate must be valid dates');
    expect(commissionFindAllMock).not.toHaveBeenCalled();
  });
});
