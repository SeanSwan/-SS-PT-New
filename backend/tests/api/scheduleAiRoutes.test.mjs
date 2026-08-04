import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateScheduleAiProposal } = vi.hoisted(() => ({
  mockGenerateScheduleAiProposal: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };
    next();
  },
}));

vi.mock('../../services/schedule-ai/scheduleAiProposalEngine.mjs', () => ({
  generateScheduleAiProposal: mockGenerateScheduleAiProposal,
}));

// This suite drives 6 requests as the SAME user to assert ERROR-CODE MAPPING
// (409/503). /proposals gained the per-user aiRateLimiter in the 2026-08-04
// spend-cap fix (SWA-128), and the real limit is 3/minute — so from the 4th
// request on, every assertion here would see 429 instead of the status under
// test. Pass the limiter through: rate limiting is covered by its own suite
// (aiSpendLimiterCoverage.test.mjs pins that the middleware is ON this route),
// and this file must keep testing what its name says.
vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scheduleAiRoutes = (await import('../../routes/scheduleAiRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/schedule-ai', scheduleAiRoutes);
  return app;
}

describe('schedule AI routes', () => {
  beforeEach(() => {
    mockGenerateScheduleAiProposal.mockReset();
  });

  it('rejects empty proposal messages without calling the proposal engine', async () => {
    await request(makeApp())
      .post('/api/schedule-ai/proposals')
      .send({ message: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: false,
          code: 'SCHEDULE_AI_MESSAGE_REQUIRED',
        });
      });

    expect(mockGenerateScheduleAiProposal).not.toHaveBeenCalled();
  });

  it('delegates safe context and authenticated actor to the proposal engine', async () => {
    mockGenerateScheduleAiProposal.mockResolvedValue({
      ok: true,
      type: 'proposal_generated',
      proposal: { id: 'proposal-1', action: 'draft_booking' },
    });

    await request(makeApp())
      .post('/api/schedule-ai/proposals')
      .send({
        message: 'Book Client #12 tomorrow',
        context: { clientId: 12, surface: 'universal_master_schedule' },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          type: 'proposal_generated',
          proposal: { id: 'proposal-1' },
        });
      });

    expect(mockGenerateScheduleAiProposal).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({ id: 7, role: 'admin' }),
      message: 'Book Client #12 tomorrow',
      context: expect.objectContaining({
        clientId: 12,
        surface: 'universal_master_schedule',
      }),
    }));
  });

  it.each([
    ['SCHEDULE_AI_PROPOSAL_DENIED', 403],
    ['SCHEDULE_AI_STALE_CONTEXT', 409],
    ['SCHEDULE_AI_PROVIDER_DEGRADED', 503],
  ])('maps %s to HTTP %i', async (code, status) => {
    mockGenerateScheduleAiProposal.mockResolvedValue({
      ok: false,
      type: 'error',
      code,
      message: code,
    });

    await request(makeApp())
      .post('/api/schedule-ai/proposals')
      .send({ message: 'Help with schedule' })
      .expect(status)
      .expect(({ body }) => {
        expect(body).toMatchObject({ success: false, code });
      });
  });

  it('mounts schedule AI routes on the backend core router', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
    expect(coreRoutes).toContain("import scheduleAiRoutes from '../routes/scheduleAiRoutes.mjs';");
    expect(coreRoutes).toContain("app.use('/api/schedule-ai', scheduleAiRoutes);");
  });
});
