/**
 * Workout Planner save payload helpers.
 *
 * Keeps horizon and authorship metadata consistent for admin/trainer saves.
 * The database still stores the full workout plan in `planData`; these helpers
 * add the small indexed fields the client vault and Swan Coach read models need.
 */

import type { PlanDuration } from './WorkoutPlannerTypes';
import { TRAINER_SESSION_METADATA } from '../../../../utils/workoutPlanAssignmentSemantics';
import { toPositiveInteger, toRecord } from '../../../../utils/objectValueGuards';
import { closestWorkoutPlanHorizon, type WorkoutPlanDurationHorizonKey } from '../../../../utils/workoutPlanHorizonTokens';

type SwanPlanHorizonKey =
  | 'one_day'
  | WorkoutPlanDurationHorizonKey;

type PlannerUserRole = 'admin' | 'trainer' | 'client' | string | undefined;

interface WorkoutPlanSaveFieldsInput {
  planData: unknown;
  planDuration: PlanDuration;
  hasGeneratedHorizonPlan: boolean;
  userRole?: PlannerUserRole;
}

const getPlanSummaryDuration = (planData: unknown) => {
  const summary = toRecord(toRecord(planData).planSummary);
  return toPositiveInteger(summary.durationWeeks, 0);
};

const getWeekCountDuration = (planData: unknown) => {
  const weeks = toRecord(planData).weeks;
  return Array.isArray(weeks) && weeks.length > 0 ? weeks.length : 0;
};

const getGeneratedPlanDuration = (planData: unknown) => {
  const summaryDuration = getPlanSummaryDuration(planData);
  return summaryDuration > 0 ? summaryDuration : getWeekCountDuration(planData);
};

const inferWorkoutPlanDurationWeeks = (
  planData: unknown,
  planDuration: PlanDuration,
  hasGeneratedHorizonPlan: boolean,
): number => {
  const candidates = [
    hasGeneratedHorizonPlan ? getGeneratedPlanDuration(planData) : 0,
    planDuration === 'single' ? 1 : 0,
    toPositiveInteger(planDuration, 0),
    getPlanSummaryDuration(planData),
    getWeekCountDuration(planData),
    1,
  ];
  return candidates.find((candidate) => candidate > 0) || 1;
};

const inferWorkoutPlanHorizonKey = (
  planData: unknown,
  planDuration: PlanDuration,
  hasGeneratedHorizonPlan: boolean,
): SwanPlanHorizonKey => {
  if (!hasGeneratedHorizonPlan && planDuration === 'single') return 'one_day';

  const durationWeeks = inferWorkoutPlanDurationWeeks(planData, planDuration, hasGeneratedHorizonPlan);
  return closestWorkoutPlanHorizon(durationWeeks).key;
};

export const buildWorkoutPlanSaveFields = ({
  planData,
  planDuration,
  hasGeneratedHorizonPlan,
  userRole,
}: WorkoutPlanSaveFieldsInput) => {
  const durationWeeks = inferWorkoutPlanDurationWeeks(planData, planDuration, hasGeneratedHorizonPlan);
  const horizonKey = inferWorkoutPlanHorizonKey(planData, planDuration, hasGeneratedHorizonPlan);
  const creatorRole = userRole === 'admin' ? 'admin' : 'trainer';

  return {
    durationWeeks,
    createdBy: hasGeneratedHorizonPlan ? 'swan_coach_planning' : creatorRole,
    metadata: {
      planHorizon: horizonKey,
      horizonKey,
      planDurationKey: horizonKey,
      durationPreset: hasGeneratedHorizonPlan ? String(durationWeeks) : planDuration,
      durationWeeks,
      planSource: hasGeneratedHorizonPlan ? 'swan_coach_planning' : 'manual_builder',
      createdByRole: creatorRole,
      ...TRAINER_SESSION_METADATA,
    },
  };
};
