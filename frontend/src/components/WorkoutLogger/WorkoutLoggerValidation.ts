/**
 * ============================================================================
 * FILE: WorkoutLoggerValidation.ts
 * PURPOSE: Pure utility functions for NASM phase enforcement, 1RM calculation,
 *          and phase-aware default values
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 */

// ─── Phase Rep Ranges ────────────────────────────────────────────────

interface RepRange {
  min: number;
  max: number;
}

const PHASE_REP_RANGES: Record<number, RepRange> = {
  1: { min: 12, max: 20 },
  2: { min: 8, max: 12 },
  3: { min: 6, max: 12 },
  4: { min: 1, max: 5 },
  5: { min: 1, max: 10 }, // 1-5 strength + 8-10 power
};

export const getRepRangeForPhase = (phase: number): RepRange =>
  PHASE_REP_RANGES[phase] || PHASE_REP_RANGES[1];

export const isRepsOutOfRange = (reps: number, phase: number): boolean => {
  if (reps <= 0) return false; // Don't warn on empty
  const range = getRepRangeForPhase(phase);
  return reps < range.min || reps > range.max;
};

export const getPhaseWarning = (reps: number, phase: number): string | null => {
  if (!isRepsOutOfRange(reps, phase)) return null;
  const range = getRepRangeForPhase(phase);
  return `Phase ${phase} recommends ${range.min}-${range.max} reps (you entered ${reps})`;
};

// ─── 1RM Calculation (Brzycki Formula) ───────────────────────────────
// estimated1RM = weight / (1.0278 - 0.0278 × reps)
// Valid for reps 2-10 per NASM standard

export const calculateBrzycki1RM = (weight: number, reps: number): number | null => {
  if (weight <= 0 || reps < 2 || reps > 10) return null;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;
  return Math.round(weight / denominator);
};

// ─── Phase-Aware Defaults ────────────────────────────────────────────

interface PhaseDefaults {
  reps: number;
  sets: number;
  tempo: string;
  restSeconds: number;
  intensityPctMin: number;
  intensityPctMax: number;
}

const PHASE_DEFAULTS: Record<number, PhaseDefaults> = {
  1: { reps: 15, sets: 2, tempo: '4/2/1', restSeconds: 60, intensityPctMin: 50, intensityPctMax: 70 },
  2: { reps: 10, sets: 3, tempo: '2/0/2', restSeconds: 45, intensityPctMin: 70, intensityPctMax: 80 },
  3: { reps: 10, sets: 4, tempo: '2/0/2', restSeconds: 60, intensityPctMin: 75, intensityPctMax: 85 },
  4: { reps: 4, sets: 5, tempo: 'X/0/X', restSeconds: 240, intensityPctMin: 85, intensityPctMax: 100 },
  5: { reps: 5, sets: 4, tempo: 'X/0/X', restSeconds: 240, intensityPctMin: 85, intensityPctMax: 100 },
};

export const getPhaseDefaults = (phase: number): PhaseDefaults =>
  PHASE_DEFAULTS[phase] || PHASE_DEFAULTS[1];

// ─── Weight Suggestion from 1RM + Phase Intensity ────────────────────

export const suggestWeight = (
  estimated1RM: number,
  phase: number,
): { min: number; max: number } | null => {
  if (estimated1RM <= 0) return null;
  const defaults = getPhaseDefaults(phase);
  return {
    min: Math.round(estimated1RM * (defaults.intensityPctMin / 100)),
    max: Math.round(estimated1RM * (defaults.intensityPctMax / 100)),
  };
};
