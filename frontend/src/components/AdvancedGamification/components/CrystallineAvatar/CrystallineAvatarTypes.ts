/**
 * ============================================================================
 * FILE: CrystallineAvatarTypes.ts
 * PURPOSE: Type definitions for the Crystalline Avatar system
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

export type TierName = 'bronze_forge' | 'silver_edge' | 'titanium_core' | 'obsidian_warrior' | 'crystalline_swan';

export type JobClass = 'paladin' | 'monk' | 'ranger' | 'white_mage' | 'dark_knight' | null;

export interface CrystallineAvatarProps {
  tier: TierName;
  level: number;
  jobClass?: JobClass;
  size?: number;
  animated?: boolean;
  showTierLabel?: boolean;
  className?: string;
}

export interface TierVisuals {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  facets: number;
  opacity: number;
  rotationSpeed: number;
  particleCount: number;
}

export interface JobClassVisuals {
  name: string;
  icon: string;
  accentColor: string;
  symbol: string;
}
