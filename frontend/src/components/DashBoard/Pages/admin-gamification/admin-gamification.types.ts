/**
 * Shared contracts for the canonical admin gamification surface.
 */

export type GamificationTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: GamificationTier;
  isActive: boolean;
  badgeImageUrl?: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: GamificationTier;
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

export interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

export interface TierThreshold {
  tier: GamificationTier;
  pointsRequired: number;
  levelRequired?: number;
}

export interface LevelSettings {
  pointsPerLevel: number;
  levelCap: number;
  enableLevelCap: boolean;
}

export interface SystemSettings {
  enableGamification: boolean;
  enableAchievements: boolean;
  enableRewards: boolean;
  enableLeaderboard: boolean;
  enableLevels: boolean;
  enableTiers: boolean;
  enableStreaks: boolean;
  notifyOnAchievement: boolean;
  notifyOnLevelUp: boolean;
  notifyOnReward: boolean;
  streakExpirationDays: number;
  pointsExpiration: {
    enabled: boolean;
    expirationDays: number;
  };
}

export interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: GamificationTier;
  achievements: number;
  streakDays: number;
}

export interface GamificationSettingsDraft {
  pointValues: PointValue[];
  tierThresholds: TierThreshold[];
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
}

export type GamificationAnalyticsData = any;
