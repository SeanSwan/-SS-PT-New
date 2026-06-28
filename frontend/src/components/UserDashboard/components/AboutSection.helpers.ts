/**
 * Mapping helpers for the active UserDashboard V3 profile about section.
 */

import { Calendar, Star, Target, Zap } from 'lucide-react';
import { getTier, getTierDisplay, type Rarity, type SkillTree } from '../../../types/gamification';
import type { EarnedAchievementCard, PersonalInfoItem, SkillTreeStats } from './AboutSection.types';

export function formatJoinDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function buildPersonalInfo(user: any, profileData: any, levelProgress: any): PersonalInfoItem[] {
  const level = levelProgress?.level ?? profileData?.level ?? 0;
  const tier = levelProgress?.tierDisplay?.name ?? getTierDisplay(getTier(level || 1)).name;

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
      value: `Level ${level} - ${tier}`,
      color: 'linear-gradient(135deg, var(--accent-purple, #8B5CF6), var(--swan-lavender, #4070C0))',
    },
    {
      Icon: Target,
      label: 'Total XP',
      value: `${(levelProgress?.currentPoints ?? profileData?.points ?? 0).toLocaleString()} points`,
      color: 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-primary, #60C0F0))',
    },
    {
      Icon: Star,
      label: 'Workout Streak',
      value: `${profileData?.streakDays ?? 0} day${(profileData?.streakDays ?? 0) !== 1 ? 's' : ''}`,
      color: 'linear-gradient(135deg, var(--swan-lavender, #4070C0), var(--accent-primary, #60C0F0))',
    },
  ];
}

export function buildAchievementCards(earnedAchievements: unknown): EarnedAchievementCard[] {
  const achievements = Array.isArray(earnedAchievements) ? earnedAchievements : [];
  const seen = new Set<string>();

  return achievements
    .filter((userAchievement: any) => {
      const key = String(userAchievement.achievement?.name || userAchievement.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((userAchievement: any) => ({
      id: String(userAchievement.id),
      title: userAchievement.achievement?.name || 'Achievement',
      description: userAchievement.achievement?.description || '',
      icon: userAchievement.achievement?.icon || userAchievement.achievement?.iconEmoji || 'Badge',
      rarity: (userAchievement.achievement?.rarity || 'common') as Rarity,
      xpReward: userAchievement.pointsAwarded || userAchievement.achievement?.pointValue || 0,
      skillTree: userAchievement.achievement?.skillTree as SkillTree | undefined,
      category: userAchievement.achievement?.category || 'milestone',
    }));
}

export function buildSkillTreeStats(achievementDefs: unknown, earnedAchievements: unknown): SkillTreeStats {
  return {
    total: countSkillTrees(achievementDefs, (achievement) => achievement.skillTree),
    earned: countSkillTrees(earnedAchievements, (userAchievement) => (
      userAchievement.achievement?.skillTree || userAchievement.achievement?.requirementType
    )),
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

function countSkillTrees(items: unknown, getTree: (item: any) => string | undefined): Record<string, number> {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set<string>();
  const totals: Record<string, number> = {};

  list.forEach((item: any) => {
    const key = String(item.achievement?.name || item.name || item.title || item.id).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const skillTree = getTree(item);
    if (skillTree) totals[skillTree] = (totals[skillTree] || 0) + 1;
  });

  return totals;
}
