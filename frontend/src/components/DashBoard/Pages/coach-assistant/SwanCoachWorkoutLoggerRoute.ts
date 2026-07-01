import { buildClientWorkoutLoggerRoute } from '../../workspaces/clients-team/clientDailyTrainingRoutes';

type SwanCoachLoggerRole = 'admin' | 'trainer' | 'client';

export const ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE = '/dashboard/admin/log-my-workout?loadPlan=today';

type BuildSwanCoachWorkoutLoggerRouteParams = {
  userRole: SwanCoachLoggerRole;
  selectedClientId?: number | string | null;
  searchParams: URLSearchParams;
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

const parseNonNegativeInteger = (value: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || !/^(0|[1-9]\d*)$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
};

const hasUnsafeRouteCharacters = (value: string): boolean => /[\r\n\t\\]|%(?:0a|0d|09|2e|2f|5c)/i.test(value);

const hasDotOrDoubleSlashSegment = (value: string): boolean => {
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname.includes('//') || pathname.split('/').some((segment) => segment === '.' || segment === '..');
};

const ISO_SESSION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;

const parseRouteDate = (value: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || hasUnsafeRouteCharacters(trimmed) || !ISO_SESSION_DATE_PATTERN.test(trimmed)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const date = new Date(trimmed);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const parseTrainerReturnTo = (value: string | null): string | null => {
  const returnTo = value?.trim();
  return returnTo
    && returnTo.startsWith('/dashboard/trainer/')
    && !hasUnsafeRouteCharacters(returnTo)
    && !hasDotOrDoubleSlashSegment(returnTo)
    ? returnTo
    : null;
};

const appendSafeSessionContext = (params: URLSearchParams, searchParams: URLSearchParams): void => {
  const sessionId = parsePositiveId(searchParams.get('sessionId'));
  if (!sessionId) return;

  params.set('sessionId', sessionId);

  const sessionDate = parseRouteDate(searchParams.get('sessionDate'));
  if (sessionDate) params.set('sessionDate', sessionDate);

  const sessionCredits = parseNonNegativeInteger(searchParams.get('sessionCredits'));
  if (sessionCredits !== null) params.set('sessionCredits', sessionCredits);
};

const appendContextToRoute = (route: string, searchParams: URLSearchParams): string => {
  const queryStart = route.indexOf('?');
  if (queryStart < 0) return route;

  const path = route.slice(0, queryStart);
  const params = new URLSearchParams(route.slice(queryStart + 1));
  appendSafeSessionContext(params, searchParams);
  return `${path}?${params.toString()}`;
};

export function buildSwanCoachWorkoutLoggerRoute({
  userRole,
  selectedClientId,
  searchParams,
}: BuildSwanCoachWorkoutLoggerRouteParams): string | null {
  if (userRole === 'client') return '/dashboard/client/log-workout?loadPlan=today';

  const clientId = parsePositiveId(selectedClientId);
  if (userRole === 'admin') {
    return clientId
      ? appendContextToRoute(buildClientWorkoutLoggerRoute(clientId) || ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE, searchParams)
      : ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE;
  }

  if (!clientId) return null;

  const params = new URLSearchParams({
    clientId,
    source: 'swan-coach',
    loadPlan: 'today',
  });

  const returnTo = parseTrainerReturnTo(searchParams.get('returnTo'));
  if (returnTo) params.set('returnTo', returnTo);

  appendSafeSessionContext(params, searchParams);

  return `/dashboard/trainer/log-workout?${params.toString()}`;
}
