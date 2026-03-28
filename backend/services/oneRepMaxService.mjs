/**
 * ============================================================================
 * FILE: oneRepMaxService.mjs
 * PURPOSE: Centralized 1RM estimation and weight recommendation service
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides safe 1RM estimation (Brzycki formula) and
 * weight recommendations based on exercise movement patterns from the DB.
 * Eliminates fragile string-matching by using the Exercise model's
 * nasmMovementPattern column.
 *
 * HOW IT FITS IN THE APP: workoutBuilderService → OneRepMaxService → Exercise DB
 *
 * KEY DECISIONS: Uses DB-driven nasmMovementPattern (not hardcoded dictionaries)
 * so new exercises automatically get correct 1RM mapping at creation time.
 */

import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Movement Pattern → 1RM Mapping
// PURPOSE: Maps NASM movement patterns to the four primary lifts
// WHY: DB-driven patterns mean zero code changes when exercises are added
// ─────────────────────────────────────────────────────────────
const PATTERN_TO_1RM_KEY = {
  // Push patterns → bench press 1RM
  push: 'bench',
  press: 'bench',
  horizontal_push: 'bench',

  // Vertical push → overhead press 1RM
  vertical_push: 'overheadPress',

  // Squat patterns → squat 1RM
  squat: 'squat',
  lunge: 'squat',

  // Hinge patterns → deadlift 1RM
  hinge: 'deadlift',
  pull: 'deadlift',

  // Rotation / gait / core → no direct 1RM mapping
  rotation: null,
  gait: null,
  core: null,
  corrective: null,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Brzycki 1RM Calculator
// PURPOSE: Safe 1RM estimation with guard rails
// WHY: Prevents div-by-zero at ~37 reps, validates NASM-standard range
// ─────────────────────────────────────────────────────────────

/**
 * Estimate 1RM using the Brzycki formula.
 * Valid for 2-10 reps (NASM standard), extended to 15 with reduced accuracy.
 *
 * @param {number} weight - Weight lifted
 * @param {number} reps - Repetitions performed
 * @returns {number|null} Estimated 1RM, or null if inputs are invalid
 */
// Absolute ceiling for any human lift (strongman world record ~501 kg / 1105 lbs deadlift)
const MAX_REASONABLE_1RM = 1500;

export function estimateBrzycki1RM(weight, reps) {
  if (!weight || !reps || weight <= 0 || reps < 1 || reps > 15) return null;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0.01) return null;
  const estimate = Math.round(weight / denominator);
  if (estimate > MAX_REASONABLE_1RM) {
    logger.warn('Brzycki 1RM exceeds human ceiling', { weight, reps, estimate, cap: MAX_REASONABLE_1RM });
    return MAX_REASONABLE_1RM;
  }
  return estimate;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Weight Recommendation
// PURPOSE: Calculate recommended weight from 1RM + phase intensity
// WHY: Separates 1RM logic from workout builder for reuse/testing
// ─────────────────────────────────────────────────────────────

/**
 * Get recommended weight range for an exercise based on movement pattern.
 *
 * @param {object} params
 * @param {string} params.movementPattern - nasmMovementPattern from Exercise model
 * @param {string} params.exerciseKey - Fallback: exercise key for string matching
 * @param {object} params.estimated1RMs - { bench, squat, deadlift, overheadPress }
 * @param {number} params.intensityMin - Lower end of phase intensity (0-1)
 * @param {number} params.intensityMax - Upper end of phase intensity (0-1)
 * @returns {{ min: number, max: number, basedOn: number, pattern: string } | null}
 */
export function getRecommendedWeight({
  movementPattern,
  exerciseKey,
  estimated1RMs,
  intensityMin,
  intensityMax,
}) {
  if (!estimated1RMs) return null;

  // Step 1: Try DB-driven pattern mapping
  let rm1Key = null;
  if (movementPattern) {
    rm1Key = PATTERN_TO_1RM_KEY[movementPattern.toLowerCase()] ?? null;
  }

  // Step 2: Fallback to exercise key string matching (for legacy 81 hardcoded)
  if (!rm1Key && exerciseKey) {
    rm1Key = fallbackKeyMatch(exerciseKey);
  }

  if (!rm1Key) return null;

  const base1RM = estimated1RMs[rm1Key];
  if (!base1RM || base1RM <= 0) return null;

  // Safety: never recommend > 100% of 1RM, and clamp base to human ceiling
  const safe1RM = Math.min(base1RM, MAX_REASONABLE_1RM);
  // Use ?? (not ||) so that 0% intensity for corrective/bodyweight phases is allowed
  const safeMin = Math.min(intensityMin ?? 0.5, 1.0);
  const safeMax = Math.min(intensityMax ?? 0.7, 1.0);

  return {
    min: Math.round(safe1RM * safeMin),
    max: Math.round(safe1RM * safeMax),
    basedOn: safe1RM,
    pattern: rm1Key,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Fallback Key Matching
// PURPOSE: String-based 1RM key detection for exercises without DB pattern
// WHY: Backward compat until all 840+ exercises have nasmMovementPattern set
// ─────────────────────────────────────────────────────────────
function fallbackKeyMatch(exerciseKey) {
  const k = exerciseKey.toLowerCase();

  // M8 FIX: Order from most specific to least specific
  if (k.includes('bench') || k.includes('chest_press') || k.includes('push_up') || k.includes('flye') || k.includes('dip')) {
    return 'bench';
  }
  if (k.includes('squat') || k.includes('leg_press') || k.includes('lunge') || k.includes('step_up')) {
    return 'squat';
  }
  if (k.includes('deadlift') || k.includes('romanian') || k.includes('hip_thrust') || k.includes('good_morning')) {
    return 'deadlift';
  }
  if (k.includes('overhead_press') || k.includes('shoulder_press') || k.includes('military') || k.includes('arnold')) {
    return 'overheadPress';
  }

  return null;
}

export default {
  estimateBrzycki1RM,
  getRecommendedWeight,
  PATTERN_TO_1RM_KEY,
};
