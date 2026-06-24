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
  Image as ImageIcon,
  Info,
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

/* Workstream O: the Feed entry is gone (the tab folded into Home) — Progress
   takes its slot, putting the workout/progress loop one tap from Home in both
   the desktop rail and the mobile lens strip. */
export const LEFT_NAV_ITEMS: VisionAction[] = [
  { id: 'progress', label: 'Progress', Icon: Dumbbell, target: 'progress' },
  { id: 'reels', label: 'Reels', Icon: Video, target: 'reels' },
  { id: 'creative', label: 'Creative', Icon: Aperture, target: 'creative' },
  { id: 'photos', label: 'Photos', Icon: Camera, target: 'photos' },
  { id: 'about', label: 'About', Icon: Info, target: 'about' },
  { id: 'activity', label: 'Activity', Icon: Activity, target: 'activity' },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils, target: 'nutrition' },
];

export const HERO_LENSES: VisionAction[] = [
  { id: 'progress', label: 'Progress', Icon: Dumbbell, target: 'progress' },
  { id: 'reels', label: 'Reels', Icon: Video, target: 'reels' },
  { id: 'creative', label: 'Creative', Icon: Aperture, target: 'creative' },
  { id: 'photos', label: 'Photos', Icon: ImageIcon, target: 'photos' },
  { id: 'about', label: 'About', Icon: Info, target: 'about' },
  { id: 'activity', label: 'Activity', Icon: Activity, target: 'activity' },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils, target: 'nutrition' },
];

/* Workstream N2 (Sean's call): the quick composer offers three core moods —
   too many choices slows the post. Smart intent inference still auto-types
   anything else from the text (the Feed tab's full composer retired with the
   tab in workstream O). */
export const POST_MOODS = [
  { id: 'community', label: 'Auto tag', Icon: Users },
  { id: 'workout', label: 'Training', Icon: Dumbbell },
  { id: 'transformation', label: 'Progress photo', Icon: Camera },
  { id: 'achievement', label: 'Win', Icon: Trophy },
] as const;

export function compactNumber(value: number | undefined): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

export function clampPercent(value: number | undefined): number {
  return Math.min(Math.max(Math.round(value || 0), 0), 100);
}
