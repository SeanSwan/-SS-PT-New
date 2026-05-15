/**
 * Gamification legacy DTO contracts
 * =================================
 * Compatibility types for dashboard surfaces that still consume the original
 * gamification hook shape while the backend returns the newer Crystalline
 * gamification profile model.
 *
 * Ownership:
 * - This file owns type contracts only.
 * - Mapping logic belongs in gamificationMappers.ts.
 * - React Query orchestration belongs in useGamificationData.ts.
 */

export type LegacyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: LegacyTier;
  isActive: boolean;
  badgeImageUrl?: string;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  earnedAt: string;
  progress: number;
  isCompleted: boolean;
  pointsAwarded: number;
  achievement: Achievement;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: LegacyTier;
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

export interface UserReward {
  id: string;
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  pointsCost: number;
  fulfillmentDetails?: unknown;
  reward: Reward;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetPoints: number;
  tier: LegacyTier;
  bonusPoints: number;
  icon: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface PointTransaction {
  id: string;
  points: number;
  balance: number;
  transactionType: 'earn' | 'spend' | 'adjustment' | 'bonus' | 'expire';
  source: string;
  description: string;
  createdAt: string;
}

export interface StreakDay {
  date: string;
  completed: boolean;
  points: number;
}

export interface ProgressSnapshot {
  date: string;
  points: number;
  level: number;
  achievements: number;
  tier: LegacyTier;
}

export interface GamificationProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: LegacyTier;
  streakDays: number;
  achievements: UserAchievement[];
  rewards: UserReward[];
  milestones: { id: string; milestoneId: string; milestone: Milestone }[];
  primaryBadge?: Achievement;
  leaderboardPosition: number;
  recentTransactions: PointTransaction[];
  nextMilestone?: Milestone;
  nextLevelProgress: number;
  nextLevelPoints: number;
  nextTierProgress: number;
  nextTier?: Exclude<LegacyTier, 'bronze'>;
  progressSnapshots?: ProgressSnapshot[];
  streakCalendar?: StreakDay[];
}

export interface LeaderboardEntry {
  overallLevel: number;
  userId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
}
