/**
 * Workout Variation Engine — NASM-Aligned Periodization
 * =====================================================
 * Phase 8: Smart exercise rotation keeping workouts fresh while
 * maintaining progressive overload.
 *
 * The 2-Week Rotation Principle:
 *   BUILD -> BUILD -> SWITCH -> BUILD -> BUILD -> SWITCH...
 *
 * Configurable patterns:
 *   Standard:     2:1 (BUILD-BUILD-SWITCH)
 *   Aggressive:   1:1 (BUILD-SWITCH)
 *   Conservative: 3:1 (BUILD-BUILD-BUILD-SWITCH)
 *
 * Variation Logic (for SWITCH sessions):
 *   1. Find exercises targeting same muscles as original
 *   2. Filter by equipment available at location
 *   3. Exclude exercises conflicting with client's compensations
 *   4. Exclude recently used (last 2 sessions)
 *   5. Match NASM progression level
 *   6. Rank by novelty + muscle match quality
 */
import { getVariationLog } from '../models/index.mjs';

import logger from '../utils/logger.mjs';

// ── Rotation Pattern Config ────────────────────────────────────────

const ROTATION_PATTERNS = {
  standard: { buildCount: 2, label: 'Standard (2:1)' },
  aggressive: { buildCount: 1, label: 'Aggressive (1:1)' },
  conservative: { buildCount: 3, label: 'Conservative (3:1)' },
};

// ── Built-in Exercise Registry (81 exercises) ──────────────────────
// Maps exercise keys to muscle groups + metadata for variation matching.
// This is the canonical reference used by the variation engine.

