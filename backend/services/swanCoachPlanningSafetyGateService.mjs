/**
 * Swan Coach planning safety gate service.
 *
 * Produces generic review metadata from already de-identified planning context.
 * This helper never returns raw condition labels, names, emails, or phone data.
 *
 * Cortex P0 (directive §5.2-§5.3, 2026-07-12):
 * - Pain context is judged by its SOURCE STATE (`pain.status`), never by array
 *   shapes — an empty array is not proof anything was loaded.
 * - Signals are TIERED: safety-class signals BLOCK (status `review_required`);
 *   data-hygiene signals only ADVISE. Alarm fatigue is itself a safety failure —
 *   a gate every new client trips is a gate trainers stop reading.
 */

const SAFETY_GATE_MODE = 'deterministic_review_gate';

const PAIN_SOURCE_STATES = new Set([
  'loaded_active_issue',
  'loaded_no_active_issue',
  'unavailable',
  'stale',
  'never_collected',
]);

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function booleanFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Resolve the pain source state from context.
 * Fail-closed: when the state cannot be established, report 'unknown' — the
 * gate treats unknown like unavailable and requires review.
 */
function resolvePainSourceState(context) {
  const pain = context.pain;
  if (!pain || typeof pain !== 'object') return 'unknown';
  if (typeof pain.status === 'string' && PAIN_SOURCE_STATES.has(pain.status)) {
    return pain.status;
  }

  // Legacy shape (no status field): only NON-EMPTY evidence counts as loaded.
  if (present(pain.exclusions) || present(pain.warnings) || present(pain.activePainEntries)) {
    return 'loaded_active_issue';
  }
  if (Number(pain.activeEntries) > 0 || Number(pain.totalActiveIssues) > 0) {
    return 'loaded_active_issue';
  }
  return 'unknown';
}

export function buildSwanCoachPlanningSafetyGate(context = {}, inputs = {}) {
  const blockingSignals = [];
  const advisorySignals = [];
  const missingCriticalData = [];
  const sessionsLast2Weeks = Number(context.workouts?.sessionsLast2Weeks || 0);
  const pain = (context.pain && typeof context.pain === 'object') ? context.pain : {};
  const painSourceState = resolvePainSourceState(context);

  // ── Safety-class signals (BLOCK) ────────────────────────────────
  if (painSourceState === 'unavailable' || painSourceState === 'unknown' || painSourceState === 'stale') {
    blockingSignals.push('pain_data_unavailable');
    missingCriticalData.push('pain/injury context');
  } else if (painSourceState === 'loaded_active_issue') {
    if (present(pain.exclusions)) {
      blockingSignals.push('pain_exclusions_active');
    } else if (present(pain.warnings)) {
      blockingSignals.push('active_pain_review_required');
    } else {
      // Active entries below the warn threshold: note it, don't block on it.
      advisorySignals.push('minor_active_pain_noted');
    }
  }

  if (inputs.painInjury && !blockingSignals.some(signal => signal.startsWith('pain_') || signal.startsWith('active_pain'))) {
    blockingSignals.push('pain_or_injury_context_present');
  }

  if (booleanFlag(context.safety?.medicalClearanceRequired)
    || booleanFlag(context.baseline?.medicalClearanceRequired)
    || booleanFlag(context.baseline?.clearanceRequired)
    || booleanFlag(context.health?.medicalClearanceRequired)) {
    blockingSignals.push('medical_clearance_required');
  }

  if (present(context.health?.specialPopulationFlags)
    || present(context.specialPopulation)
    || booleanFlag(context.health?.pregnancyPostpartum)
    || booleanFlag(context.health?.olderAdult)
    || booleanFlag(context.health?.youth)) {
    blockingSignals.push('special_population_review_required');
  }

  if (booleanFlag(context.safety?.referralRecommended)
    || booleanFlag(context.health?.referralRecommended)
    || booleanFlag(context.baseline?.referralRecommended)) {
    blockingSignals.push('referral_review_recommended');
  }

  if (booleanFlag(context.criticalDataUnavailable) || present(context.criticalFailures)) {
    blockingSignals.push('source_data_unavailable');
  }

  // ── Data-hygiene signals (ADVISE) ───────────────────────────────
  if (painSourceState === 'never_collected') {
    advisorySignals.push('pain_intake_not_collected');
    missingCriticalData.push('pain/injury context');
  }
  if (present(pain.staleActiveIssues)) {
    advisorySignals.push('stale_active_pain_reassessment_due');
  }
  if (!inputs.baselineReadiness) {
    advisorySignals.push('missing_baseline_or_readiness_context');
    missingCriticalData.push('baseline/readiness context');
  }
  if (sessionsLast2Weeks < 1) {
    advisorySignals.push('low_training_history');
    missingCriticalData.push('recent workout history');
  }

  const status = blockingSignals.length > 0 ? 'review_required' : 'coach_review_ready';
  return {
    mode: SAFETY_GATE_MODE,
    status,
    painSourceState,
    blockingSignals,
    advisorySignals,
    // Back-compat alias: downstream consumers (approval gate, fingerprint) treat
    // reviewRequiredSignals as "signals that force acknowledgement" — that is the
    // blocking tier by definition.
    reviewRequiredSignals: blockingSignals,
    missingCriticalData,
    reviewMessage: status === 'review_required'
      ? 'Deterministic safety gate requires coach review before assignment.'
      : 'No deterministic review blockers detected; trainer approval still required.',
  };
}
