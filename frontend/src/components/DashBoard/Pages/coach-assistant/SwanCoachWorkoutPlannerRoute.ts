/**
 * FILE: SwanCoachWorkoutPlannerRoute.ts
 * PURPOSE: Role-aware Build Plan routes launched from Swan Coach.
 *
 * Coach does not write workout plans directly. These routes only move the
 * operator into the selected-client Build Plan surface with enough context for that
 * surface to keep save/generate/review gates authoritative.
 */
import { buildClientWorkoutPlannerReturnTo } from '../../workspaces/clients-team/clientDailyTrainingRoutes';

type SwanCoachPlannerRole = 'admin' | 'trainer' | 'client';

export const ADMIN_PERSONAL_WORKOUT_PLANNER_ROUTE =
  '/dashboard/admin/workout-planner?self=1&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Flog-my-workout%3FloadPlan%3Dtoday';

type BuildSwanCoachWorkoutPlannerRouteParams = {
  userRole: SwanCoachPlannerRole;
  selectedClientId?: number | string | null;
  workflowReturnTo?: string | null;
  searchParams?: URLSearchParams;
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

const hasUnsafeReturnCharacters = (value: string): boolean => /[\r\n\t\\]|%(?:0a|0d|09|2e|2f|5c)/i.test(value);

const hasDotOrDoubleSlashSegment = (value: string): boolean => {
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname.includes('//') || pathname.split('/').some((segment) => segment === '.' || segment === '..');
};

const parseNonNegativeInteger = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || !/^(0|[1-9]\d*)$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? String(parsed) : null;
};

const ISO_SESSION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;

const safeSessionDate = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed || hasUnsafeReturnCharacters(trimmed) || !ISO_SESSION_DATE_PATTERN.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
};

const appendSafeSessionContext = (params: URLSearchParams, searchParams?: URLSearchParams): void => {
  const sessionId = parsePositiveId(searchParams?.get('sessionId'));
  if (!sessionId) return;

  params.set('sessionId', sessionId);

  const sessionDate = safeSessionDate(searchParams?.get('sessionDate'));
  if (sessionDate) params.set('sessionDate', sessionDate);

  const sessionCredits = parseNonNegativeInteger(searchParams?.get('sessionCredits'));
  if (sessionCredits !== null) params.set('sessionCredits', sessionCredits);
};

const trainerReturnTo = (value: string | null | undefined) => (
  value?.startsWith('/dashboard/trainer/')
    && !hasUnsafeReturnCharacters(value)
    && !hasDotOrDoubleSlashSegment(value)
    ? value
    : '/dashboard/trainer/overview'
);

const buildAdminClientPlannerRoute = (clientId: string, searchParams?: URLSearchParams): string | null => {
  const returnTo = buildClientWorkoutPlannerReturnTo(clientId);
  if (!returnTo) return null;

  const params = new URLSearchParams({
    clientId,
    source: 'swan-coach',
    returnTo,
  });
  appendSafeSessionContext(params, searchParams);
  return `/dashboard/admin/workout-planner?${params.toString()}`;
};

export function buildSwanCoachWorkoutPlannerRoute({
  userRole,
  selectedClientId,
  workflowReturnTo,
  searchParams,
}: BuildSwanCoachWorkoutPlannerRouteParams): string | null {
  const clientId = parsePositiveId(selectedClientId);

  if (userRole === 'admin') {
    return clientId ? buildAdminClientPlannerRoute(clientId, searchParams) : ADMIN_PERSONAL_WORKOUT_PLANNER_ROUTE;
  }

  if (userRole === 'trainer') {
    if (!clientId) return null;
    const params = new URLSearchParams({
      clientId,
      source: 'swan-coach',
      returnTo: trainerReturnTo(workflowReturnTo),
    });
    appendSafeSessionContext(params, searchParams);
    return `/dashboard/trainer/workout-planner?${params.toString()}`;
  }

  return null;
}
