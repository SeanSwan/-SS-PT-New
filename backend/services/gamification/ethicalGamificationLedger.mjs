import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const VALID_POINT_SOURCES = new Set([
  'workout_completion',
  'exercise_completion',
  'streak_bonus',
  'level_up',
  'achievement_earned',
  'milestone_reached',
  'reward_redemption',
  'package_purchase',
  'friend_referral',
  'social_engagement',
  'goal_milestone',
  'goal_completed',
  'admin_adjustment',
  'trainer_award',
  'challenge_completion'
]);

const LEGACY_POINT_SOURCE_MAP = {
  workout_completed: 'workout_completion',
  workout_completion: 'workout_completion',
  check_in_logged: 'social_engagement',
  social_interaction: 'social_engagement',
  daily_login: 'social_engagement',
  social_post: 'social_engagement',
  profile_updated: 'social_engagement',
  helped_community: 'social_engagement'
};

export const toPointLedgerFilter = (action) => {
  const legacyReason = String(action || '');
  const source = VALID_POINT_SOURCES.has(legacyReason)
    ? legacyReason
    : LEGACY_POINT_SOURCE_MAP[legacyReason] || 'social_engagement';
  const needsLegacyReason = source !== legacyReason || !VALID_POINT_SOURCES.has(legacyReason);
  return {
    source,
    legacyReason: needsLegacyReason ? legacyReason : null
  };
};

const legacyReasonSql = ({ legacyReason }) =>
  legacyReason ? ' AND "metadata"->>\'legacyReason\' = :legacyReason' : '';

const withLedgerFilterReplacements = (base, filter) => ({
  ...base,
  action: filter.source,
  ...(filter.legacyReason ? { legacyReason: filter.legacyReason } : {})
});

const getDatabase = async () => (await import('../../database.mjs')).default;

export async function getRecentActions(userId, minutes = 5) {
  try {
    const sequelize = await getDatabase();
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const rows = await sequelize.query(
      'SELECT * FROM "PointTransactions" WHERE "userId" = :userId AND "createdAt" >= :cutoff ORDER BY "createdAt" DESC',
      { replacements: { userId, cutoff: cutoff.toISOString() }, type: sequelize.QueryTypes.SELECT }
    );
    return Array.isArray(rows) ? rows : [rows].filter(Boolean);
  } catch (error) {
    piiSafeLogger.error('Failed to get recent actions', { error: error.message, userId, minutes });
    return [];
  }
}

export async function getDailyActionCount(userId, action) {
  try {
    const sequelize = await getDatabase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const filter = toPointLedgerFilter(action);
    const [result] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM "PointTransactions" WHERE "userId" = :userId AND "source" = :action AND "createdAt" >= :startOfToday${legacyReasonSql(filter)}`,
      {
        replacements: withLedgerFilterReplacements({
          userId,
          startOfToday: startOfToday.toISOString()
        }, filter),
        type: sequelize.QueryTypes.SELECT
      }
    );
    return parseInt(result?.cnt) || 0;
  } catch (error) {
    piiSafeLogger.error('Failed to get daily action count', { error: error.message, userId, action });
    return 0;
  }
}

export async function getCurrentSessionLength(userId) {
  try {
    const sequelize = await getDatabase();
    const filter = toPointLedgerFilter('daily_login');
    const [result] = await sequelize.query(
      `SELECT "createdAt" FROM "PointTransactions" WHERE "userId" = :userId AND "source" = :action${legacyReasonSql(filter)} ORDER BY "createdAt" DESC LIMIT 1`,
      { replacements: withLedgerFilterReplacements({ userId }, filter), type: sequelize.QueryTypes.SELECT }
    );
    return result?.createdAt
      ? Math.floor((Date.now() - new Date(result.createdAt).getTime()) / 60000)
      : 0;
  } catch (error) {
    piiSafeLogger.error('Failed to get session length', { error: error.message, userId });
    return 0;
  }
}

export async function getDailyLoginCount(userId) {
  try {
    const sequelize = await getDatabase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const filter = toPointLedgerFilter('daily_login');
    const [result] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM "PointTransactions" WHERE "userId" = :userId AND "source" = :action AND "createdAt" >= :startOfToday${legacyReasonSql(filter)}`,
      {
        replacements: withLedgerFilterReplacements({
          userId,
          startOfToday: startOfToday.toISOString()
        }, filter),
        type: sequelize.QueryTypes.SELECT
      }
    );
    return parseInt(result?.cnt) || 0;
  } catch (error) {
    piiSafeLogger.error('Failed to get daily login count', { error: error.message, userId });
    return 0;
  }
}
