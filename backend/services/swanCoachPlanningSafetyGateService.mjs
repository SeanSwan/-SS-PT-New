/**
 * Swan Coach planning safety gate service.
 *
 * Produces generic review metadata from already de-identified planning context.
 * This helper never returns raw condition labels, names, emails, or phone data.
 */

const SAFETY_GATE_MODE = 'deterministic_review_gate';

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function booleanFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function hasPainContext(context) {
  const pain = context.pain;
  if (!pain) return false;
  if (typeof pain !== 'object') return present(pain);
  return Array.isArray(pain.exclusions)
    || Array.isArray(pain.warnings)
    || Array.isArray(pain.activePainEntries)
    || present(pain.exclusions)
    || present(pain.warnings)
    || present(pain.activePainEntries)
    || present(pain.totalActiveIssues)
    || present(pain.summary);
}

function hasMedicalClearanceFlag(context) {
  return booleanFlag(context.safety?.medicalClearanceRequired)
    || booleanFlag(context.baseline?.medicalClearanceRequired)
    || booleanFlag(context.baseline?.clearanceRequired)
    || booleanFlag(context.health?.medicalClearanceRequired);
}

function hasReferralFlag(context) {
  return booleanFlag(context.safety?.referralRecommended)
    || booleanFlag(context.health?.referralRecommended)
    || booleanFlag(context.baseline?.referralRecommended);
}

function hasSpecialPopulationFlag(context) {
  return present(context.health?.specialPopulationFlags)
    || present(context.specialPopulation)
    || booleanFlag(context.health?.pregnancyPostpartum)
    || booleanFlag(context.health?.olderAdult)
    || booleanFlag(context.health?.youth);
}

export function buildSwanCoachPlanningSafetyGate(context = {}, inputs = {}) {
  const reviewRequiredSignals = [];
  const missingCriticalData = [];
  const sessionsLast2Weeks = Number(context.workouts?.sessionsLast2Weeks || 0);
  const addMissing = (signal, label) => {
    reviewRequiredSignals.push(signal);
    missingCriticalData.push(label);
  };

  if (!hasPainContext(context)) addMissing('missing_pain_or_injury_context', 'pain/injury context');
  if (!inputs.baselineReadiness) addMissing('missing_baseline_or_readiness_context', 'baseline/readiness context');
  if (sessionsLast2Weeks < 1) addMissing('low_training_history', 'recent workout history');
  if (inputs.painInjury) reviewRequiredSignals.push('pain_or_injury_context_present');
  if (hasMedicalClearanceFlag(context)) reviewRequiredSignals.push('medical_clearance_required');
  if (hasSpecialPopulationFlag(context)) reviewRequiredSignals.push('special_population_review_required');
  if (hasReferralFlag(context)) reviewRequiredSignals.push('referral_review_recommended');
  if (booleanFlag(context.criticalDataUnavailable) || present(context.criticalFailures)) {
    reviewRequiredSignals.push('source_data_unavailable');
  }

  const status = reviewRequiredSignals.length > 0 ? 'review_required' : 'coach_review_ready';
  return {
    mode: SAFETY_GATE_MODE,
    status,
    reviewRequiredSignals,
    missingCriticalData,
    reviewMessage: status === 'review_required'
      ? 'Deterministic safety gate requires coach review before assignment.'
      : 'No deterministic review blockers detected; trainer approval still required.',
  };
}
