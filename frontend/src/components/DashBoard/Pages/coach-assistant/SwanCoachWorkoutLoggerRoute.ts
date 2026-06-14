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
  if (!value || !/^(0|[1-9]\d*)$/.test(value)) return null;
  return Number.isSafeInteger(Number(value)) ? value : null;
};

const parseIsoDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const parseTrainerReturnTo = (value: string | null): string | null => {
  return value?.startsWith('/dashboard/trainer/') ? value : null;
};

export function buildSwanCoachWorkoutLoggerRoute({
  userRole,
  selectedClientId,
  searchParams,
}: BuildSwanCoachWorkoutLoggerRouteParams): string | null {
  if (userRole === 'client') return '/dashboard/client/log-workout?loadPlan=today';

  const clientId = parsePositiveId(selectedClientId);
  if (userRole === 'admin') {
    return clientId ? buildClientWorkoutLoggerRoute(clientId) : ADMIN_PERSONAL_WORKOUT_LOGGER_ROUTE;
  }

  if (!clientId) return null;

  const params = new URLSearchParams({
    clientId,
    source: 'swan-coach',
    loadPlan: 'today',
  });

  const returnTo = parseTrainerReturnTo(searchParams.get('returnTo'));
  if (returnTo) params.set('returnTo', returnTo);

  const sessionId = parsePositiveId(searchParams.get('sessionId'));
  if (sessionId) params.set('sessionId', sessionId);

  const sessionDate = parseIsoDate(searchParams.get('sessionDate'));
  if (sessionDate) params.set('sessionDate', sessionDate);

  const sessionCredits = parseNonNegativeInteger(searchParams.get('sessionCredits'));
  if (sessionCredits) params.set('sessionCredits', sessionCredits);

  return `/dashboard/trainer/log-workout?${params.toString()}`;
}
