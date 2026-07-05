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
 * Fail-open contract: the gate must NEVER empty a selection pool. If every
 * candidate would be rejected, the caller receives the original pool plus
 * the rejection notes so a trainer can see why the gate stood down.
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
 * @returns {{ allowed: Array, rejected: Array<{key: string, reason: string}>, gateStoodDown: boolean }}
 */
export function applyExerciseQualityGate(candidates = [], context = {}) {
  if (allowsHighImpact(context)) {
    return { allowed: candidates, rejected: [], gateStoodDown: false };
  }

  const rejected = [];
  const allowed = candidates.filter((exercise) => {
    if (isHighImpactExercise(exercise)) {
      rejected.push({
        key: exercise?.key || exercise?.name || 'unknown',
        reason: 'high-impact move excluded from low-impact strength selection',
      });
      return false;
    }
    return true;
  });

  if (allowed.length === 0 && candidates.length > 0) {
    // Fail-open: never hand back an empty pool — surface the stand-down.
    return { allowed: candidates, rejected: [], gateStoodDown: true };
  }

  return { allowed, rejected, gateStoodDown: false };
}
