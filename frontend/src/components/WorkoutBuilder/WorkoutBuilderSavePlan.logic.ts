/**
 * WorkoutBuilderSavePlan.logic
 * ----------------------------
 * Builds the canonical POST /api/workout-plans payload for generated
 * Swan Coach plans without coupling the active builder route to the admin
 * planner's local state machine.
 */

import type {
  GeneratedPlan,
  WorkoutBuilderPlanAssignmentDefault,
  WorkoutBuilderPlanBillingIntent,
  WorkoutBuilderPlanSavePayload,
} from '../../hooks/useWorkoutBuilderAPI';
import { toPositiveInteger } from '../../utils/objectValueGuards';
import { sanitizeWorkoutPlanDataForPersistence } from '../../utils/workoutPlanDataPrivacy';

interface WorkoutBuilderPlanSaveOptions {
  assignmentDefault?: WorkoutBuilderPlanAssignmentDefault;
}

type NormalizedPlanSummary = {
  durationWeeks: number;
  sessionsPerWeek: number;
  totalSessions: number;
  primaryGoal: string;
  startingPhase: number | null;
  equipmentProfileId: number | null;
  trainingStyle?: GeneratedPlan['trainingStyle'];
};

const normalizeAssignmentDefault = (
  value?: WorkoutBuilderPlanAssignmentDefault,
): WorkoutBuilderPlanAssignmentDefault => (
  value === 'trainer_session' ? 'trainer_session' : 'homework'
);

const billingIntentFor = (
  assignmentDefault: WorkoutBuilderPlanAssignmentDefault,
): WorkoutBuilderPlanBillingIntent => (
  assignmentDefault === 'trainer_session'
    ? 'trainer_led_scheduled_flow'
    : 'non_billable_assignment'
);

const buildAssignmentDefaults = (assignmentDefault: WorkoutBuilderPlanAssignmentDefault) => ({
  defaultAssignmentType: assignmentDefault,
  billingIntent: billingIntentFor(assignmentDefault),
  shouldDeductSession: false,
});

const goalLabel = (goal: string): string =>
  goal
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parsePositiveIntegerOrNull = (value: unknown): number | null => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeNasmPhase = (value: unknown): number | null => {
  const phase = parsePositiveIntegerOrNull(value);
  return phase !== null && phase >= 1 && phase <= 5 ? phase : null;
};

const normalizeGeneratedPlanSummary = (summary: GeneratedPlan['planSummary']): NormalizedPlanSummary => {
  const durationWeeks = toPositiveInteger(summary.durationWeeks, 12);
  const sessionsPerWeek = toPositiveInteger(summary.sessionsPerWeek, 3);

  return {
    durationWeeks,
    sessionsPerWeek,
    totalSessions: toPositiveInteger(summary.totalSessions, durationWeeks * sessionsPerWeek),
    primaryGoal: typeof summary.primaryGoal === 'string' && summary.primaryGoal.trim()
      ? summary.primaryGoal
      : 'general_fitness',
    startingPhase: normalizeNasmPhase(summary.startingPhase),
    equipmentProfileId: parsePositiveIntegerOrNull(summary.equipmentProfileId),
    trainingStyle: summary.trainingStyle,
  };
};

const buildPlanData = (
  plan: GeneratedPlan,
  planSummary: NormalizedPlanSummary,
  assignmentDefault: WorkoutBuilderPlanAssignmentDefault,
): Record<string, unknown> => {
  const trainingStyle = plan.trainingStyle ?? planSummary.trainingStyle;
  const normalizedPlanSummary = trainingStyle
    ? { ...planSummary, trainingStyle }
    : planSummary;

  const payload: Record<string, unknown> = {
    weeks: Array.isArray(plan.weeks) ? plan.weeks : [],
    mesocycles: plan.mesocycles ?? [],
    weeklySchedule: plan.weeklySchedule ?? [],
    recommendations: plan.recommendations ?? [],
    rationale: plan.rationale ?? [],
    planSummary: normalizedPlanSummary,
    goal: planSummary.primaryGoal,
    category: 'full_body',
    planningSystem: plan.planningSystem,
    swanCoachPlanning: plan.swanCoachPlanning,
    assignmentDefaults: buildAssignmentDefaults(assignmentDefault),
  };

  if (trainingStyle) {
    payload.trainingStyle = trainingStyle;
  }
  if (plan.recommendationDetails) {
    payload.recommendationDetails = plan.recommendationDetails;
  }
  if (plan.equipmentContext !== undefined) {
    payload.equipmentContext = plan.equipmentContext;
  }

  return sanitizeWorkoutPlanDataForPersistence(payload) as Record<string, unknown>;
};

export const buildWorkoutBuilderPlanSavePayload = (
  plan: GeneratedPlan,
  options: WorkoutBuilderPlanSaveOptions = {},
): WorkoutBuilderPlanSavePayload => {
  const planSummary = normalizeGeneratedPlanSummary(plan.planSummary);
  const goal = goalLabel(planSummary.primaryGoal);
  const assignmentDefault = normalizeAssignmentDefault(options.assignmentDefault);
  const billingIntent = billingIntentFor(assignmentDefault);

  return {
    userId: plan.clientId,
    title: `${plan.clientName || 'Client'} - ${planSummary.durationWeeks}-Week Swan Coach Plan`,
    description: `${goal} plan generated from Swan Coach Planning context.`,
    nasmPhase: planSummary.startingPhase,
    durationWeeks: planSummary.durationWeeks,
    status: 'draft',
    planData: buildPlanData(plan, planSummary, assignmentDefault),
    createdBy: 'swan_coach_planning',
    metadata: {
      source: 'workout_builder',
      planSource: 'swan_coach_planning',
      planningSystem: plan.planningSystem,
      swanCoachPlanning: plan.swanCoachPlanning,
      primaryGoal: planSummary.primaryGoal,
      sessionsPerWeek: planSummary.sessionsPerWeek,
      totalSessions: planSummary.totalSessions,
      equipmentProfileId: planSummary.equipmentProfileId,
      generatedAt: plan.generatedAt,
      defaultAssignmentType: assignmentDefault,
      billingIntent,
      defaultShouldDeductSession: false,
    },
  };
};
