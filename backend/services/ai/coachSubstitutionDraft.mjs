/**
 * G07/T34 — substitution DRAFT with contraindication gating (S8b).
 *
 * Produces a trainer-review draft substitution for a planned exercise using
 * the client's pain/readiness/contraindication data. Output is ALWAYS a draft
 * or a refusal — never an applied change and never a fabricated clearance:
 *
 * - 'blocked'         an ACTIVE hard contraindication matches the planned
 *                     exercise (movement pattern/muscle/joint). There is no
 *                     bypass input: a caller cannot override a block, only a
 *                     documented clinical policy process may (out of scope).
 * - 'requires_review' pain/readiness/contraindication data is unknown or the
 *                     recorded pain/readiness crosses this slice's review
 *                     thresholds (pain >= 4 on the 0-10 scale, readiness <= 3).
 *                     Unknown data can never clear an exercise.
 * - 'draft'           no contra/pain/readiness signal — still requires
 *                     trainer review before any plan change.
 *
 * The substitution payload preserves the planned exercise's identity
 * (exerciseKey), equipment and media metadata, and the replacement key.
 */

const PAIN_REVIEW_THRESHOLD = 4;   // WorkoutExercise.painLevel scale is 0-10.
const READINESS_REVIEW_FLOOR = 3;

/** A contraindication is ACTIVE only when explicitly marked active; unknown
 * activity (null/undefined active) is treated as requiring review, never as
 * safe and never as blocked. Returns 'metadata_missing' when the planned
 * exercise carries no pattern/muscle/joint to match against — a vacuous
 * check must never read as "no contraindication found". */
function activeHardMatch(contraindications, plannedExercise) {
  const patterns = [
    String(plannedExercise?.pattern || '').trim().toLowerCase(),
    String(plannedExercise?.muscleGroup || '').trim().toLowerCase(),
    String(plannedExercise?.joint || '').trim().toLowerCase(),
  ].filter(Boolean);
  if (patterns.length === 0) return 'metadata_missing';
  for (const contra of Array.isArray(contraindications) ? contraindications : []) {
    if (contra?.active !== true) continue;
    const targets = [contra.pattern, contra.muscleGroup, contra.joint]
      .map((value) => String(value || '').toLowerCase())
      .filter(Boolean);
    if (targets.some((target) => patterns.includes(target))) return contra;
  }
  return null;
}

export function buildSubstitutionDraft({
  plannedExercise = null,
  substitutions = [],
  pain = null,
  readiness = null,
  contraindications = null,
} = {}) {
  const exerciseKey = String(plannedExercise?.exerciseKey || '').trim();
  if (!exerciseKey || !plannedExercise) {
    return { status: 'requires_review', reasons: ['missing_planned_exercise'], substitution: null };
  }

  const hard = activeHardMatch(contraindications, plannedExercise);
  if (hard === 'metadata_missing') {
    return {
      status: 'requires_review',
      reasons: ['planned_exercise_metadata_unknown'],
      substitution: null,
    };
  }
  if (hard) {
    return {
      status: 'blocked',
      reasons: [`hard_contraindication_active:${hard.pattern || hard.muscleGroup || hard.joint || 'matched'}`],
      substitution: null,
    };
  }

  const reasons = [];
  if (!Array.isArray(contraindications) || contraindications.some(item => !item || typeof item.active !== 'boolean'
      || (item.active && ![item.pattern, item.muscleGroup, item.joint].some(value => typeof value === 'string' && value.trim())))) {
    reasons.push('contraindication_data_unknown');
  }
  if (typeof pain !== 'number' || !Number.isFinite(pain) || pain < 0 || pain > 10) {
    reasons.push('pain_data_unknown');
  } else if (Number(pain) >= PAIN_REVIEW_THRESHOLD) {
    reasons.push(`active_pain_${Number(pain)}`);
  }
  if (typeof readiness !== 'number' || !Number.isFinite(readiness) || readiness < 0 || readiness > 10) {
    reasons.push('readiness_data_unknown');
  } else if (Number(readiness) <= READINESS_REVIEW_FLOOR) {
    reasons.push(`low_readiness_${Number(readiness)}`);
  }
  if (reasons.length > 0) {
    return { status: 'requires_review', reasons, substitution: null };
  }

  const candidate = (Array.isArray(substitutions) ? substitutions : []).find((item) => (
    item && String(item.fromExerciseKey || '').toLowerCase() === exerciseKey.toLowerCase()
  ));
  if (!candidate?.exerciseKey) {
    return { status: 'requires_review', reasons: ['no_substitution_candidate'], substitution: null };
  }

  const replacementMatch = activeHardMatch(contraindications, candidate);
  if (replacementMatch === 'metadata_missing') return { status: 'requires_review', reasons: ['replacement_metadata_unknown'], substitution: null };
  if (replacementMatch) return { status: 'blocked', reasons: ['replacement_contraindication_active'], substitution: null };

  // Draft substitution: replacement metadata comes from the selected candidate.
  // Preserve the planned key separately for the review diff.

  return {
    status: 'draft',
    reasons: [],
    substitution: {
      fromExerciseKey: exerciseKey,
      exerciseKey: String(candidate.exerciseKey),
      equipment: candidate.equipment ?? null,
      media: candidate.media ?? null,
      requiresTrainerReview: true,
      policySource: 'G07-S8b-draft-gate',
    },
  };
}
