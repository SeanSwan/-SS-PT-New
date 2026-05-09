/**
 * Shared types for the active UserDashboard V3 profile about section.
 */

import type { LucideIcon } from 'lucide-react';
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
