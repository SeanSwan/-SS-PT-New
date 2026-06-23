import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { userCount, userFindAll, sessionCount, sessionFindAll } = vi.hoisted(() => ({
  userCount: vi.fn(),
  userFindAll: vi.fn(),
  sessionCount: vi.fn(),
  sessionFindAll: vi.fn(),
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
    fn: (name, ...args) => ({ fn: name, args }),
    col: (name) => ({ col: name }),
  },
}));

vi.mock('../models/User.mjs', () => ({
  default: {
    count: userCount,
    findAll: userFindAll,
  },
}));

vi.mock('../models/Session.mjs', () => ({
  default: {
    count: sessionCount,
    findAll: sessionFindAll,
  },
}));

const { default: analyticsUserRoutes } = await import('../routes/admin/analyticsUserRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/admin/analytics', analyticsUserRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = [
  readFileSync(resolve(__dirname, '../routes/admin/analyticsUserRoutes.mjs'), 'utf8'),
  readFileSync(resolve(__dirname, '../services/adminUserAnalyticsService.mjs'), 'utf8'),
].join('\n');

const dateKeyDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

describe('admin user analytics truth handling', () => {
  let activityDate;

  beforeEach(() => {
    activityDate = dateKeyDaysAgo(7);
    userCount.mockReset();
    userFindAll.mockReset();
    sessionCount.mockReset();
    sessionFindAll.mockReset();

    userCount.mockImplementation(({ where } = {}) => {
      if (!where) return Promise.resolve(42);
      if (where.createdAt) return Promise.resolve(5);
      if (where.lastLogin) return Promise.resolve(9);
      if (where.isActive === true) return Promise.resolve(30);
      return Promise.resolve(0);
    });

    userFindAll.mockImplementation(({ attributes }) => {
      const aliases = JSON.stringify(attributes);
      if (aliases.includes('activeUsers')) {
        return Promise.resolve([{ date: activityDate, activeUsers: '4' }]);
      }
      if (aliases.includes('newUsers')) {
        return Promise.resolve([{ date: activityDate, newUsers: '2' }]);
      }
      return Promise.resolve([]);
    });
    sessionFindAll.mockResolvedValue([{ date: activityDate, sessions: '3' }]);
  });

  it('derives overview and history from User and Session rows instead of random activity', async () => {
    const res = await request(app).get('/api/admin/analytics/users');

    expect(res.status).toBe(200);
    expect(res.body.data.overview).toMatchObject({
      totalUsers: 42,
      activeToday: 9,
      newThisWeek: 5,
      retentionRate: 71.4,
      avgSessionDuration: 0,
      bounceRate: 0,
      conversionRate: 0,
      engagementScore: 0,
    });
    expect(res.body.data.userActivity).toContainEqual({
      date: activityDate,
      activeUsers: 4,
      newUsers: 2,
      sessions: 3,
      pageViews: 0,
    });
    expect(res.body.data.liveActivity).toEqual([]);
    expect(res.body.data.deviceBreakdown).toEqual([]);
    expect(res.body.data.topPages).toEqual([]);
    expect(res.body.data.geographicData).toEqual([]);
  });

  it('does not retain random or named demo user activity fixtures', () => {
    expect(SOURCE).not.toContain('Math.random');
    expect(SOURCE).not.toContain('generateLiveActivity');
    expect(SOURCE).not.toMatch(/Sarah M\.|Mike J\.|Purchased Premium Plan|Completed HIIT Workout/);
  });

  it('does not expose raw analytics errors to admin clients', () => {
    expect(SOURCE).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(SOURCE).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
  });

  it('derives session tracking fields for the admin widget from session rows', async () => {
    sessionCount
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    sessionFindAll
      .mockResolvedValueOnce([{ date: '2026-05-20', count: '2' }])
      .mockResolvedValueOnce([{ avgDuration: '55.4' }])
      .mockResolvedValueOnce([{ clientName: 'Live Client', userId: 7, sessions: '3' }]);

    const res = await request(app).get('/api/admin/analytics/statistics/workouts');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      completionRate: 75,
      sessionsToday: 2,
      sessionsThisWeek: 5,
      sessionsThisMonth: 6,
      trainerUtilization: 75,
      avgDuration: 55.4,
      topClients: [{ name: 'Live Client', sessions: 3 }],
    });
  });
});
