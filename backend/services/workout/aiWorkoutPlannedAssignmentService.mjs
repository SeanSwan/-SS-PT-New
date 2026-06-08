/**
 * AI Workout Planned Assignment Service
 * =====================================
 * Reuses the canonical planned-assignment guard so Swan Coach workout logs
 * can complete plan homework without trusting model-provided metadata alone.
 */
import { buildClientTrainingOverview } from '../clientTrainingReadModelService.mjs';
import { advancePlanAfterPlannedAssignmentLog } from '../clientTrainingPlanProgressService.mjs';
import {
  PlannedWorkoutAssignmentError,
  assertPlannedAssignmentMatchesOverview,
  buildPlannedAssignmentFormMetadata,
  getPlannedWorkoutAssignmentClientMessage,
  isNonBillablePlannedWorkoutAssignment,
  normalizePlannedWorkoutAssignmentInput,
} from '../plannedWorkoutAssignmentLogService.mjs';
import { toCurrentWorkoutPlanResponse } from '../workoutPlanShapeService.mjs';
import { AiWorkoutDailyFormError, toIsoDateOnly } from './aiWorkoutDailyFormPayloadService.mjs';

const plannedAssignmentError = (message, code = 'PLANNED_ASSIGNMENT_INVALID') => (
  new AiWorkoutDailyFormError(message, code)
);

const plannedAssignmentApplyError = (error) => {
  if (error instanceof PlannedWorkoutAssignmentError) {
    return plannedAssignmentError(getPlannedWorkoutAssignmentClientMessage(error));
  }
  return error;
};

export const isAiNonBillablePlannedAssignment = isNonBillablePlannedWorkoutAssignment;

export async function resolveAiPlannedAssignmentForLog({
  WorkoutPlan,
  rawAssignment,
  clientId,
  workoutDateValue,
  hasScheduledSession = false,
  transaction,
}) {
  const normalized = normalizePlannedWorkoutAssignmentInput(rawAssignment, { hasScheduledSession });
  if (!normalized.ok) throw plannedAssignmentError(normalized.message);
  if (!normalized.assignment) return null;
  if (!WorkoutPlan?.findOne) {
    throw plannedAssignmentError('Workout plan verification is unavailable', 'WORKOUT_APPLY_FAILED');
  }

  const query = {
    where: {
      id: normalized.assignment.planId,
      userId: clientId,
      status: 'active',
    },
    order: [['updatedAt', 'DESC']],
    transaction,
  };
  if (transaction?.LOCK?.UPDATE) query.lock = transaction.LOCK.UPDATE;

  const plan = await WorkoutPlan.findOne(query);
  if (!plan) throw plannedAssignmentError('Active workout plan assignment was not found');

  const formatted = toCurrentWorkoutPlanResponse(plan);
  const overview = buildClientTrainingOverview({
    activePlan: plan,
    plans: [plan],
    currentSession: formatted.currentSession || null,
    ...(hasScheduledSession ? { today: workoutDateValue } : {}),
  });

  try {
    assertPlannedAssignmentMatchesOverview(
      normalized.assignment,
      overview.todayAssignment,
      { hasScheduledSession },
    );
  } catch (error) {
    throw plannedAssignmentApplyError(error);
  }

  const metadata = buildPlannedAssignmentFormMetadata(
    normalized.assignment,
    overview.todayAssignment,
  );
  const assignmentDate = toIsoDateOnly(metadata?.scheduledDate);
  const workoutDate = toIsoDateOnly(workoutDateValue);
  if (assignmentDate && workoutDate && assignmentDate !== workoutDate) {
    throw plannedAssignmentError('Planned assignment date does not match the workout log date');
  }
  return metadata;
}

export async function advanceAiPlannedAssignmentAfterLog({
  WorkoutPlan,
  assignment,
  clientId,
  dailyWorkoutFormId,
  workoutSessionId,
  completedAt,
  hasScheduledSession = false,
  transaction,
}) {
  if (!assignment) return null;
  return advancePlanAfterPlannedAssignmentLog({
    WorkoutPlan,
    assignment,
    clientId,
    dailyWorkoutFormId,
    workoutSessionId,
    completedAt,
    allowScheduledTrainerSession: hasScheduledSession,
    transaction,
  });
}
