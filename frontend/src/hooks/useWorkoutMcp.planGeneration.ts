/**
 * Workout MCP plan generation adapter
 * ====================================
 *
 * Bridges the legacy MCP-named hook to the real Swan Coach planning API.
 * Keeps Program Architect generation on `/api/workout-builder/plan` while
 * returning the existing WorkoutPlan shape expected by WorkoutPlanBuilder.
 */

import type { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise } from './useWorkoutMcp';

export interface WorkoutPlanGenerationParams {
  trainerId: string;
  clientId: string;
  name: string;
  description?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  daysPerWeek: number;
  focusAreas?: string[];
  difficulty?: string;
  optPhase?: string;
  equipment?: string[];
}

export interface SwanCoachPlanRequest {
  clientId: number;
  durationWeeks: number;
  sessionsPerWeek: number;
  primaryGoal: string;
  startingPhaseOverride?: number;
}

export interface WorkoutPlanSaveOptions {
  activate?: boolean;
  status?: 'draft' | 'active';
  userRole?: string;
}

const GOAL_MAP: Record<string, string> = {
  general: 'general_fitness',
  general_fitness: 'general_fitness',
  strength: 'strength',
  hypertrophy: 'hypertrophy',
  endurance: 'athletic_performance',
  athletic_performance: 'athletic_performance',
  weight_loss: 'fat_loss',
  fat_loss: 'fat_loss',
  rehabilitation: 'general_fitness',
  golf_performance: 'golf_performance',
};

const PLAN_HORIZONS: Array<{ key: string; durationWeeks: number }> = [
  { key: 'one_week', durationWeeks: 1 },
  { key: 'one_month', durationWeeks: 4 },
  { key: 'three_month', durationWeeks: 12 },
  { key: 'six_month', durationWeeks: 26 },
  { key: 'nine_month', durationWeeks: 39 },
  { key: 'twelve_month', durationWeeks: 52 },
];

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const deriveDurationWeeks = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 8;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 8;
  return Math.min(Math.max(Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)), 1), 52);
};

const parsePhase = (value?: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
};

const normalizeGoal = (goal?: string) => GOAL_MAP[String(goal || '').trim().toLowerCase()] || 'general_fitness';

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const closestHorizonKey = (durationWeeks: number) =>
  PLAN_HORIZONS.reduce((closest, horizon) => (
    Math.abs(horizon.durationWeeks - durationWeeks) < Math.abs(closest.durationWeeks - durationWeeks)
      ? horizon
      : closest
  ), PLAN_HORIZONS[0]).key;

const getPlanDataDuration = (planData: Record<string, unknown>) => {
  const summary = toRecord(planData.planSummary);
  const summaryWeeks = toPositiveInteger(summary.durationWeeks, 0);
  if (summaryWeeks) return summaryWeeks;
  return Array.isArray(planData.weeks) && planData.weeks.length > 0 ? planData.weeks.length : 0;
};

const inferPlanDurationWeeks = (plan: WorkoutPlan) => {
  const planData = toRecord(plan.planData);
  return getPlanDataDuration(planData) || deriveDurationWeeks(plan.startDate, plan.endDate);
};

const inferPlanNasmPhase = (plan: WorkoutPlan) => {
  const summary = toRecord(toRecord(plan.planData).planSummary);
  const phase = toPositiveInteger(summary.startingPhase, 0);
  return phase >= 1 && phase <= 5 ? phase : null;
};

const buildPersistablePlanData = (plan: WorkoutPlan) => {
  const existing = toRecord(plan.planData);
  const fallbackWeeks = plan.days?.length
    ? [{ weekNumber: 1, days: plan.days }]
    : [];
  return {
    ...existing,
    weeks: Array.isArray(existing.weeks) ? existing.weeks : fallbackWeeks,
    goal: existing.goal || plan.goal || 'general',
    assignmentDefaults: {
      ...toRecord(existing.assignmentDefaults),
      defaultAssignmentType: 'homework',
      billingIntent: 'non_billable_assignment',
      shouldDeductSession: false,
    },
  };
};

const normalizeExercise = (exercise: Record<string, unknown>, index: number): WorkoutPlanDayExercise => ({
  exerciseId: firstString(exercise.exerciseId, exercise.exerciseKey, exercise.id) || `exercise-${index + 1}`,
  exerciseName: firstString(exercise.exerciseName, exercise.name),
  orderInWorkout: toPositiveInteger(exercise.orderInWorkout, index + 1),
  setScheme: firstString(exercise.setScheme) || (
    exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : undefined
  ),
  repGoal: firstString(exercise.repGoal, exercise.reps, exercise.targetReps),
  restPeriod: toPositiveInteger(exercise.restPeriod, 60),
  tempo: firstString(exercise.tempo) || undefined,
  intensityGuideline: firstString(exercise.intensityGuideline, exercise.intensity) || undefined,
  notes: firstString(exercise.notes) || undefined,
});

