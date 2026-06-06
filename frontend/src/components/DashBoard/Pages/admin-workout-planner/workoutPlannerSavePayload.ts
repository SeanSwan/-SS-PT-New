/**
 * Workout Planner save payload helpers.
 *
 * Keeps horizon and authorship metadata consistent for admin/trainer saves.
 * The database still stores the full workout plan in `planData`; these helpers
 * add the small indexed fields the client vault and Swan Coach read models need.
 */

import type { PlanDuration } from './WorkoutPlannerTypes';

type SwanPlanHorizonKey =
  | 'one_day'
  | 'one_week'
  | 'one_month'
  | 'three_month'
  | 'six_month'
  | 'nine_month'
  | 'twelve_month';

type PlannerUserRole = 'admin' | 'trainer' | 'client' | string | undefined;

interface WorkoutPlanSaveFieldsInput {
  planData: unknown;
  planDuration: PlanDuration;
  hasGeneratedHorizonPlan: boolean;
  userRole?: PlannerUserRole;
}

const PLAN_HORIZONS: Array<{ key: SwanPlanHorizonKey; durationWeeks: number }> = [
  { key: 'one_week', durationWeeks: 1 },
  { key: 'one_month', durationWeeks: 4 },
  { key: 'three_month', durationWeeks: 12 },
  { key: 'six_month', durationWeeks: 26 },
  { key: 'nine_month', durationWeeks: 39 },
  { key: 'twelve_month', durationWeeks: 52 },
];

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toPositiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPlanSummaryDuration = (planData: unknown) => {
  const summary = toRecord(toRecord(planData).planSummary);
  return toPositiveInteger(summary.durationWeeks, 0);
};

const getWeekCountDuration = (planData: unknown) => {
  const weeks = toRecord(planData).weeks;
  return Array.isArray(weeks) && weeks.length > 0 ? weeks.length : 0;
};

const closestHorizonKey = (durationWeeks: number): SwanPlanHorizonKey =>
  PLAN_HORIZONS.reduce((closest, horizon) => {
    const currentScore = Math.abs(horizon.durationWeeks - durationWeeks);
    const closestScore = Math.abs(closest.durationWeeks - durationWeeks);
    return currentScore < closestScore ? horizon : closest;
  }, PLAN_HORIZONS[0]).key;

const inferWorkoutPlanDurationWeeks = (
  planData: unknown,
  planDuration: PlanDuration,
): number => {
  const candidates = [
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
): SwanPlanHorizonKey => {
  if (planDuration === 'single') return 'one_day';

  const durationWeeks = inferWorkoutPlanDurationWeeks(planData, planDuration);
  const exact = PLAN_HORIZONS.find((horizon) => horizon.durationWeeks === durationWeeks);
  return exact?.key || closestHorizonKey(durationWeeks);
};

export const buildWorkoutPlanSaveFields = ({
  planData,
  planDuration,
  hasGeneratedHorizonPlan,
  userRole,
}: WorkoutPlanSaveFieldsInput) => {
  const durationWeeks = inferWorkoutPlanDurationWeeks(planData, planDuration);
  const horizonKey = inferWorkoutPlanHorizonKey(planData, planDuration);
  const creatorRole = userRole === 'admin' ? 'admin' : 'trainer';

  return {
    durationWeeks,
    createdBy: hasGeneratedHorizonPlan ? 'ai' : creatorRole,
    metadata: {
      planHorizon: horizonKey,
      horizonKey,
      planDurationKey: horizonKey,
      durationPreset: planDuration,
      durationWeeks,
      planSource: hasGeneratedHorizonPlan ? 'swan_coach_ai' : 'manual_builder',
      createdByRole: creatorRole,
    },
  };
};
