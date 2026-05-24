import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { sequelizeQuery } = vi.hoisted(() => ({
  sequelizeQuery: vi.fn(),
}));

vi.mock('../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', () => ({
  default: {
    query: sequelizeQuery,
  },
}));

vi.mock('../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { default: adminComplianceRoutes } = await import('../routes/adminComplianceRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin', adminComplianceRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, '../routes/adminComplianceRoutes.mjs'), 'utf8');

describe('admin compliance business KPI route truth handling', () => {
  beforeEach(() => {
    sequelizeQuery.mockReset();
  });

  it('derives session utilization from session rows instead of a hardcoded value', async () => {
    sequelizeQuery
      .mockResolvedValueOnce([[{ totalRevenue: 5678, mrr: 1234 }]])
      .mockResolvedValueOnce([[{ activeClients: 10, newClients: 2, churnedClients: 1 }]])
      .mockResolvedValueOnce([[{
        sessionsThisMonth: 6,
        sessionsLastMonth: 4,
        bookedSessionsThisMonth: 8,
      }]]);

    const res = await request(app).get('/api/admin/analytics/business-kpis?period=30d');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mrr: 1234,
      totalRevenue: 5678,
      activeClients: 10,
      sessionsThisMonth: 6,
      sessionsLastMonth: 4,
      sessionUtilization: 75,
    });
    expect(sequelizeQuery.mock.calls[2][0]).toContain('FROM sessions');
  });

  it('falls back to zero utilization when the session query is unavailable', async () => {
    sequelizeQuery
      .mockResolvedValueOnce([[{ totalRevenue: 0, mrr: 0 }]])
      .mockResolvedValueOnce([[{ activeClients: 0, newClients: 0, churnedClients: 0 }]])
      .mockRejectedValueOnce(new Error('sessions unavailable'));

    const res = await request(app).get('/api/admin/analytics/business-kpis');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      sessionsThisMonth: 0,
      sessionsLastMonth: 0,
      sessionUtilization: 0,
    });
  });

  it('does not retain the old hardcoded session utilization placeholder', () => {
    expect(SOURCE).not.toMatch(/sessionUtilization:\s*78/);
  });

  it('keeps revenue business KPIs admin-only even though compliance routes allow trainers', () => {
    expect(SOURCE).toContain("router.use(protect, authorize(['admin', 'trainer']))");
    expect(SOURCE).toContain("router.get('/analytics/business-kpis', validateBusinessKpiPeriod, authorize(['admin'])");
  });

  it('rejects unsupported KPI periods before SQL queries', async () => {
    const res = await request(app).get('/api/admin/analytics/business-kpis?period=1y');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'invalid_period',
      message: 'Invalid business KPI period',
    });
    expect(sequelizeQuery).not.toHaveBeenCalled();
  });

  it('uses the mapped daily_workout_forms columns for compliance recency queries', async () => {
    sequelizeQuery.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/admin/compliance/at-risk');

    expect(res.status).toBe(200);
    expect(sequelizeQuery.mock.calls[0][0]).toContain('dwf.created_at');
    expect(sequelizeQuery.mock.calls[0][0]).toContain('dwf.client_id');
    expect(sequelizeQuery.mock.calls[0][0]).not.toContain('dwf."createdAt"');
    expect(sequelizeQuery.mock.calls[0][0]).not.toContain('dwf."clientId"');
  });
});
