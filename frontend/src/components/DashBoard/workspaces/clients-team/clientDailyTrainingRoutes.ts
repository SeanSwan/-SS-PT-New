export type ClientDailyIntent = 'log_workout' | 'plan_next';
type ClientDailyReturnSection = 'logger' | 'plans' | 'history';

const CLIENT_MANAGEMENT_BASE = '/dashboard/admin/client-management';

const parseClientDailyRouteClientId = (clientId: number | string): number | null => {
  const trimmed = String(clientId).trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const buildClientManagementReturnTo = (
  clientId: number | string,
  trainingSection?: ClientDailyReturnSection,
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;

  const params = new URLSearchParams({ clientId: String(parsedClientId) });
  if (trainingSection) {
    params.set('tab', 'training');
    params.set('trainingSection', trainingSection);
    if (trainingSection === 'logger') params.set('loadPlan', 'today');
  }

  return `${CLIENT_MANAGEMENT_BASE}?${params.toString()}`;
};

const buildClientDailyParams = (
  clientId: number | string,
  extraParams: Record<string, string> = {},
  returnSection?: ClientDailyReturnSection,
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;
  const returnTo = buildClientManagementReturnTo(parsedClientId, returnSection);
  if (!returnTo) return null;

  const params = new URLSearchParams({
    clientId: String(parsedClientId),
    source: 'clients-team',
    returnTo,
    ...extraParams,
  });

  return params.toString();
};

export const buildClientCoachDailyRoute = (
  clientId: number | string,
  intent: ClientDailyIntent = 'log_workout'
) => {
  const returnSection: ClientDailyReturnSection = intent === 'plan_next' ? 'plans' : 'logger';
  const params = buildClientDailyParams(clientId, { intent }, returnSection);
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
  return buildClientManagementReturnTo(clientId, 'logger');
};

export const buildClientWorkoutPlannerRoute = (clientId: number | string) => {
  const params = buildClientDailyParams(clientId, {}, 'plans');
  return params ? `/dashboard/admin/workout-planner?${params}` : null;
};
