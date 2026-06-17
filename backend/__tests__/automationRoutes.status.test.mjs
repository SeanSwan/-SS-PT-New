/**
 * Automation route arm-status contract.
 * Keeps the operator cockpit honest: the read-only arm indicator must be
 * admin-only and must report the same default-off kill switch used by the
 * scheduler and sender chokepoint.
 */
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => {
    const auth = req.get('authorization');
    if (auth === 'Bearer admin') {
      req.user = { id: 1, role: 'admin' };
      return next();
    }
    if (auth === 'Bearer trainer') {
      req.user = { id: 2, role: 'trainer' };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Not authorized' });
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
  },
  trainerOrAdminOnly: (req, res, next) => {
    if (['admin', 'trainer'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Trainer or admin access required' });
  },
}));

vi.mock('../models/index.mjs', () => ({
  getAllModels: () => ({ AutomationSequence: {}, AutomationLog: {}, User: {} }),
}));

vi.mock('../utils/clientAccess.mjs', () => ({
  ensureClientAccess: vi.fn(),
}));

vi.mock('../services/automationService.mjs', () => ({
  ensureDefaultSequences: vi.fn(),
  triggerSequence: vi.fn(),
  cancelSequence: vi.fn(),
  previewScheduledMessages: vi.fn(),
  processScheduledMessages: vi.fn(),
  sendNurtureTestMessage: vi.fn(),
}));

vi.mock('../services/smsService.mjs', () => ({
  previewSmsTemplates: vi.fn(() => []),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const buildApp = async () => {
  const { default: automationRoutes } = await import('../routes/automationRoutes.mjs');
  const app = express();
  app.use(express.json());
  app.use('/api/automation', automationRoutes);
  return app;
};

describe('GET /api/automation/status', () => {
  beforeEach(() => {
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });

  afterEach(() => {
    delete process.env.SWAN_AUTOMATION_CRON_ENABLED;
  });

  it('requires an authenticated admin', async () => {
    const app = await buildApp();

    await request(app).get('/api/automation/status').expect(401);
    await request(app)
      .get('/api/automation/status')
      .set('Authorization', 'Bearer trainer')
      .expect(403);
  });

  it('reports disarmed when the kill switch is unset or not the literal true', async () => {
    const app = await buildApp();

    const unset = await request(app)
      .get('/api/automation/status')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(unset.body).toEqual({ success: true, data: { armed: false } });

    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'TRUE';
    const nonLiteral = await request(app)
      .get('/api/automation/status')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(nonLiteral.body).toEqual({ success: true, data: { armed: false } });
  });

  it('reports armed only when the shared kill switch is the literal true', async () => {
    process.env.SWAN_AUTOMATION_CRON_ENABLED = 'true';
    const app = await buildApp();

    const response = await request(app)
      .get('/api/automation/status')
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(response.body).toEqual({ success: true, data: { armed: true } });
  });
});
