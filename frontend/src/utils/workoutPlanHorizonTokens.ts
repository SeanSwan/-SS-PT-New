/**
 * Shared SwanStudios workout-plan horizon tokens.
 *
 * Keeps generated PDF names and exported plan labels aligned with the
 * seven Plan Vault arcs instead of deriving unsupported month counts.
 */

export interface WorkoutPlanHorizonToken {
  key: WorkoutPlanHorizonKey;
  weeks: number;
  token: string;
  label: string;
}

export type WorkoutPlanHorizonKey =
  | 'one_day'
  | WorkoutPlanDurationHorizonKey;

export type WorkoutPlanDurationHorizonKey =
  | 'one_week'
  | 'one_month'
  | 'three_month'
  | 'six_month'
  | 'nine_month'
  | 'twelve_month';

const WORKOUT_PLAN_DURATION_HORIZON_TOKENS: WorkoutPlanHorizonToken[] = [
  { key: 'one_week', weeks: 1, token: '1wk', label: '1-Week' },
  { key: 'one_month', weeks: 4, token: '1mo', label: '1-Month' },
  { key: 'three_month', weeks: 12, token: '3mo', label: '3-Month' },
  { key: 'six_month', weeks: 26, token: '6mo', label: '6-Month' },
  { key: 'nine_month', weeks: 39, token: '9mo', label: '9-Month' },
  { key: 'twelve_month', weeks: 52, token: '12mo', label: '12-Month' },
];

const WORKOUT_PLAN_VAULT_HORIZON_TOKENS: WorkoutPlanHorizonToken[] = [
  { key: 'one_day', weeks: 1, token: '1d', label: '1-Day' },
  ...WORKOUT_PLAN_DURATION_HORIZON_TOKENS,
];

export const closestWorkoutPlanHorizon = (durationWeeks: number): WorkoutPlanHorizonToken =>
  WORKOUT_PLAN_DURATION_HORIZON_TOKENS.reduce((closest, horizon) => {
    const currentDistance = Math.abs(horizon.weeks - durationWeeks);
    const closestDistance = Math.abs(closest.weeks - durationWeeks);
    if (currentDistance < closestDistance) return horizon;
    if (currentDistance === closestDistance && horizon.weeks > closest.weeks) return horizon;
    return closest;
  }, WORKOUT_PLAN_DURATION_HORIZON_TOKENS[0]);

export const workoutPlanHorizonForKey = (
  horizonKey: string | null | undefined,
  fallbackDurationWeeks: number,
): WorkoutPlanHorizonToken => {
  const normalizedKey = String(horizonKey || '').trim();
  return WORKOUT_PLAN_VAULT_HORIZON_TOKENS.find(horizon => horizon.key === normalizedKey)
    || closestWorkoutPlanHorizon(fallbackDurationWeeks);
};
