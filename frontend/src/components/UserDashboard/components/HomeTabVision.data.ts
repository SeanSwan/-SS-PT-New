/**
 * FILE: HomeTabVision.data.ts
 * PURPOSE: Static presentation data for the /user-dashboard Creator Observatory.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Aperture,
  Camera,
  Dumbbell,
  Flame,
  Home,
  Image as ImageIcon,
  Info,
  MessageCircle,
  Mic2,
  Palette,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Video,
} from 'lucide-react';
import type { TabId } from '../types/UserDashboardTypes';

export type VisionTarget = TabId | 'challenges';

export interface VisionAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  target: VisionTarget;
}

export const LEFT_NAV_ITEMS: VisionAction[] = [
  { id: 'feed', label: 'Feed', Icon: Home, target: 'feed' },
  { id: 'reels', label: 'Reels', Icon: Video, target: 'reels' },
  { id: 'creative', label: 'Creative', Icon: Aperture, target: 'creative' },
  { id: 'photos', label: 'Photos', Icon: Camera, target: 'photos' },
  { id: 'about', label: 'About', Icon: Info, target: 'about' },
  { id: 'activity', label: 'Activity', Icon: Activity, target: 'activity' },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils, target: 'nutrition' },
];

export const HERO_LENSES: VisionAction[] = [
  { id: 'reels', label: 'Reels', Icon: Video, target: 'reels' },
  { id: 'feed', label: 'Feed', Icon: MessageCircle, target: 'feed' },
  { id: 'creative', label: 'Creative', Icon: Aperture, target: 'creative' },
  { id: 'photos', label: 'Photos', Icon: ImageIcon, target: 'photos' },
  { id: 'about', label: 'About', Icon: Info, target: 'about' },
  { id: 'activity', label: 'Activity', Icon: Activity, target: 'activity' },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils, target: 'nutrition' },
];

export const POST_MOODS = [
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'transformation', label: 'Transformation', Icon: Sparkles },
  { id: 'achievement', label: 'Achievement', Icon: Trophy },
  { id: 'challenge', label: 'Challenge', Icon: Flame },
  { id: 'music', label: 'Music', Icon: Mic2 },
  { id: 'art', label: 'Art', Icon: Palette },
  { id: 'community', label: 'Community', Icon: Users },
] as const;

export function compactNumber(value: number | undefined): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

export function clampPercent(value: number | undefined): number {
  return Math.min(Math.max(Math.round(value || 0), 0), 100);
}
