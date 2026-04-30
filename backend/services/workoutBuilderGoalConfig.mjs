/**
 * ============================================================================
 * FILE: workoutBuilderGoalConfig.mjs
 * PURPOSE: Goal-driven NASM-OPT phase progression and bias strategy table
 *          for the trainer/admin AI workout builder.
 * AUTHOR:  Claude Opus 4.7 | LAST MODIFIED: 2026-04-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES
 * Pure helper module consumed by workoutBuilderService.mjs. Replaces the
 * legacy hardcoded phase ramp (Math.floor(i/2)) with a goal-aware strategy.
 * Same goal + same input always yields the same output - no clock, no
 * randomness, no I/O.
 *
 * RECEIPT:
 * docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-CANONICAL-SURFACE-RECEIPT-2026-04-29.md
 *
 * EXPORTS
 * - ALLOWED_GOALS               - frozen goal allowlist matching the route validator
 * - GOAL_CONFIG                 - per-goal strategy table (label + phase fn + bias map)
 * - normalizeGoal(g)            - returns a valid goal key or 'general_fitness'
 * - resolveStartingPhase({...}) - trainer override > client context > 1
 * - buildGoalPhaseSequence({})  - mesocycle phase array of length ceil(weeks/4)
 * - getGoalOptBias({...})       - { setBias, repBias, restBias, intensityBias, exerciseBias }
 *
 * NASM-OPT PHASE REFERENCE
 *   1 Stabilization Endurance | 2 Strength Endurance | 3 Hypertrophy
 *   4 Maximal Strength        | 5 Power
 *
 * RULES OBSERVED: 4 (file-size discipline - lives in its own module),
 *                 51 (helpers are deterministic / pure, no [HYPOTHESIS] branches),
 *                 NASM-OPT-PROTOCOL.md (set/rep bands stay inside phase params)
 * ============================================================================
 */

export const ALLOWED_GOALS = Object.freeze([
  'general_fitness',
  'hypertrophy',
  'strength',
  'fat_loss',
  'athletic_performance',
  'golf_performance',
]);

const ALLOWED_GOAL_SET = new Set(ALLOWED_GOALS);

const clampPhase = (n) => {
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
};

const isValidPhase = (n) => Number.isInteger(n) && n >= 1 && n <= 5;

/**
 * Per-goal phase progression functions.
 * Each function maps mesocycle index (0-based) -> recommended NASM phase (1-5)
 * BEFORE the startingPhase floor is applied. Output is always 1-5.
 */
const GOAL_PHASE_FN = {
  // Legacy linear ramp - preserves backward-compatible behavior.
  general_fitness: (i) => Math.min(5, 1 + Math.floor(i / 2)),

  // Short ramp, then hold Phase 3 (muscular development) for the bulk of the plan.
  hypertrophy: (i) => {
    if (i === 0) return 1;
    if (i === 1) return 2;
    return 3;
  },

  // Ramp through stabilization, endurance, hypertrophy, then HOLD Phase 4 (maximal strength).
  strength: (i) => {
    if (i === 0) return 1;
    if (i === 1) return 2;
    if (i === 2) return 3;
    return 4;
  },

  // Extended Phase 2 (low-rest circuit-friendly endurance), brief Phase 3 finish to defend LBM.
  fat_loss: (i) => {
    if (i === 0) return 1;
    if (i < 4) return 2;
    return 3;
  },

  // Full periodization through every phase, reaching Phase 5 (power) by the final block.
  athletic_performance: (i) => Math.min(5, 1 + i),

  // Alternating stabilization (Phase 2 - posture/core) and power (Phase 5 - rotational speed).
  // Ideal for golf: posture-stable, rotationally explosive.
  golf_performance: (i) => {
    if (i === 0) return 1;
    return i % 2 === 1 ? 2 : 5;
  },
};

/**
 * Per-goal OPT bias map. Keys are NASM phases (1-5).
 * Values describe where in the OPT_PHASE_PARAMS band to land for set/rep/rest/intensity,
 * plus a priority order for exercise-type selection.
 *
 * `mid` is the safe default; the service may interpret it as "use the middle of the band".
 * Goals only override the phases where they have a meaningful preference; everything
 * else falls back to the default mid bias via getGoalOptBias().
 */
