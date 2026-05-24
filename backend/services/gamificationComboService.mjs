/**
 * gamificationComboService — Combo Bonus Detection for Workouts
 * ==============================================================
 * Analyzes exercise types in a completed workout and awards
 * multiplier bonuses for balanced training:
 *
 *   - Balanced Warrior:  strength + cardio + flexibility  → 2x
 *   - Full Spectrum:     strength + cardio + flex + balance → 3x
 *   - Flexibility Focus: 3+ flexibility exercises          → 1.5x
 *   - Cardio Chain:      3+ consecutive cardio exercises   → 1.3x
 *
 * Called by awardWorkoutXP after base XP is computed.
 */

import logger from '../utils/logger.mjs';

// ── Combo Definitions ────────────────────────────────────────────────

const COMBOS = [
  {
    id: 'full_spectrum',
    name: 'Full Spectrum',
    description: 'Strength + Cardio + Flexibility + Balance in one session',
    multiplier: 3.0,
    detect: (types) =>
      types.has('strength') && types.has('cardio') && types.has('flexibility') && types.has('balance'),
  },
  {
    id: 'balanced_warrior',
    name: 'Balanced Warrior',
    description: 'Strength + Cardio + Flexibility in one session',
    multiplier: 2.0,
    detect: (types) =>
      types.has('strength') && types.has('cardio') && types.has('flexibility'),
  },
  {
    id: 'flexibility_focus',
    name: 'Flexibility Focus',
    description: '3 or more flexibility exercises in one session',
    multiplier: 1.5,
    detect: (_types, counts) => (counts.flexibility || 0) >= 3,
  },
  {
    id: 'cardio_chain',
    name: 'Cardio Chain',
    description: '3 or more consecutive cardio exercises',
    multiplier: 1.3,
    detect: (_types, _counts, exercises) => {
      let consecutive = 0;
      for (const ex of exercises) {
        const t = normalizeType(ex.exerciseType || ex.type || '');
        if (t === 'cardio') {
          consecutive++;
          if (consecutive >= 3) return true;
        } else {
          consecutive = 0;
        }
      }
      return false;
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

const TYPE_ALIASES = {
  strength: 'strength',
  resistance: 'strength',
  weight_training: 'strength',
  compound: 'strength',
  isolation: 'strength',
  cardio: 'cardio',
  cardiovascular: 'cardio',
  hiit: 'cardio',
  plyometric: 'cardio',
  flexibility: 'flexibility',
  stretching: 'flexibility',
  mobility: 'flexibility',
  foam_rolling: 'flexibility',
  balance: 'balance',
  stability: 'balance',
  core: 'strength',
  calisthenics: 'strength',
};

function normalizeType(raw) {
  const key = raw.toLowerCase().replace(/[\s-]/g, '_');
  return TYPE_ALIASES[key] || 'strength'; // default to strength
}

// ── Main Detection ───────────────────────────────────────────────────

/**
 * Detect combo bonuses from a workout's exercises.
 *
 * @param {Array<{exerciseType?: string, type?: string}>} exercises
 *   Array of exercise objects from the workout. Only `exerciseType` (or `type`) is used.
 *
 * @returns {{
 *   combos: Array<{id: string, name: string, description: string, multiplier: number}>,
 *   bestMultiplier: number,
 *   comboBonus: number
 * }}
 *   - combos: all detected combos
 *   - bestMultiplier: highest multiplier (only the best applies)
 *   - comboBonus: (bestMultiplier - 1) as a factor (e.g., 2.0 → 1.0 means +100%)
 */
export function detectCombos(exercises = []) {
  if (!exercises || exercises.length === 0) {
    return { combos: [], bestMultiplier: 1.0, comboBonus: 0 };
  }

  const types = new Set();
  const counts = {};

  for (const ex of exercises) {
    const t = normalizeType(ex.exerciseType || ex.type || '');
    types.add(t);
    counts[t] = (counts[t] || 0) + 1;
  }

  const detected = [];
  for (const combo of COMBOS) {
    try {
      if (combo.detect(types, counts, exercises)) {
        detected.push({
          id: combo.id,
          name: combo.name,
          description: combo.description,
          multiplier: combo.multiplier,
        });
      }
    } catch (err) {
      logger.warn(`Combo detection error for ${combo.id}: ${err.message}`);
    }
  }

  // Only the best multiplier applies (no stacking)
  const bestMultiplier = detected.length > 0
    ? Math.max(...detected.map((c) => c.multiplier))
    : 1.0;

  return {
    combos: detected,
    bestMultiplier,
    comboBonus: Math.round((bestMultiplier - 1) * 100) / 100,
  };
}

/**
 * Compute per-exercise XP from an array of exercises.
 * Uses each exercise's `experiencePointsEarned` field if available,
 * otherwise falls back to difficulty-based calculation.
 *
 * @param {Array} exercises - Exercise objects with optional XP/difficulty fields
 * @returns {number} Total per-exercise XP (before combo multiplier)
 */
export function sumExerciseXP(exercises = []) {
  let total = 0;
  for (const ex of exercises) {
    if (ex.experiencePointsEarned && ex.experiencePointsEarned > 0) {
      total += ex.experiencePointsEarned;
    } else {
      // Fallback: difficulty-based (difficulty 1-5 * 10)
      const diff = ex.difficulty || 1;
      const scaledDiff = diff > 10 ? Math.round(diff / 10) : diff;
      total += scaledDiff * 10;
    }
  }
  return total;
}

export default { detectCombos, sumExerciseXP };
