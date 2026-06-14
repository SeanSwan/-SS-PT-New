import type { FormattedLogBody } from './CoachCommandLogEntry.types';
import {
  parseAIWorkoutPlan,
  PENDING_WORKOUT_KEY,
  type WorkoutPlanTransfer,
} from '../../../../utils/parseAIWorkoutPlan';

export type CoachWorkoutLoggerHandoff = {
  exerciseCount: number;
  payload: WorkoutPlanTransfer;
};

function logBodyToParseText(body: FormattedLogBody): string {
  return [
    ...body.leadParagraphs,
    ...body.bullets.map((bullet) => `- ${bullet}`),
    ...body.steps.map((step) => `${step.number}. ${step.title}: ${step.body}`),
  ].filter(Boolean).join('\n');
}

export function buildCoachWorkoutLoggerHandoff(
  body: FormattedLogBody,
): CoachWorkoutLoggerHandoff | null {
  const exercises = parseAIWorkoutPlan(logBodyToParseText(body));
  if (!exercises?.length) return null;

  return {
    exerciseCount: exercises.length,
    payload: { exercises, source: 'ai-chat' },
  };
}

export function storeCoachWorkoutLoggerHandoff(payload: WorkoutPlanTransfer): boolean {
  try {
    sessionStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
