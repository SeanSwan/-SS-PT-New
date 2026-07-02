import { normalizeIsoDateOnly } from '../../utils/isoDateOnly';

type WorkoutLoggerCoachRole = 'admin' | 'trainer' | 'client';

interface BuildWorkoutLoggerCoachRouteParams {
  clientId?: number | string | null;
  selfMode?: boolean;
  userRole?: string | null;
  workoutDate?: string | null;
  scheduledSessionId?: string | null;
  scheduledSessionDate?: string | null;
  scheduledSessionCreditHint?: number | null;
}

const parseRole = (userRole?: string | null): WorkoutLoggerCoachRole | null => {
  if (userRole === 'user') return 'client';
  return userRole === 'admin' || userRole === 'trainer' || userRole === 'client' ? userRole : null;
};

const parsePositiveId = (value?: number | string | null): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  const trimmed = value?.trim();
  if (!trimmed || !/^[1-9]\d*$/.test(trimmed)) return null;
  return Number.isSafeInteger(Number(trimmed)) ? trimmed : null;
};

const parseSessionCredits = (value?: number | null): string | null =>
  Number.isSafeInteger(value) && Number(value) >= 0 ? String(value) : null;

type LoggerContext = {
  sessionCredits: string | null;
  sessionDate: string | null;
  sessionId: string | null;
  workoutDate: string | null;
};

const buildLoggerContext = ({
  scheduledSessionCreditHint,
  scheduledSessionDate,
  scheduledSessionId,
  workoutDate,
}: BuildWorkoutLoggerCoachRouteParams): LoggerContext => {
  const sessionId = parsePositiveId(scheduledSessionId);
  const sessionDate = sessionId ? normalizeIsoDateOnly(scheduledSessionDate) : null;
  return {
    sessionCredits: sessionId ? parseSessionCredits(scheduledSessionCreditHint) : null,
    sessionDate,
    sessionId,
    workoutDate: sessionDate || normalizeIsoDateOnly(workoutDate),
  };
};

const appendSessionContext = (params: URLSearchParams, context: LoggerContext) => {
  if (!context.sessionId) return;
  params.set('sessionId', context.sessionId);
  if (context.sessionDate) params.set('sessionDate', context.sessionDate);
  if (context.sessionCredits !== null) params.set('sessionCredits', context.sessionCredits);
};

const adminClientLoggerReturnTo = (clientId: string, context: LoggerContext): string => {
  const params = new URLSearchParams({
    clientId,
    tab: 'training',
    trainingSection: 'logger',
    loadPlan: 'today',
  });
  appendSessionContext(params, context);
  return `/dashboard/admin/client-management?${params.toString()}`;
};

const trainerClientLoggerReturnTo = (clientId: string, context: LoggerContext): string => {
  const params = new URLSearchParams({ clientId, loadPlan: 'today' });
  appendSessionContext(params, context);
  return `/dashboard/trainer/log-workout?${params.toString()}`;
};

const selfLoggerReturnTo = (role: WorkoutLoggerCoachRole): string =>
  role === 'client'
    ? '/dashboard/client/log-workout?loadPlan=today'
    : '/dashboard/admin/log-my-workout?loadPlan=today';

const coachBasePath = (role: WorkoutLoggerCoachRole): string =>
  role === 'client' ? '/dashboard/client/coach-assistant' : `/dashboard/${role}/coach-assistant`;

const addCoachDateContext = (params: URLSearchParams, context: LoggerContext) => {
  if (context.workoutDate) params.set('workoutDate', context.workoutDate);
  appendSessionContext(params, context);
};

export const buildWorkoutLoggerCoachRoute = ({
  clientId,
  selfMode = false,
  userRole,
  ...contextInput
}: BuildWorkoutLoggerCoachRouteParams): string | null => {
  const role = parseRole(userRole);
  if (!role) return null;

  const context = buildLoggerContext(contextInput);
  const params = new URLSearchParams();
  const isSelfWorkout = selfMode || role === 'client';

  if (isSelfWorkout) {
    const source = role === 'client' ? 'client-workout-logger' : 'admin-workout-logger';
    params.set('source', source);
    params.set('returnTo', selfLoggerReturnTo(role));
    params.set('intent', 'log_self_workout');
    addCoachDateContext(params, context);
    return `${coachBasePath(role)}?${params.toString()}`;
  }

  const parsedClientId = parsePositiveId(clientId);
  if (!parsedClientId) return null;

  const returnTo = role === 'trainer'
    ? trainerClientLoggerReturnTo(parsedClientId, context)
    : adminClientLoggerReturnTo(parsedClientId, context);

  params.set('clientId', parsedClientId);
  params.set('source', `${role}-workout-logger`);
  params.set('returnTo', returnTo);
  params.set('intent', 'log_workout');
  addCoachDateContext(params, context);
  return `${coachBasePath(role)}?${params.toString()}`;
};
