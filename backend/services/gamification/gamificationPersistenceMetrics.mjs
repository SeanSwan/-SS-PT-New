const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TIMEFRAME_DAYS = 30;
const MAX_TIMEFRAME_DAYS = 365;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function roundMetric(value, digits = 1) {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  const multiplier = 10 ** digits;
  return Math.round(parsed * multiplier) / multiplier;
}

function normalizeTimeframeDays(timeframe) {
  const raw = String(timeframe || `${DEFAULT_TIMEFRAME_DAYS}d`).trim().toLowerCase();
  const aliases = {
    day: 1,
    daily: 1,
    week: 7,
    weekly: 7,
    month: 30,
    monthly: 30,
    quarter: 90,
    quarterly: 90,
    year: 365,
    yearly: 365
  };

  if (Object.hasOwn(aliases, raw)) return aliases[raw];

  const match = raw.match(/^(\d+)\s*d(?:ays?)?$/);
  if (!match) return DEFAULT_TIMEFRAME_DAYS;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TIMEFRAME_DAYS;
  return Math.min(Math.trunc(parsed), MAX_TIMEFRAME_DAYS);
}

function normalizeTimeframeLabel(timeframe) {
  const raw = String(timeframe || `${DEFAULT_TIMEFRAME_DAYS}d`).trim().toLowerCase();
  return raw || `${DEFAULT_TIMEFRAME_DAYS}d`;
}

function cutoffIso(days) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

async function selectOne(sequelize, sql, replacements = {}) {
  const [row] = await sequelize.query(sql, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });
  return row || {};
}

export async function countActiveUsersSince(sequelize, days) {
  const row = await selectOne(
    sequelize,
    `SELECT COUNT(DISTINCT "userId") AS "activeUsers"
     FROM "PointTransactions"
     WHERE "createdAt" >= :cutoff`,
    { cutoff: cutoffIso(days) }
  );
  return toCount(row.activeUsers);
}

export async function getTotalPointsAwardedFromLedger(sequelize) {
  const row = await selectOne(
    sequelize,
    `SELECT COALESCE(SUM("points"), 0) AS "totalPoints"
     FROM "PointTransactions"
     WHERE "points" > 0
       AND "transactionType" IN ('earn', 'bonus', 'adjustment')`
  );
  return toCount(row.totalPoints);
}

export async function getAchievementCompletionRateFromDatabase(sequelize) {
  const row = await selectOne(
    sequelize,
    `SELECT
       COUNT(*) FILTER (WHERE ua."isCompleted" = TRUE) AS "completedAchievements",
       COUNT(*) AS "startedAchievements"
     FROM "UserAchievements" ua
     INNER JOIN "Achievements" a ON a."id" = ua."achievementId"
     WHERE a."isActive" = TRUE
       AND a."isHidden" = FALSE`
  );

  const started = toCount(row.startedAchievements);
  if (started === 0) return null;
  return roundMetric((toCount(row.completedAchievements) / started) * 100);
}

export async function getAverageStreakFromDatabase(sequelize) {
  const row = await selectOne(
    sequelize,
    `SELECT AVG("currentCount") AS "averageStreak"
     FROM "streaks"
     WHERE "isActive" = TRUE
       AND "streakType" = 'workout'`
  );
  return roundMetric(row.averageStreak);
}

export async function getAverageSessionLengthFromDatabase(sequelize, timeframe = '30d') {
  const row = await selectOne(
    sequelize,
    `SELECT AVG("duration") AS "averageSessionLength"
     FROM "workout_sessions"
     WHERE "status" = 'completed'
       AND "duration" > 0
       AND "completedAt" >= :cutoff`,
    { cutoff: cutoffIso(normalizeTimeframeDays(timeframe)) }
  );
  return roundMetric(row.averageSessionLength);
}

export async function getEngagementRateFromDatabase(sequelize) {
  const row = await selectOne(
    sequelize,
    `WITH active AS (
       SELECT COUNT(DISTINCT "userId") AS count
       FROM "PointTransactions"
       WHERE "createdAt" >= :activeCutoff
     ),
     baseline AS (
       SELECT COUNT(DISTINCT "userId") AS count
       FROM "PointTransactions"
       WHERE "createdAt" >= :baselineCutoff
     )
     SELECT CASE
       WHEN baseline.count = 0 THEN NULL
       ELSE active.count::decimal * 100 / baseline.count
     END AS "engagementRate"
     FROM active, baseline`,
    {
      activeCutoff: cutoffIso(7),
      baselineCutoff: cutoffIso(30)
    }
  );
  return roundMetric(row.engagementRate);
}

export async function getPointsPerUserFromDatabase(sequelize, timeframe = '30d') {
  const row = await selectOne(
    sequelize,
    `SELECT CASE
       WHEN COUNT(DISTINCT "userId") = 0 THEN NULL
       ELSE COALESCE(SUM(CASE WHEN "points" > 0 THEN "points" ELSE 0 END), 0)::decimal
         / COUNT(DISTINCT "userId")
     END AS "pointsPerUser"
     FROM "PointTransactions"
     WHERE "createdAt" >= :cutoff`,
    { cutoff: cutoffIso(normalizeTimeframeDays(timeframe)) }
  );
  return roundMetric(row.pointsPerUser);
}

export async function getAchievementsPerUserFromDatabase(sequelize, timeframe = '30d') {
  const row = await selectOne(
    sequelize,
    `SELECT CASE
       WHEN COUNT(DISTINCT "userId") = 0 THEN NULL
       ELSE COUNT(*)::decimal / COUNT(DISTINCT "userId")
     END AS "achievementsPerUser"
     FROM "UserAchievements"
     WHERE "isCompleted" = TRUE
       AND "earnedAt" >= :cutoff`,
    { cutoff: cutoffIso(normalizeTimeframeDays(timeframe)) }
  );
  return roundMetric(row.achievementsPerUser, 2);
}

export async function getEngagementMetricsFromDatabase(sequelize, options = {}) {
  const timeframe = normalizeTimeframeLabel(options.timeframe);
  const [
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    averageSessionTime,
    pointsPerUser,
    achievementsPerUser,
    engagementRate
  ] = await Promise.all([
    countActiveUsersSince(sequelize, 1),
    countActiveUsersSince(sequelize, 7),
    countActiveUsersSince(sequelize, 30),
    getAverageSessionLengthFromDatabase(sequelize, timeframe),
    getPointsPerUserFromDatabase(sequelize, timeframe),
    getAchievementsPerUserFromDatabase(sequelize, timeframe),
    getEngagementRateFromDatabase(sequelize)
  ]);

  return {
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    averageSessionTime,
    pointsPerUser,
    achievementsPerUser,
    engagementRate,
    streakCompletionRate: null,
    dataSource: 'postgres',
    timeframe,
    verificationStatus: 'partial',
    unverifiedMetrics: ['streakCompletionRate']
  };
}
