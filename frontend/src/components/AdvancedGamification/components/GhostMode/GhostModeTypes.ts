/**
 * ============================================================================
 * FILE: GhostModeTypes.ts
 * PURPOSE: Type definitions for Ghost Mode workout comparison system
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 */

// ─────────────────────────────────────────────��───────────────
// SECTION: Ghost Data Types
// ──────────────��──────────────────────────────────────────────

export interface GhostExercise {
  name: string;
  exerciseId: number | null;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
}

export interface GhostData {
  ghostId: string;
  sourceSessionId: number;
  sourceDate: string;
  category: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exercises: GhostExercise[];
  comparison: {
    metric: 'volume' | 'reps' | 'weight';
    target: number;
  };
}

export interface GhostResponse {
  hasGhost: boolean;
  ghost?: GhostData;
  message?: string;
}

// ─────��────────────────────────��──────────────────────────────
// SECTION: Comparison Types
// ��────────────────────────────────────────────────────────────

export interface ExerciseComparison {
  name: string;
  ghostVolume?: number;
  currentVolume?: number;
  status: 'beat' | 'tied' | 'lost' | 'skipped';
  delta: string;
}

export interface GhostBonus {
  type: string;
  label: string;
  xp: number;
}

export interface GhostComparisonResult {
  result: 'victory' | 'close' | 'defeat' | 'no_comparison';
  ghostVolume?: number;
  currentVolume?: number;
  ratio?: number;
  bonusXP: number;
  bonuses: GhostBonus[];
  exerciseComparisons?: ExerciseComparison[];
}

export interface GhostConfig {
  bonuses: Record<string, number>;
  description: string;
}

// ─���────────────────────────────���──────────────────────────────
// SECTION: Component Props
// ──────────────────��──────────────────────────────────────────

export interface GhostModeOverlayProps {
  userId: number;
  ghostData: GhostData | null;
  currentVolume: number;
  isActive: boolean;
  compact?: boolean;
  className?: string;
}

export interface GhostModeBannerProps {
  userId: number;
  category?: string;
  /** Current workout volume — fed from workout logger or parent context */
  currentVolume?: number;
  /** Current per-exercise volumes — keyed by exercise name */
  currentExercises?: Record<string, number>;
  onGhostLoaded?: (ghost: GhostData | null) => void;
  onToggle?: (active: boolean) => void;
  compact?: boolean;
}
