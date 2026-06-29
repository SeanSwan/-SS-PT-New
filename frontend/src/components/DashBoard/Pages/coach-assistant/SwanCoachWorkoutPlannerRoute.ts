/**
 * FILE: SwanCoachWorkoutPlannerRoute.ts
 * PURPOSE: Role-aware Build Plan routes launched from Swan Coach.
 *
 * Coach does not write workout plans directly. These routes only move the
 * operator into the selected-client Build Plan surface with enough context for that
 * surface to keep save/generate/review gates authoritative.
 */
import { buildClientWorkoutPlannerRoute } from '../../workspaces/clients-team/clientDailyTrainingRoutes';

type SwanCoachPlannerRole = 'admin' | 'trainer' | 'client';

export const ADMIN_PERSONAL_WORKOUT_PLANNER_ROUTE =
  '/dashboard/admin/workout-planner?self=1&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday';

type BuildSwanCoachWorkoutPlannerRouteParams = {
  userRole: SwanCoachPlannerRole;
  selectedClientId?: number | string | null;
  workflowReturnTo?: string | null;
};

const parsePositiveId = (value: number | string | null | undefined): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  const trimmed = value?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? String(parsed) : null;
};

const trainerReturnTo = (value: string | null | undefined) => (
  value?.startsWith('/dashboard/trainer/') ? value : '/dashboard/trainer/overview'
);

export function buildSwanCoachWorkoutPlannerRoute({
  userRole,
  selectedClientId,
  workflowReturnTo,
}: BuildSwanCoachWorkoutPlannerRouteParams): string | null {
  const clientId = parsePositiveId(selectedClientId);

  if (userRole === 'admin') {
    return clientId ? buildClientWorkoutPlannerRoute(clientId) : ADMIN_PERSONAL_WORKOUT_PLANNER_ROUTE;
  }

  if (userRole === 'trainer') {
    if (!clientId) return null;
    const params = new URLSearchParams({
      clientId,
      source: 'swan-coach',
      returnTo: trainerReturnTo(workflowReturnTo),
    });
    return `/dashboard/trainer/workout-planner?${params.toString()}`;
  }

  return null;
}
