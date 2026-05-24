import { Op } from 'sequelize';

import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import Session from '../models/Session.mjs';

const toDateKey = (value) => {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string' && value.trim()) return value.slice(0, 10);
  return null;
};

const indexRowsByDate = (rows, valueKey) => {
  const map = new Map();
  for (const row of rows || []) {
    const date = toDateKey(row.date);
    if (date) map.set(date, Number(row[valueKey] || 0));
  }
  return map;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDateRangeFromTimeRange = (timeRange) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeRange) {
    case '24h':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const durationMs = now.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate);
  const prevStart = new Date(startDate.getTime() - durationMs);

  return { startDate, endDate: now, prevStart, prevEnd };
};

const calculateChangePercent = (currentValue, previousValue) => {
  if (!previousValue) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const dailyCountRows = (model, dateField, alias, startDate, endDate, extraWhere = {}) => (
  model.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col(dateField)), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), alias],
    ],
    where: {
      ...extraWhere,
      [dateField]: { [Op.between]: [startDate, endDate] },
    },
    group: [sequelize.fn('DATE', sequelize.col(dateField))],
    order: [[sequelize.fn('DATE', sequelize.col(dateField)), 'ASC']],
    raw: true,
  })
);

const buildDailyUserActivity = (startDate, activeRows, newRows, sessionRows) => {
  const activeByDate = indexRowsByDate(activeRows, 'activeUsers');
  const newByDate = indexRowsByDate(newRows, 'newUsers');
  const sessionsByDate = indexRowsByDate(sessionRows, 'sessions');

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      activeUsers: activeByDate.get(dateKey) || 0,
      newUsers: newByDate.get(dateKey) || 0,
      sessions: sessionsByDate.get(dateKey) || 0,
      pageViews: 0,
    };
  });
};

export async function generateWorkoutStatistics() {
  const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeRange('30d');
  const todayStart = startOfDay(endDate);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    completedCurrent,
    totalCurrent,
    completedPrev,
    totalPrev,
    sessionsToday,
    sessionsThisWeek,
  ] = await Promise.all([
    Session.count({
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
      },
    }),
    Session.count({
      where: {
        sessionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
      },
    }),
    Session.count({
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: prevStart, [Op.lte]: prevEnd },
      },
    }),
    Session.count({
      where: {
        sessionDate: { [Op.gte]: prevStart, [Op.lte]: prevEnd },
      },
    }),
    Session.count({
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: todayStart, [Op.lte]: endDate },
      },
    }),
    Session.count({
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: weekStart, [Op.lte]: endDate },
      },
    }),
  ]);

  const completionRate = totalCurrent ? (completedCurrent / totalCurrent) * 100 : 0;
  const prevRate = totalPrev ? (completedPrev / totalPrev) * 100 : 0;
  const changePercent = calculateChangePercent(completionRate, prevRate);

  const [trendRows, avgDurationRows, topClientRows] = await Promise.all([
    dailyCountRows(Session, 'sessionDate', 'count', startDate, endDate, { status: 'completed' }),
    Session.findAll({
      attributes: [[sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']],
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
      },
      raw: true,
    }),
    Session.findAll({
      attributes: [
        'userId',
        'clientName',
        [sequelize.fn('COUNT', sequelize.col('id')), 'sessions'],
      ],
      where: {
        status: 'completed',
        sessionDate: { [Op.gte]: startDate, [Op.lte]: endDate },
      },
      group: ['userId', 'clientName'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const topClients = topClientRows
    .map((row) => {
      const clientName = typeof row.clientName === 'string' ? row.clientName.trim() : '';
      const sessions = Number(row.sessions || 0);
      return {
        name: clientName || (row.userId ? `Client #${row.userId}` : 'Unlinked client'),
        sessions,
      };
    })
    .filter((client) => client.sessions > 0);

  const avgDuration = Number(avgDurationRows[0]?.avgDuration || 0);

  return {
    completionRate: Number(completionRate.toFixed(1)),
    changePercent: Number(changePercent.toFixed(1)),
    trend: trendRows.map((row) => Number(row.count || 0)),
    target: 90,
    sessionsToday,
    sessionsThisWeek,
    sessionsThisMonth: completedCurrent,
    trainerUtilization: Number(completionRate.toFixed(1)),
    avgDuration: Number(avgDuration.toFixed(1)),
    topClients,
  };
}

export async function generateUserAnalytics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const activityStart = new Date(todayStart);
  activityStart.setDate(activityStart.getDate() - 29);

  const [
    totalUsers,
    newUsersThisWeek,
    activeToday,
    activeAccounts,
    activeRows,
    newRows,
    sessionRows,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { createdAt: { [Op.gte]: weekStart } } }),
    User.count({ where: { lastLogin: { [Op.gte]: todayStart } } }),
    User.count({ where: { isActive: true } }),
    dailyCountRows(User, 'lastLogin', 'activeUsers', activityStart, now),
    dailyCountRows(User, 'createdAt', 'newUsers', activityStart, now),
    dailyCountRows(Session, 'sessionDate', 'sessions', activityStart, now, { status: 'completed' }),
  ]);

  const retentionRate = totalUsers
    ? Number(((activeAccounts / totalUsers) * 100).toFixed(1))
    : 0;

  return {
    overview: {
      totalUsers,
      activeToday,
      newThisWeek: newUsersThisWeek,
      avgSessionDuration: 0,
      bounceRate: 0,
      conversionRate: 0,
      retentionRate,
      engagementScore: 0,
    },
    changes: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      sessionDuration: 0,
      bounceRate: 0,
      conversion: 0,
    },
    deviceBreakdown: [],
    topPages: [],
    userActivity: buildDailyUserActivity(activityStart, activeRows, newRows, sessionRows),
    liveActivity: [],
    geographicData: [],
  };
}
