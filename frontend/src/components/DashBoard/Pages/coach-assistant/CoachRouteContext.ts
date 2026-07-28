/**
 * Read-only dashboard context contract for Swan Coach.
 *
 * The context binder lets the command lane know which dashboard surface is in
 * focus. It never grants write authority; every app-side mutation remains
 * approval-gated by deterministic backend services.
 */
import { normalizeIsoDateOnly } from '../../../../utils/isoDateOnly';

export type CoachRouteSurface =
  | 'client_overview'
  | 'workout_logging'
  | 'progress'
  | 'community'
  | 'rewards'
  | 'profile'
  | 'schedule'
  | 'messages'
  | 'coach_command_center'
  | 'dashboard_unknown';

export type CoachActionMode = 'ask' | 'draft' | 'act';

export interface CoachRouteAction {
  key: string;
  mode: CoachActionMode;
  requiresApproval: boolean;
}

export interface CoachRouteContext {
  route: string;
  surface: CoachRouteSurface;
  scope: 'client' | 'trainer' | 'admin' | 'unknown';
  source?: string;
  intent?: string;
  scheduledSessionId?: string;
  scheduledSessionDate?: string;
  scheduledSessionCredits?: number;
  threadId?: string;
  sourceMessageId?: string;
  allowedActions: CoachRouteAction[];
  writeBackPolicy: 'approval_required';
}

const ACTIONS: Record<CoachRouteSurface, CoachRouteAction[]> = {
  client_overview: [
    { key: 'summarize_dashboard', mode: 'ask', requiresApproval: false },
    { key: 'draft_next_best_action', mode: 'draft', requiresApproval: true },
  ],
  workout_logging: [
    { key: 'explain_logged_workouts', mode: 'ask', requiresApproval: false },
    { key: 'draft_workout_log', mode: 'draft', requiresApproval: true },
  ],
  progress: [
    { key: 'summarize_progress', mode: 'ask', requiresApproval: false },
    { key: 'draft_workout_plan_delta', mode: 'draft', requiresApproval: true },
  ],
  community: [
    { key: 'summarize_community_activity', mode: 'ask', requiresApproval: false },
    { key: 'draft_social_post', mode: 'draft', requiresApproval: true },
  ],
  rewards: [
    { key: 'summarize_gamification', mode: 'ask', requiresApproval: false },
    { key: 'draft_challenge_update', mode: 'draft', requiresApproval: true },
  ],
  profile: [
    { key: 'summarize_profile_state', mode: 'ask', requiresApproval: false },
    { key: 'draft_profile_update', mode: 'draft', requiresApproval: true },
  ],
  schedule: [
    { key: 'summarize_schedule', mode: 'ask', requiresApproval: false },
    { key: 'draft_schedule_request', mode: 'draft', requiresApproval: true },
  ],
  messages: [
    { key: 'summarize_messages', mode: 'ask', requiresApproval: false },
    { key: 'draft_client_message', mode: 'draft', requiresApproval: true },
    { key: 'create_task_from_message', mode: 'draft', requiresApproval: true },
    { key: 'schedule_from_message', mode: 'draft', requiresApproval: true },
    { key: 'log_workout_from_message', mode: 'draft', requiresApproval: true },
  ],
  coach_command_center: [
    { key: 'summarize_open_approvals', mode: 'ask', requiresApproval: false },
    { key: 'prepare_approval_draft', mode: 'draft', requiresApproval: true },
  ],
  dashboard_unknown: [
    { key: 'answer_dashboard_question', mode: 'ask', requiresApproval: false },
  ],
};

function routeScope(pathname: string): CoachRouteContext['scope'] {
  if (pathname.includes('/dashboard/client/')) return 'client';
  if (pathname.includes('/dashboard/trainer/')) return 'trainer';
  if (pathname.includes('/dashboard/admin/')) return 'admin';
  return 'unknown';
}

const SURFACE_MATCHERS: Array<[CoachRouteSurface, (pathname: string) => boolean]> = [
  ['coach_command_center', (pathname) => pathname.includes('/coach-assistant')],
  ['workout_logging', (pathname) => pathname.includes('/log-workout') || pathname.includes('/workouts')],
  ['progress', (pathname) => pathname.includes('/progress')],
  ['community', (pathname) => pathname.includes('/community')],
  ['rewards', (pathname) => pathname.includes('/rewards')],
  ['profile', (pathname) => pathname.includes('/profile')],
  ['schedule', (pathname) => pathname.includes('/schedule')],
  ['messages', (pathname) => pathname.includes('/messages')],
  ['client_overview', (pathname) => pathname.includes('/overview')],
];

function routeSurface(pathname: string): CoachRouteSurface {
  return SURFACE_MATCHERS.find(([, matches]) => matches(pathname))?.[0] ?? 'dashboard_unknown';
}

const ROUTE_CONTEXT_TOKEN_PATTERN = /^[a-z0-9_-]{1,80}$/i;

function safeToken(rawValue: string | null): string | undefined {
  const token = rawValue?.trim();
  return token && ROUTE_CONTEXT_TOKEN_PATTERN.test(token) ? token : undefined;
}

function safePositiveIntegerString(rawValue: string | null): string | undefined {
  const token = rawValue?.trim();
  if (!token || !/^[1-9]\d*$/.test(token)) return undefined;
  return Number.isSafeInteger(Number(token)) ? token : undefined;
}

function safeIsoDate(rawValue: string | null): string | undefined {
  return normalizeIsoDateOnly(rawValue) ?? undefined;
}

function safePositiveInteger(rawValue: string | null): number | undefined {
  const token = safePositiveIntegerString(rawValue);
  if (!token) return undefined;
  const parsed = Number(token);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function compactRouteFields(
  entries: Array<[keyof CoachRouteContext, CoachRouteContext[keyof CoachRouteContext] | undefined]>,
): Partial<CoachRouteContext> {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as Partial<CoachRouteContext>;
}

function scheduledSessionFields(
  scheduledSessionId: string | undefined,
  params: URLSearchParams,
): Partial<CoachRouteContext> {
  if (!scheduledSessionId) return {};
  return compactRouteFields([
    ['scheduledSessionId', scheduledSessionId],
    ['scheduledSessionDate', safeIsoDate(params.get('sessionDate'))],
    ['scheduledSessionCredits', safePositiveInteger(params.get('sessionCredits'))],
  ]);
}

export function buildCoachRouteContext(pathname: string, search = ''): CoachRouteContext {
  const params = new URLSearchParams(search);
  const sourcePath = params.get('sourcePath') || pathname;
  const surface = routeSurface(sourcePath);
  const source = safeToken(params.get('source'));
  const intent = safeToken(params.get('intent'));
  const scheduledSessionId = safePositiveIntegerString(params.get('sessionId'));
  const threadId = safePositiveIntegerString(params.get('threadId'));
  const sourceMessageId = safeToken(params.get('sourceMessageId'));

  return {
    route: sourcePath,
    surface,
    scope: routeScope(sourcePath),
    ...compactRouteFields([
      ['source', source],
      ['intent', intent],
      ['threadId', threadId],
      ['sourceMessageId', sourceMessageId],
    ]),
    ...scheduledSessionFields(scheduledSessionId, params),
    allowedActions: ACTIONS[surface],
    writeBackPolicy: 'approval_required',
  };
}