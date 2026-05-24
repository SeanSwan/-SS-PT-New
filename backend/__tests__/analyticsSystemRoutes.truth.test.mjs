import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { dbAuthenticate, userCount } = vi.hoisted(() => ({
  dbAuthenticate: vi.fn(),
  userCount: vi.fn(),
}));

vi.mock('../middleware/auth.mjs', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorizeAdmin: (_req, _res, next) => next(),
}));

vi.mock('../database.mjs', () => ({
  default: {
    authenticate: dbAuthenticate,
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: {
    count: userCount,
  },
}));

const { default: analyticsSystemRoutes } = await import('../routes/admin/analyticsSystemRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/analytics', analyticsSystemRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const servicePath = resolve(__dirname, '../services/adminSystemAnalyticsService.mjs');
const SOURCE = [
  readFileSync(resolve(__dirname, '../routes/admin/analyticsSystemRoutes.mjs'), 'utf8'),
  existsSync(servicePath) ? readFileSync(servicePath, 'utf8') : '',
].join('\n');

describe('admin system analytics truth handling', () => {
  beforeEach(() => {
    dbAuthenticate.mockReset();
    userCount.mockReset();
    dbAuthenticate.mockResolvedValue(undefined);
    userCount.mockResolvedValue(42);
  });

  it('reports database-backed system health without randomized uptime', async () => {
    const res = await request(app).get('/api/admin/analytics/statistics/system-health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      uptime: 100,
      changePercent: 0,
      errorRate: 0,
      throughput: 0,
      systemMetrics: {
        uptime: 100,
        errorRate: 0,
        throughput: 0,
      },
      services: [
        expect.objectContaining({
          name: 'Database',
          status: 'online',
          uptime: 100,
        }),
      ],
    });
    expect(res.body.data.uptimeSeconds).toEqual(expect.any(Number));
    expect(res.body.data.trend).toHaveLength(1);
  });

  it('fails closed when database health cannot be verified', async () => {
    dbAuthenticate.mockRejectedValueOnce(new Error('offline'));

    const res = await request(app).get('/api/admin/analytics/statistics/system-health');

    expect(res.status).toBe(200);
    expect(res.body.data.uptime).toBe(0);
    expect(res.body.data.systemMetrics.uptime).toBe(0);
    expect(res.body.data.services[0]).toMatchObject({
      name: 'Database',
      status: 'offline',
      uptime: 0,
    });
  });

  it('does not retain random demo telemetry in active system analytics endpoints', () => {
    expect(SOURCE).not.toContain('Math.random');
    expect(SOURCE).not.toContain('Premium Fitness');
    expect(SOURCE).not.toContain('Digital Wellness');
    expect(SOURCE).not.toContain('SLA-style value');
  });

  it('does not expose raw system analytics errors to admin clients', () => {
    expect(SOURCE).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(SOURCE).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
  });

  it('returns an explicit insufficient-data executive summary instead of user-derived fake revenue', async () => {
    const res = await request(app).get('/api/admin/analytics/business-intelligence/executive-summary');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      source: 'runtime-and-user-count',
      dataQuality: 'insufficient_financial_data',
      userCount: 42,
      executiveKPIs: {
        totalRevenue: 0,
        annualGrowthRate: 0,
        customerLifetimeValue: 0,
        marketCapture: 0,
        profitMargin: 0,
        brandStrength: 0,
        competitiveAdvantage: 0,
        futureValuation: 0,
      },
      marketPosition: [],
      growthTrajectory: [],
    });
  });
});
