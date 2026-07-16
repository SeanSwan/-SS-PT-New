/**
 * Route-to-builder saved-plan hydration.
 * =====================================
 *
 * The Client Hub's Edit in Planner link carries only safe identifiers. This
 * hook waits until the selected client's canonical saved-plan list is present,
 * then invokes the existing authorized detail loader exactly once.
 */

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

interface RouteSavedPlan {
  id: string;
  name: string;
}

interface UseWorkoutPlannerRoutePlanLoadInput {
  loadPlanIntoBuilder: (planId: string, planName: string) => Promise<void> | void;
  requestedPlanId: string | null;
  routeClientId: number | null;
  routeMode: string | null;
  savedPlans: RouteSavedPlan[];
  savedPlansClientId: number | null;
  selectedClientId: number | null;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

const normalizeRoutePlanId = (value: string | null) => {
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9-]{1,64}$/.test(normalized) ? normalized : null;
};

export const useWorkoutPlannerRoutePlanLoad = ({
  loadPlanIntoBuilder,
  requestedPlanId,
  routeClientId,
  routeMode,
  savedPlans,
  savedPlansClientId,
  selectedClientId,
  setStatusMsg,
}: UseWorkoutPlannerRoutePlanLoadInput) => {
  const attemptedRouteKey = useRef<string | null>(null);

  useEffect(() => {
    const planId = normalizeRoutePlanId(requestedPlanId);
    if (
      routeMode !== 'edit'
      || !planId
      || !routeClientId
      || selectedClientId !== routeClientId
      || savedPlansClientId !== selectedClientId
      || savedPlans.length === 0
    ) return;

    const routeKey = `${routeClientId}:${planId}`;
    if (attemptedRouteKey.current === routeKey) return;
    attemptedRouteKey.current = routeKey;

    const plan = savedPlans.find((candidate) => candidate.id === planId);
    if (!plan) {
      setStatusMsg({
        type: 'error',
        text: 'The requested saved plan is no longer available for this client.',
      });
      return;
    }

    void loadPlanIntoBuilder(plan.id, plan.name);
  }, [
    loadPlanIntoBuilder,
    requestedPlanId,
    routeClientId,
    routeMode,
    savedPlans,
    savedPlansClientId,
    selectedClientId,
    setStatusMsg,
  ]);
};
