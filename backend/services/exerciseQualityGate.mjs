/**
 * exerciseQualityGate.mjs
 * =======================
 * Pure quality gate for AI exercise selection.
 *
 * Doctrine (Sean, 2026-07): low-impact is the DEFAULT. High-impact plyo
 * moves (jumps, hops, bounds, sprints) are cardio/athletic tools — they are
 * never main strength work for a general-population client, and they only
 * enter a session when the trainer explicitly asks for an athletic/hardcore
 * style or the client sits in a power phase (NASM 5).
 *
 * Rejection classes (Cortex P0 §5.7, 2026-07-12):
 * - STYLE rejections (high-impact vs low-impact default) keep the fail-open
 *   contract: the gate must never empty a selection pool; an all-rejected
 *   pool falls back untouched with `gateStoodDown: true`.
 * - SAFETY rejections (via `context.safetyRejector`) NEVER stand down. A
 *   pain-excluded exercise stays excluded even when that empties the pool —
 *   an empty pool is a safer failure than a contraindicated exercise.
 */

const HIGH_IMPACT_NAME_PATTERN = /\b(jumps?|jumping|hops?|hopping|bounds?|bounding|plyo\w*|sprints?|leaps?|slams?|explosive)\b/i;

export const isHighImpactExercise = (exercise) => {
  const name = `${exercise?.name || ''} ${exercise?.key || ''}`.replace(/_/g, ' ');
  return HIGH_IMPACT_NAME_PATTERN.test(name);
};

export const allowsHighImpact = ({ nasmPhase, trainingStyleMode, primaryGoal } = {}) => (
  trainingStyleMode === 'hardcore'
  || nasmPhase === 5
  || primaryGoal === 'athletic_performance'
  || primaryGoal === 'power'
);

/**
 * Filter a candidate pool for session quality.
 *
 * @param {Array} candidates
 * @param {object} context - { nasmPhase, trainingStyleMode, primaryGoal,
 *   safetyRejector?: (exercise) => string|null } — safetyRejector returns a
 *   human-readable reason when the exercise must be excluded for SAFETY.
 * @returns {{ allowed: Array, rejected: Array<{key: string, reason: string, class: 'safety'|'style'}>, gateStoodDown: boolean }}
 */
export function applyExerciseQualityGate(candidates = [], context = {}) {
  const safetyRejector = typeof context.safetyRejector === 'function' ? context.safetyRejector : null;
  const safetyRejected = [];

  // Safety-class pass runs FIRST and its exclusions are never restored.
  const safePool = safetyRejector
    ? candidates.filter((exercise) => {
      const reason = safetyRejector(exercise);
      if (reason) {
        safetyRejected.push({
          key: exercise?.key || exercise?.name || 'unknown',
          reason,
          class: 'safety',
        });
        return false;
      }
      return true;
    })
    : candidates;

  if (allowsHighImpact(context)) {
    return { allowed: safePool, rejected: safetyRejected, gateStoodDown: false };
  }

  const styleRejected = [];
  const allowed = safePool.filter((exercise) => {
    if (isHighImpactExercise(exercise)) {
      styleRejected.push({
        key: exercise?.key || exercise?.name || 'unknown',
        reason: 'high-impact move excluded from low-impact strength selection',
        class: 'style',
      });
      return false;
    }
    return true;
  });

  if (allowed.length === 0 && safePool.length > 0) {
    // Fail-open restores ONLY the style rejections — never the safety ones.
    return { allowed: safePool, rejected: safetyRejected, gateStoodDown: true };
  }

  return { allowed, rejected: [...safetyRejected, ...styleRejected], gateStoodDown: false };
}
