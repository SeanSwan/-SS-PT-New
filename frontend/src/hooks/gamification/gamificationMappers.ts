/**
 * Pure mappers from backend gamification payloads to legacy dashboard DTOs.
 */

import { mapRankTitlePayloadFields } from './gamificationRankTitleMappers';
import {
  type GamificationProfile as NewGamificationProfile,
  type TierName,
  getLevelProgress,
} from '../../types/gamification';
import type {
  Achievement,
  GamificationProfile,
  LegacyTier,
  UserAchievement,
} from './gamificationLegacyTypes';
import { firstNonNegativeNumber, isRecord, safeId, safeText } from './gamificationMapperGuards';

interface UserSnapshot {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageUrl?: string;
}

interface ProfileMapperInput {
  raw: NewGamificationProfile & Record<string, unknown>;
  targetUserId?: string | number;
  user?: UserSnapshot | null;
}

type AchievementWithExtras = Achievement & Partial<{
  rarity: string;
  skillTree: string;
  xpReward: number;
  iconEmoji: string;
}>;

const mapNonNullAchievements = (
  items: unknown[],
  mapper: (item: unknown) => Achievement | null
): Achievement[] => items.map(mapper).filter((achievement): achievement is Achievement => achievement !== null);

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

const clampProgressPercent = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value.trim()) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const getUsableNextLevelTarget = (rawTarget: unknown, points: number): number | null => {
  const parsed = typeof rawTarget === 'number' ? rawTarget : typeof rawTarget === 'string' && /^-?\d+(\.\d+)?$/.test(rawTarget.trim()) ? Number(rawTarget.trim()) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= points) return null;
  return Math.ceil(parsed);
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const hasRealIsoCalendarDate = (text: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return true;
  const [year, month, day] = match.slice(1).map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() + 1 === month && calendarDate.getUTCDate() === day;
};

const getSafeEarnedAt = (value: unknown): string => {
  const text = safeText(value);
  if (!text) return '';
  const parsedDate = new Date(text);
  return Number.isFinite(parsedDate.getTime()) && hasRealIsoCalendarDate(text) ? text : '';
};
export function mapAchievementToLegacy(item: unknown): UserAchievement | null {
  if (!isRecord(item)) return null;

  const nestedAchievement = isRecord(item.achievement) ? item.achievement : null;
  const achievementId = safeId(item.achievementId) ?? safeId(nestedAchievement?.id);
  const id = safeId(item.id) ?? achievementId;
  if (!id || !achievementId) return null;

  const progress = firstNonNegativeNumber(item.progress);
  const maxProgress = firstNonNegativeNumber(item.maxProgress, nestedAchievement?.maxProgress);
  const pointsAwarded = firstNonNegativeNumber(item.pointsAwarded, item.xpAwarded, nestedAchievement?.xpReward);
  const iconEmoji = safeText(nestedAchievement?.iconEmoji);
  const iconUrl = safeText(nestedAchievement?.iconUrl);

  return {
    id,
    achievementId,
    earnedAt: getSafeEarnedAt(item.earnedAt),
    progress,
    isCompleted: item.isCompleted === true,
    pointsAwarded,
    achievement: {
      id: safeId(nestedAchievement?.id) ?? achievementId,
      name: safeText(nestedAchievement?.name) ?? safeText(nestedAchievement?.title) ?? 'Achievement',
      description: safeText(nestedAchievement?.description) ?? '',
      icon: iconEmoji ?? iconUrl ?? 'Trophy',
      pointValue: firstNonNegativeNumber(nestedAchievement?.xpReward, pointsAwarded),
      requirementType: safeText(nestedAchievement?.category) ?? 'milestone',
      requirementValue: firstNonNegativeNumber(nestedAchievement?.requiredPoints, maxProgress),
      tier: 'bronze',
      isActive: true,
      ...(iconUrl ? { badgeImageUrl: iconUrl } : {}),
    },
  };
}

export function mapAchievementTemplateToLegacy(item: unknown): Achievement | null {
  if (!isRecord(item)) return null;

  const nestedAchievement = isRecord(item.achievement) ? item.achievement : null;
  const id = safeId(item.id) ?? safeId(item.achievementId) ?? safeId(nestedAchievement?.id);
  if (!id) return null;

  const iconEmoji = safeText(item.iconEmoji) ?? safeText(nestedAchievement?.iconEmoji);
  const iconUrl = safeText(item.iconUrl) ?? safeText(nestedAchievement?.iconUrl);
  const xpReward = firstNonNegativeNumber(item.xpReward, nestedAchievement?.xpReward, item.pointValue);
  const rarity = safeText(item.rarity) ?? safeText(nestedAchievement?.rarity);
  const skillTree = safeText(item.skillTree) ?? safeText(nestedAchievement?.skillTree);
  const achievement: AchievementWithExtras = {
    id,
    name: safeText(item.name) ?? safeText(item.title) ?? safeText(nestedAchievement?.name) ?? safeText(nestedAchievement?.title) ?? 'Achievement',
    description: safeText(item.description) ?? safeText(nestedAchievement?.description) ?? '',
    icon: iconEmoji ?? iconUrl ?? 'Trophy',
    pointValue: xpReward,
    requirementType: safeText(item.category) ?? skillTree ?? safeText(nestedAchievement?.category) ?? 'milestone',
    requirementValue: firstNonNegativeNumber(item.requiredPoints, nestedAchievement?.requiredPoints),
    tier: 'bronze',
    isActive: item.isActive === false ? false : nestedAchievement?.isActive !== false,
    ...(iconUrl ? { badgeImageUrl: iconUrl } : {}),
    ...(rarity ? { rarity } : {}),
    ...(skillTree ? { skillTree } : {}),
    ...(xpReward > 0 ? { xpReward } : {}),
    ...(iconEmoji ? { iconEmoji } : {}),
  };

  return achievement;
}

