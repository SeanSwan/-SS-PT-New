/**
 * Mapping helpers for the active UserDashboard V3 profile about section.
 */

import { Calendar, Star, Target, Zap } from 'lucide-react';
import type { User } from '../../../context/AuthContext';
import type {
  GamificationProfile,
  ProgressionBeatOption,
  RankTitleOption,
} from '../../../hooks/gamification/gamificationLegacyTypes';
import {
  getRankTitles,
  getTier,
  getTierDisplay,
  type LevelProgress,
  type Rarity,
  type SkillTree,
} from '../../../types/gamification';
import { getUpcomingProgressionBeats } from '../../../types/gamificationProgression';
import type { EarnedAchievementCard, PersonalInfoItem, RankTitleCatalog, SkillTreeStats } from './AboutSection.types';

type UnknownRecord = Record<string, unknown>;

const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const SKILL_TREES: readonly SkillTree[] = [
  'awakening',
  'forge_nasm',
  'iron_gravity',
  'tribe_social',
  'free_spirit',
  'unbroken_streaks',
];

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function safeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstNonNegativeNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function toRarity(value: unknown): Rarity {
  return typeof value === 'string' && RARITIES.includes(value as Rarity)
    ? value as Rarity
    : 'common';
}

function toSkillTree(value: unknown): SkillTree | undefined {
  return typeof value === 'string' && SKILL_TREES.includes(value as SkillTree)
    ? value as SkillTree
    : undefined;
}

function formatJoinDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function buildPersonalInfo(
  user: Pick<User, 'createdAt'> | null | undefined,
  profileData: GamificationProfile | null | undefined,
  levelProgress: LevelProgress | null | undefined,
): PersonalInfoItem[] {
  const level = levelProgress?.level ?? profileData?.level ?? 0;
  const tier = levelProgress?.tierDisplay?.name ?? getTierDisplay(getTier(level || 1)).name;
  const progressionPoints = levelProgress?.currentPoints
    ?? profileData?.lifetimePointsEarned
    ?? profileData?.points
    ?? 0;

  return [
    {
      Icon: Calendar,
      label: 'Joined',
      value: formatJoinDate(user?.createdAt),
      color: 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--swan-lavender, #4070C0))',
    },
    {
      Icon: Zap,
      label: 'Level',
      value: 'Level ' + level + ' - ' + tier,
      color: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6), var(--swan-lavender, #4070C0))',
    },
    {
      Icon: Target,
      label: 'Total XP',
      value: progressionPoints.toLocaleString() + ' points',
      color: 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))',
    },
    {
      Icon: Star,
      label: 'Workout Streak',
      value: (profileData?.streakDays ?? 0) + ' day' + ((profileData?.streakDays ?? 0) !== 1 ? 's' : ''),
      color: 'linear-gradient(135deg, var(--swan-lavender, #4070C0), var(--accent-primary, #60C0F0))',
    },
  ];
}

export function buildAchievementCards(earnedAchievements: unknown): EarnedAchievementCard[] {
  const achievements = Array.isArray(earnedAchievements) ? earnedAchievements : [];
  const seen = new Set<string>();
  const cards: EarnedAchievementCard[] = [];

  for (const value of achievements) {
    if (cards.length >= 12) break;
    const row = asRecord(value);
    if (!row) continue;
    const achievement = asRecord(row.achievement) ?? {};
    const id = safeText(row.id) ?? safeText(row.achievementId);
    if (!id) continue;

    const title = safeText(achievement.name);
    const deduplicationKey = (title ?? id).toLowerCase();
    if (seen.has(deduplicationKey)) continue;
    seen.add(deduplicationKey);

    const skillTree = toSkillTree(achievement.skillTree);
    cards.push({
      id,
      title: title ?? 'Achievement',
      description: safeText(achievement.description) ?? '',
      icon: safeText(achievement.icon) ?? safeText(achievement.iconEmoji) ?? 'Badge',
      rarity: toRarity(achievement.rarity),
      xpReward: firstNonNegativeNumber(row.pointsAwarded, achievement.pointValue),
      ...(skillTree ? { skillTree } : {}),
      category: safeText(achievement.category) ?? 'milestone',
    });
  }

  return cards;
}

export function buildSkillTreeStats(achievementDefs: unknown, earnedAchievements: unknown): SkillTreeStats {
  return {
    total: countSkillTrees(achievementDefs, (achievement) => achievement.skillTree),
    earned: countSkillTrees(earnedAchievements, (userAchievement) => {
      const achievement = asRecord(userAchievement.achievement);
      return achievement?.skillTree ?? achievement?.requirementType;
    }),
  };
}