const EXERCISE_REGISTRY = {
  // === CHEST ===
  barbell_bench_press: { muscles: ['chest', 'triceps', 'anterior_deltoid'], category: 'push', equipment: ['barbell', 'bench'], nasmLevel: 3 },
  dumbbell_bench_press: { muscles: ['chest', 'triceps', 'anterior_deltoid'], category: 'push', equipment: ['dumbbell', 'bench'], nasmLevel: 2 },
  incline_bench_press: { muscles: ['upper_chest', 'triceps', 'anterior_deltoid'], category: 'push', equipment: ['barbell', 'bench'], nasmLevel: 3 },
  incline_dumbbell_press: { muscles: ['upper_chest', 'triceps', 'anterior_deltoid'], category: 'push', equipment: ['dumbbell', 'bench'], nasmLevel: 2 },
  dumbbell_flyes: { muscles: ['chest', 'anterior_deltoid'], category: 'push', equipment: ['dumbbell', 'bench'], nasmLevel: 2 },
  cable_crossover: { muscles: ['chest', 'anterior_deltoid'], category: 'push', equipment: ['cable_machine'], nasmLevel: 2 },
  push_ups: { muscles: ['chest', 'triceps', 'anterior_deltoid', 'core'], category: 'push', equipment: ['bodyweight'], nasmLevel: 1 },
  decline_bench_press: { muscles: ['lower_chest', 'triceps'], category: 'push', equipment: ['barbell', 'bench'], nasmLevel: 3 },
  chest_dips: { muscles: ['chest', 'triceps', 'anterior_deltoid'], category: 'push', equipment: ['bodyweight'], nasmLevel: 3 },

  // === BACK ===
  barbell_row: { muscles: ['lats', 'rhomboids', 'biceps', 'rear_deltoid'], category: 'pull', equipment: ['barbell'], nasmLevel: 3 },
  dumbbell_row: { muscles: ['lats', 'rhomboids', 'biceps', 'rear_deltoid'], category: 'pull', equipment: ['dumbbell', 'bench'], nasmLevel: 2 },
  lat_pulldown: { muscles: ['lats', 'biceps', 'rear_deltoid'], category: 'pull', equipment: ['cable_machine'], nasmLevel: 2 },
  pull_ups: { muscles: ['lats', 'biceps', 'rear_deltoid', 'core'], category: 'pull', equipment: ['pull_up_bar'], nasmLevel: 3 },
  chin_ups: { muscles: ['lats', 'biceps', 'core'], category: 'pull', equipment: ['pull_up_bar'], nasmLevel: 3 },
  seated_cable_row: { muscles: ['lats', 'rhomboids', 'biceps', 'rear_deltoid'], category: 'pull', equipment: ['cable_machine'], nasmLevel: 2 },
  face_pulls: { muscles: ['rear_deltoid', 'rhomboids', 'rotator_cuff'], category: 'pull', equipment: ['cable_machine', 'resistance_band'], nasmLevel: 1 },
  straight_arm_pulldown: { muscles: ['lats', 'core'], category: 'pull', equipment: ['cable_machine'], nasmLevel: 2 },
  inverted_row: { muscles: ['lats', 'rhomboids', 'biceps'], category: 'pull', equipment: ['bodyweight', 'rack'], nasmLevel: 2 },
  deadlift: { muscles: ['erector_spinae', 'glutes', 'hamstrings', 'lats', 'traps'], category: 'hinge', equipment: ['barbell'], nasmLevel: 4 },

  // === SHOULDERS ===
  overhead_press: { muscles: ['anterior_deltoid', 'lateral_deltoid', 'triceps'], category: 'push', equipment: ['barbell'], nasmLevel: 3 },
  dumbbell_shoulder_press: { muscles: ['anterior_deltoid', 'lateral_deltoid', 'triceps'], category: 'push', equipment: ['dumbbell'], nasmLevel: 2 },
  lateral_raises: { muscles: ['lateral_deltoid'], category: 'push', equipment: ['dumbbell'], nasmLevel: 1 },
  front_raises: { muscles: ['anterior_deltoid'], category: 'push', equipment: ['dumbbell'], nasmLevel: 1 },
  reverse_flyes: { muscles: ['rear_deltoid', 'rhomboids'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 1 },
  arnold_press: { muscles: ['anterior_deltoid', 'lateral_deltoid', 'triceps'], category: 'push', equipment: ['dumbbell'], nasmLevel: 2 },
  upright_row: { muscles: ['lateral_deltoid', 'traps', 'biceps'], category: 'pull', equipment: ['barbell', 'dumbbell'], nasmLevel: 2 },
  shrugs: { muscles: ['traps'], category: 'pull', equipment: ['barbell', 'dumbbell'], nasmLevel: 1 },

  // === ARMS ===
  barbell_curl: { muscles: ['biceps'], category: 'pull', equipment: ['barbell'], nasmLevel: 1 },
  dumbbell_curl: { muscles: ['biceps'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 1 },
  hammer_curl: { muscles: ['biceps', 'brachioradialis'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 1 },
  preacher_curl: { muscles: ['biceps'], category: 'pull', equipment: ['barbell', 'bench'], nasmLevel: 2 },
  cable_curl: { muscles: ['biceps'], category: 'pull', equipment: ['cable_machine'], nasmLevel: 1 },
  tricep_pushdown: { muscles: ['triceps'], category: 'push', equipment: ['cable_machine'], nasmLevel: 1 },
  skull_crushers: { muscles: ['triceps'], category: 'push', equipment: ['barbell', 'bench'], nasmLevel: 2 },
  overhead_tricep_extension: { muscles: ['triceps'], category: 'push', equipment: ['dumbbell', 'cable_machine'], nasmLevel: 1 },
  dips: { muscles: ['triceps', 'chest', 'anterior_deltoid'], category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  close_grip_bench_press: { muscles: ['triceps', 'chest'], category: 'push', equipment: ['barbell', 'bench'], nasmLevel: 3 },

  // === LEGS: QUADS ===
  barbell_squat: { muscles: ['quads', 'glutes', 'hamstrings', 'core'], category: 'squat', equipment: ['barbell', 'rack'], nasmLevel: 4 },
  front_squat: { muscles: ['quads', 'core', 'glutes'], category: 'squat', equipment: ['barbell', 'rack'], nasmLevel: 4 },
  goblet_squat: { muscles: ['quads', 'glutes', 'core'], category: 'squat', equipment: ['dumbbell', 'kettlebell'], nasmLevel: 2 },
  leg_press: { muscles: ['quads', 'glutes', 'hamstrings'], category: 'squat', equipment: ['machine'], nasmLevel: 2 },
  leg_extension: { muscles: ['quads'], category: 'squat', equipment: ['machine'], nasmLevel: 1 },
  walking_lunges: { muscles: ['quads', 'glutes', 'hamstrings'], category: 'lunge', equipment: ['bodyweight', 'dumbbell'], nasmLevel: 2 },
  reverse_lunges: { muscles: ['quads', 'glutes', 'hamstrings'], category: 'lunge', equipment: ['bodyweight', 'dumbbell'], nasmLevel: 2 },
  step_ups: { muscles: ['quads', 'glutes'], category: 'lunge', equipment: ['bench', 'dumbbell'], nasmLevel: 2 },
  bulgarian_split_squat: { muscles: ['quads', 'glutes', 'hamstrings'], category: 'lunge', equipment: ['dumbbell', 'bench'], nasmLevel: 3 },
  wall_sit: { muscles: ['quads', 'glutes'], category: 'squat', equipment: ['bodyweight'], nasmLevel: 1 },

  // === LEGS: POSTERIOR ===
  romanian_deadlift: { muscles: ['hamstrings', 'glutes', 'erector_spinae'], category: 'hinge', equipment: ['barbell', 'dumbbell'], nasmLevel: 3 },
  leg_curl: { muscles: ['hamstrings'], category: 'hinge', equipment: ['machine'], nasmLevel: 1 },
  glute_bridge: { muscles: ['glutes', 'hamstrings'], category: 'hinge', equipment: ['bodyweight'], nasmLevel: 1 },
  hip_thrust: { muscles: ['glutes', 'hamstrings'], category: 'hinge', equipment: ['barbell', 'bench'], nasmLevel: 2 },
  good_mornings: { muscles: ['hamstrings', 'erector_spinae', 'glutes'], category: 'hinge', equipment: ['barbell'], nasmLevel: 3 },
  single_leg_deadlift: { muscles: ['hamstrings', 'glutes', 'core'], category: 'hinge', equipment: ['dumbbell', 'kettlebell'], nasmLevel: 3 },
  cable_pull_through: { muscles: ['glutes', 'hamstrings'], category: 'hinge', equipment: ['cable_machine'], nasmLevel: 2 },

  // === LEGS: CALVES / ADDUCTORS ===
  calf_raises: { muscles: ['calves'], category: 'squat', equipment: ['bodyweight', 'machine'], nasmLevel: 1 },
  seated_calf_raises: { muscles: ['calves'], category: 'squat', equipment: ['machine'], nasmLevel: 1 },
  adductor_machine: { muscles: ['adductors'], category: 'squat', equipment: ['machine'], nasmLevel: 1 },
  abductor_machine: { muscles: ['hip_abductors', 'glute_medius'], category: 'squat', equipment: ['machine'], nasmLevel: 1 },
  lateral_band_walks: { muscles: ['glute_medius', 'hip_abductors'], category: 'squat', equipment: ['resistance_band'], nasmLevel: 1 },

  // === CORE ===
  plank: { muscles: ['core', 'tva'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  side_plank: { muscles: ['obliques', 'core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  dead_bug: { muscles: ['core', 'tva'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  bird_dog: { muscles: ['core', 'erector_spinae', 'glute_medius'], category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  russian_twist: { muscles: ['obliques', 'core'], category: 'core', equipment: ['bodyweight', 'medicine_ball'], nasmLevel: 2 },
  cable_woodchop: { muscles: ['obliques', 'core'], category: 'core', equipment: ['cable_machine'], nasmLevel: 2 },
  hanging_leg_raise: { muscles: ['core', 'hip_flexors'], category: 'core', equipment: ['pull_up_bar'], nasmLevel: 3 },
  ab_rollout: { muscles: ['core', 'lats'], category: 'core', equipment: ['other'], nasmLevel: 3 },
  pallof_press: { muscles: ['core', 'obliques'], category: 'core', equipment: ['cable_machine', 'resistance_band'], nasmLevel: 2 },

  // === CORRECTIVE / MOBILITY ===
  foam_roll_it_band: { muscles: ['it_band', 'tfl'], category: 'corrective', equipment: ['foam_roller'], nasmLevel: 1 },
  foam_roll_quads: { muscles: ['quads'], category: 'corrective', equipment: ['foam_roller'], nasmLevel: 1 },
  foam_roll_calves: { muscles: ['calves'], category: 'corrective', equipment: ['foam_roller'], nasmLevel: 1 },
  band_pull_aparts: { muscles: ['rear_deltoid', 'rhomboids'], category: 'corrective', equipment: ['resistance_band'], nasmLevel: 1 },
  external_rotation: { muscles: ['rotator_cuff'], category: 'corrective', equipment: ['resistance_band', 'dumbbell'], nasmLevel: 1 },
  hip_flexor_stretch: { muscles: ['hip_flexors'], category: 'corrective', equipment: ['bodyweight'], nasmLevel: 1 },
  cat_cow: { muscles: ['erector_spinae', 'core'], category: 'corrective', equipment: ['bodyweight'], nasmLevel: 1 },
  worlds_greatest_stretch: { muscles: ['hip_flexors', 'hamstrings', 'thoracic_spine'], category: 'corrective', equipment: ['bodyweight'], nasmLevel: 1 },
};

// ── Core Logic ─────────────────────────────────────────────────────

/**
 * Determine if the next session should be BUILD or SWITCH
 * based on rotation history.
 */
export function getNextSessionType(history, pattern = 'standard') {
  const { buildCount } = ROTATION_PATTERNS[pattern] || ROTATION_PATTERNS.standard;

  if (history.length === 0) return 'build';

  // Count consecutive BUILD sessions from end of history
  let consecutiveBuilds = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].sessionType === 'build') {
      consecutiveBuilds++;
    } else {
      break;
    }
  }

  return consecutiveBuilds >= buildCount ? 'switch' : 'build';
}

/**
 * Calculate muscle overlap score between two exercises.
 * Returns 0-1 where 1 = perfect muscle match.
 */
function muscleMatchScore(exerciseA, exerciseB) {
  const musclesA = new Set(exerciseA.muscles);
  const musclesB = new Set(exerciseB.muscles);
  const intersection = [...musclesA].filter(m => musclesB.has(m)).length;
  const union = new Set([...musclesA, ...musclesB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Check if an exercise's equipment is available at the given profile.
 */
function isEquipmentAvailable(exerciseKey, availableEquipment) {
  if (!availableEquipment || availableEquipment.length === 0) return true;
  const exercise = EXERCISE_REGISTRY[exerciseKey];
  if (!exercise) return false;

  // Bodyweight exercises always available
  if (exercise.equipment.length === 1 && exercise.equipment[0] === 'bodyweight') return true;

  // Check if at least one required equipment is available
  const availableCategories = new Set(availableEquipment.map(e => e.category));
  return exercise.equipment.some(eq => availableCategories.has(eq) || eq === 'bodyweight');
}

/**
 * Generate SWITCH workout suggestions.
 *
 * @param {string[]} originalExercises - Exercise keys from the BUILD workout
 * @param {object} options
 * @param {string[]} [options.recentlyUsed] - Exercise keys used in last 2 sessions
 * @param {string[]} [options.compensations] - Compensation patterns to avoid
 * @param {object[]} [options.availableEquipment] - Equipment items at the location
 * @param {number} [options.nasmLevel] - Target NASM level (1-5)
 * @returns {Array<{original: string, replacement: string, muscleMatch: number, nasmConfidence: string}>}
 */
export function generateSwapSuggestions(originalExercises, options = {}) {
  const {
    recentlyUsed = [],
    compensations = [],
    availableEquipment = [],
    nasmLevel = null,
  } = options;

  const recentSet = new Set(recentlyUsed);
  const originalSet = new Set(originalExercises);
  const suggestions = [];

  for (const originalKey of originalExercises) {
    const original = EXERCISE_REGISTRY[originalKey];
    if (!original) {
      suggestions.push({ original: originalKey, replacement: null, muscleMatch: 0, nasmConfidence: 'N/A' });
      continue;
    }

    // Skip corrective exercises — don't swap them
    if (original.category === 'corrective') {
      suggestions.push({ original: originalKey, replacement: originalKey, muscleMatch: 1, nasmConfidence: 'Keep' });
      continue;
    }

    // Find candidates
    const candidates = [];
    for (const [key, exercise] of Object.entries(EXERCISE_REGISTRY)) {
      // Skip self, original exercises, recently used, and corrective
      if (key === originalKey) continue;
      if (originalSet.has(key)) continue;
      if (recentSet.has(key)) continue;
      if (exercise.category === 'corrective') continue;

      // Must target same muscle groups
      const matchScore = muscleMatchScore(original, exercise);
      if (matchScore < 0.3) continue;

      // Filter by equipment availability
      if (!isEquipmentAvailable(key, availableEquipment)) continue;

      // NASM level filter (within +-1 level of target)
      if (nasmLevel !== null) {
        if (Math.abs(exercise.nasmLevel - nasmLevel) > 1) continue;
      }

      // Check compensations — skip exercises that conflict
      // (simplified: if compensation mentions a muscle group, prefer exercises that don't heavily load it)
      let compensationPenalty = 0;
      for (const comp of compensations) {
        if (exercise.muscles.some(m => comp.toLowerCase().includes(m))) {
          compensationPenalty += 0.2;
        }
      }

      candidates.push({
        key,
        matchScore: matchScore - compensationPenalty,
        nasmLevel: exercise.nasmLevel,
        exercise,
      });
    }

    // Sort by match score (highest first)
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    if (candidates.length > 0) {
      const best = candidates[0];
      const nasmConfidence = nasmLevel !== null
        ? (best.nasmLevel === nasmLevel ? 'High' : 'Medium')
        : 'N/A';

      suggestions.push({
        original: originalKey,
        replacement: best.key,
        muscleMatch: Math.round(best.matchScore * 100),
        nasmConfidence,
        replacementName: formatExerciseName(best.key),
        originalName: formatExerciseName(originalKey),
        muscles: best.exercise.muscles,
      });
    } else {
      // No suitable replacement found — keep original
      suggestions.push({
        original: originalKey,
        replacement: originalKey,
        muscleMatch: 100,
        nasmConfidence: 'Keep',
        replacementName: formatExerciseName(originalKey),
        originalName: formatExerciseName(originalKey),
        muscles: original.muscles,
      });
    }
  }

  return suggestions;
}

/**
 * Get the variation timeline for a client showing recent BUILD/SWITCH pattern.
 */
export async function getVariationTimeline(clientId, category, limit = 10) {
  const VariationLog = getVariationLog();
  const logs = await VariationLog.findAll({
    where: { clientId, templateCategory: category },
    order: [['sessionDate', 'DESC']],
    limit,
  });
  return logs.reverse();
}

/**
 * Record a variation log entry.
 */
export async function recordVariation({
  clientId, trainerId, templateCategory, sessionType,
  rotationPattern, sessionNumber, exercisesUsed,
  swapDetails, equipmentProfileId, nasmPhase,
}) {
  const VariationLog = getVariationLog();
  return VariationLog.create({
    clientId,
    trainerId,
    templateCategory,
    sessionType,
    rotationPattern: rotationPattern || 'standard',
    sessionNumber: sessionNumber || 1,
    exercisesUsed: exercisesUsed || [],
    swapDetails: swapDetails || null,
    equipmentProfileId: equipmentProfileId || null,
    nasmPhase: nasmPhase || null,
    sessionDate: new Date(),
    accepted: false,
  });
}

/**
 * Accept a variation suggestion (trainer confirmation).
 */
export async function acceptVariation(logId, trainerId) {
  const VariationLog = getVariationLog();
  const log = await VariationLog.findByPk(logId);
  if (!log) throw new Error('Variation log not found');
  if (log.trainerId !== trainerId) throw new Error('Access denied');
  await log.update({ accepted: true, acceptedAt: new Date() });
  return log;
}

/**
 * Format exercise key to display name.
 */
function formatExerciseName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get the full exercise registry (for frontend exercise pickers).
 */
export function getExerciseRegistry() {
  return Object.entries(EXERCISE_REGISTRY).map(([key, data]) => ({
    key,
    name: formatExerciseName(key),
    ...data,
  }));
}

/**
 * Get available rotation patterns.
 */
export function getRotationPatterns() {
  return Object.entries(ROTATION_PATTERNS).map(([key, data]) => ({
    key,
    ...data,
  }));
}

export default {
  getNextSessionType,
  generateSwapSuggestions,
  getVariationTimeline,
  recordVariation,
  acceptVariation,
  getExerciseRegistry,
  getRotationPatterns,
  EXERCISE_REGISTRY,
  ROTATION_PATTERNS,
};
