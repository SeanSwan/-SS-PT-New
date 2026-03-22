/**
 * ============================================================================
 * FILE: ProfileBadgeShowcaseTypes.ts
 * PURPOSE: Shared types for Profile badge showcase and detail modal
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines shared types/interfaces and theme tokens used
 * by ProfileBadgeShowcase, BadgesTab, and BadgeDetailModal.
 * HOW IT FITS IN THE APP: Imported by all badge-related profile components.
 */

import type { Rarity } from '../../../types/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Crystalline Swan Tokens
// PURPOSE: Centralized theme tokens for badge components
// ─────────────────────────────────────────────────────────────

export const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  wingPurple: '#8B5CF6',
  obsidianBlack: '#0A0A0F',
  carbon: '#141419',
  graphite: '#1A1A24',
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Rarity Config
// PURPOSE: Maps rarity levels to Crystalline Swan colors and labels
// ─────────────────────────────────────────────────────────────

export const RARITY_CONFIG: Record<Rarity, { color: string; glow: string; label: string }> = {
  common:    { color: T.swanLavender, glow: 'rgba(64, 112, 192, 0.4)',  label: 'Cygnus Initiate' },
  rare:      { color: T.gildedFern,   glow: 'rgba(198, 168, 75, 0.4)',  label: 'Frostwing Ascendant' },
  epic:      { color: T.wingPurple,   glow: 'rgba(139, 92, 246, 0.5)',  label: 'Gilded Sovereign' },
  legendary: { color: T.gildedFern,   glow: 'rgba(198, 168, 75, 0.6)',  label: 'Amethyst Apex' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Badge Data Interface
// PURPOSE: Unified badge shape used across all profile badge components
// ─────────────────────────────────────────────────────────────

export interface ProfileBadge {
  id: string;
  name: string;
  title: string;
  description: string;
  iconEmoji: string;
  iconUrl?: string | null;
  xpReward: number;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special' | 'community';
  rarity: Rarity;
  progress: number;
  maxProgress: number;
  earnedAt?: string | null;
  isNew?: boolean;
  skillTree?: string;
}

export type CategoryFilter = 'all' | 'fitness' | 'social' | 'streak' | 'milestone' | 'special' | 'community';
export type RarityFilter = 'all' | Rarity;
export type StatusFilter = 'all' | 'earned' | 'locked';
