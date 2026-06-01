/**
 * Dashboard command dispatcher contracts
 * ======================================
 * Ensures Swan Coach dashboard commands execute real read summaries while
 * returning compact, PII-safe receipts for command-center cards.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher({
  recentUsers = [],
  userCount = 8,
  activeUserCount = 5,
  clientCount = 4,
  trainerCount = 2,
  adminCount = 1,
  orderSum = 750,
  orderCount = 3,
  sessionCount = 6,
} = {}) {
  vi.resetModules();

  const countUsers = vi.fn(async (options = {}) => {
    if (options.where?.role === 'client') return clientCount;
    if (options.where?.role === 'trainer') return trainerCount;
    if (options.where?.role === 'admin') return adminCount;
    if (options.where?.isActive === true) return activeUserCount;
    return userCount;
  });
  const findAllUsers = vi.fn(async () => recentUsers);
  const User = { count: countUsers, findAll: findAllUsers };

  const sumOrders = vi.fn(async () => orderSum);
  const countOrders = vi.fn(async () => orderCount);
  const Order = { sum: sumOrders, count: countOrders };

  const countSessions = vi.fn(async () => sessionCount);
  const Session = { count: countSessions };

  const pageViewCache = new Map([
    ['pv_1', {
      lastSeen: Date.now(),
      pageCount: 3,
      pages: ['/pricing', '/pricing', '/contact'],
      geo: { countryCode: 'US', country: 'United States' },
    }],
    ['pv_2', {
      lastSeen: Date.now() - 70 * 60 * 1000,
      pageCount: 1,
      pages: ['/pricing'],
      geo: { countryCode: 'US', country: 'United States' },
    }],
  ]);

  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({ User, Order, Session }),
  }));
  vi.doMock('../../services/pageViewCache.mjs', () => ({
    PAGE_VIEW_CACHE: pageViewCache,
    PAGE_VIEW_TTL: 24 * 60 * 60 * 1000,
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    countUsers,
    findAllUsers,
    sumOrders,
    countOrders,
    countSessions,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('dashboard command dispatchers', () => {
  it('registers every dashboard command handler', async () => {
    const { hasDispatcher } = await loadDispatcher();

    [
      'scan_command_center',
      'view_revenue',
      'view_business_kpis',
      'view_recent_signups',
      'view_system_health',
      'view_user_engagement',
      'view_active_user_count',
      'view_visitor_intelligence',
    ].forEach((commandType) => {
      expect(hasDispatcher(commandType)).toBe(true);
    });
  });

  it('summarizes revenue and business KPIs from real model reads', async () => {
    const { dispatch, sumOrders, countOrders, countSessions } = await loadDispatcher();

    const revenue = await dispatch('view_revenue', { period: 'month' }, {
      user: { id: 1, role: 'admin' },
    });
    const kpis = await dispatch('view_business_kpis', { period: '30d' }, {
      user: { id: 1, role: 'admin' },
    });

    expect(sumOrders).toHaveBeenCalled();
    expect(countOrders).toHaveBeenCalled();
    expect(countSessions).toHaveBeenCalled();
    expect(revenue).toEqual({
      period: 'month',
      totalRevenue: 750,
      transactionCount: 3,
      averageTransaction: 250,
    });
    expect(kpis).toMatchObject({
      period: '30d',
      totalRevenue: 750,
      activeClients: 4,
      sessionsCompleted: 6,
    });
  });

  it('summarizes recent signups without echoing names or emails', async () => {
    const { dispatch, findAllUsers } = await loadDispatcher({
      recentUsers: [{
        id: 42,
        firstName: 'Private',
        email: 'private@example.com',
        role: 'client',
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
      }],
    });

    const result = await dispatch('view_recent_signups', { hours: 12, limit: 25 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findAllUsers).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'role', 'clientSource', 'createdAt'],
      limit: 25,
      order: [['createdAt', 'DESC']],
    }));
    expect(result).toEqual({
      hours: 12,
      limit: 25,
      signupCount: 1,
      latestSignupUserId: 42,
      latestSignupRole: 'client',
      latestSignupDate: '2026-05-01',
    });
    expect(JSON.stringify(result)).not.toContain('Private');
    expect(JSON.stringify(result)).not.toContain('private@example.com');
  });

  it('summarizes system, engagement, active users, and visitors without visitor identifiers', async () => {
    const { dispatch } = await loadDispatcher();
    const sequelize = { authenticate: vi.fn(async () => undefined) };
    const ctx = { user: { id: 1, role: 'admin' }, options: { sequelize } };

    const health = await dispatch('view_system_health', {}, ctx);
    const engagement = await dispatch('view_user_engagement', { timeRange: '7d' }, ctx);
    const users = await dispatch('view_active_user_count', {}, ctx);
    const visitors = await dispatch('view_visitor_intelligence', { source: 'anonymous' }, ctx);

    expect(health).toMatchObject({ databaseStatus: 'online' });
    expect(engagement).toMatchObject({ timeRange: '7d', totalUsers: 8, activeUsers: 5 });
    expect(users).toMatchObject({
      totalUsers: 8,
      activeUsers: 5,
      clientCount: 4,
      trainerCount: 2,
      adminCount: 1,
    });
    expect(visitors).toEqual({
      source: 'anonymous',
      activeNow: 1,
      lastHour: 1,
      last24h: 2,
      totalPageViews: 4,
      topPage: '/pricing',
      topPageViews: 3,
      uniqueCountries: 1,
    });
    expect(JSON.stringify(visitors)).not.toContain('pv_1');
  });
});
