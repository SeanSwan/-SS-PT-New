import {
  getClientHubAudienceConfig,
  type ClientHubAudience,
} from './clientHubAudience';

export type ClientDailyIntent = 'log_workout' | 'plan_next';
type ClientDailyReturnSection = 'architect' | 'logger' | 'plans' | 'history';

const parseClientDailyRouteClientId = (clientId: number | string): number | null => {
  const trimmed = String(clientId).trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const buildClientManagementReturnTo = (
  clientId: number | string,
  trainingSection?: ClientDailyReturnSection,
  audience: ClientHubAudience = 'admin',
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;

  const params = new URLSearchParams({ clientId: String(parsedClientId) });
  if (trainingSection) {
    params.set('tab', 'training');
    params.set('trainingSection', trainingSection);
    if (trainingSection === 'logger') params.set('loadPlan', 'today');
  }

  return `${getClientHubAudienceConfig(audience).clientManagementBase}?${params.toString()}`;
};

const buildClientDailyParams = (
  clientId: number | string,
  extraParams: Record<string, string> = {},
  returnSection?: ClientDailyReturnSection,
  audience: ClientHubAudience = 'admin',
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;
  const returnTo = buildClientManagementReturnTo(parsedClientId, returnSection, audience);
  if (!returnTo) return null;

  const params = new URLSearchParams({
    clientId: String(parsedClientId),
    source: 'clients-team',
    returnTo,
    ...extraParams,
  });

  return params.toString();
};

/** Plain Client Hub deep link (no training section) — the canonical
 *  "open this client's profile" target for intervention surfaces. */
export const buildClientProfileRoute = (
  clientId: number | string,
  audience: ClientHubAudience = 'admin',
) => buildClientManagementReturnTo(clientId, undefined, audience);

export const buildClientCoachDailyRoute = (
  clientId: number | string,
  intent: ClientDailyIntent = 'log_workout',
  audience: ClientHubAudience = 'admin',
) => {
  const returnSection: ClientDailyReturnSection = intent === 'plan_next' ? 'plans' : 'logger';
  const params = buildClientDailyParams(clientId, { intent }, returnSection, audience);
  return params
    ? `${getClientHubAudienceConfig(audience).coachAssistantBase}?${params}`
    : null;
};

export const buildClientCoachOnboardingRoute = () => {
  const params = new URLSearchParams({
    source: 'clients-team',
    workspace: 'onboarding',
    returnTo: getClientHubAudienceConfig('admin').clientManagementBase,
    intent: 'client_onboarding',
  });

  return `${getClientHubAudienceConfig('admin').coachAssistantBase}?${params.toString()}`;
};

export const buildClientWorkoutLoggerRoute = (
  clientId: number | string,
  audience: ClientHubAudience = 'admin',
) => {
  return buildClientManagementReturnTo(clientId, 'logger', audience);
};

export const buildClientWorkoutPlannerReturnTo = (
  clientId: number | string,
  audience: ClientHubAudience = 'admin',
) => {
  return buildClientManagementReturnTo(clientId, 'plans', audience);
};

export const buildClientWorkoutPlannerRoute = (
  clientId: number | string,
  audience: ClientHubAudience = 'admin',
) => {
  const parsedClientId = parseClientDailyRouteClientId(clientId);
  if (!parsedClientId) return null;

  const returnTo = buildClientWorkoutPlannerReturnTo(parsedClientId, audience);
  if (!returnTo) return null;

  const params = new URLSearchParams({
    clientId: String(parsedClientId),
    source: 'clients-team',
    returnTo,
  });

  return `${getClientHubAudienceConfig(audience).workoutPlannerBase}?${params.toString()}`;
};
const normalizeWorkoutPlanRouteId = (planId: number | string): string | null => {
  const normalized = String(planId).trim();
  return /^[A-Za-z0-9-]{1,64}$/.test(normalized) ? normalized : null;
};

export const buildClientWorkoutPlanEditRoute = (
  clientId: number | string,
  planId: number | string,
  audience: ClientHubAudience = 'admin',
) => {
  const plannerRoute = buildClientWorkoutPlannerRoute(clientId, audience);
  const normalizedPlanId = normalizeWorkoutPlanRouteId(planId);
  if (!plannerRoute || !normalizedPlanId) return null;
  const params = new URLSearchParams({ planId: normalizedPlanId, mode: 'edit' });
  return `${plannerRoute}&${params.toString()}`;
};