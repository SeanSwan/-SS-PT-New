/**
 * useWorkoutMcp.planGeneration.ts
 * ===============================
 * Bridges the legacy MCP-named hook to the real Swan Coach planning API.
 * Owns request mapping, generated-day normalization, and save payload assembly.
 */

import type { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise } from './useWorkoutMcp.types';
import {
  TRAINER_SESSION_ASSIGNMENT_DEFAULTS,
  TRAINER_SESSION_METADATA,
  withTrainerSessionDaySemantics,
  withTrainerSessionPlanWeeks,
} from '../utils/workoutPlanAssignmentSemantics';
import {
  recordArrayFrom,
  sanitizePlanDataForPersistence,
  toRecord,
} from './useWorkoutMcp.planGenerationData';

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
  attachPdf?: boolean;
  clientName?: string;
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
  { key: 'one_week', durationWeeks: 1 }, { key: 'one_month', durationWeeks: 4 },
  { key: 'three_month', durationWeeks: 12 }, { key: 'six_month', durationWeeks: 26 },
  { key: 'nine_month', durationWeeks: 39 }, { key: 'twelve_month', durationWeeks: 52 },
];

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const SWAN_COACH_PLAN_DESCRIPTION =
  'Swan Coach planning generated this program from client context and NASM progression data.';

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const clampDurationWeeks = (weeks: number) => Math.min(Math.max(Math.ceil(weeks), 1), 52);
const parseDateMs = (value?: string) => Date.parse(value || '');
const validDurationWeeks = (weeks: number) => Number.isFinite(weeks) && weeks > 0 ? clampDurationWeeks(weeks) : 8;
const deriveDurationWeeks = (startDate?: string, endDate?: string) =>
  validDurationWeeks((parseDateMs(endDate) - parseDateMs(startDate)) / MS_PER_WEEK);

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

const optionalString = (...values: unknown[]) => firstString(...values) || undefined;

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

const fallbackWeeksFromPlanDays = (plan: WorkoutPlan) =>
  plan.days?.length ? [{ weekNumber: 1, days: plan.days }] : [];

const resolvePersistableWeeks = (existing: Record<string, unknown>, plan: WorkoutPlan) => {
  const existingWeeks = recordArrayFrom(existing.weeks);
  return existingWeeks.length ? existingWeeks : fallbackWeeksFromPlanDays(plan);
};

const buildPersistablePlanData = (plan: WorkoutPlan) => {
  const existing = toRecord(sanitizePlanDataForPersistence(plan.planData));
  return {
    ...existing,
    weeks: withTrainerSessionPlanWeeks(resolvePersistableWeeks(existing, plan)),
    goal: firstString(existing.goal, plan.goal, 'general'),
    assignmentDefaults: {
      ...toRecord(existing.assignmentDefaults),
      ...TRAINER_SESSION_ASSIGNMENT_DEFAULTS,
    },
  };
};

const buildExerciseId = (exercise: Record<string, unknown>, index: number) =>
  optionalString(exercise.exerciseId, exercise.exerciseKey, exercise.id) ?? `exercise-${index + 1}`;

const fallbackSetScheme = (exercise: Record<string, unknown>) =>
  exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : undefined;

const normalizeExercise = (exercise: Record<string, unknown>, index: number): WorkoutPlanDayExercise => ({
  exerciseId: buildExerciseId(exercise, index),
  exerciseName: firstString(exercise.exerciseName, exercise.name),
  orderInWorkout: toPositiveInteger(exercise.orderInWorkout, index + 1),
  setScheme: optionalString(exercise.setScheme) ?? fallbackSetScheme(exercise),
  repGoal: firstString(exercise.repGoal, exercise.reps, exercise.targetReps),
  restPeriod: toPositiveInteger(exercise.restPeriod, 60),
  tempo: optionalString(exercise.tempo),
  intensityGuideline: optionalString(exercise.intensityGuideline, exercise.intensity),
  notes: optionalString(exercise.notes),
});

const generatedDayName = (dayRecord: Record<string, unknown>, weekNumber: number, sortOrder: number) =>
  `Week ${weekNumber} - ${firstString(dayRecord.name, `Day ${sortOrder}`)}`;

const normalizeGeneratedDay = (dayRecord: Record<string, unknown>, weekNumber: number, sortOrder: number) =>
  withTrainerSessionDaySemantics({
  dayNumber: sortOrder,
  name: generatedDayName(dayRecord, weekNumber, sortOrder),
  focus: firstString(dayRecord.focus, 'full_body'),
  dayType: firstString(dayRecord.dayType, 'training'),
  optPhase: optionalString(dayRecord.optPhase),
  sortOrder,
  exercises: recordArrayFrom(dayRecord.exercises).map(normalizeExercise),
});

