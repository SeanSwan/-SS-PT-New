/**
 * Coach Command Center route context helpers.
 *
 * Keeps URL parsing, return-route safety, and route-prefilled Coach prompts
 * outside the main controller/logic module.
 */
import { normalizeIsoDateOnly } from '../../../../utils/isoDateOnly';
import { buildMessageRouteContext, compactMessageActionRouteContext } from './CoachCommandCenter.messageRouteContext';
import type {
  CoachCommandRouteContext,
  CoachMessageActionRouteContext,
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
  messageActionContext: Partial<CoachMessageActionRouteContext> | null = null,
): CoachCommandRouteContext {
  return {
    source: 'coach-command-center',
    intent: routeIntent,
    ...(scheduledSession || {}),
    ...compactMessageActionRouteContext(messageActionContext),
  };
}

const RETURN_ROUTE_REJECTORS: Array<(value: string) => boolean> = [
  (value) => value.startsWith('//'),
  (value) => /[\r\n\t\\]/.test(value),
  (value) => !value.startsWith('/dashboard/'),
];

function isUnsafeReturnRoute(value: string | null): boolean {
  return !value || RETURN_ROUTE_REJECTORS.some((reject) => reject(value));
}

export function normalizeCommandCenterReturnTo(rawReturnTo: string | null): string | null {
  return isUnsafeReturnRoute(rawReturnTo) ? null : rawReturnTo;
}

const RETURN_LABELS: Record<string, string> = {
  'admin-overview': 'Back to Admin Overview',
  'clients-team': 'Back to Client Hub',
  'master-schedule': 'Back to Schedule',
  'trainer-overview': 'Back to Trainer Home',
  'client-dashboard': 'Back to Client Dashboard',
  'admin-workout-logger': 'Back to Workout Logger',
  'trainer-workout-logger': 'Back to Workout Logger',
  'client-workout-logger': 'Back to Workout Logger',
  'admin-workout-planner': 'Back to Workout Planner',
  'trainer-workout-planner': 'Back to Workout Planner',
  'client-workout-planner': 'Back to Workout Planner',
};

function commandCenterReturnLabel(source: string | null): string {
  return source ? RETURN_LABELS[source] ?? 'Back to Dashboard' : 'Back to Dashboard';
}

export function buildWorkflowReturnLabel(workflowReturnTo: string | null, source: string | null): string | null {
  return workflowReturnTo ? commandCenterReturnLabel(source) : null;
}

export function buildRouteClientLabel(routeClientId: number | null): string | null {
  return routeClientId ? `Client #${routeClientId}` : null;
}

