/**
 * Shared contracts for the active admin gamification analytics tab.
 */

export type AnalyticsTab = 'overview' | 'users' | 'achievements' | 'rewards' | 'tiers' | 'trends';

export type AnalyticsTimeRange = 'week' | 'month' | 'quarter' | 'year';

export type AnalyticsTrend = 'up' | 'down' | 'neutral';

export interface AnalyticsItemSummary {
  name?: string;
  description?: string;
  count?: number;
}

export interface UserEngagementAnalytics {
  totalUsers?: number;
  activeUsers?: number;
  engagementRate?: number;
  averagePointsPerUser?: number;
  averageLevelPerUser?: number;
}

export interface AchievementAnalytics {
  totalAchievementsEarned?: number;
  achievementCompletionRate?: number;
  mostPopularAchievement?: AnalyticsItemSummary | null;
  leastPopularAchievement?: AnalyticsItemSummary | null;
}

export interface RewardAnalytics {
  totalRewardsRedeemed?: number;
  totalPointsSpent?: number;
  mostRedeemedReward?: AnalyticsItemSummary | null;
  leastRedeemedReward?: AnalyticsItemSummary | null;
}

export interface TierAnalytics {
  tier: string;
  count?: number;
  percentage?: number;
}

export interface TimeSeriesAnalytics {
  date: string;
  newUsers?: number;
  achievementsEarned?: number;
  pointsEarned?: number;
  pointsSpent?: number;
}

export interface SystemAnalyticsData {
  userEngagement?: UserEngagementAnalytics;
  achievementStats?: AchievementAnalytics;
  rewardStats?: RewardAnalytics;
  tierDistribution?: TierAnalytics[];
  timeSeriesData?: TimeSeriesAnalytics[];
}
