/**
 * FILE: AegisHudTypes.ts
 * PURPOSE: Type definitions for the mounted Aegis HUD needs system.
 */
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
