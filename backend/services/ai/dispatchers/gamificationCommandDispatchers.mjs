/**
 * Gamification command dispatchers
 * ================================
 * Coach command handlers for compact leaderboard, XP/streak, and achievement
 * award receipts. Do not echo names, badge titles, or free-form text.
 */
import { getAllModels } from '../../../models/index.mjs';
import GamificationPointsService from '../../gamification/GamificationPointsService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';
import { isNewAchievement } from './achievementRecency.mjs';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asPlain = (row) => (row?.toJSON ? row.toJSON() : row);
const resolveClientId = resolveCommandClientId;

const withRequiredTransaction = async (ctx, callback) => {
  const sequelize = ctx.options?.sequelize || ctx.sequelize;
  if (!sequelize?.transaction) {
    const error = new Error('Database transaction unavailable for gamification award.');
    error.statusCode = 503;
    throw error;
  }
  const transaction = await sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const dispatchViewLeaderboard = async (params = {}) => {
  const { User } = getAllModels();
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.limit, 10) || 10));
  const where = {};
  if (params.tier) where.tier = String(params.tier);

  const [leaderboard, totalUsers] = await Promise.all([
    User.findAll({
      attributes: ['id', 'points', 'level', 'tier'],
      where,
      order: [['points', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    }),
    User.count({ where }),
  ]);
  const rows = leaderboard.map(asPlain);
  const top = rows[0] || null;

  return {
    totalUsers,
    returnedCount: rows.length,
    topUserId: top?.id ?? null,
    topPoints: toNumber(top?.points),
    page,
    limit,
    tier: params.tier || null,
  };
};

export const dispatchViewXpStreaks = async (params, ctx) => {
  const { User, Streak, UserAchievement } = getAllModels();
  const clientId = resolveClientId(params, ctx);
  const [user, streaks, userAchievements] = await Promise.all([
    User.findByPk(clientId, {
      attributes: ['id', 'points', 'level', 'tier', 'streakDays', 'totalWorkouts', 'totalExercises'],
    }),
    Streak.findAll({
      where: { userId: clientId, isActive: true },
      order: [['currentCount', 'DESC']],
    }),
    UserAchievement.findAll({
      where: { userId: clientId },
      order: [['earnedAt', 'DESC']],
      limit: 100,
    }),
  ]);

  if (!user) return { clientId, found: false };

  const data = asPlain(user);
  const streakRows = streaks.map(asPlain);
  const achievementRows = userAchievements.map(asPlain);

  return {
    clientId,
    found: true,
    points: toNumber(data.points),
    level: toNumber(data.level),
    tier: data.tier ?? null,
    streakDays: toNumber(data.streakDays),
    totalWorkouts: toNumber(data.totalWorkouts),
    totalExercises: toNumber(data.totalExercises),
    activeStreaks: streakRows.length,
    longestStreak: streakRows.reduce((max, streak) => Math.max(max, toNumber(streak.longestCount)), 0),
    completedAchievements: achievementRows.filter((achievement) => achievement.isCompleted).length,
    // "New" = completed AND earned inside the recency window. Two earlier versions were both
    // wrong VALUES rather than errors, which is why neither surfaced: `achievement.isNew` (no such
    // column → undefined → always 0), then `!notificationSent` (nothing ever sets that flag →
    // always ALL completed). Definition now lives in achievementRecency.mjs so this and
    // `my_streaks_badges` cannot drift apart again.
    newAchievements: achievementRows.filter((achievement) => isNewAchievement(achievement)).length,
  };
};

export const dispatchAwardBadge = async (params, ctx) => withRequiredTransaction(ctx, async (transaction) => {
  const { User, Achievement, UserAchievement } = getAllModels();
  const clientId = resolveClientId(params, ctx);
  const achievementId = String(params.achievementId);
  const options = transaction ? { transaction } : {};
  const [user, achievement] = await Promise.all([
    User.findByPk(clientId, options),
    Achievement.findByPk(achievementId, options),
  ]);

  if (!user || !achievement) {
    return { clientId, achievementId, found: false, awarded: false, alreadyAwarded: false };
  }

  const existingAchievement = await UserAchievement.findOne({
    where: { userId: clientId, achievementId },
    ...options,
  });

  if (existingAchievement?.isCompleted) {
    return {
      clientId,
      achievementId,
      found: true,
      awarded: false,
      alreadyAwarded: true,
      pointsAwarded: 0,
      newBalance: toNumber(user.points),
      newLevel: toNumber(user.level),
      newTier: user.tier ?? null,
    };
  }

  const pointsAwarded = toNumber(achievement.xpReward);
  const earnedAt = new Date();
  // Only real UserAchievements columns (rule 58, verified 2026-07-29) — the previously included
  // progressPercentage/unlockedAt do not exist in the table.
  const achievementFields = {
    userId: clientId,
    achievementId,
    isCompleted: true,
    progress: 100,
    earnedAt,
    pointsAwarded,
  };

  if (existingAchievement) {
    await existingAchievement.update(achievementFields, options);
  } else {
    await UserAchievement.create(achievementFields, options);
  }

  let ledgerResult = {
    pointsAwarded: 0,
    newBalance: toNumber(user.points),
    newLevel: toNumber(user.level),
    newTier: user.tier ?? null,
  };
  if (pointsAwarded > 0) {
    ledgerResult = await GamificationPointsService.recordLedgerEntry({
      userId: clientId,
      points: pointsAwarded,
      transactionType: 'earn',
      source: 'achievement_earned',
      sourceId: null,
      description: 'Achievement earned',
      metadata: { achievementId },
      awardedBy: ctx.user?.id ?? null,
      idempotencyKey: `ai-achievement:${clientId}:${achievementId}`,
      maxPoints: Number.MAX_SAFE_INTEGER,
    }, transaction);
  }
  const finalPointsAwarded = toNumber(ledgerResult.pointsAwarded);
  const newBalance = toNumber(ledgerResult.newBalance ?? user.points);
  const newLevel = toNumber(ledgerResult.newLevel ?? user.level);
  const newTier = ledgerResult.newTier ?? user.tier ?? null;

  return {
    clientId,
    achievementId,
    found: true,
    awarded: true,
    alreadyAwarded: false,
    pointsAwarded: finalPointsAwarded,
    newBalance,
    newLevel,
    newTier,
  };
});
