/**
 * Dashboard command dispatchers
 * =============================
 * Read-only Swan Coach handlers for admin dashboard intelligence. Receipts are
 * compact and never echo names, emails, IPs, or raw visitor identifiers.
 */
import { Op } from 'sequelize';

import defaultSequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { PAGE_VIEW_CACHE, PAGE_VIEW_TTL } from '../../pageViewCache.mjs';

const REVENUE_PERIOD_DAYS = Object.freeze({
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
});

const KPI_PERIOD_DAYS = Object.freeze({
  '30d': 30,
  '90d': 90,
  '12m': 365,
});

const TIME_RANGE_DAYS = Object.freeze({
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const dateRangeWhere = (days, field = 'createdAt') => ({
  [field]: { [Op.gte]: daysAgo(days) },
});

const revenueWhere = (days) => ({
  status: { [Op.in]: ['completed', 'paid'] },
  ...dateRangeWhere(days),
});

const safeCount = async (model, options = {}) => {
  if (!model?.count) return 0;
  return toNumber(await model.count(options));
};

const safeSum = async (model, field, options = {}) => {
  if (!model?.sum) return 0;
  return toNumber(await model.sum(field, options));
};

export const dispatchViewRevenue = async (params = {}) => {
  const { Order } = getAllModels();
  const period = params.period || 'month';
  const days = REVENUE_PERIOD_DAYS[period] || REVENUE_PERIOD_DAYS.month;
  const where = revenueWhere(days);
  const [totalRevenue, transactionCount] = await Promise.all([
    safeSum(Order, 'totalAmount', { where }),
    safeCount(Order, { where }),
  ]);

  return {
    period,
    totalRevenue,
    transactionCount,
    averageTransaction: transactionCount ? Math.round(totalRevenue / transactionCount) : 0,
  };
};

export const dispatchViewBusinessKpis = async (params = {}) => {
  const { User, Order, Session } = getAllModels();
  const period = params.period || '30d';
  const days = KPI_PERIOD_DAYS[period] || KPI_PERIOD_DAYS['30d'];
  const [totalRevenue, activeClients, newClients, sessionsCompleted, sessionsBooked] = await Promise.all([
    safeSum(Order, 'totalAmount', { where: revenueWhere(days) }),
    safeCount(User, { where: { role: 'client', isActive: true } }),
    safeCount(User, { where: { role: 'client', ...dateRangeWhere(days) } }),
    safeCount(Session, { where: { status: 'completed', ...dateRangeWhere(days, 'sessionDate') } }),
    safeCount(Session, {
      where: {
        status: { [Op.in]: ['scheduled', 'confirmed', 'completed', 'cancelled'] },
        ...dateRangeWhere(days, 'sessionDate'),
      },
    }),
  ]);

  return {
    period,
    totalRevenue,
    activeClients,
    newClients,
    sessionsCompleted,
    sessionUtilization: sessionsBooked ? Math.round((sessionsCompleted / sessionsBooked) * 100) : 0,
    averageRevenuePerClient: activeClients ? Math.round(totalRevenue / activeClients) : 0,
  };
};

export const dispatchViewRecentSignups = async (params = {}) => {
  const { User } = getAllModels();
  const hours = Math.min(168, Math.max(1, Number.parseInt(params.hours, 10) || 24));
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.limit, 10) || 50));
  const rows = await User.findAll({
    where: { createdAt: { [Op.gte]: new Date(Date.now() - hours * 60 * 60 * 1000) } },
    attributes: ['id', 'role', 'clientSource', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit,
  });
  const signups = rows.map((row) => (row?.toJSON ? row.toJSON() : row));
  const latest = signups[0] || null;

  return {
    hours,
    limit,
    signupCount: signups.length,
    latestSignupUserId: latest?.id ?? null,
    latestSignupRole: latest?.role ?? null,
    latestSignupDate: toDateOnly(latest?.createdAt),
  };
};

export const dispatchViewSystemHealth = async (_params = {}, ctx = {}) => {
  const sequelize = ctx.options?.sequelize || ctx.sequelize || defaultSequelize;
  const startedAt = Date.now();
  let databaseStatus = 'online';

  try {
    await sequelize.authenticate();
  } catch {
    databaseStatus = 'offline';
  }

  const memory = process.memoryUsage();
  return {
    databaseStatus,
    responseTimeMs: Date.now() - startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
  };
};

export const dispatchViewUserEngagement = async (params = {}) => {
  const { User, Session } = getAllModels();
  const timeRange = params.timeRange || '30d';
  const days = TIME_RANGE_DAYS[timeRange] || TIME_RANGE_DAYS['30d'];
  const [totalUsers, activeUsers, newUsers, completedSessions] = await Promise.all([
    safeCount(User),
    safeCount(User, { where: { isActive: true } }),
    safeCount(User, { where: dateRangeWhere(days) }),
    safeCount(Session, { where: { status: 'completed', ...dateRangeWhere(days, 'sessionDate') } }),
  ]);

  return {
    timeRange,
    totalUsers,
    activeUsers,
    newUsers,
    completedSessions,
    activationRate: totalUsers ? Number(((activeUsers / totalUsers) * 100).toFixed(1)) : 0,
  };
};

export const dispatchViewActiveUserCount = async () => {
  const { User } = getAllModels();
  const [totalUsers, activeUsers, clientCount, trainerCount, adminCount] = await Promise.all([
    safeCount(User),
    safeCount(User, { where: { isActive: true } }),
    safeCount(User, { where: { role: 'client' } }),
    safeCount(User, { where: { role: 'trainer' } }),
    safeCount(User, { where: { role: 'admin' } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: Math.max(0, totalUsers - activeUsers),
    clientCount,
    trainerCount,
    adminCount,
  };
};

export const dispatchViewVisitorIntelligence = async (params = {}) => {
  const source = params.source || 'anonymous';
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;
  const all = [...PAGE_VIEW_CACHE.values()].filter((visitor) => (
    visitor.lastSeen > now - PAGE_VIEW_TTL
  ));
  const pageMap = new Map();
  const countries = new Set();

  for (const visitor of all) {
    countries.add(visitor.geo?.countryCode || 'XX');
    for (const page of visitor.pages || []) {
      pageMap.set(page, (pageMap.get(page) || 0) + 1);
    }
  }

  const [topPage = null, topPageViews = 0] =
    [...pageMap.entries()].sort((a, b) => b[1] - a[1])[0] || [];

  return {
    source,
    activeNow: all.filter((visitor) => visitor.lastSeen > fiveMinAgo).length,
    lastHour: all.filter((visitor) => visitor.lastSeen > oneHourAgo).length,
    last24h: all.length,
    totalPageViews: all.reduce((sum, visitor) => sum + toNumber(visitor.pageCount || 1), 0),
    topPage,
    topPageViews,
    uniqueCountries: [...countries].filter((country) => country !== 'XX').length,
  };
};

export const dispatchScanCommandCenter = async (params = {}, ctx = {}) => {
  const [kpis, users, visitors, health] = await Promise.all([
    dispatchViewBusinessKpis({ period: params.period || '30d' }),
    dispatchViewActiveUserCount(),
    dispatchViewVisitorIntelligence({ source: 'anonymous' }),
    dispatchViewSystemHealth({}, ctx),
  ]);

  return {
    activeClients: kpis.activeClients,
    sessionsCompleted: kpis.sessionsCompleted,
    totalRevenue: kpis.totalRevenue,
    activeUsers: users.activeUsers,
    visitorsLast24h: visitors.last24h,
    databaseStatus: health.databaseStatus,
  };
};
