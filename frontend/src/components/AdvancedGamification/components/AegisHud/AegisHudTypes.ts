/**
 * ============================================================================
 * FILE: AegisHudTypes.ts
 * PURPOSE: Type definitions for the Aegis HUD needs system
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Need Types
// ─────────────────────────────────────────────────────────────

export type NeedKey = 'athletic' | 'recovery' | 'social' | 'discipline' | 'vitality';

export interface NeedBar {
  key: NeedKey;
  label: string;
  icon: string;
  value: number;
  maxValue: number;
  color: string;
  decayRate: number;
  lastUpdated: string;
}

export interface Moodlet {
  id: string;
  label: string;
  icon: string;
}

export interface AegisHudData {
  needs: NeedBar[];
  moodlet: Moodlet;
  overallHealth: number;
  userId?: number;
  jobClass?: string | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Config Types (from /aegis-hud/config endpoint)
// ─────────────────────────────────────────────────────────────

export interface NeedConfig {
  label: string;
  icon: string;
  decayPerHour: number;
  maxValue: number;
  minValue: number;
  color: string;
}

export interface ActionReplenish {
  [needKey: string]: number;
}

export interface AegisHudConfig {
  needs: Record<NeedKey, NeedConfig>;
  actions: Record<string, ActionReplenish>;
  moodlets: Moodlet[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component Props
// ─────────────────────────────────────────────────────────────

export interface AegisHudProps {
  userId: number;
  compact?: boolean;
  showMoodlet?: boolean;
  className?: string;
}

export interface NeedBarProps {
  need: NeedBar;
  animate?: boolean;
}

export interface MoodletBadgeProps {
  moodlet: Moodlet;
  size?: 'sm' | 'md' | 'lg';
}
