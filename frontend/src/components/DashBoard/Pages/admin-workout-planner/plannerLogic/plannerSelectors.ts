/** @since S14 — extracted pure logic. NOT WIRED until S15. */
import { OPT_PHASES } from '../WorkoutPlannerTypes';

export const selectPlannerPhase = (phaseNumber: number) => (
  OPT_PHASES.find(phase => phase.phase === phaseNumber) ?? OPT_PHASES.find(phase => phase.phase === 2) ?? OPT_PHASES[0]
);

export const selectLoadedPlan = <T extends { id: string }>(plans: readonly T[], loadedPlanId: string | null) => (
  loadedPlanId ? plans.find(plan => plan.id === loadedPlanId) : undefined
);

export const selectHasPlannerContent = (selectedClientId: number | null, exerciseCount: number, hasGeneratedPlan: boolean) => (
  Boolean(selectedClientId !== null && (exerciseCount > 0 || hasGeneratedPlan))
);
