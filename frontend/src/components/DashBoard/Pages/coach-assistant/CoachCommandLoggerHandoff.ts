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

export function storeCoachWorkoutLoggerHandoff(payload: WorkoutPlanTransfer): boolean {
  return appendPendingWorkoutPlan(payload);
}
