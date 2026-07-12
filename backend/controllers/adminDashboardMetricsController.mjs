import sequelize from '../database.mjs';
import { getAllModels, Op } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const INTERNAL_ERROR = 'Internal server error';
const ALLOWED_TIMEFRAMES = new Set(['7d', '30d', '90d', '1y']);

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: INTERNAL_ERROR,
});

const normalizeTimeframe = (timeframe) => (
  ALLOWED_TIMEFRAMES.has(timeframe) ? timeframe : '30d'
);

const parsePositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseNonNegativeIntegerCount = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!/^(0|[1-9]\d*)$/.test(trimmed)) return 0;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : 0;
};

const getDateRangeFromTimeframe = (timeframe) => {
  const now = new Date();
  const startDate = new Date(now);

  switch (timeframe) {
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
  return {
    startDate,
    endDate: now,
    prevStart: new Date(startDate.getTime() - durationMs),
    prevEnd: new Date(startDate),
  };
};

const calculateChangePercent = (currentValue, previousValue) => {
  if (!previousValue) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = parsePositiveInteger(req.user?.id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userRole = req.user.role;
    const timeframe = normalizeTimeframe(req.query.timeframe);
    const { startDate, endDate, prevStart, prevEnd } = getDateRangeFromTimeframe(timeframe);
    const { Session, User, Order } = getAllModels();
    const baseWhere = userRole === 'trainer' ? { trainerId: userId } : {};

    const [currentSessions, previousSessions, completedSessions, avgRatingRow] = await Promise.all([
      Session.count({ where: { ...baseWhere, sessionDate: { [Op.between]: [startDate, endDate] } } }),
      Session.count({ where: { ...baseWhere, sessionDate: { [Op.between]: [prevStart, prevEnd] } } }),
      Session.count({ where: { ...baseWhere, status: 'completed', sessionDate: { [Op.between]: [startDate, endDate] } } }),
      Session.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        where: { ...baseWhere, rating: { [Op.not]: null } },
        raw: true,
      }),
    ]);

    const sessionCompletion = currentSessions ? (completedSessions / currentSessions) * 100 : 0;
    const growthRate = calculateChangePercent(currentSessions, previousSessions);
    const clientSatisfaction = Number(Number(avgRatingRow?.avgRating || 0).toFixed(1));

    const newClientsTrend = await Session.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('sessionDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('userId'))), 'count'],
      ],
      where: { ...baseWhere, sessionDate: { [Op.gte]: startDate }, userId: { [Op.not]: null } },
      group: [sequelize.fn('DATE', sequelize.col('sessionDate'))],
      order: [[sequelize.fn('DATE', sequelize.col('sessionDate')), 'ASC']],
      raw: true,
    });

    const workoutCompletionsTrend = await Session.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('sessionDate')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { ...baseWhere, status: 'completed', sessionDate: { [Op.gte]: startDate } },
      group: [sequelize.fn('DATE', sequelize.col('sessionDate'))],
      order: [[sequelize.fn('DATE', sequelize.col('sessionDate')), 'ASC']],
      raw: true,
    });

    const metrics = {
      performance: {
        clientRetention: currentSessions ? Math.min(100, sessionCompletion) : 0,
        sessionCompletion: Number(sessionCompletion.toFixed(1)),
        clientSatisfaction,
        growthRate: Number(growthRate.toFixed(1)),
      },
      trends: {
        newClients: newClientsTrend.map((row) => ({ date: row.date, count: Number(row.count || 0) })),
        workoutCompletions: workoutCompletionsTrend.map((row) => ({ date: row.date, count: Number(row.count || 0) })),
      },
    };

    if (userRole === 'admin') {
      const monthlyStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [activeUsers, revenueTotal, prevRevenueTotal, monthlyRevenueTotal] = await Promise.all([
        User.count({ where: { updatedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        Order ? Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.gte]: startDate } } }) : 0,
        // Revenue's OWN prior-period total, so growth reflects money — not session count.
        Order ? Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.between]: [prevStart, prevEnd] } } }) : 0,
        // A real trailing-30-day figure for the "monthly" tile.
        Order ? Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.gte]: monthlyStart } } }) : 0,
      ]);
      metrics.systemHealth = {
        serverUptimeSeconds: Math.round(process.uptime()),
        responseTimeMs: 0,
        errorRate: 0,
        activeUsers,
      };
      // `growth` used to be the SESSION-count growth stamped onto revenue, and `monthly`
      // was a copy of the full-timeframe `total` (a year's revenue under timeframe=1y).
      // Both are now real money figures: growth = this-period vs prior-period REVENUE,
      // monthly = trailing 30 days of completed-order revenue.
      metrics.revenue = {
        total: Number(revenueTotal || 0),
        monthly: Number(monthlyRevenueTotal || 0),
        growth: Number(calculateChangePercent(Number(revenueTotal || 0), Number(prevRevenueTotal || 0)).toFixed(1)),
      };
    }

    return res.status(200).json({
      success: true,
      metrics,
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return sendInternalError(res, 'Failed to fetch dashboard metrics');
  }
};

export const getAdminDashboardStats = async (req, res) => {
  try {
    const [videoResult] = await sequelize.query('SELECT COUNT(*) as count FROM exercise_videos WHERE "deletedAt" IS NULL');
    const [exerciseResult] = await sequelize.query('SELECT COUNT(*) as count FROM exercise_library WHERE "deletedAt" IS NULL');
    let templateCount = 0;

    try {
      const [templateResult] = await sequelize.query('SELECT COUNT(*) as count FROM workout_templates');
      templateCount = parseNonNegativeIntegerCount(templateResult[0]?.count);
    } catch {
      logger.warn('[Admin Dashboard Stats] workout_templates table not found, using count=0');
    }

    return res.status(200).json({
      success: true,
      stats: {
        total_videos: parseNonNegativeIntegerCount(videoResult[0]?.count),
        total_exercises: parseNonNegativeIntegerCount(exerciseResult[0]?.count),
        total_templates: templateCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Admin Dashboard Stats] Error fetching stats', { error: error.message, stack: error.stack });
    return sendInternalError(res, 'Failed to fetch dashboard statistics');
  }
};

export const getAdminDashboardHealth = async (req, res) => {
  try {
    const dbStart = Date.now();
    let dbStatus = 'healthy';

    try {
      await sequelize.authenticate();
    } catch {
      dbStatus = 'unhealthy';
    }

    const memory = process.memoryUsage();
    const uptimePercent = dbStatus === 'healthy' ? 100 : 0;

    return res.status(200).json({
      success: true,
      health: {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        services: {
          database: {
            status: dbStatus,
            responseTimeMs: Date.now() - dbStart,
          },
        },
        performance: {
          uptimePercent,
          uptimePercentBasis: 'current_probe',
          uptimeSeconds: Math.round(process.uptime()),
          memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
          heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        },
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    return sendInternalError(res, 'Failed to fetch system health');
  }
};
