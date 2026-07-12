/**
 * Coach Command Center route context helpers.
 *
 * Keeps URL parsing, return-route safety, and route-prefilled Coach prompts
 * outside the main controller/logic module.
 */
import { normalizeIsoDateOnly } from '../../../../utils/isoDateOnly';
import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';
import type {
  CoachChatRouteRequestContext,
  CoachCommandRouteContext,
  CoachScheduledSessionRouteContext,
} from './CoachCommandCenter.types';

export function parseRouteClientId(rawClientId: string | null): number | null {
  const trimmedClientId = rawClientId?.trim();
  if (!trimmedClientId || !/^[1-9]\d*$/.test(trimmedClientId)) return null;

  const parsed = Number(trimmedClientId);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseRouteThreadId(rawThreadId: string | null): number | null {
  const trimmedThreadId = rawThreadId?.trim();
  if (!trimmedThreadId || !/^[1-9]\d*$/.test(trimmedThreadId)) return null;
  const parsed = Number(trimmedThreadId);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePositiveIntegerString(rawValue: string | null): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
}

function parseScheduledCredits(rawValue: string | null): number | undefined {
  const trimmed = rawValue?.trim();
  if (!trimmed || !/^(0|[1-9]\d*)$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

const ROUTE_CONTEXT_TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;

export function parseRouteContextToken(rawValue: string | null): string | null {
  if (typeof rawValue !== 'string') return null;
  const token = rawValue.trim();
  return ROUTE_CONTEXT_TOKEN_PATTERN.test(token) ? token : null;
}

export function getScheduledSessionRouteContextFromSearchParams(
  searchParams: URLSearchParams,
): CoachScheduledSessionRouteContext | null {
  const scheduledSessionId = parsePositiveIntegerString(searchParams.get('sessionId'));
  const workoutDate = normalizeIsoDateOnly(searchParams.get('workoutDate'));
  const scheduledSessionDate = scheduledSessionId ? normalizeIsoDateOnly(searchParams.get('sessionDate')) : null;
  const scheduledSessionCredits = scheduledSessionId ? parseScheduledCredits(searchParams.get('sessionCredits')) : undefined;
  const context: CoachScheduledSessionRouteContext = {
    ...(workoutDate ? { workoutDate } : {}),
    ...(scheduledSessionId ? { scheduledSessionId } : {}),
    ...(scheduledSessionDate ? { scheduledSessionDate } : {}),
    ...(scheduledSessionCredits !== undefined ? { scheduledSessionCredits } : {}),
  };
  return Object.keys(context).length ? context : null;
}

export function buildCommandRouteContext(
  routeIntent: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
): CoachCommandRouteContext {
  return {
    source: 'coach-command-center',
    intent: routeIntent,
    ...(scheduledSession || {}),
  };
}

export function buildChatRouteRequestContext(
  routeIntent: string | null,
  routeSource: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
): CoachChatRouteRequestContext | null {
  const intent = parseRouteContextToken(routeIntent);
  const source = parseRouteContextToken(routeSource) || 'coach-command-center';
  const scheduled = scheduledSession || {};
  if (!intent && Object.keys(scheduled).length === 0) return null;
  return {
    source,
    ...(intent ? { intent } : {}),
    surface: 'coach-command-center',
    ...scheduled,
  };
}

const UNSAFE_RETURN_ROUTE_PATTERN = /[\r\n\t\\]|%(?:0a|0d|09|2e|2f|5c)/i;

function hasDotOrDoubleSlashSegment(value: string): boolean { const pathname = value.split(/[?#]/, 1)[0]; return pathname.includes('//') || pathname.split('/').some((segment) => segment === '.' || segment === '..'); }

type ReturnRouteRole = 'admin' | 'trainer' | 'client';

function isRoleScopedDashboardRoute(value: string, userRole?: ReturnRouteRole | null): boolean {
  const roleRoot = userRole === 'admin' || userRole === 'trainer' || userRole === 'client' ? `/dashboard/${userRole}` : null;
  return roleRoot ? value === roleRoot || value.startsWith(`${roleRoot}/`) || value.startsWith(`${roleRoot}?`) : value.startsWith('/dashboard/');
}

const RETURN_ROUTE_REJECTORS: Array<(value: string) => boolean> = [
  (value) => value.startsWith('//'),
  (value) => UNSAFE_RETURN_ROUTE_PATTERN.test(value),
  (value) => hasDotOrDoubleSlashSegment(value),
];

function isUnsafeReturnRoute(value: string | null, userRole?: ReturnRouteRole | null): boolean {
  return !value || RETURN_ROUTE_REJECTORS.some((reject) => reject(value)) || !isRoleScopedDashboardRoute(value, userRole);
}

export function normalizeCommandCenterReturnTo(rawReturnTo: string | null, userRole?: ReturnRouteRole | null): string | null {
  const returnTo = rawReturnTo?.trim() || null;
  return isUnsafeReturnRoute(returnTo, userRole) ? null : returnTo;
}

const RETURN_LABELS: Record<string, string> = {
  'admin-overview': 'Back to Admin Overview', 'clients-team': 'Back to Client Hub', 'master-schedule': 'Back to Schedule',
  'trainer-overview': 'Back to Trainer Home', 'client-dashboard': 'Back to Client Dashboard',
  'admin-workout-logger': 'Back to Workout Logger', 'trainer-workout-logger': 'Back to Workout Logger', 'client-workout-logger': 'Back to Workout Logger',
  'admin-workout-planner': `Back to ${CANONICAL_SURFACES.workoutPlanner.name}`, 'trainer-workout-planner': `Back to ${CANONICAL_SURFACES.workoutPlanner.name}`, 'client-workout-planner': 'Back to My Workouts',
};

function commandCenterReturnPathLabel(returnTo: string): string {
  const pathname = returnTo.split(/[?#]/, 1)[0];
  if (pathname === '/dashboard/admin/log-my-workout' || /^\/dashboard\/(?:trainer|client)\/log-workout\/?$/.test(pathname)) return 'Back to Workout Logger';
  if (/^\/dashboard\/(?:admin|trainer)\/workout-planner\/?$/.test(pathname)) return `Back to ${CANONICAL_SURFACES.workoutPlanner.name}`;
  if (pathname === '/dashboard/client/workouts') return 'Back to My Workouts';
  if (pathname.startsWith('/dashboard/admin/client-management')) return 'Back to Client Hub';
  if (/^\/dashboard\/(?:admin|trainer)\/schedule\/?$/.test(pathname)) return 'Back to Schedule';
  if (pathname === '/dashboard/trainer/overview') return 'Back to Trainer Home';
  if (pathname.startsWith('/dashboard/client/')) return 'Back to Client Dashboard';
  return 'Back to Dashboard';
}

function commandCenterReturnLabel(returnTo: string, source: string | null): string {
  return (source ? RETURN_LABELS[source] : null) ?? commandCenterReturnPathLabel(returnTo);
}

export function buildWorkflowReturnLabel(workflowReturnTo: string | null, source: string | null): string | null { return workflowReturnTo ? commandCenterReturnLabel(workflowReturnTo, source) : null; }
export function buildRouteClientLabel(routeClientId: number | null): string | null { return routeClientId ? `Client #${routeClientId}` : null; }

const THREAD_SELECTION_STALE_KEYS = [
  'intent',
  'source',
  'returnTo',
  'sourcePath',
  'teachPrompt',
  'sessionId',
  'sessionDate',
  'sessionCredits',
  'workoutDate',
  'draftKey',
];

export function buildThreadSelectionSearchParams(
  currentParams: URLSearchParams,
  rawTargetUserId: number | string | null | undefined,
  rawThreadId: number | string | null | undefined,
): URLSearchParams {
  const nextParams = new URLSearchParams(currentParams);
  THREAD_SELECTION_STALE_KEYS.forEach((key) => nextParams.delete(key));
  const threadClientId = parseRouteClientId(rawTargetUserId == null ? null : String(rawTargetUserId));
  const threadId = parseRouteThreadId(rawThreadId == null ? null : String(rawThreadId));
  if (threadClientId) nextParams.set('clientId', String(threadClientId));
  else nextParams.delete('clientId');
  if (threadId) nextParams.set('threadId', String(threadId));
  else nextParams.delete('threadId');
  return nextParams;
}

export type { RouteContextCopy } from './CoachCommandCenter.routeCopy';
export { buildEffectiveRouteContext, buildRouteContext, buildTeachPromptRouteContext, readHistoricalImportRouteDraft } from './CoachCommandCenter.routeCopy';
