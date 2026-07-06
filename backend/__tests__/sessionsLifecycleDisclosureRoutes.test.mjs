/**
 * sessions.mjs lifecycle disclosure regression tests.
 *
 * Schedule lifecycle actions are core admin/trainer operations. Generic
 * failures must not leak private service, transaction, or storage details.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assignTrainer,
  cancelSession,
  completeSession,
  confirmSession,
} = vi.hoisted(() => ({
  assignTrainer: vi.fn(),
  cancelSession: vi.fn(),
  completeSession: vi.fn(),
  confirmSession: vi.fn(),
}));

vi.mock('../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next(),
  trainerOrAdminOnly: (_req, _res, next) => next(),
}));

vi.mock('../models/Session.mjs', () => ({
  default: {
    sequelize: {
      Sequelize: {
        Op: {},
      },
    },
  },
}));

vi.mock('../services/sessions/session.service.mjs', () => ({
  default: {
    assignTrainer,
    cancelSession,
    completeSession,
    confirmSession,
    getSessionById: vi.fn(),
    getSessions: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

vi.mock('../services/conflictService.mjs', () => ({
  default: {
    checkConflicts: vi.fn(),
    findAlternatives: vi.fn(),
  },
}));

vi.mock('../services/TrainerAssignmentService.mjs', () => ({
  default: {
    healthCheck: vi.fn(),
  },
}));

vi.mock('../controllers/notificationController.mjs', () => ({
  createNotification: vi.fn(),
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const sessionsRouter = (await import('../routes/sessions.mjs')).default;

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);

describe('mounted sessions lifecycle disclosure routes', () => {
  beforeEach(() => {
    assignTrainer.mockReset();
    cancelSession.mockReset();
    completeSession.mockReset();
    confirmSession.mockReset();
  });

  it('PATCH /api/sessions/:id/cancel does not disclose internal cancellation errors', async () => {
    cancelSession.mockRejectedValueOnce(new Error('private cancellation service host'));

    const response = await request(app)
      .patch('/api/sessions/42/cancel')
      .send({ reason: 'Client requested cancellation' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error cancelling session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private cancellation');
  });

  it('PATCH /api/sessions/:id/confirm does not disclose internal confirmation errors', async () => {
    confirmSession.mockRejectedValueOnce(new Error('private confirmation service host'));

    const response = await request(app).patch('/api/sessions/42/confirm').send({});

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error confirming session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private confirmation');
  });

  it('PATCH /api/sessions/:id/complete does not disclose internal completion errors', async () => {
    completeSession.mockRejectedValueOnce(new Error('private completion service host'));

    const response = await request(app)
      .patch('/api/sessions/42/complete')
      .send({ notes: 'Completed without workout log' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error completing session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private completion');
  });

  it('PATCH /api/sessions/:id/assign does not disclose internal assignment errors', async () => {
    assignTrainer.mockRejectedValueOnce(new Error('private trainer assignment host'));

    const response = await request(app)
      .patch('/api/sessions/42/assign')
      .send({ trainerId: 9 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Server error assigning trainer',
    });
    expect(JSON.stringify(response.body)).not.toContain('private trainer assignment');
  });

  it('PATCH /api/sessions/:id/cancel does not disclose substring-matched private errors', async () => {
    cancelSession.mockRejectedValueOnce(new Error('private permission storage host'));

    const response = await request(app)
      .patch('/api/sessions/42/cancel')
      .send({ reason: 'Client requested cancellation' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to cancel this session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private permission');
  });

  it('PATCH /api/sessions/:id/confirm does not disclose substring-matched private errors', async () => {
    confirmSession.mockRejectedValueOnce(new Error('private privileges required storage host'));

    const response = await request(app).patch('/api/sessions/42/confirm').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Not authorized to confirm this session',
    });
    expect(JSON.stringify(response.body)).not.toContain('private privileges');
  });

  it('PATCH /api/sessions/:id/complete does not disclose substring-matched private errors', async () => {
    completeSession.mockRejectedValueOnce(new Error('private only confirmed storage host'));

    const response = await request(app)
      .patch('/api/sessions/42/complete')
      .send({ notes: 'Completed without workout log' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Only scheduled or confirmed sessions can be completed',
    });
    expect(JSON.stringify(response.body)).not.toContain('private only confirmed');
  });

  it('PATCH /api/sessions/:id/assign does not disclose substring-matched private errors', async () => {
    assignTrainer.mockRejectedValueOnce(new Error('private required trainer storage host'));

    const response = await request(app)
      .patch('/api/sessions/42/assign')
      .send({ trainerId: 9 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Required assignment field missing',
    });
    expect(JSON.stringify(response.body)).not.toContain('private required');
  });
});

describe('Slice 0.1 server-side completion billing route contract', () => {
  beforeEach(() => {
    completeSession.mockReset();
  });

  it('PATCH /api/sessions/:id/complete forwards waiveReason to the unified service', async () => {
    completeSession.mockResolvedValueOnce({ success: true });

    await request(app)
      .patch('/api/sessions/42/complete')
      .send({ completeWithoutLog: true, deductSessionCredit: false, waiveReason: 'comp for referral' });

    expect(completeSession).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ role: 'admin' }),
      expect.objectContaining({
        completeWithoutLog: true,
        deductSessionCredit: false,
        waiveReason: 'comp for referral',
      })
    );
  });

  it('maps waive-validation errors to 400 without internal disclosure', async () => {
    completeSession.mockRejectedValueOnce(
      new Error('Invalid waive request: waiveReason (min 5 chars) is required to complete without deducting a session credit')
    );

    const response = await request(app)
      .patch('/api/sessions/42/complete')
      .send({ completeWithoutLog: true, deductSessionCredit: false });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('waive reason');
  });

  it('maps insufficient-credit completion errors to 400 instead of 500', async () => {
    completeSession.mockRejectedValueOnce(new Error('Insufficient session credits (need 1, have 0)'));

    const response = await request(app)
      .patch('/api/sessions/42/complete')
      .send({ completeWithoutLog: true });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Insufficient session credits to complete with deduction',
    });
  });

  it('PUT /api/sessions/:id completion alias forwards waiveReason (source contract, Rule 20 sibling)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(__dirname, '../routes/sessions.mjs'), 'utf8');
    const aliasStart = source.indexOf("req.body?.status === 'completed'");
    const aliasBlock = source.slice(aliasStart, source.indexOf('allowedStatusUpdates', aliasStart));
    expect(aliasStart).toBeGreaterThan(-1);
    expect(aliasBlock).toContain('waiveReason: req.body?.waiveReason');
  });
});