const THREAD_SELECTION_STALE_KEYS = [
  'intent', 'source', 'returnTo', 'sourcePath', 'teachPrompt', 'sessionId',
  'sessionDate', 'sessionCredits', 'workoutDate', 'draftKey', 'sourceMessageId',
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

export type RouteContextCopy = { prompt: string | null; status: string | null };
type RouteContextBuilder = (
  routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
) => RouteContextCopy;

const EMPTY_ROUTE_CONTEXT: RouteContextCopy = { prompt: null, status: null };
const prompt = (parts: string[]) => parts.join(' ');

function onboardingRouteContext(routeClientLabel: string | null): RouteContextCopy {
  const selectedClient = Boolean(routeClientLabel);
  return {
    prompt: prompt(selectedClient ? [
      'Selected paid client onboarding activation.',
      'Use the selectedClientId route context and ask me only for missing onboarding fields: source policy, training goal, limitations, pain notes, equipment access, availability, and first-session priorities.',
      'Prepare a review-gated client_onboarding proposal only after I confirm the details.',
      'Do not create duplicate clients or write profile records without operator approval.',
    ] : [
      'New client onboarding intake.',
      'Ask me for the client name, contact details, SwanStudios, Move Fitness, or External source, training goal, limitations, pain notes, equipment access, availability, and first-session priorities.',
      'Prepare a review-gated client_onboarding proposal only after I confirm the details.',
      'Do not create the client or write profile records without operator approval.',
    ]),
    status: selectedClient ? `${routeClientLabel} onboarding context loaded` : 'New client onboarding context loaded',
  };
}

function adminDailyCommandRouteContext(): RouteContextCopy {
  return {
    prompt: prompt([
      'Admin daily command triage.',
      'Help me choose the next owner/admin move across client logging, my workout, onboarding, intake review, audio review, schedule gaps, session credits, and money-path blockers.',
      'Keep it low-click: tell me the next one or two actions and where to go.',
      'Keep all workout, client, intake, and money-path writes review-gated; do not claim anything was saved until I approve it.',
    ]),
    status: 'Admin daily command context loaded',
  };
}

function trainerDailyCommandRouteContext(): RouteContextCopy {
  return {
    prompt: prompt([
      'Trainer daily command triage.',
      'Help me pick the next client action, dictate a workout, adjust a plan, or open the right logger without extra navigation.',
      'Keep the answer low-click and floor-ready.',
      'Keep every workout, client, and intake write review-gated until I approve it.',
    ]),
    status: 'Trainer day command context loaded',
  };
}

function scheduledSessionCopy(scheduledSession: CoachScheduledSessionRouteContext | null): string {
  if (!scheduledSession) return '';
  const workoutDateCopy = scheduledSession.workoutDate ? ` for ${scheduledSession.workoutDate}` : '';
  if (!scheduledSession.scheduledSessionId) {
    return workoutDateCopy ? ` This workout is${workoutDateCopy}.` : '';
  }
  const dateCopy = scheduledSession.scheduledSessionDate ? ` on ${scheduledSession.scheduledSessionDate}` : '';
  return ` This is booked session #${scheduledSession.scheduledSessionId}${dateCopy || workoutDateCopy}. Include scheduledSessionId ${scheduledSession.scheduledSessionId} in the review-gated workout_log proposal and do not invent any other session id.`;
}

function logWorkoutRouteContext(
  routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
): RouteContextCopy {
  if (!routeClientLabel) return EMPTY_ROUTE_CONTEXT;
  return {
    prompt: `${routeClientLabel} daily workout log.${scheduledSessionCopy(scheduledSession)} Ask me for dictated exercises, sets, reps, load, pain, and session notes. Prepare a review-gated workout_log proposal only after I confirm the details.`,
    status: scheduledSession
      ? `${routeClientLabel} booked session #${scheduledSession.scheduledSessionId} log context loaded`
      : `${routeClientLabel} daily log context loaded`,
  };
}

function selfWorkoutRouteContext(
  _routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
): RouteContextCopy {
  const dateLabel = scheduledSession?.workoutDate || scheduledSession?.scheduledSessionDate || 'today';
  return {
    prompt: prompt([
      `My ${dateLabel} workout log.`,
      'Help me build, adjust, or review this workout for the Workout Logger.',
      'Keep it logger-ready with exercises, sets, reps, load targets, tempo, rest, pain notes, and save-check warnings.',
      'Do not claim the workout was logged until I save it in the Workout Logger.',
    ]),
    status: `My ${dateLabel} workout context loaded`,
  };
}

function planReviewRouteContext(routeClientLabel: string | null): RouteContextCopy {
  return {
    prompt: prompt([
      'Workout planner review.',
      routeClientLabel ? `${routeClientLabel} generated-plan context loaded.` : 'No selected client is attached to this planner route.',
      'Review the selected day before it is saved, assigned, or logged.',
      'Name safety issues, missing warmup/cooldown detail, pain-risk edits, and the simplest logger-ready version.',
      'Do not claim the workout was logged until it is saved in the Workout Logger.',
    ]),
    status: 'Workout planner review context loaded',
  };
}

function historicalImportRouteContext(routeClientLabel: string | null): RouteContextCopy {
  if (!routeClientLabel) return EMPTY_ROUTE_CONTEXT;
  return {
    prompt: `${routeClientLabel} historical workout import. Use selectedClientId route context and prepare editable historical workout-log drafts only. Treat Move Fitness/external import work as free-tracking with no paid-session deduction. Mark estimated workouts as AI-estimated historical filler and keep every write review-gated.`,
    status: `${routeClientLabel} historical import context loaded`,
  };
}

const ROUTE_CONTEXT_BUILDERS: Record<string, RouteContextBuilder> = {
  admin_daily_command: () => adminDailyCommandRouteContext(),
  trainer_daily_command: () => trainerDailyCommandRouteContext(),
  client_onboarding: (routeClientLabel) => onboardingRouteContext(routeClientLabel),
  historical_import: (routeClientLabel) => historicalImportRouteContext(routeClientLabel),

  log_self_workout: selfWorkoutRouteContext,
  log_workout: logWorkoutRouteContext,
  plan_review: (routeClientLabel) => planReviewRouteContext(routeClientLabel),
};

export function buildRouteContext(
  routeIntent: string | null,
  routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null = null,
): RouteContextCopy {
  const messageContext = buildMessageRouteContext(routeIntent);
  if (messageContext.prompt) return messageContext;
  return routeIntent
    ? ROUTE_CONTEXT_BUILDERS[routeIntent]?.(routeClientLabel, scheduledSession) ?? EMPTY_ROUTE_CONTEXT
    : EMPTY_ROUTE_CONTEXT;
}

const HISTORICAL_IMPORT_DRAFT_KEY = /^swan-historical-import-[1-9]\d*-\d+$/;

function safeSessionStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage?.getItem(key)?.trim() || null;
  } catch {
    return null;
  }
}

function historicalImportDraftKey(routeIntent: string | null, routeDraftKey: string | null): string | null {
  if (routeIntent !== 'historical_import') return null;
  return routeDraftKey && HISTORICAL_IMPORT_DRAFT_KEY.test(routeDraftKey) ? routeDraftKey : null;
}

export function readHistoricalImportRouteDraft(
  routeIntent: string | null,
  routeDraftKey: string | null,
): string | null {
  const draftKey = historicalImportDraftKey(routeIntent, routeDraftKey);
  return draftKey ? safeSessionStorageItem(draftKey) : null;
}

export function buildEffectiveRouteContext(
  routeContext: RouteContextCopy,
  storedRouteDraft: string | null,
  routeClientLabel: string | null,
): RouteContextCopy {
  return storedRouteDraft
    ? { prompt: storedRouteDraft, status: `${routeClientLabel || 'Client'} historical import draft loaded` }
    : routeContext;
}
