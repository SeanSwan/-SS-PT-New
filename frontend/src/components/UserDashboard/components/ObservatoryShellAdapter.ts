/*
 * ============================================================================
 * COMPONENT: ObservatoryShellAdapter
 * PURPOSE: Phase 19B Observatory shell adapter helpers. Keeps V3 focused on
 *          orchestration while this file maps existing dashboard data/actions
 *          into the presentational Observatory shell props.
 * OWNER:   Claude Opus 4.7 / Codex review
 * UPDATED: 2026-04-29
 * ============================================================================
 */

import { Activity, Dumbbell, Sparkles, Trophy, UserCircle2, Users, Home } from 'lucide-react';

import type { TransformationPhoto, PhotoVisibility } from './TransformationPhotoTypes';
import type {
  ObservatoryNavItem,
  ObservatoryNextBestAction,
} from './ObservatoryShellTypes';
import type { TabId } from '../types/UserDashboardTypes';
import { getLogWorkoutDashboardPath } from './swanCoachDashboardRoute';

export const OBSERVATORY_NAV_ITEMS: ReadonlyArray<ObservatoryNavItem> = [
  { id: 'home',      label: 'Home',      Icon: Home },
  { id: 'feed',      label: 'Feed',      Icon: Sparkles },
  { id: 'progress',  label: 'Progress',  Icon: Activity },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'profile',   label: 'Profile',   Icon: UserCircle2 },
];

export function buildObservatoryNextBestActions(
  navigate: (path: string) => void,
  setActiveTab: (tab: TabId) => void,
  role?: string | null,
): ReadonlyArray<ObservatoryNextBestAction> {
  return [
    { label: 'Log Workout',    Icon: Dumbbell, run: () => navigate(getLogWorkoutDashboardPath(role)) },
    { label: 'View Progress',  Icon: Trophy,   run: () => setActiveTab('progress') },
    { label: 'Explore Feed',   Icon: Sparkles, run: () => setActiveTab('feed') },
    { label: 'Find Community', Icon: Users,    run: () => setActiveTab('community') },
  ];
}

export function getTransformationPhotos(
  profile: Record<string, unknown> | null | undefined,
): TransformationPhoto[] {
  const raw = profile?.transformationPhotos;
  if (Array.isArray(raw)) return raw as TransformationPhoto[];
  return [];
}

export function getTransformationVisibility(
  profile: Record<string, unknown> | null | undefined,
): PhotoVisibility {
  const settings = profile?.transformationSettings;
  if (settings && typeof settings === 'object' && 'defaultVisibility' in settings) {
    const value = (settings as Record<string, unknown>).defaultVisibility;
    if (value === 'public' || value === 'friends' || value === 'private' || value === 'hidden') {
      return value;
    }
  }

  return 'private';
}
