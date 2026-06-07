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

interface WorkoutBuilderPlanSaveOptions {
  assignmentDefault?: WorkoutBuilderPlanAssignmentDefault;
}

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

const buildPlanData = (
  plan: GeneratedPlan,
  assignmentDefault: WorkoutBuilderPlanAssignmentDefault,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    weeks: Array.isArray(plan.weeks) ? plan.weeks : [],
    mesocycles: plan.mesocycles ?? [],
    weeklySchedule: plan.weeklySchedule ?? [],
    recommendations: plan.recommendations ?? [],
    rationale: plan.rationale ?? [],
    planSummary: plan.planSummary,
    goal: plan.planSummary.primaryGoal,
    category: 'full_body',
    assignmentDefaults: buildAssignmentDefaults(assignmentDefault),
  };

  if (plan.recommendationDetails) {
    payload.recommendationDetails = plan.recommendationDetails;
  }
  if (plan.equipmentContext !== undefined) {
    payload.equipmentContext = plan.equipmentContext;
  }

  return payload;
};

export const buildWorkoutBuilderPlanSavePayload = (
  plan: GeneratedPlan,
  options: WorkoutBuilderPlanSaveOptions = {},
): WorkoutBuilderPlanSavePayload => {
  const { planSummary } = plan;
  const phase = Number.isFinite(planSummary.startingPhase) ? planSummary.startingPhase : null;
  const goal = goalLabel(planSummary.primaryGoal || 'general_fitness');
  const assignmentDefault = normalizeAssignmentDefault(options.assignmentDefault);
  const billingIntent = billingIntentFor(assignmentDefault);

  return {
    userId: plan.clientId,
    title: `${plan.clientName || 'Client'} - ${planSummary.durationWeeks}-Week Swan Coach Plan`,
    description: `${goal} plan generated from Swan Coach Planning context.`,
    nasmPhase: phase,
    durationWeeks: planSummary.durationWeeks,
    status: 'draft',
    planData: buildPlanData(plan, assignmentDefault),
    createdBy: 'ai',
    metadata: {
      source: 'workout_builder',
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
