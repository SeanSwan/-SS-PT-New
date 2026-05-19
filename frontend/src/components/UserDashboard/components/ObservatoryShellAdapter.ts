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

import {
  Activity,
  Aperture,
  Camera,
  Dumbbell,
  Home,
  Info,
  Sparkles,
  UserCircle2,
  Users,
  Utensils,
  Video,
} from 'lucide-react';

import type { TransformationPhoto, PhotoVisibility } from './TransformationPhotoTypes';
import type { ObservatoryNavItem } from './ObservatoryShellTypes';

export const OBSERVATORY_NAV_ITEMS: ReadonlyArray<ObservatoryNavItem> = [
  { id: 'home',      label: 'Home',      Icon: Home },
  { id: 'feed',      label: 'Feed',      Icon: Sparkles },
  { id: 'reels',     label: 'Reels',     Icon: Video },
  { id: 'creative',  label: 'Creative',  Icon: Aperture },
  { id: 'photos',    label: 'Photos',    Icon: Camera },
  { id: 'about',     label: 'About',     Icon: Info },
  { id: 'activity',  label: 'Activity',  Icon: Activity },
  { id: 'nutrition', label: 'Nutrition', Icon: Utensils },
  { id: 'progress',  label: 'Progress',  Icon: Dumbbell },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'profile',   label: 'Profile',   Icon: UserCircle2 },
];

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
