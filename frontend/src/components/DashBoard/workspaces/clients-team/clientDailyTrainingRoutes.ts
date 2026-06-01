export type ClientDailyIntent = 'log_workout' | 'plan_next';

const CLIENT_MANAGEMENT_BASE = '/dashboard/admin/client-management';

export const parseClientDailyRouteClientId = (clientId: number | string): number | null => {
  if (typeof clientId === 'number') {
    return Number.isSafeInteger(clientId) && clientId > 0 ? clientId : null;
  }

  const trimmed = clientId.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const buildClientManagementReturnTo = (clientId: number | string) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  return parsedClientId ? `${CLIENT_MANAGEMENT_BASE}?clientId=${parsedClientId}` : null;
};

const buildClientDailyParams = (
  clientId: number | string,
  extraParams: Record<string, string> = {}
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;

  const params = new URLSearchParams({
    clientId: String(parsedClientId),
    source: 'clients-team',
    returnTo: `${CLIENT_MANAGEMENT_BASE}?clientId=${parsedClientId}`,
    ...extraParams,
  });

  return params.toString();
};

export const buildClientCoachDailyRoute = (
  clientId: number | string,
  intent: ClientDailyIntent = 'log_workout'
) => {
  const params = buildClientDailyParams(clientId, { intent });
  return params ? `/dashboard/admin/coach-assistant?${params}` : null;
};

export const buildClientCoachOnboardingRoute = () => {
  const params = new URLSearchParams({
    source: 'clients-team',
    returnTo: CLIENT_MANAGEMENT_BASE,
    intent: 'client_onboarding',
  });

  return `/dashboard/admin/coach-assistant?${params.toString()}`;
};

export const buildClientWorkoutLoggerRoute = (clientId: number | string) => {
  const params = buildClientDailyParams(clientId);
  return params ? `/dashboard/admin/log-workout?${params}` : null;
};

export const buildClientWorkoutPlannerRoute = (clientId: number | string) => {
  const params = buildClientDailyParams(clientId);
  return params ? `/dashboard/admin/workout-planner?${params}` : null;
};
