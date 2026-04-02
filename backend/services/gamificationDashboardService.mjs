/**
 * ============================================================================
 * FILE: gamificationDashboardService.mjs
 * PURPOSE: Direct DB queries for gamification dashboard/featured/search
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-02
 * ============================================================================
 *
 * Replaces the anti-pattern of calling controllers with mock res objects.
 * Each method returns plain data objects — no Express req/res coupling.
 */
import { Op } from 'sequelize';
import getModels from '../models/associations.mjs';
import logger from '../utils/logger.mjs';

/**
 * Get dashboard aggregation for a user — stats, progress, challenges
 */
export async function getDashboardData(userId) {
  const models = await getModels();
  const { User, ProgressData, UserAchievement, Achievement, ChallengeParticipant, Challenge, Goal } = models;

  const results = await Promise.allSettled([
    // Stats
    (async () => {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName', 'lastName', 'username', 'points', 'level', 'tier', 'streakDays', 'totalWorkouts', 'createdAt']
      });
      if (!user) return null;

      const [achievementData, challengeData, goalData, rank] = await Promise.allSettled([
        UserAchievement ? UserAchievement.findAndCountAll({
          where: { userId },
          include: Achievement ? [{ model: Achievement, attributes: ['id', 'name', 'tier', 'pointValue'] }] : [],
          limit: 50
        }) : { count: 0, rows: [] },

        ChallengeParticipant ? ChallengeParticipant.findAndCountAll({
          where: { userId },
          include: Challenge ? [{ model: Challenge, attributes: ['id', 'title', 'challengeType', 'category'] }] : [],
          order: [['joinedAt', 'DESC']],
          limit: 5
        }) : { count: 0, rows: [] },

        Goal ? Goal.findAll({
          where: { userId },
          attributes: ['status', [models.sequelize?.fn?.('COUNT', models.sequelize?.col?.('id')) || 'count', 'count']],
          group: ['status'],
          raw: true
        }).catch(() => []) : [],

        User.count({ where: { points: { [Op.gt]: user.points || 0 } } }).catch(() => 0)
      ]);

      return {
        user: user.toJSON(),
        achievements: achievementData.status === 'fulfilled' ? {
          total: achievementData.value?.count || 0,
          recent: (achievementData.value?.rows || []).slice(0, 3).map(a => a.toJSON?.() || a)
        } : { total: 0, recent: [] },
        challenges: challengeData.status === 'fulfilled' ? {
          total: challengeData.value?.count || 0,
          recent: (challengeData.value?.rows || []).slice(0, 5).map(c => c.toJSON?.() || c)
        } : { total: 0, recent: [] },
        goals: goalData.status === 'fulfilled' ? goalData.value : [],
        leaderboardRank: (rank.status === 'fulfilled' ? rank.value : 0) + 1
      };
    })(),

    // Recent progress
    (async () => {
      if (!ProgressData) return [];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return ProgressData.findAll({
        where: { userId, date: { [Op.gte]: weekAgo } },
        order: [['date', 'ASC']],
        limit: 7
      }).then(rows => rows.map(r => r.toJSON?.() || r));
    })(),

    // Active challenges
    (async () => {
      if (!ChallengeParticipant || !Challenge) return [];
      return ChallengeParticipant.findAll({
        where: { userId, status: { [Op.in]: ['joined', 'active'] } },
        include: [{ model: Challenge, attributes: ['id', 'title', 'challengeType', 'goal', 'endDate'] }],
        order: [['joinedAt', 'DESC']],
        limit: 5
      }).then(rows => rows.map(r => r.toJSON?.() || r));
    })()
  ]);

  return {
    stats: results[0].status === 'fulfilled' ? results[0].value : null,
    progress: results[1].status === 'fulfilled' ? results[1].value : [],
    challenges: results[2].status === 'fulfilled' ? results[2].value : []
  };
}

/**
 * Get featured challenges and achievements
 */
export async function getFeaturedData() {
  const models = await getModels();
  const { Achievement, Challenge } = models;

  const [challenges, achievements] = await Promise.allSettled([
    Challenge ? Challenge.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']],
      limit: 6
    }).then(rows => rows.map(r => r.toJSON?.() || r)) : [],

    Achievement ? Achievement.findAll({
      order: [['pointValue', 'DESC']],
      limit: 8
    }).then(rows => rows.map(r => r.toJSON?.() || r)) : []
  ]);

  return {
    challenges: challenges.status === 'fulfilled' ? challenges.value : [],
    achievements: achievements.status === 'fulfilled' ? achievements.value : []
  };
}

/**
 * Search across challenges, achievements, and rewards
 */
export async function searchGamification(query, type = 'all', limit = 20) {
  const models = await getModels();
  const { Achievement, Challenge, Reward } = models;
  const perType = Math.floor(limit / 3);

  const results = { challenges: [], achievements: [], rewards: [] };

  const searchWhere = (fields) => ({
    [Op.or]: fields.map(f => ({ [f]: { [Op.iLike]: `%${query}%` } }))
  });

  const searches = [];

  if ((type === 'all' || type === 'challenges') && Challenge) {
    searches.push(
      Challenge.findAll({ where: searchWhere(['title', 'description']), limit: perType, order: [['title', 'ASC']] })
        .then(rows => { results.challenges = rows.map(r => r.toJSON?.() || r); })
        .catch(() => {})
    );
  }

  if ((type === 'all' || type === 'achievements') && Achievement) {
    searches.push(
      Achievement.findAll({ where: searchWhere(['name', 'description']), limit: perType, order: [['name', 'ASC']] })
        .then(rows => { results.achievements = rows.map(r => r.toJSON?.() || r); })
        .catch(() => {})
    );
  }

  if ((type === 'all' || type === 'rewards') && Reward) {
    searches.push(
      Reward.findAll({ where: searchWhere(['name', 'description']), limit: perType, order: [['name', 'ASC']] })
        .then(rows => { results.rewards = rows.map(r => r.toJSON?.() || r); })
        .catch(() => {})
    );
  }

  await Promise.allSettled(searches);
  return results;
}