const DEFAULT_BIAS = Object.freeze({
  setBias: 'mid',
  repBias: 'mid',
  restBias: 'mid',
  intensityBias: 'mid',
  exerciseBias: ['compound', 'isolation', 'stability'],
});

const GOAL_BIAS_MAP = {
  general_fitness: {
    // All phases use DEFAULT_BIAS - balanced, no preference.
  },
  hypertrophy: {
    2: { setBias: 'mid', repBias: 'mid', restBias: 'mid', intensityBias: 'mid',
         exerciseBias: ['compound', 'isolation'] },
    3: { setBias: 'high', repBias: 'high', restBias: 'low', intensityBias: 'mid',
         exerciseBias: ['compound', 'isolation'] },
    4: { setBias: 'high', repBias: 'mid', restBias: 'mid', intensityBias: 'high',
         exerciseBias: ['compound', 'isolation'] },
  },
  strength: {
    3: { setBias: 'high', repBias: 'low', restBias: 'high', intensityBias: 'high',
         exerciseBias: ['compound'] },
    4: { setBias: 'high', repBias: 'low', restBias: 'high', intensityBias: 'high',
         exerciseBias: ['compound'] },
    5: { setBias: 'mid', repBias: 'low', restBias: 'high', intensityBias: 'high',
         exerciseBias: ['compound', 'plyometric'] },
  },
  fat_loss: {
    1: { setBias: 'high', repBias: 'high', restBias: 'low', intensityBias: 'mid',
         exerciseBias: ['stability', 'compound', 'core'] },
    2: { setBias: 'high', repBias: 'high', restBias: 'low', intensityBias: 'mid',
         exerciseBias: ['compound', 'stability', 'core'] },
    3: { setBias: 'mid', repBias: 'high', restBias: 'low', intensityBias: 'mid',
         exerciseBias: ['compound', 'isolation'] },
  },
  athletic_performance: {
    2: { setBias: 'mid', repBias: 'mid', restBias: 'mid', intensityBias: 'mid',
         exerciseBias: ['compound', 'stability', 'core'] },
    3: { setBias: 'mid', repBias: 'mid', restBias: 'mid', intensityBias: 'mid',
         exerciseBias: ['compound', 'plyometric'] },
    4: { setBias: 'mid', repBias: 'low', restBias: 'high', intensityBias: 'high',
         exerciseBias: ['compound', 'plyometric'] },
    5: { setBias: 'mid', repBias: 'low', restBias: 'high', intensityBias: 'mid',
         exerciseBias: ['plyometric', 'compound'] },
  },
  golf_performance: {
    1: { setBias: 'mid', repBias: 'mid', restBias: 'low', intensityBias: 'low',
         exerciseBias: ['stability', 'core', 'balance'] },
    2: { setBias: 'mid', repBias: 'mid', restBias: 'low', intensityBias: 'mid',
         exerciseBias: ['stability', 'core', 'compound'] },
    5: { setBias: 'mid', repBias: 'low', restBias: 'high', intensityBias: 'mid',
         exerciseBias: ['plyometric', 'compound'] },
  },
};

/**
 * Authoritative GOAL_CONFIG - one entry per allowed goal.
 * Holds the human label, the phase-progression function, and the bias map.
 */
