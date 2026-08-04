/**
 * ============================================================================
 * FILE: currentClientWorkoutNormalizer.ts
 * PURPOSE: Normalize /api/workouts/:clientId/current into the client dashboard
 * current-workout card contract.
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-08
 * AI VILLAGE VALIDATED: Not run - scoped refactor with local tests.
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Converts the active-plan, today-assignment, homework,
 * and plan-vault fragments returned by the current-workout API into compact
 * view data for the client observatory.
 * HOW IT FITS IN THE APP: useCurrentClientWorkout fetches the endpoint, this
 * normalizer shapes the read model, and dashboard cards render the result.
 * KEY DECISIONS: Keep fallback logic pure and separately tested so the React
 * hook stays limited to request lifecycle state.
 * NASM PROTOCOL CONTEXT: Preserves workout progression labels and planned
 * exercise counts without interpreting exercise science rules here.
 */

import {
  normalizeTrainingPlanVault,
  primaryPlanLabel,
  type TrainingPlanCatalogPreview,
} from './clientTrainingPlanVaultNormalizer';
import { normalizeClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';
import type {
  CurrentClientWorkout,
  CurrentSessionPreview,
  CurrentWorkoutPlanPreview,
  CurrentWorkoutResponse,
  PlannedExercisePreview,
  TodayAssignmentPreview,
} from './currentClientWorkoutTypes';

interface CurrentWorkoutContext {
  plan: CurrentWorkoutPlanPreview;
  assignment: TodayAssignmentPreview;
  session: CurrentSessionPreview;
  exercises: PlannedExercisePreview[];
  catalog: TrainingPlanCatalogPreview | null;
  homeworkSummary: unknown;
}

const EMPTY_PLAN: CurrentWorkoutPlanPreview = {};
const EMPTY_ASSIGNMENT: TodayAssignmentPreview = {};
const EMPTY_SESSION: CurrentSessionPreview = {};

function cleanString(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function firstValue<T>(values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function nullableValue<T>(values: Array<T | null | undefined>): T | null {
  const value = firstValue(values);
  if (value === undefined) return null;
  return value;
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    const candidate = cleanString(value);
    if (candidate) return candidate;
  }
  return undefined;
}

function stringWithFallback(values: unknown[], fallback: string): string {
  const value = firstString(values);
  if (value) return value;
  return fallback;
}

function toPositiveInteger(raw: unknown): number | undefined {
  const value = Number(raw);
  if (!Number.isInteger(value)) return undefined;
  if (value <= 0) return undefined;
  return value;
}

function exerciseName(exercise: PlannedExercisePreview = {}): string | undefined {
  return firstString([exercise.name, exercise.exerciseName]);
}

function arrayValue(value: unknown): PlannedExercisePreview[] | undefined {
  if (Array.isArray(value)) return value;
  return undefined;
}

function sessionExercises(session: CurrentSessionPreview): PlannedExercisePreview[] {
  const exercises = nullableValue([
    arrayValue(session.exercises),
    arrayValue(session.session?.exercises),
  ]);
  if (exercises) return exercises;
  return [];
}

function objectOrEmpty<T extends object>(value: T | null, fallback: T): T {
  if (value) return value;
  return fallback;
}

function planFrom(payload?: CurrentWorkoutResponse | null): CurrentWorkoutPlanPreview | null {
  return nullableValue([payload?.data, payload?.plan]);
}

function assignmentFrom(
  payload: CurrentWorkoutResponse | null | undefined,
  plan: CurrentWorkoutPlanPreview | null,
): TodayAssignmentPreview | null {
  return nullableValue([payload?.todayAssignment, plan?.todayAssignment]);
}

function sessionFrom(
  payload: CurrentWorkoutResponse | null | undefined,
  plan: CurrentWorkoutPlanPreview | null,
): CurrentSessionPreview | null {
  return nullableValue([payload?.currentSession, plan?.currentSession]);
}

function catalogFrom(
  payload: CurrentWorkoutResponse | null | undefined,
  plan: CurrentWorkoutPlanPreview | null,
): TrainingPlanCatalogPreview | null {
  return nullableValue([payload?.trainingPlanCatalog, plan?.trainingPlanCatalog]);
}

function homeworkSummaryFrom(payload: CurrentWorkoutResponse | null | undefined, plan: CurrentWorkoutPlanPreview | null) {
  return nullableValue([payload?.homeworkSummary, plan?.homeworkSummary]);
}

function hasWorkoutContent(plan: CurrentWorkoutPlanPreview | null, assignment: TodayAssignmentPreview | null): boolean {
  if (plan) return true;
  return Boolean(assignment);
}

function currentWorkoutContext(payload?: CurrentWorkoutResponse | null): CurrentWorkoutContext | null {
  const plan = planFrom(payload);
  const assignment = assignmentFrom(payload, plan);
  if (!hasWorkoutContent(plan, assignment)) return null;

  const session = objectOrEmpty(sessionFrom(payload, plan), EMPTY_SESSION);
  return {
    plan: objectOrEmpty(plan, EMPTY_PLAN),
    assignment: objectOrEmpty(assignment, EMPTY_ASSIGNMENT),
    session,
    exercises: assignment?.exercises?.length ? assignment.exercises : sessionExercises(session),
    catalog: catalogFrom(payload, plan),
    homeworkSummary: homeworkSummaryFrom(payload, plan),
  };
}

function assignmentKey(assignment: TodayAssignmentPreview): string | undefined {
  return cleanString(firstValue([assignment.assignmentKey, assignment.assignmentId]));
}

function isLoggable(assignment: TodayAssignmentPreview, exercises: PlannedExercisePreview[]): boolean {
  if (typeof assignment.isLoggable === 'boolean') return assignment.isLoggable;
  return exercises.length > 0;
}

function weekNumber(context: CurrentWorkoutContext): number | undefined {
  return toPositiveInteger(firstValue([
    context.assignment.weekNumber,
    context.session.weekNumber,
    context.plan.currentWeek,
  ]));
}

function dayNumber(context: CurrentWorkoutContext): number | undefined {
  return toPositiveInteger(firstValue([
    context.assignment.dayNumber,
    context.session.dayNumber,
    context.plan.currentDay,
  ]));
}

function dayLabel(context: CurrentWorkoutContext): string | undefined {
  return firstString([
    context.assignment.dayLabel,
    context.session.dayLabel,
    context.session.session?.dayLabel,
    context.session.session?.name,
  ]);
}

function exerciseCount(context: CurrentWorkoutContext): number {
  const assignmentCount = toPositiveInteger(context.assignment.exerciseCount);
  if (assignmentCount) return assignmentCount;
  return context.exercises.length;
}

function exerciseNames(context: CurrentWorkoutContext): string[] {
  return context.exercises.map(exerciseName).filter((name): name is string => Boolean(name));
}

function firstExercise(context: CurrentWorkoutContext): string | undefined {
  return cleanString(context.assignment.firstExerciseName) || exerciseNames(context)[0];
}

function weeklyPlanVolume(context: CurrentWorkoutContext): number | undefined {
  // The /current response's `days` is the CURRENT plan week flattened by the
  // backend shape service — its length is the plan's real weekly session
  // volume. No days array (assignment-only payloads, legacy shapes) → no
  // volume claim.
  const days = context.plan.days;
  return Array.isArray(days) && days.length > 0 ? days.length : undefined;
}

function buildCurrentClientWorkout(context: CurrentWorkoutContext): CurrentClientWorkout {
  return {
    title: stringWithFallback([context.assignment.title, context.plan.title, context.plan.name], 'Today\'s Assignment'),
    assignmentKey: assignmentKey(context.assignment),
    assignmentType: context.assignment.assignmentType,
    assignmentStatus: context.assignment.status,
    sessionType: context.assignment.sessionType,
    isLoggable: isLoggable(context.assignment, context.exercises),
    ctaLabel: stringWithFallback([context.assignment.ctaLabel], 'Start'),
    weekNumber: weekNumber(context),
    dayNumber: dayNumber(context),
    dayLabel: dayLabel(context),
    exerciseCount: exerciseCount(context),
    firstExercise: firstExercise(context),
    exerciseNames: exerciseNames(context),
    scheduledDate: cleanString(context.assignment.scheduledDate),
    prescribedRevision: toPositiveInteger(context.assignment.prescribedRevision),
    primaryPlanLabel: primaryPlanLabel(context.catalog),
    homeworkSummary: normalizeClientHomeworkSummary(context.homeworkSummary),
    weeklyPlanVolume: weeklyPlanVolume(context),
  };
}

/**
 * Builds the dashboard current-workout contract from either canonical or legacy
 * current-workout response shapes. Assignment-only payloads stay visible so
 * off-day homework can still route clients into the workout logger.
 */
export function normalizeCurrentClientWorkout(payload?: CurrentWorkoutResponse | null): CurrentClientWorkout | null {
  const context = currentWorkoutContext(payload);
  if (!context) return null;
  return buildCurrentClientWorkout(context);
}

export { normalizeTrainingPlanVault };
export type { ClientTrainingPlanVault } from './clientTrainingPlanVaultNormalizer';
export type { CurrentClientWorkout, CurrentWorkoutResponse } from './currentClientWorkoutTypes';
