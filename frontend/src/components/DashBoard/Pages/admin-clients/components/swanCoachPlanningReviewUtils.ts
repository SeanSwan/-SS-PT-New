import type { SwanCoachPlanningFingerprint } from '../../../../../services/aiWorkoutService';

const SIGNAL_LABELS: Record<string, string> = {
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
