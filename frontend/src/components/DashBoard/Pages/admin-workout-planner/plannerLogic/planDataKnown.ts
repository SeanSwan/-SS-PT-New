/**
 * H22 — single source of truth for "the saved-plan list actually belongs to
 * the selected client AND its fetch settled successfully".
 *
 * `fetchSavedPlans` sets `savedPlansClientId` in a finally block, so a
 * rejected GET or a 2xx failure payload leaves an empty list that is
 * indistinguishable from "this client has no plans". Everything that decides
 * whether an empty list is TRUTH (the NBA `missing_plan` chip) or UNKNOWN
 * (suppress the chip) must derive that decision from THIS predicate — the
 * first H22 repair broke exactly here because the component and its test each
 * kept a private copy that could drift.
 */

export interface PlanDataKnowledgeState {
  savedPlansClientId: number | null;
  savedPlansLoading: boolean;
  savedPlansError: boolean;
}

export function derivePlanDataKnown(
  state: PlanDataKnowledgeState,
  selectedClientId: number | null,
): boolean {
  return selectedClientId !== null
    && state.savedPlansClientId === selectedClientId
    && !state.savedPlansLoading
    && !state.savedPlansError;
}
