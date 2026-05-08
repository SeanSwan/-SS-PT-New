/**
 * API response mappers for the admin gamification shell.
 */

import type {
  Achievement,
  GamificationAnalyticsData,
  GamificationTier,
  LeaderboardEntry,
  Reward,
  TierThreshold,
} from './admin-gamification.types';

export const readApiArray = (payload: any, key: string): any[] => {
  const value = payload?.[key] ?? payload ?? [];
  return Array.isArray(value) ? value : [];
};

export const mapAchievement = (achievement: any): Achievement => ({
  id: String(achievement.id),
  name: achievement.title || achievement.name || '',
  description: achievement.description || '',
  icon: achievement.iconEmoji || achievement.icon || 'Award',
  pointValue: achievement.xpReward || achievement.pointValue || achievement.points || 0,
  requirementType: achievement.requirementType || achievement.requirement_type || achievement.progressUnit || '',
  requirementValue: achievement.requirementValue || achievement.requirement_value || achievement.maxProgress || 0,
  tier: achievement.tier || 'bronze',
  isActive: achievement.isActive !== undefined ? achievement.isActive : true,
  badgeImageUrl: achievement.badgeImageUrl || achievement.badge_image_url,
});

export const mapReward = (reward: any): Reward => ({
  id: String(reward.id),
  name: reward.name || '',
  description: reward.description || '',
  icon: reward.icon || 'Gift',
  pointCost: reward.pointCost || reward.point_cost || 0,
  tier: reward.tier || 'bronze',
  stock: reward.stock ?? reward.quantity ?? 0,
  isActive: reward.isActive !== undefined ? reward.isActive : true,
  redemptionCount: reward.redemptionCount || reward.redemption_count || 0,
  imageUrl: reward.imageUrl,
  expiresAt: reward.expiresAt,
});

export const mapLeaderboardEntry = (user: any): LeaderboardEntry => ({
  id: String(user.id || user.userId),
  firstName: user.firstName || user.first_name || '',
  lastName: user.lastName || user.last_name || '',
  username: user.username || '',
  points: user.points || user.totalPoints || 0,
  level: user.level || 0,
  tier: user.tier || 'bronze',
  achievements: user.achievements || user.achievementCount || 0,
  streakDays: user.streakDays || user.streak_days || 0,
});

export const mapTierThresholds = (value: unknown): TierThreshold[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).map(([tier, points]) => ({
    tier: tier as GamificationTier,
    pointsRequired: typeof points === 'number' ? points : 0,
  }));
};

export const buildAnalyticsData = (
  leaderboardPayload: any,
  achievementsPayload: any,
  rewardsPayload: any,
): GamificationAnalyticsData => {
  const users = readApiArray(leaderboardPayload, 'leaderboard');
  const achievements = readApiArray(achievementsPayload, 'achievements');
  const rewards = readApiArray(rewardsPayload, 'rewards');
  const totalUsers = users.length;
  const activeUsers = users.filter(user => (user.points || 0) > 0).length;
  const totalPoints = users.reduce((sum, user) => sum + (user.points || user.totalPoints || 0), 0);
  const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;
  const avgLevel = totalUsers > 0
    ? Math.round(users.reduce((sum, user) => sum + (user.level || 0), 0) / totalUsers)
    : 0;

  return {
    userEngagement: {
      totalUsers,
      activeUsers,
      engagementRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      averagePointsPerUser: avgPoints,
      averageLevelPerUser: avgLevel,
    },
    achievementStats: {
      totalAchievementsEarned: achievements.length,
      achievementCompletionRate: 0,
      mostPopularAchievement: achievements[0] || null,
      leastPopularAchievement: achievements[achievements.length - 1] || null,
    },
    rewardStats: {
      totalRewardsRedeemed: rewards.reduce((sum, reward) => sum + (reward.redemptionCount || 0), 0),
      totalPointsSpent: 0,
      mostRedeemedReward: rewards[0] || null,
      leastRedeemedReward: rewards[rewards.length - 1] || null,
    },
    tierDistribution: ['bronze', 'silver', 'gold', 'platinum'].map(tier => {
      const count = users.filter(user => (user.tier || 'bronze') === tier).length;
      return { tier, count, percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0 };
    }),
    timeSeriesData: [],
  };
};
