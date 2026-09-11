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
 * safe and never as blocked. */
function activeHardMatch(contraindications, plannedExercise) {
  const patterns = [
    String(plannedExercise?.pattern || '').toLowerCase(),
    String(plannedExercise?.muscleGroup || '').toLowerCase(),
    String(plannedExercise?.joint || '').toLowerCase(),
  ].filter(Boolean);
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
  if (hard) {
    return {
      status: 'blocked',
      reasons: [`hard_contraindication_active:${hard.pattern || hard.muscleGroup || hard.joint || 'matched'}`],
      substitution: null,
    };
  }

  const reasons = [];
  if (contraindications === null || contraindications === undefined) {
    reasons.push('contraindication_data_unknown');
  }
  if (pain === null || pain === undefined) {
    reasons.push('pain_data_unknown');
  } else if (Number(pain) >= PAIN_REVIEW_THRESHOLD) {
    reasons.push(`active_pain_${Number(pain)}`);
  }
  if (readiness === null || readiness === undefined) {
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

  // Draft substitution: identity + equipment/media metadata preserved from the
  // PLANNED exercise context; trainer review is mandatory before any write.
  return {
    status: 'draft',
    reasons: [],
    substitution: {
      fromExerciseKey: exerciseKey,
      exerciseKey: String(candidate.exerciseKey),
      equipment: plannedExercise.equipment ?? null,
      media: plannedExercise.media ?? null,
      requiresTrainerReview: true,
      policySource: 'G07-S8b-draft-gate',
    },
  };
}
