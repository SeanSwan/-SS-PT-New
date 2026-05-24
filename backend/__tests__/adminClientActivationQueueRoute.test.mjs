/**
 * adminClientActivationQueueRoute.test.mjs
 * ========================================
 * Guards the admin intake queue route from being swallowed by
 * /api/admin/clients/:clientId. Sean needs a canonical new-paid-client
 * queue, and Express route order is the first failure mode.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClients: vi.fn((_req, res) => res.status(200).json({ success: true, route: 'clients' })),
  getClientDetails: vi.fn((_req, res) => res.status(200).json({ success: true, route: 'client-details' })),
  getClientActivationQueue: vi.fn((_req, res) => res.status(200).json({ success: true, route: 'activation-queue' })),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../controllers/adminClientController.mjs', () => ({
  default: {
    getClients: mocks.getClients,
    getClientDetails: mocks.getClientDetails,
    getClientActivationQueue: mocks.getClientActivationQueue,
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    createExternalClient: vi.fn(),
    resetClientPassword: vi.fn(),
    assignTrainer: vi.fn(),
    getBillingOverview: vi.fn(),
    getClientWorkoutStats: vi.fn(),
    generateWorkoutPlan: vi.fn(),
    getMCPStatus: vi.fn(),
  },
}));

vi.mock('../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../models/index.mjs', () => ({
  getUser: () => ({ findByPk: vi.fn() }),
}));

vi.mock('../services/photoStorageService.mjs', () => ({
  uploadPhoto: vi.fn(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { default: adminClientRoutes } = await import('../routes/adminClientRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminClientRoutes);
  return app;
}

describe('admin client activation queue route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts before /clients/:clientId so activation-queue is not treated as a client id', async () => {
    const response = await request(buildApp()).get('/api/admin/clients/activation-queue');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('activation-queue');
    expect(mocks.getClientActivationQueue).toHaveBeenCalledTimes(1);
    expect(mocks.getClientDetails).not.toHaveBeenCalled();
  });
});
