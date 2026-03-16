/**
 * Badge Image Resolver
 * ====================
 * Resolves achievement badge image URLs from the badge manifest.
 * Uses the frontend manifest (badge-manifest.json) as single source of truth.
 *
 * Usage:
 *   import { getBadgeImage, getBadgeImages } from '@/utils/badgeImageResolver';
 *   const url = getBadgeImage('first_login', 'glass');
 *   const all = getBadgeImages('first_login');
 */

import badgeManifest from '../data/badge-manifest.json';

export type BadgeStyle = 'claymation' | 'glass' | 'metallic';

export interface BadgeImages {
  claymation: string;
  glass: string;
  metallic: string;
}

export interface BadgeEntry {
  title: string;
  description: string;
  emoji: string;
  skillTree: string;
  category: string;
  images: BadgeImages;
}

const achievements = (badgeManifest as any).achievements as Record<string, BadgeEntry>;

/**
 * Get a single badge image URL by achievement name and style.
 * Defaults to 'glass' style (most premium).
 * Returns null if achievement not found.
 */
export function getBadgeImage(
  achievementName: string | undefined | null,
  style: BadgeStyle = 'glass'
): string | null {
  if (!achievementName) return null;

  // Try direct match
  const entry = achievements[achievementName];
  if (entry?.images?.[style]) return entry.images[style];

  // Try stripping tier suffix (e.g., "first_login_tier2" → "first_login")
  const baseName = achievementName.replace(/_tier\d+$/, '');
  const baseEntry = achievements[baseName];
  if (baseEntry?.images?.[style]) return baseEntry.images[style];

  return null;
}

/**
 * Get all 3 badge image URLs for an achievement.
 * Returns null if achievement not found.
 */
export function getBadgeImages(
  achievementName: string | undefined | null
): BadgeImages | null {
  if (!achievementName) return null;

  const entry = achievements[achievementName];
  if (entry?.images) return entry.images;

  const baseName = achievementName.replace(/_tier\d+$/, '');
  const baseEntry = achievements[baseName];
  if (baseEntry?.images) return baseEntry.images;

  return null;
}

/**
 * Get the full badge entry (title, description, emoji, images) by name.
 */
export function getBadgeEntry(
  achievementName: string | undefined | null
): BadgeEntry | null {
  if (!achievementName) return null;

  const entry = achievements[achievementName];
  if (entry) return entry;

  const baseName = achievementName.replace(/_tier\d+$/, '');
  return achievements[baseName] || null;
}

/**
 * Enrich an achievement object with badge image URL.
 * Sets iconUrl from manifest if not already set.
 */
export function enrichWithBadgeImage<T extends { name?: string; templateId?: string; iconUrl?: string | null }>(
  achievement: T,
  style: BadgeStyle = 'glass'
): T & { iconUrl: string | null } {
  const name = achievement.name || achievement.templateId;
  const existingUrl = achievement.iconUrl;

  return {
    ...achievement,
    iconUrl: existingUrl || getBadgeImage(name, style),
  };
}

/**
 * Batch enrich achievements with badge images.
 */
export function enrichAllWithBadgeImages<T extends { name?: string; templateId?: string; iconUrl?: string | null }>(
  achievements: T[],
  style: BadgeStyle = 'glass'
): (T & { iconUrl: string | null })[] {
  return achievements.map(a => enrichWithBadgeImage(a, style));
}
