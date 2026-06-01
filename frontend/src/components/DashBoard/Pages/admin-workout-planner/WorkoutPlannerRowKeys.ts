import type { GeneratedPlan } from './WorkoutPlannerTypes';

type WorkoutPlannerExplanationRow = {
  type: string;
  message: string;
  details?: string | string[];
};

type WorkoutPlannerRecommendationDetail = NonNullable<GeneratedPlan['recommendationDetails']>[number];

const normalizeExplanationDetails = (details: WorkoutPlannerExplanationRow['details']): string => {
  if (Array.isArray(details)) return details.join('|');
  return details ?? '';
};

export const workoutPlannerExplanationKey = (explanation: WorkoutPlannerExplanationRow): string =>
  [
    'explanation',
    explanation.type,
    explanation.message,
    normalizeExplanationDetails(explanation.details),
  ].join('|');

export const workoutPlannerRecommendationKey = (
  recommendation: string,
  detail?: WorkoutPlannerRecommendationDetail
): string =>
  [
    'recommendation',
    recommendation,
    detail?.type ?? '',
    detail?.sourceCitation ?? '',
  ].join('|');
