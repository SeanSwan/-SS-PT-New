/**
 * Swan Coach planning metadata types.
 *
 * Shared API contract for workout and long-horizon draft responses. The
 * backend returns generic review signals only; raw health labels and PII stay
 * out of this metadata.
 */

interface SwanCoachPlanningSafetyGate {
  mode: 'deterministic_review_gate';
  status: 'coach_review_ready' | 'review_required';
  reviewRequiredSignals: string[];
  missingCriticalData: string[];
  reviewMessage: string;
}

export interface SwanCoachPlanningFingerprint {
  createdBy: 'swan_coach_planning';
  identityMode: 'client_id_only';
  horizonWeeks: number | null;
  sessionsPerWeek: number | null;
  primaryGoal: string | null;
  nasmPhase: string | number | null;
  nasmDomainsApplied: string[];
  standardsStackApplied?: string[];
  architectureRules?: string[];
  safetyGate?: SwanCoachPlanningSafetyGate;
  planInputsUsed: Record<string, boolean>;
  dataCategoriesUsed: string[];
  missingDataCategories: string[];
  rules: string[];
}
