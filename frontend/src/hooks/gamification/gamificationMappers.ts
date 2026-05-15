/**
 * Gamification API mappers
 * =======================
 * Converts the newer backend gamification payloads into the legacy dashboard
 * contracts exported by useGamificationData.
 *
 * This file intentionally has no React imports. It is pure mapping logic so
 * hook tests can lock data truth without coupling every assertion to React
 * Query orchestration.
 */

import {
  type GamificationProfile as NewGamificationProfile,
  type TierName,
  type UserAchievement as NewUserAchievement,
  getLevelProgress,
} from '../../types/gamification';
import type {
  Achievement,
  GamificationProfile,
  LegacyTier,
  UserAchievement,
} from './gamificationLegacyTypes';

interface UserSnapshot {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageUrl?: string;
}

interface ProfileMapperInput {
  raw: NewGamificationProfile & Record<string, any>;
  targetUserId?: string | number;
  user?: UserSnapshot | null;
}

export function mapTierToLegacy(tier: TierName): LegacyTier {
  switch (tier) {
    case 'bronze_forge':
      return 'bronze';
    case 'silver_edge':
      return 'silver';
    case 'titanium_core':
      return 'gold';
    case 'obsidian_warrior':
    case 'crystalline_swan':
      return 'platinum';
    default:
      return 'bronze';
  }
}

export function getNextLegacyTier(
  currentTier: LegacyTier
): 'silver' | 'gold' | 'platinum' | undefined {
  switch (currentTier) {
    case 'bronze':
      return 'silver';
    case 'silver':
      return 'gold';
    case 'gold':
      return 'platinum';
    default:
      return undefined;
  }
}

export function mapAchievementToLegacy(ua: NewUserAchievement): UserAchievement {
  return {
    id: ua.id,
    achievementId: ua.achievementId,
    earnedAt: ua.earnedAt || new Date().toISOString(),
    progress: ua.progress,
    isCompleted: ua.isCompleted,
    pointsAwarded: ua.pointsAwarded,
    achievement: {
      id: ua.achievement?.id || ua.achievementId,
      name: ua.achievement?.name || ua.achievement?.title || 'Achievement',
      description: ua.achievement?.description || '',
      icon: ua.achievement?.iconEmoji || 'Trophy',
      pointValue: ua.achievement?.xpReward || ua.pointsAwarded,
      requirementType: ua.achievement?.category || 'milestone',
      requirementValue: ua.achievement?.requiredPoints || ua.maxProgress,
      tier: 'bronze',
      isActive: true,
      badgeImageUrl: ua.achievement?.iconUrl,
    },
  };
}

export function mapAchievementTemplateToLegacy(item: any): Achievement {
  if (item.name || item.title || item.iconEmoji) {
    return {
      id: String(item.id),
      name: item.name || item.title || 'Achievement',
      description: item.description || '',
      icon: item.iconEmoji || item.iconUrl || 'Trophy',
      pointValue: item.xpReward || item.pointValue || 0,
      requirementType: item.category || item.skillTree || 'milestone',
      requirementValue: item.requiredPoints || 0,
      tier: 'bronze',
      isActive: item.isActive !== false,
      badgeImageUrl: item.iconUrl,
      ...(item.rarity ? { rarity: item.rarity } : {}),
      ...(item.skillTree ? { skillTree: item.skillTree } : {}),
      ...(item.xpReward ? { xpReward: item.xpReward } : {}),
      ...(item.iconEmoji ? { iconEmoji: item.iconEmoji } : {}),
    } as Achievement;
  }

  return mapAchievementToLegacy(item as NewUserAchievement).achievement;
}

export function mapFallbackAchievementToLegacy(item: any): Achievement {
  return {
    id: String(item.id),
    name: item.name || 'Achievement',
    description: item.description || '',
    icon: item.iconUrl || 'Trophy',
    pointValue: 0,
    requirementType: item.category || 'milestone',
    requirementValue: 0,
    tier: 'bronze',
    isActive: true,
    badgeImageUrl: item.iconUrl,
  };
}

export function buildLegacyProfile({
  raw,
  targetUserId,
  user,
}: ProfileMapperInput): GamificationProfile {
  const levelProgress = getLevelProgress(raw.points);
  const legacyTier = mapTierToLegacy(raw.tier || levelProgress.tier);
  const nextTier = getNextLegacyTier(legacyTier);
  const legacyAchievements = (raw.recentAchievements || raw.userAchievements || []).map(
    mapAchievementToLegacy
  );
  const profile: GamificationProfile = {
    id: String(raw.userId ?? targetUserId ?? ''),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    photo: user?.profileImageUrl,
    points: raw.points,
    level: raw.level ?? levelProgress.level,
    tier: legacyTier,
    streakDays: raw.streakDays ?? raw.stats?.streakDays ?? 0,
    achievements: legacyAchievements,
    rewards: raw.rewards || [],
    milestones: raw.milestones || [],
    leaderboardPosition: raw.leaderboardPosition ?? 0,
    recentTransactions: raw.recentTransactions || [],
    nextLevelProgress: raw.nextLevelProgress ?? levelProgress.progressPercent,
    nextLevelPoints: raw.nextLevelPoints ?? levelProgress.pointsNeededForNext,
    nextTierProgress: raw.nextTierProgress ?? 0,
    nextTier,
    progressSnapshots: undefined,
    streakCalendar: undefined,
  };

  if (nextTier) {
    const tierTargets: Record<string, number> = {
      silver: 5000,
      gold: 20000,
      platinum: 50000,
    };
    profile.nextTierProgress = Math.min(100, (raw.points / tierTargets[nextTier]) * 100);
  }

  return profile;
}

export function buildFallbackProfile(
  fallbackUser: any,
  targetUserId?: string | number,
  user?: UserSnapshot | null
): GamificationProfile {
  const points = fallbackUser?.points || 0;
  const levelProgress = getLevelProgress(points);
  const legacyTier = mapTierToLegacy(levelProgress.tier);
  return {
    id: String(targetUserId || ''),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    photo: user?.profileImageUrl,
    points,
    level: fallbackUser?.level || levelProgress.level,
    tier: legacyTier,
    streakDays: fallbackUser?.streakDays || 0,
    achievements: [],
    rewards: [],
    milestones: [],
    leaderboardPosition: 0,
    recentTransactions: [],
    nextLevelProgress: levelProgress.progressPercent,
    nextLevelPoints: levelProgress.pointsNeededForNext,
    nextTierProgress: 0,
    nextTier: getNextLegacyTier(legacyTier),
  };
}

export function buildEmptyProfile(
  targetUserId?: string | number,
  user?: UserSnapshot | null
): GamificationProfile {
  return {
    ...buildFallbackProfile({ points: 0, level: 0, streakDays: 0 }, targetUserId, user),
    nextLevelProgress: 0,
    nextTier: 'silver',
  };
}
