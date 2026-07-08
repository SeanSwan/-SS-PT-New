/**
 * Coach Command Center route copy helpers.
 *
 * Owns route-prefilled prompt/status text and session-storage draft recovery so
 * the route parsing module stays under Swan's file-size cap.
 */
import type { CoachScheduledSessionRouteContext } from './CoachCommandCenter.types';

export type RouteContextCopy = { prompt: string | null; status: string | null };
type RouteContextBuilder = (
  routeClientLabel: string | null,
  scheduledSession: CoachScheduledSessionRouteContext | null,
) => RouteContextCopy;

const EMPTY_ROUTE_CONTEXT: RouteContextCopy = { prompt: null, status: null };
const prompt = (parts: string[]) => parts.join(' ');

function onboardingRouteContext(routeClientLabel: string | null): RouteContextCopy {
  if (routeClientLabel) return profileCoverageRouteContext(routeClientLabel);
  return {
    prompt: prompt([
      'New client onboarding intake.',
      'Ask me for the client name, client source (SwanStudios, Move Fitness, or External), training goal, limitations, pain notes, equipment access, availability, and first-session priorities.',
      'The secure access handoff stays deterministic after approval; this route prompt only stages training and onboarding context for review.',
      'Prepare a review-gated client_onboarding proposal only after I confirm the details.',
      'Do not create the client or write profile records without operator approval.',
    ]),
    status: 'New client onboarding context loaded',
  };
}

function profileCoverageRouteContext(routeClientLabel: string | null): RouteContextCopy {
  if (!routeClientLabel) return EMPTY_ROUTE_CONTEXT;
  return {
    prompt: prompt([
      'Selected client onboarding coverage update.',
      `${routeClientLabel} existing-client context loaded.`,
      'Use the selectedClientId route context and ask me only for missing onboarding/profile coverage fields: training goal, limitations, pain notes, equipment access, availability, communication style, nutrition preferences, and first-session priorities.',
      'Prepare a review-gated client_profile_coverage_update proposal only after I confirm the details.',
      'Do not create duplicate clients, reset access, or mark onboarding complete from chat.',
      'Workout logging remains available while missing coverage is resolved.',
    ]),
    status: `${routeClientLabel} profile coverage context loaded`,
  };
}

function adminDailyCommandRouteContext(): RouteContextCopy {
  return {
    prompt: prompt([
      'Admin daily command triage.',
      'Help me choose the next owner/admin move across client logging, my workout, onboarding, intake review, PLAUD review, schedule gaps, session credits, and money-path blockers.',
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
      'Build Plan review.',
      routeClientLabel ? `${routeClientLabel} generated-plan context loaded.` : 'No selected client is attached to this Build Plan route.',
      'Review the selected day before it is saved, assigned, or logged.',
      'Name safety issues, missing warmup/cooldown detail, pain-risk edits, and the simplest logger-ready version.',
      'Do not claim the workout was logged until it is saved in the Workout Logger.',
    ]),
    status: 'Build Plan review context loaded',
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
  client_profile_coverage_update: (routeClientLabel) => profileCoverageRouteContext(routeClientLabel),
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
  return routeIntent
    ? ROUTE_CONTEXT_BUILDERS[routeIntent]?.(routeClientLabel, scheduledSession) ?? EMPTY_ROUTE_CONTEXT
    : EMPTY_ROUTE_CONTEXT;
}

/** Route context when a teach prompt rides the URL: the prompt IS the context. */
export function buildTeachPromptRouteContext(
  routeTeachPrompt: string,
  routeIntent: string | null,
): RouteContextCopy {
  return {
    prompt: routeTeachPrompt,
    status: routeIntent === 'trainer_daily_command'
      ? 'Trainer day command context loaded'
      : routeIntent === 'plan_review'
        ? 'Build Plan review context loaded'
        : 'Coach route prompt loaded',
  };
}

const HISTORICAL_IMPORT_DRAFT_KEY = /^swan-historical-import-[1-9]\d*-\d+$/;

function safeSessionStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage?.getItem(key)?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { prompt?: unknown; expiresAt?: unknown };
      if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < Date.now()) { window.sessionStorage.removeItem(key); return null; }
      return typeof parsed.prompt === 'string' ? parsed.prompt.trim() || null : raw;
    } catch { return raw; }
  } catch { return null; }
}

function historicalImportDraftKey(routeIntent: string | null, routeDraftKey: string | null): string | null {
  return routeIntent === 'historical_import' && routeDraftKey && HISTORICAL_IMPORT_DRAFT_KEY.test(routeDraftKey) ? routeDraftKey : null;
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
