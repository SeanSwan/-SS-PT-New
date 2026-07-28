/**
 * ChallengesView constants.
 *
 * Keeps the live challenge panel compact while preserving category/status
 * labels and the icon contract used by the user-dashboard challenges tab.
 */
import type { ElementType } from 'react';
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Gamepad2,
  Utensils,
  Laugh,
  Mic,
  Mic2,
  Music2,
  Palette,
  Target,
  Users,
} from 'lucide-react';
import type { ChallengeCategory, ChallengeStatus } from '../../../hooks/useChallenges';

export const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  strength: 'var(--challenge-strength, #C6A84B)',
  cardio: 'var(--challenge-cardio, #E879F9)',
  nutrition: 'var(--challenge-nutrition, #34D399)',
  consistency: 'var(--challenge-consistency, #8B5CF6)',
  social: 'var(--challenge-social, #60C0F0)',
  dance: 'var(--challenge-dance, #EC4899)',
  music: 'var(--challenge-music, #A855F7)',
  singing: 'var(--challenge-singing, #C084FC)',
  art: 'var(--challenge-art, #F59E0B)',
  gaming: 'var(--challenge-gaming, #22C55E)',
  comedy: 'var(--challenge-comedy, #FACC15)',
  community: 'var(--challenge-community, #4070C0)',
};

export const CATEGORY_ICONS: Record<ChallengeCategory, ElementType> = {
  strength: Dumbbell,
  cardio: Flame,
  nutrition: Utensils,
  consistency: Target,
  social: Users,
  dance: Music2,
  music: Mic2,
  singing: Mic,
  art: Palette,
  gaming: Gamepad2,
  comedy: Laugh,
  community: Users,
};

export const ALL_CATEGORIES: { key: ChallengeCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'strength', label: 'Fitness' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'social', label: 'Social' },
  { key: 'dance', label: 'Dance' },
  { key: 'music', label: 'Music' },
  { key: 'singing', label: 'Singing' },
  { key: 'art', label: 'Art' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'comedy', label: 'Comedy' },
  { key: 'community', label: 'Community' },
];

export const TABS: { key: ChallengeStatus; label: string; icon: ElementType }[] = [
  { key: 'active', label: 'Active', icon: Flame },
  { key: 'upcoming', label: 'Upcoming', icon: Clock },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export const ALL_CHALLENGE_COLOR = 'var(--accent-secondary, #8B5CF6)';
