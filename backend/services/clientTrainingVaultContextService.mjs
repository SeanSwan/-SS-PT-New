/**
 * Client Training Vault Context Service
 * =====================================
 *
 * Builds a de-identified, LLM-safe summary of the Workout Plan Vault for
 * Swan Coach Planning. The output intentionally uses plan IDs, horizon keys,
 * week/day cursors, assignment semantics, and boolean PDF presence only.
 * It does not expose client names, plan titles, PDF URLs, file names, or
 * private storage keys.
 */

import { buildClientTrainingOverview } from './clientTrainingReadModelService.mjs';
import { summarizeAssignmentExercises } from './clientTrainingExercisePreviewService.mjs';
import { readAssignmentCompletionContext } from './clientTrainingAssignmentCompletionService.mjs';
import { summarizeHomeworkSummary } from './clientTrainingHomeworkSummaryReadSanitizer.mjs';
import {
  compactString,
  compactStringOr,
  stringIdOrNull,
  toBoolean,
  toDateOnly,
  toPlainObject,
  valueOr,
} from './clientTrainingSafeReadValueService.mjs';
import { extractCurrentSession } from './workoutPlanShapeService.mjs';

const ACTIVE_STATUSES = ['active', 'paused', 'draft'];
const EMPTY_ASSIGNMENT = Object.freeze({});

const safePlanSummary = (plan) => {
  if (!plan) return null;
  return {
    id: stringIdOrNull(plan.id),
    status: compactStringOr(plan.status, 'draft'),
    durationWeeks: valueOr(plan.durationWeeks, null),
    currentWeek: valueOr(plan.currentWeek, null),
    currentDay: valueOr(plan.currentDay, null),
    nasmPhase: valueOr(plan.nasmPhase, null),
    createdBy: compactString(plan.createdBy),
    pdfAttached: Boolean(plan.pdfFile),
    assignmentDefault: compactString(plan.assignmentDefault),
    billingIntent: compactString(plan.billingIntent),
    defaultShouldDeductSession: toBoolean(plan.defaultShouldDeductSession),
  };
};

const safeSlotSummary = (slot) => ({
  horizonKey: slot.horizonKey,
  label: slot.label,
  durationWeeks: slot.durationWeeks,
  isDefaultHorizon: toBoolean(slot.isDefaultHorizon),
  isFilled: toBoolean(slot.isFilled),
  isPrimary: toBoolean(slot.isPrimary),
  plan: slot.plan ? safePlanSummary(slot.plan) : null,
});

const safeAssignmentCompletion = (completion) => {
  if (!completion) return null;
  return {
    source: compactString(completion.source),
    formId: stringIdOrNull(completion.formId),
    completedAt: toDateOnly(completion.completedAt),
  };
};

const safeAssignmentBaseSummary = (assignment = EMPTY_ASSIGNMENT) => ({
  assignmentKey: compactString(assignment.assignmentKey),
  assignmentType: compactStringOr(assignment.assignmentType, 'none'),
  sessionType: compactStringOr(assignment.sessionType, 'solo'),
  status: compactStringOr(assignment.status, 'none'),
  isLoggable: toBoolean(assignment.isLoggable),
  isBillable: toBoolean(assignment.isBillable),
  shouldDeductSession: toBoolean(assignment.shouldDeductSession),
  ctaLabel: compactString(assignment.ctaLabel),
  weekNumber: valueOr(assignment.weekNumber, null),
  dayNumber: valueOr(assignment.dayNumber, null),
  exerciseCount: valueOr(assignment.exerciseCount, 0),
  firstExerciseName: compactString(assignment.firstExerciseName),
  exercisePreview: summarizeAssignmentExercises(assignment.exercises),
});

const safeAssignmentSummary = (assignment) => {
  const completion = safeAssignmentCompletion(assignment?.completion);
  const summary = safeAssignmentBaseSummary(assignment || {});
  return completion ? { ...summary, completion } : summary;
};

const selectActivePlan = (plans) => (
  plans.find((plan) => plan.status === 'active')
  || null
);

const statusWhere = (Op) => (
  Op?.in ? { [Op.in]: ACTIVE_STATUSES } : ACTIVE_STATUSES
);

const unavailableContext = () => ({
  available: false,
  reason: 'workout_plan_model_unavailable',
  defaultHorizonKey: 'six_month',
  primaryPlanId: null,
  primaryHorizonKey: null,
  filledHorizonKeys: [],
  slots: [],
  todayAssignment: safeAssignmentSummary(null),
  homeworkSummary: summarizeHomeworkSummary(),
});

const hasWorkoutPlanReader = ({ clientId, WorkoutPlan }) => (
  Boolean(clientId) && typeof WorkoutPlan?.findAll === 'function'
);

const readCandidatePlans = async ({ clientId, WorkoutPlan, Op }) => (
  WorkoutPlan.findAll({
    where: {
      userId: clientId,
      status: statusWhere(Op),
    },
    order: [['updatedAt', 'DESC']],
    limit: 14,
  })
);

const normalizePlanRows = (rows) => (
  (Array.isArray(rows) ? rows : []).map(toPlainObject).filter(Boolean)
);

const currentSessionFor = (activePlan) => (
  activePlan ? extractCurrentSession(activePlan) : null
);

const stringPrimaryPlanId = (catalog) => stringIdOrNull(catalog.primaryPlanId);

const availableContext = ({ plans, overview }) => {
  const catalog = overview.trainingPlanCatalog;
  return {
    available: plans.length > 0,
    defaultHorizonKey: catalog.defaultHorizonKey,
    primaryPlanId: stringPrimaryPlanId(catalog),
    primaryHorizonKey: catalog.primaryHorizonKey,
    filledHorizonKeys: catalog.filledHorizonKeys,
    slots: catalog.slots.map(safeSlotSummary),
    todayAssignment: safeAssignmentSummary(overview.todayAssignment),
    homeworkSummary: summarizeHomeworkSummary(overview.homeworkSummary),
  };
};

export async function buildClientTrainingVaultContext({
  clientId,
  WorkoutPlan,
  DailyWorkoutForm,
  Op,
  today,
} = {}) {
  if (!hasWorkoutPlanReader({ clientId, WorkoutPlan })) return unavailableContext();

  const rows = await readCandidatePlans({ clientId, WorkoutPlan, Op });
  const plans = normalizePlanRows(rows);
  const activePlan = selectActivePlan(plans);
  const todayDate = toDateOnly(today);
  const completionContext = await readAssignmentCompletionContext(
    DailyWorkoutForm,
    { clientId, date: todayDate },
  );
  const overview = buildClientTrainingOverview({
    activePlan,
    plans,
    currentSession: currentSessionFor(activePlan),
    today,
    assignmentCompletions: completionContext.assignmentCompletions,
    recentAssignmentCompletions: completionContext.recentAssignmentCompletions,
  });
  return availableContext({ plans, overview });
}
