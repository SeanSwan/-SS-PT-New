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
  Aperture,
  Bell,
  Camera,
  Dumbbell,
  Home,
  Trophy,
  UserPlus,
  Users,
  Utensils,
  Video,
} from 'lucide-react';

import type { TransformationPhoto, PhotoVisibility } from './TransformationPhotoTypes';
import type { ObservatoryNavItem } from './ObservatoryShellTypes';
import { STUDIO_TAB_IDS } from '../types/UserDashboardTypes';

/* Workstream N5/O: Photos is a first-class library entry. Creative groups About/Activity; Profile and Community keep their panels and URLs but leave the nav. Feed left the nav because Home absorbed its unique widgets. */
export const OBSERVATORY_NAV_ITEMS: ReadonlyArray<ObservatoryNavItem> = [
  { id: 'home',          label: 'Home',          Icon: Home },
  { id: 'progress',      label: 'Progress',      Icon: Dumbbell },
  { id: 'groups',        label: 'Groups',        Icon: Users },
  { id: 'reels',         label: 'Reels',         Icon: Video },
  { id: 'friends',       label: 'Friends',       Icon: UserPlus },
  { id: 'challenges',    label: 'Challenges',    Icon: Trophy },
  { id: 'notifications', label: 'Alerts',        Icon: Bell },
  { id: 'nutrition',     label: 'Nutrition',     Icon: Utensils },
  { id: 'photos',        label: 'Photos',        Icon: Camera },
  { id: 'creative',      label: 'Creative',      Icon: Aperture, matches: STUDIO_TAB_IDS },
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