const normalizeGeneratedWeek = (weekRecord: Record<string, unknown>, baseSortOrder: number) => {
  const weekNumber = toPositiveInteger(weekRecord.weekNumber, 1);
  return recordArrayFrom(weekRecord.days).map((dayRecord, index) =>
    normalizeGeneratedDay(dayRecord, weekNumber, baseSortOrder + index + 1));
};

const normalizeGeneratedDays = (generatedPlan: Record<string, unknown>): WorkoutPlanDay[] =>
  recordArrayFrom(generatedPlan.weeks).reduce<WorkoutPlanDay[]>((days, weekRecord) => [
    ...days,
    ...normalizeGeneratedWeek(weekRecord, days.length),
  ], []);

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

const buildPlanDescription = (description?: string) =>
  [description, SWAN_COACH_PLAN_DESCRIPTION].filter(Boolean).join('\n\n');

const resolveTrainerId = (params: WorkoutPlanGenerationParams, userId?: string | number) =>
  params.trainerId && params.trainerId !== 'current-trainer' ? params.trainerId : String(userId || '');

export const buildWorkoutPlanFromSwanCoachPlan = (
  params: WorkoutPlanGenerationParams,
  generatedPlan: Record<string, unknown>,
  userId?: string | number,
): WorkoutPlan => ({
  id: optionalString(generatedPlan.id),
  name: params.name,
  description: buildPlanDescription(params.description),
  trainerId: resolveTrainerId(params, userId),
  clientId: params.clientId,
  goal: firstString(params.goal, 'general'),
  startDate: params.startDate,
  endDate: params.endDate,
  status: 'active',
  planningSystem: firstString(generatedPlan.planningSystem, 'swan_coach_planning'),
  planData: generatedPlan,
  days: normalizeGeneratedDays(generatedPlan),
});

const roleForCreator = (role?: string) => role === 'admin' ? 'admin' : 'trainer';

const usesSwanCoachPlanning = (plan: WorkoutPlan, planData: Record<string, unknown>) =>
  firstString(plan.planningSystem) === 'swan_coach_planning'
  || firstString(planData.planningSystem) === 'swan_coach_planning';

const sourceForPlan = (isCoachPlan: boolean) => isCoachPlan ? 'swan_coach_planning' : 'manual_builder';

const createdByForPlan = (isCoachPlan: boolean, creatorRole: string) =>
  isCoachPlan ? 'swan_coach_planning' : creatorRole;

const buildSaveMetadata = (horizonKey: string, durationWeeks: number, planSource: string, creatorRole: string) => ({
  planHorizon: horizonKey,
  horizonKey,
  planDurationKey: horizonKey,
  durationPreset: horizonKey,
  durationWeeks,
  planSource,
  createdByRole: creatorRole,
  ...TRAINER_SESSION_METADATA,
});

const requirePlanUserId = (clientId: unknown) => {
  const userId = toPositiveInteger(clientId, 0);
  if (!userId) throw new Error('Valid clientId is required to save workout plan');
  return userId;
};
const nullableText = (value?: string) => value || null;
const saveStatus = (status?: WorkoutPlanSaveOptions['status']) => status || 'draft';

export const buildWorkoutPlanSavePayload = (
  plan: WorkoutPlan,
  options: WorkoutPlanSaveOptions = {},
) => {
  const userId = requirePlanUserId(plan.clientId);
  const planData = buildPersistablePlanData(plan);
  const durationWeeks = inferPlanDurationWeeks({ ...plan, planData });
  const horizonKey = closestHorizonKey(durationWeeks);
  const isCoachPlan = usesSwanCoachPlanning(plan, planData);
  const creatorRole = roleForCreator(options.userRole);
  const planSource = sourceForPlan(isCoachPlan);
  return {
    userId,
    title: plan.name,
    description: nullableText(plan.description),
    nasmPhase: inferPlanNasmPhase({ ...plan, planData }),
    startDate: nullableText(plan.startDate),
    endDate: nullableText(plan.endDate),
    durationWeeks,
    status: saveStatus(options.status),
    planData,
    createdBy: createdByForPlan(isCoachPlan, creatorRole),
    metadata: buildSaveMetadata(horizonKey, durationWeeks, planSource, creatorRole),
  };
};
