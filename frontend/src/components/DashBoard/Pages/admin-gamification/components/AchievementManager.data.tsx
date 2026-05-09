/**
 * Static icon, requirement, and tier options for achievement management.
 */
import React from 'react';
import {
  Award,
  Calendar,
  Clock,
  Dumbbell,
  Gift,
  Heart,
  Medal,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AchievementDraft, AchievementTier, SelectOption } from './AchievementManager.types';

export const achievementIconOptions = [
  { name: 'Award', component: <Award /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Star', component: <Star /> },
  { name: 'Dumbbell', component: <Dumbbell /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Target', component: <Target /> },
  { name: 'Zap', component: <Zap /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Clock', component: <Clock /> },
  { name: 'TrendingUp', component: <TrendingUp /> },
  { name: 'Gift', component: <Gift /> },
];

export const requirementTypes: SelectOption[] = [
  { value: 'session_count', label: 'Session Count' },
  { value: 'exercise_count', label: 'Exercise Count' },
  { value: 'specific_exercise', label: 'Specific Exercise' },
  { value: 'level_reached', label: 'Level Reached' },
  { value: 'streak_days', label: 'Streak Days' },
  { value: 'specific_goal', label: 'Specific Goal' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'custom', label: 'Custom Achievement' },
];

export const achievementTiers: Array<SelectOption<AchievementTier> & { color: string }> = [
  { value: 'bronze', label: 'Cygnus Initiate', color: 'var(--achievement-tier-bronze, #002060)' },
  { value: 'silver', label: 'Frostwing Ascendant', color: 'var(--achievement-tier-silver, #60C0F0)' },
  { value: 'gold', label: 'Gilded Sovereign', color: 'var(--achievement-tier-gold, #C6A84B)' },
  { value: 'platinum', label: 'Amethyst Apex', color: 'var(--achievement-tier-platinum, #8B5CF6)' },
];

export const createDefaultAchievement = (): AchievementDraft => ({
  name: '',
  description: '',
  icon: 'Trophy',
  pointValue: 100,
  requirementType: 'session_count',
  requirementValue: 5,
  tier: 'bronze',
  isActive: true,
});
