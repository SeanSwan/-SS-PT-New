import type { LevelSettings, SystemSettings } from './admin-gamification.types';

export const DEFAULT_LEVEL_SETTINGS: LevelSettings = {
  pointsPerLevel: 500,
  levelCap: 100,
  enableLevelCap: false,
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  enableGamification: true,
  enableAchievements: true,
  enableRewards: true,
  enableLeaderboard: true,
  enableLevels: true,
  enableTiers: true,
  enableStreaks: true,
  notifyOnAchievement: true,
  notifyOnLevelUp: true,
  notifyOnReward: true,
  streakExpirationDays: 3,
  pointsExpiration: { enabled: false, expirationDays: 365 },
};
