/**
 * Shared types for the canonical admin gamification settings tab.
 */

export interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierThreshold {
  tier: TierName;
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

export interface GamificationSettingsDraft {
  pointValues: PointValue[];
  tierThresholds: TierThreshold[];
  levelSettings: LevelSettings;
  systemSettings: SystemSettings;
}

export interface GamificationSettingsProps extends GamificationSettingsDraft {
  onUpdatePointValues: (pointValues: PointValue[]) => void;
  onUpdateTierThresholds: (tierThresholds: TierThreshold[]) => void;
  onUpdateLevelSettings: (levelSettings: LevelSettings) => void;
  onUpdateSystemSettings: (systemSettings: SystemSettings) => void;
  onSaveSettings: (settings: GamificationSettingsDraft) => void;
  onRestoreDefaults: () => void;
}

export type UpdateLevelSetting = <K extends keyof LevelSettings>(key: K, value: LevelSettings[K]) => void;
export type UpdateSystemSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
export type UpdateTierThreshold = (tier: TierName, value: number) => void;
export type UpdatePointValue = (id: string, value: number) => void;

export const TIER_PUBLIC_LABELS: Record<TierName, string> = {
  bronze: 'Cygnus Initiate',
  silver: 'Frostwing Ascendant',
  gold: 'Gilded Sovereign',
  platinum: 'Amethyst Apex',
};

export const TIER_COLOR_MAP: Record<TierName, string> = {
  bronze: 'var(--gamification-tier-cygnus, #002060)',
  silver: 'var(--gamification-tier-frostwing, #60C0F0)',
  gold: 'var(--gamification-tier-gilded, #C6A84B)',
  platinum: 'var(--gamification-tier-amethyst, #8B5CF6)',
};