export const GOAL_CONFIG = Object.freeze({
  general_fitness: {
    label: 'General Fitness',
    description: 'Balanced linear progression through stabilization, endurance, and hypertrophy.',
    phaseFn: GOAL_PHASE_FN.general_fitness,
    biasMap: GOAL_BIAS_MAP.general_fitness,
  },
  hypertrophy: {
    label: 'Muscle Growth (Hypertrophy)',
    description: 'Short ramp, then hold Phase 3 to maximize muscular development.',
    phaseFn: GOAL_PHASE_FN.hypertrophy,
    biasMap: GOAL_BIAS_MAP.hypertrophy,
  },
  strength: {
    label: 'Maximal Strength',
    description: 'Progress through Phase 3 hypertrophy then hold Phase 4 maximal strength.',
    phaseFn: GOAL_PHASE_FN.strength,
    biasMap: GOAL_BIAS_MAP.strength,
  },
  fat_loss: {
    label: 'Fat Loss',
    description: 'Extended Phase 2 strength endurance with low-rest circuits; brief Phase 3 to defend lean mass.',
    phaseFn: GOAL_PHASE_FN.fat_loss,
    biasMap: GOAL_BIAS_MAP.fat_loss,
  },
  athletic_performance: {
    label: 'Athletic Performance',
    description: 'Full periodization reaching Phase 5 power for sport-specific output.',
    phaseFn: GOAL_PHASE_FN.athletic_performance,
    biasMap: GOAL_BIAS_MAP.athletic_performance,
  },
  golf_performance: {
    label: 'Golf Performance',
    description: 'Alternates Phase 2 stability/core for posture and Phase 5 rotational power for swing speed.',
    phaseFn: GOAL_PHASE_FN.golf_performance,
    biasMap: GOAL_BIAS_MAP.golf_performance,
  },
});

/**
 * Returns a valid goal key. Unknown / invalid input -> 'general_fitness'.
 * Mirrors the safeGoal pattern at workoutBuilderRoutes.mjs:108-109.
 */
export function normalizeGoal(primaryGoal) {
  if (typeof primaryGoal !== 'string' || primaryGoal.length === 0) return 'general_fitness';
  return ALLOWED_GOAL_SET.has(primaryGoal) ? primaryGoal : 'general_fitness';
}

/**
 * Trainer override > client context > 1.
 * Override and context are validated as integer 1-5; otherwise dropped.
 */
export function resolveStartingPhase({ startingPhaseOverride, contextPhase } = {}) {
  const override = clampPhase(startingPhaseOverride);
  if (override !== null) return override;
  const context = clampPhase(contextPhase);
  if (context !== null) return context;
  return 1;
}

/**
 * Build the mesocycle phase array. Length = ceil(durationWeeks / 4).
 * Each phase is clamped to >= startingPhase and <= 5.
 */
export function buildGoalPhaseSequence({ primaryGoal, startingPhase, durationWeeks } = {}) {
  const goal = normalizeGoal(primaryGoal);
  const phaseFn = GOAL_CONFIG[goal].phaseFn;
  const startFloor = isValidPhase(startingPhase) ? startingPhase : 1;
  const weeks = Number.isFinite(durationWeeks) && durationWeeks > 0 ? durationWeeks : 12;
  const mesocycleCount = Math.max(1, Math.ceil(weeks / 4));

  const sequence = [];
  for (let i = 0; i < mesocycleCount; i++) {
    const recommended = phaseFn(i);
    const clamped = Math.min(5, Math.max(startFloor, recommended));
    sequence.push(clamped);
  }
  return sequence;
}

/**
 * Returns the OPT bias for a given goal+phase combo. Falls back to the
 * default mid-band bias when the goal does not specifically opinion-ize
 * that phase.
 */
export function getGoalOptBias({ primaryGoal, phase } = {}) {
  const goal = normalizeGoal(primaryGoal);
  const phaseKey = isValidPhase(phase) ? phase : 2; // safe default phase
  const goalMap = GOAL_CONFIG[goal].biasMap;
  const override = goalMap[phaseKey];
  if (!override) return { ...DEFAULT_BIAS };
  // Merge so unspecified keys fall back to defaults.
  return {
    setBias: override.setBias ?? DEFAULT_BIAS.setBias,
    repBias: override.repBias ?? DEFAULT_BIAS.repBias,
    restBias: override.restBias ?? DEFAULT_BIAS.restBias,
    intensityBias: override.intensityBias ?? DEFAULT_BIAS.intensityBias,
    exerciseBias: override.exerciseBias ?? [...DEFAULT_BIAS.exerciseBias],
  };
}