export function buildRankTitleCatalog(
  profileData: GamificationProfile | null | undefined,
  levelProgress: LevelProgress | null | undefined,
): RankTitleCatalog {
  const level = levelProgress?.level ?? profileData?.level ?? 1;
  const points = levelProgress?.currentPoints
    ?? profileData?.lifetimePointsEarned
    ?? profileData?.points
    ?? 0;
  const selectedKey = profileData?.selectedRankTitleKey;
  const backendTitles = Array.isArray(profileData?.rankTitles) ? profileData.rankTitles : [];
  const fallbackTitles: RankTitleOption[] = getRankTitles().map((rank, index) => {
    const rankNumber = index + 1;
    const earned = level >= rank.minLevel;
    const isCurrent = level >= rank.minLevel && level <= rank.maxLevel;
    return {
      ...rank,
      rankNumber,
      label: 'Rank ' + String(rankNumber).padStart(2, '0') + ' | ' + rank.name,
      earned,
      isCurrent,
      isSelected: selectedKey ? rank.key === selectedKey : isCurrent,
    };
  });
  const rankTitles = backendTitles.length ? backendTitles : fallbackTitles;
  const currentRankTitle = profileData?.currentRankTitleDisplay
    ?? rankTitles.find((rank) => rank.isCurrent)
    ?? fallbackTitles.find((rank) => rank.isCurrent);
  const selectedRankTitle = profileData?.selectedRankTitleDisplay
    ?? rankTitles.find((rank) => rank.isSelected)
    ?? currentRankTitle;
  const nextRankTitle = profileData?.nextRankTitleDisplay !== undefined
    ? profileData.nextRankTitleDisplay
    : rankTitles.find((rank) => !rank.earned) ?? null;
  const earnedRankTitleCount = typeof profileData?.earnedRankTitleCount === 'number'
    ? profileData.earnedRankTitleCount
    : rankTitles.filter((rank) => rank.earned).length;
  const backendProgressionBeats: ProgressionBeatOption[] = Array.isArray(profileData?.upcomingProgressionBeats)
    ? profileData.upcomingProgressionBeats
    : [];
  const upcomingProgressionBeats = backendProgressionBeats.length
    ? backendProgressionBeats
    : getUpcomingProgressionBeats({ level, points, count: 4 });
  const nextMajorProgressionBeat = profileData?.nextMajorProgressionBeat !== undefined
    ? profileData.nextMajorProgressionBeat
    : upcomingProgressionBeats.find((beat) => beat.type !== 'momentum') ?? upcomingProgressionBeats[0] ?? null;

  return {
    rankTitles,
    selectedRankTitle,
    currentRankTitle,
    nextRankTitle,
    earnedRankTitleCount,
    upcomingProgressionBeats,
    nextMajorProgressionBeat,
  };
}

export function getRarityGradient(rarity?: Rarity): string {
  switch (rarity) {
    case 'legendary':
      return 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B))';
    case 'epic':
      return 'linear-gradient(135deg, var(--accent-purple, #8B5CF6), var(--swan-lavender, #4070C0))';
    case 'rare':
      return 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--midnight-sapphire, #002060))';
    default:
      return 'linear-gradient(135deg, var(--swan-lavender, #4070C0), var(--midnight-sapphire, #002060))';
  }
}

export function getRarityFlat(rarity?: Rarity): string {
  switch (rarity) {
    case 'legendary':
      return 'var(--accent-gold, #C6A84B)';
    case 'epic':
      return 'var(--accent-purple, #8B5CF6)';
    case 'rare':
      return 'var(--accent-gold, #C6A84B)';
    default:
      return 'var(--swan-lavender, #4070C0)';
  }
}

function countSkillTrees(
  items: unknown,
  getTree: (item: UnknownRecord) => unknown,
): Record<string, number> {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set<string>();
  const totals: Record<string, number> = {};

  for (const value of list) {
    const item = asRecord(value);
    if (!item) continue;
    const achievement = asRecord(item.achievement);
    const key = safeText(achievement?.name)
      ?? safeText(item.name)
      ?? safeText(item.title)
      ?? safeText(item.id);
    if (!key) continue;

    const deduplicationKey = key.toLowerCase();
    if (seen.has(deduplicationKey)) continue;
    seen.add(deduplicationKey);

    const skillTree = toSkillTree(getTree(item));
    if (skillTree) totals[skillTree] = (totals[skillTree] || 0) + 1;
  }

  return totals;
}
