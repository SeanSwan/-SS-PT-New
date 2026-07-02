import type { FormattedLogBody } from './CoachCommandLogEntry.types';
import {
  appendPendingWorkoutPlan,
  parseAIWorkoutPlan,
  type WorkoutPlanTransfer,
} from '../../../../utils/parseAIWorkoutPlan';

export type CoachWorkoutLoggerHandoff = {
  exerciseCount: number;
  payload: WorkoutPlanTransfer;
};

function logBodyToParseText(body: FormattedLogBody): string {
  return [
    ...body.leadParagraphs,
    ...(body.sections || []).flatMap((section) => [
      `${section.title}:`,
      ...section.bullets.map((bullet) => `- ${bullet}`),
    ]),
    ...body.bullets.map((bullet) => `- ${bullet}`),
    ...body.steps.map((step) => `${step.number}. ${step.title}: ${step.body}`),
  ].filter(Boolean).join('\n');
}

export function buildCoachWorkoutLoggerHandoff(
  body: FormattedLogBody,
): CoachWorkoutLoggerHandoff | null {
  return buildCoachWorkoutLoggerHandoffFromText(logBodyToParseText(body));
}

export function buildCoachWorkoutLoggerHandoffFromText(text: string): CoachWorkoutLoggerHandoff | null {
  const exercises = parseAIWorkoutPlan(text);
  if (!exercises?.length) return null;

  return {
    exerciseCount: exercises.length,
    payload: { exercises, source: 'ai-chat' },
  };
}

function getWorkoutLoggerRouteTargetClientId(route?: string | null): number | null {
  if (!route) return null;
  const queryStart = route.indexOf('?');
  if (queryStart < 0) return null;

  const rawClientId = new URLSearchParams(route.slice(queryStart + 1)).get('clientId');
  if (!rawClientId || !/^\d+$/.test(rawClientId)) return null;

  const parsed = Number(rawClientId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function withWorkoutLoggerRouteTarget(
  payload: WorkoutPlanTransfer,
  workoutLoggerRoute?: string | null,
): WorkoutPlanTransfer {
  const targetClientId = getWorkoutLoggerRouteTargetClientId(workoutLoggerRoute);
  return targetClientId ? { ...payload, targetClientId } : payload;
}

export function storeCoachWorkoutLoggerHandoff(
  payload: WorkoutPlanTransfer,
  workoutLoggerRoute?: string | null,
): boolean {
  return appendPendingWorkoutPlan(withWorkoutLoggerRouteTarget(payload, workoutLoggerRoute));
}
