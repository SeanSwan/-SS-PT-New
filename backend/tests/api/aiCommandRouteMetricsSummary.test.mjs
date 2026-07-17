/**
 * v2 P2.2 — /api/ai-command/metrics/summary is admin-only and returns the
 * aggregation service's payload; window param flows through.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildSummary } = vi.hoisted(() => ({ mockBuildSummary: vi.fn() }));

let currentRole = 'admin';
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: currentRole, firstName: 'QA', lastName: 'Admin' };
    next();
  },
}));
vi.mock('../../middleware/aiCommandGuards.mjs', () => ({
  aiCommandLaneKillSwitch: (_req, _res, next) => next(),
  aiCommandRateLimiter: (_req, _res, next) => next(),
}));
vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: vi.fn(),
  executeConfirmedOperation: vi.fn(),
  checkForConfirmation: vi.fn(),
}));
vi.mock('../../services/ai/commandContextEnvelope.mjs', () => ({ buildCommandContextEnvelope: vi.fn() }));
vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({ getCommandExecutionLane: vi.fn() }));
vi.mock('../../services/ai/coachCommandMetricsSummary.mjs', () => ({
  buildCoachCommandMetricsSummary: mockBuildSummary,
}));

const { default: aiCommandRoutes } = await import('../../routes/aiCommandRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

beforeEach(() => {
  currentRole = 'admin';
  mockBuildSummary.mockReset();
});

describe('GET /api/ai-command/metrics/summary', () => {
  it('returns the aggregated summary for admins, passing the window through', async () => {
    mockBuildSummary.mockResolvedValue({
      windowDays: 30,
      since: '2026-06-17T00:00:00.000Z',
      totals: { attempts: 5, succeeded: 4, failed: 1, confirmationsPending: 0, cancelled: 0, successRate: 0.8 },
      commands: [{ commandType: 'log_workout', attempts: 5, succeeded: 4, failed: 1, confirmationsPending: 0, cancelled: 0, successRate: 0.8, avgDurationMs: 420 }],
    });

    const res = await request(buildApp()).get('/api/ai-command/metrics/summary?days=30');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totals.successRate).toBe(0.8);
    expect(mockBuildSummary).toHaveBeenCalledWith({ days: '30' });
  });

  it('refuses non-admin roles fail-closed', async () => {
    currentRole = 'trainer';
    const res = await request(buildApp()).get('/api/ai-command/metrics/summary');
    expect(res.status).toBe(403);
    expect(mockBuildSummary).not.toHaveBeenCalled();
  });

  it('returns an honest 500 without leaking internals when aggregation fails', async () => {
    mockBuildSummary.mockRejectedValue(new Error('pg exploded with secrets'));
    const res = await request(buildApp()).get('/api/ai-command/metrics/summary');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secrets');
  });
});
