export type ClientDailyIntent = 'log_workout' | 'plan_next';

const CLIENT_MANAGEMENT_BASE = '/dashboard/admin/client-management';

export const buildClientManagementReturnTo = (clientId: number | string) =>
  `${CLIENT_MANAGEMENT_BASE}?clientId=${encodeURIComponent(String(clientId))}`;

export const buildClientCoachDailyRoute = (
  clientId: number | string,
  intent: ClientDailyIntent = 'log_workout'
) => {
  const params = new URLSearchParams({
    clientId: String(clientId),
    intent,
    source: 'clients-team',
    returnTo: buildClientManagementReturnTo(clientId),
  });

  return `/dashboard/admin/coach-assistant?${params.toString()}`;
};

export const buildClientWorkoutLoggerRoute = (clientId: number | string) =>
  `/dashboard/admin/log-workout?clientId=${encodeURIComponent(String(clientId))}`;

export const buildClientWorkoutPlannerRoute = (clientId: number | string) =>
  `/dashboard/admin/workout-planner?clientId=${encodeURIComponent(String(clientId))}`;