const normalizeGeneratedDays = (generatedPlan: Record<string, unknown>): WorkoutPlanDay[] => {
  const weeks = Array.isArray(generatedPlan.weeks) ? generatedPlan.weeks : [];
  const days: WorkoutPlanDay[] = [];
  for (const week of weeks) {
    if (!week || typeof week !== 'object') continue;
    const weekNumber = toPositiveInteger((week as Record<string, unknown>).weekNumber, 1);
    const weekDays = Array.isArray((week as Record<string, unknown>).days)
      ? (week as Record<string, unknown>).days as unknown[]
      : [];
    for (const day of weekDays) {
      if (!day || typeof day !== 'object') continue;
      const dayRecord = day as Record<string, unknown>;
      const exercises = Array.isArray(dayRecord.exercises) ? dayRecord.exercises : [];
      const sortOrder = days.length + 1;
      days.push({
        dayNumber: sortOrder,
        name: `Week ${weekNumber} - ${firstString(dayRecord.name) || `Day ${sortOrder}`}`,
        focus: firstString(dayRecord.focus) || 'full_body',
        dayType: firstString(dayRecord.dayType) || 'training',
        optPhase: firstString(dayRecord.optPhase) || undefined,
        sortOrder,
        exercises: exercises
          .filter((exercise): exercise is Record<string, unknown> => Boolean(exercise && typeof exercise === 'object'))
          .map(normalizeExercise),
      });
    }
  }
  return days;
};

export const buildSwanCoachPlanRequest = (params: WorkoutPlanGenerationParams): SwanCoachPlanRequest => {
  const clientId = toPositiveInteger(params.clientId, 0);
  if (!clientId) throw new Error('Valid clientId is required for Swan Coach planning');
  const request: SwanCoachPlanRequest = {
    clientId,
    durationWeeks: deriveDurationWeeks(params.startDate, params.endDate),
    sessionsPerWeek: Math.min(Math.max(toPositiveInteger(params.daysPerWeek, 3), 1), 7),
    primaryGoal: normalizeGoal(params.goal),
  };
  const phase = parsePhase(params.optPhase);
  if (phase) request.startingPhaseOverride = phase;
  return request;
};

export const buildWorkoutPlanFromSwanCoachPlan = (
  params: WorkoutPlanGenerationParams,
  generatedPlan: Record<string, unknown>,
  userId?: string | number,
): WorkoutPlan => ({
  id: firstString(generatedPlan.id) || undefined,
  name: params.name,
  description: [
    params.description,
    'Swan Coach planning generated this program from client context and NASM progression data.',
  ].filter(Boolean).join('\n\n'),
  trainerId: params.trainerId && params.trainerId !== 'current-trainer'
    ? params.trainerId
    : String(userId || ''),
  clientId: params.clientId,
  goal: params.goal || 'general',
  startDate: params.startDate,
  endDate: params.endDate,
  status: 'active',
  planningSystem: firstString(generatedPlan.planningSystem) || 'swan_coach_planning',
  planData: generatedPlan,
  days: normalizeGeneratedDays(generatedPlan),
});

export const buildWorkoutPlanSavePayload = (
  plan: WorkoutPlan,
  options: WorkoutPlanSaveOptions = {},
) => {
  const userId = toPositiveInteger(plan.clientId, 0);
  if (!userId) throw new Error('Valid clientId is required to save workout plan');
  const planData = buildPersistablePlanData(plan);
  const durationWeeks = inferPlanDurationWeeks({ ...plan, planData });
  const horizonKey = closestHorizonKey(durationWeeks);
  const isCoachPlan = plan.planningSystem === 'swan_coach_planning'
    || firstString(toRecord(planData).planningSystem) === 'swan_coach_planning';
  const creatorRole = options.userRole === 'admin' ? 'admin' : 'trainer';
  return {
    userId,
    title: plan.name,
    description: plan.description || null,
    nasmPhase: inferPlanNasmPhase({ ...plan, planData }),
    startDate: plan.startDate || null,
    endDate: plan.endDate || null,
    durationWeeks,
    status: options.status || 'draft',
    planData,
    createdBy: isCoachPlan ? 'ai' : creatorRole,
    metadata: {
      planHorizon: horizonKey,
      horizonKey,
      planDurationKey: horizonKey,
      durationPreset: horizonKey,
      durationWeeks,
      planSource: isCoachPlan ? 'swan_coach_ai' : 'manual_builder',
      createdByRole: creatorRole,
      assignmentDefault: 'homework',
      billingIntent: 'non_billable_assignment',
      defaultShouldDeductSession: false,
    },
  };
};
