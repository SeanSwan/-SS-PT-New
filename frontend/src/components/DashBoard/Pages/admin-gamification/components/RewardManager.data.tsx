/**
 * Static icon and tier options for reward management.
 */
import React from 'react';
import {
  Award,
  Calendar,
  Clock,
  DollarSign,
  Gift,
  Heart,
  Medal,
  Star,
  Tag,
  Trophy,
} from 'lucide-react';
import type { RewardDraft, RewardTier } from './RewardManager.types';

export const rewardIconOptions = [
  { name: 'Gift', component: <Gift /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Star', component: <Star /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Tag', component: <Tag /> },
  { name: 'DollarSign', component: <DollarSign /> },
  { name: 'Award', component: <Award /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Clock', component: <Clock /> },
];

export const rewardTiers: Array<{ value: RewardTier; label: string; color: string }> = [
  { value: 'bronze', label: 'Cygnus Initiate', color: 'var(--reward-tier-bronze, #002060)' },
  { value: 'silver', label: 'Frostwing Ascendant', color: 'var(--reward-tier-silver, #60C0F0)' },
  { value: 'gold', label: 'Gilded Sovereign', color: 'var(--reward-tier-gold, #C6A84B)' },
  { value: 'platinum', label: 'Amethyst Apex', color: 'var(--reward-tier-platinum, #8B5CF6)' },
];

export const createDefaultReward = (): RewardDraft => ({
  name: '',
  description: '',
  icon: 'Gift',
  pointCost: 500,
  tier: 'bronze',
  stock: 10,
  isActive: true,
});
