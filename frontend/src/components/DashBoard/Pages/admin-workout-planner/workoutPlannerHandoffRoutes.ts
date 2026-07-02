import type { GeneratedPlan, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

type PlannerRole = 'admin' | 'trainer' | 'client';

interface PlannerRouteContext {
  pathname: string;
  search: string;
  selectedClientId: number | null;
  generatedPlan?: GeneratedPlan | null;
  stripDebateJobId?: boolean;
}

interface PlannerCoachReviewContext extends PlannerRouteContext {
  generatedPlan: GeneratedPlan | null;
  selectedMesoDay: number;
}

interface PlannerReviewPromptContext {
  generatedPlan: GeneratedPlan | null;
  selectedMesoDay: number;
  selectedClientId: number | null;
  isSelfPlanner?: boolean;
}

const PROMPT_MAX_CHARS = 8000;

function plannerRoleFromPath(pathname: string): PlannerRole | null {
  if (/^\/dashboard\/admin\/workout-planner\/?$/.test(pathname)) return 'admin';
  if (/^\/dashboard\/trainer\/workout-planner\/?$/.test(pathname)) return 'trainer';
  if (/^\/dashboard\/client\/workouts\/?$/.test(pathname)) return 'client';
  return null;
}

function safePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

function safeNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^(0|[1-9]\d*)$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

const hasUnsafeSessionContextCharacters = (value: string): boolean => /[\r\n\t\\]|%(?:0a|0d|09|2e|2f|5c)/i.test(value);
const ISO_SESSION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function safeSessionDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || hasUnsafeSessionContextCharacters(trimmed) || !ISO_SESSION_DATE_PATTERN.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
}