export function mapAchievementTemplatesToLegacy(items: unknown[]): Achievement[] {
  return mapNonNullAchievements(items, mapAchievementTemplateToLegacy);
}

export function mapFallbackAchievementToLegacy(item: unknown): Achievement | null {
  if (!isRecord(item)) return null;
  const id = safeId(item.id);
  if (!id) return null;
  const iconUrl = safeText(item.iconUrl);

  return {
    id,
    name: safeText(item.name) ?? 'Achievement',
    description: safeText(item.description) ?? '',
    icon: iconUrl ?? 'Trophy',
    pointValue: 0,
    requirementType: safeText(item.category) ?? 'milestone',
    requirementValue: 0,
    tier: 'bronze',
    isActive: true,
    ...(iconUrl ? { badgeImageUrl: iconUrl } : {}),
  };
}

export function mapFallbackAchievementsToLegacy(items: unknown[]): Achievement[] {
  return mapNonNullAchievements(items, mapFallbackAchievementToLegacy);
}

export function buildLegacyProfile({
  raw,
  targetUserId,
  user,
}: ProfileMapperInput): GamificationProfile {
  const points = firstNonNegativeNumber(raw.points);
  const lifetimePointsEarned = firstNonNegativeNumber(raw.lifetimePointsEarned, points);
  const stats = isRecord(raw.stats) ? raw.stats : null;
  const levelProgress = getLevelProgress(lifetimePointsEarned);
  const legacyTier = mapTierToLegacy(raw.tier || levelProgress.tier);
  const nextTier = getNextLegacyTier(legacyTier);
  const usableNextLevelTarget = getUsableNextLevelTarget(raw.nextLevelPoints, lifetimePointsEarned);
  const nextLevelProgress = usableNextLevelTarget
    ? clampProgressPercent(raw.nextLevelProgress, levelProgress.progressPercent)
    : levelProgress.progressPercent;
  const recentAchievements = asArray<unknown>(raw.recentAchievements);
  const userAchievements = asArray<unknown>(raw.userAchievements);
  const legacyAchievements = (recentAchievements.length ? recentAchievements : userAchievements)
    .map(mapAchievementToLegacy)
    .filter((achievement): achievement is UserAchievement => achievement !== null);
  const profile: GamificationProfile = {
    id: String(raw.userId ?? targetUserId ?? ''),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    photo: user?.profileImageUrl,
    points,
    lifetimePointsEarned,
    level: firstNonNegativeNumber(raw.level) || levelProgress.level,
    tier: legacyTier,
    streakDays: firstNonNegativeNumber(raw.streakDays, stats?.streakDays),
    achievements: legacyAchievements,
    rewards: asArray(raw.rewards),
    milestones: asArray(raw.milestones),
    leaderboardPosition: firstNonNegativeNumber(raw.leaderboardPosition),
    recentTransactions: asArray(raw.recentTransactions),
    nextLevelProgress,
    nextLevelPoints: usableNextLevelTarget ?? levelProgress.nextLevelAt,
    nextTierProgress: clampProgressPercent(raw.nextTierProgress),
    nextTier,
    ...mapRankTitlePayloadFields(raw),
    progressSnapshots: undefined,
    streakCalendar: undefined,
  };

  if (nextTier) {
    const tierTargets: Record<string, number> = {
      silver: 5000,
      gold: 20000,
      platinum: 50000,
    };
    profile.nextTierProgress = clampProgressPercent((lifetimePointsEarned / tierTargets[nextTier]) * 100);
  }

  return profile;
}

export function buildFallbackProfile(
  fallbackUser: unknown,
  targetUserId?: string | number,
  user?: UserSnapshot | null
): GamificationProfile {
  const fallbackRecord = isRecord(fallbackUser) ? fallbackUser : null;
  const points = firstNonNegativeNumber(fallbackRecord?.points);
  const lifetimePointsEarned = firstNonNegativeNumber(fallbackRecord?.lifetimePointsEarned, points);
  const levelProgress = getLevelProgress(lifetimePointsEarned);
  const legacyTier = mapTierToLegacy(levelProgress.tier);
  return {
    id: String(targetUserId || ''),
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    photo: user?.profileImageUrl,
    points,
    lifetimePointsEarned,
    level: firstNonNegativeNumber(fallbackRecord?.level) || levelProgress.level,
    tier: legacyTier,
    streakDays: firstNonNegativeNumber(fallbackRecord?.streakDays),
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
