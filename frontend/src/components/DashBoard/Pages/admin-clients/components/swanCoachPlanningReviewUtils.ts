import type { SwanCoachPlanningFingerprint } from '../../../../../services/aiWorkoutService';

const SIGNAL_LABELS: Record<string, string> = {
  // Cortex P0 blocking-tier signal names (2026-07-12)
  pain_data_unavailable: 'Pain data could not be loaded',
  pain_exclusions_active: 'Active pain auto-excluded muscle groups',
  active_pain_review_required: 'Active pain reported — review required',
  pain_intake_not_collected: 'Pain intake never collected',
  minor_active_pain_noted: 'Minor active pain noted',
  stale_active_pain_reassessment_due: 'Active pain report is stale — reassessment due',
  // Retained legacy/advisory names still emitted elsewhere
  missing_pain_or_injury_context: 'Missing pain or injury context',
  missing_baseline_or_readiness_context: 'Missing baseline or readiness context',
  low_training_history: 'Limited recent workout history',
  pain_or_injury_context_present: 'Pain or injury context present',
  medical_clearance_required: 'Medical clearance review',
  special_population_review_required: 'Special population review',
  referral_review_recommended: 'Referral review recommended',
  source_data_unavailable: 'Source data unavailable',
};

export function requiresSwanCoachPlanningReview(
  planning: SwanCoachPlanningFingerprint | null | undefined,
) {
  return planning?.safetyGate?.status === 'review_required';
}

export function labelPlanningSignal(signal: string) {
  return SIGNAL_LABELS[signal] || signal.replace(/_/g, ' ');
}

export function nonEmptyList(values: string[] | undefined) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}