function cleanText(value: unknown, fallback = ''): string {
  return String(value ?? fallback)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function plannerSearchParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function appendSafeSessionContext(params: URLSearchParams, search: string): void {
  const sourceParams = plannerSearchParams(search);
  const sessionId = safePositiveInteger(sourceParams.get('sessionId'));
  if (!sessionId) return;

  params.set('sessionId', String(sessionId));

  const sessionDate = safeSessionDate(sourceParams.get('sessionDate'));
  if (sessionDate) params.set('sessionDate', sessionDate);

  const sessionCredits = safeNonNegativeInteger(sourceParams.get('sessionCredits'));
  if (sessionCredits !== null) params.set('sessionCredits', String(sessionCredits));
}

function isAdminSelfPlanner(search: string): boolean {
  return plannerSearchParams(search).get('self') === '1';
}

function plannerReturnTo({ pathname, search, selectedClientId, generatedPlan, stripDebateJobId = false }: PlannerRouteContext): string | null {
  const role = plannerRoleFromPath(pathname);
  if (!role) return null;
  if (role === 'client') return '/dashboard/client/workouts';

  const params = plannerSearchParams(search);
  if (stripDebateJobId) params.delete('debateJobId');
  const clientId = safePositiveInteger(selectedClientId) || safePositiveInteger(generatedPlan?.clientId);
  if (clientId && !isAdminSelfPlanner(search)) params.set('clientId', String(clientId));
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

function selectedRouteClientId(selectedClientId: number | null, generatedPlan?: GeneratedPlan | null): number | null {
  return safePositiveInteger(selectedClientId) || safePositiveInteger(generatedPlan?.clientId);
}

function generatedDay(generatedPlan: GeneratedPlan, selectedMesoDay: number): GeneratedPlanWeekDay | null {
  const weeks = Array.isArray(generatedPlan.weeks) ? generatedPlan.weeks : [];
  for (const week of weeks) {
    const days = [...(week.days || []), ...(week.sessions || [])];
    const match = days.find(day => day.dayNumber === selectedMesoDay);
    if (match) return match;
  }
  return null;
}

function exerciseLine(exercise: GeneratedPlanWeekDay['exercises'][number]): string | null {
  const name = cleanText(exercise.exerciseName || exercise.name);
  if (!name) return null;
  const sets = typeof exercise.sets === 'number' ? String(exercise.sets) : '';
  const reps = cleanText(exercise.reps || exercise.targetReps);
  const work = sets && reps ? `${sets} x ${reps}` : reps || sets;
  const rest = typeof exercise.restSeconds === 'number'
    ? `${exercise.restSeconds}s rest`
    : typeof exercise.restTime === 'number'
      ? `${exercise.restTime}s rest`
      : '';
  const tempo = cleanText(exercise.tempo);
  return [name, work ? `- ${work}` : '', rest, tempo ? `tempo ${tempo}` : '']
    .filter(Boolean)
    .join(' ');
}

export function buildWorkoutPlannerPlanReviewPrompt({
  generatedPlan,
  selectedMesoDay,
  selectedClientId,
  isSelfPlanner = false,
}: PlannerReviewPromptContext): string | null {
  if (!generatedPlan) return null;
  const clientId = isSelfPlanner ? null : selectedRouteClientId(selectedClientId, generatedPlan);
  const scheduleDay = generatedPlan.weeklySchedule.find(day => day.dayNumber === selectedMesoDay);
  const day = generatedDay(generatedPlan, selectedMesoDay);
  const exerciseLines = (day?.exercises || []).map(exerciseLine).filter(Boolean).slice(0, 10);
  const lines = [
    'Workout planner generated day review.',
    isSelfPlanner ? 'Personal admin workout review.' : clientId ? `Client #${clientId}.` : 'No client id is selected.',
    `Plan: ${generatedPlan.planSummary.durationWeeks} weeks, ${generatedPlan.planSummary.sessionsPerWeek} sessions/week, goal ${cleanText(generatedPlan.planSummary.primaryGoal)}.`,
    `Day ${selectedMesoDay}: ${cleanText(day?.focus || scheduleDay?.focus || 'selected workout')} (${cleanText(day?.category || scheduleDay?.category || 'workout')}).`,
    exerciseLines.length ? `Exercises: ${exerciseLines.join('; ')}.` : 'Detailed exercises are not available in this route preview.',
    'Review the selected generated day before it is saved, assigned, or logged.',
    'Tell me the unsafe or confusing parts first, then give the simplest logger-ready version.',
    'Do not claim anything was logged. Final logging happens only after Workout Logger save.',
  ];
  return lines.join(' ').slice(0, PROMPT_MAX_CHARS);
}

export function buildWorkoutPlannerCoachReviewRoute({
  pathname,
  search,
  selectedClientId,
  selectedMesoDay,
  generatedPlan,
}: PlannerCoachReviewContext): string | null {
  const role = plannerRoleFromPath(pathname);
  const isSelfPlanner = role === 'admin' && isAdminSelfPlanner(search);
  const returnTo = plannerReturnTo({ pathname, search, selectedClientId, generatedPlan });
  const prompt = buildWorkoutPlannerPlanReviewPrompt({ generatedPlan, selectedMesoDay, selectedClientId, isSelfPlanner });
  if (!role || !returnTo || !prompt) return null;

  const clientId = isSelfPlanner ? null : selectedRouteClientId(selectedClientId, generatedPlan);
  const params = new URLSearchParams({
    source: `${role}-workout-planner`,
    returnTo,
    intent: 'plan_review',
    teachPrompt: prompt,
  });
  if (clientId) params.set('clientId', String(clientId));
  return `/dashboard/${role}/coach-assistant?${params.toString()}`;
}

export function buildWorkoutPlannerLoggerRoute({
  pathname,
  search,
  selectedClientId,
  generatedPlan,
}: PlannerRouteContext): string | null {
  const role = plannerRoleFromPath(pathname);
  if (!role) return null;

  if (role === 'admin' && isAdminSelfPlanner(search)) {
    const params = new URLSearchParams({ loadPlan: 'today', source: 'workout-planner' });
    const returnTo = plannerReturnTo({ pathname, search, selectedClientId, generatedPlan, stripDebateJobId: true });
    if (returnTo) params.set('returnTo', returnTo);
    appendSafeSessionContext(params, search);
    return `/dashboard/admin/log-my-workout?${params.toString()}`;
  }

  const clientId = selectedRouteClientId(selectedClientId, generatedPlan);
  if (!clientId) return null;

  if (role === 'admin') {
    const params = new URLSearchParams({
      clientId: String(clientId),
      tab: 'training',
      trainingSection: 'logger',
      loadPlan: 'today',
      source: 'workout-planner',
    });
    const returnTo = plannerReturnTo({ pathname, search, selectedClientId, generatedPlan, stripDebateJobId: true });
    if (returnTo) params.set('returnTo', returnTo);
    appendSafeSessionContext(params, search);
    return `/dashboard/admin/client-management?${params.toString()}`;
  }

  const params = new URLSearchParams({
    clientId: String(clientId),
    source: 'workout-planner',
    loadPlan: 'today',
  });
  const returnTo = plannerReturnTo({ pathname, search, selectedClientId, generatedPlan, stripDebateJobId: true });
  if (returnTo) params.set('returnTo', returnTo);
  appendSafeSessionContext(params, search);
  return `/dashboard/${role}/log-workout?${params.toString()}`;
}
