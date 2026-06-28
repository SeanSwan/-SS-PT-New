/**
 * Shared types for the active UserDashboard V3 profile about section.
 */

import type { LucideIcon } from 'lucide-react';
import type { ProgressionBeatOption, RankTitleOption } from '../../../hooks/gamification/gamificationLegacyTypes';
import type { Rarity, SkillTree } from '../../../types/gamification';

export interface PersonalInfoItem {
  Icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

export interface EarnedAchievementCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: Rarity;
  xpReward: number;
  skillTree?: SkillTree;
  category: string;
}

export interface SkillTreeStats {
  total: Record<string, number>;
  earned: Record<string, number>;
}

export interface RankTitleCatalog {
  rankTitles: RankTitleOption[];
  selectedRankTitle?: RankTitleOption;
  currentRankTitle?: RankTitleOption;
  nextRankTitle?: RankTitleOption | null;
  earnedRankTitleCount: number;
  upcomingProgressionBeats: ProgressionBeatOption[];
  nextMajorProgressionBeat?: ProgressionBeatOption | null;
}
