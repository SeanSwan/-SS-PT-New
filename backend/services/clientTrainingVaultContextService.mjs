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
import { extractCurrentSession } from './workoutPlanShapeService.mjs';

const ACTIVE_STATUSES = ['active', 'paused', 'draft'];

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const toBoolean = (value) => value === true;

const planId = (plan) => (plan?.id == null ? null : String(plan.id));

const safePlanSummary = (plan) => {
  if (!plan) return null;
  return {
    id: planId(plan),
    status: compactString(plan.status) || 'draft',
    durationWeeks: plan.durationWeeks ?? null,
    currentWeek: plan.currentWeek ?? null,
    currentDay: plan.currentDay ?? null,
    nasmPhase: plan.nasmPhase ?? null,
    createdBy: compactString(plan.createdBy) || null,
    pdfAttached: Boolean(plan.pdfFile),
    assignmentDefault: compactString(plan.assignmentDefault) || null,
    billingIntent: compactString(plan.billingIntent) || null,
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

const safeAssignmentSummary = (assignment) => ({
  assignmentKey: compactString(assignment?.assignmentKey),
  assignmentType: compactString(assignment?.assignmentType) || 'none',
  sessionType: compactString(assignment?.sessionType) || 'solo',
  status: compactString(assignment?.status) || 'none',
  isLoggable: toBoolean(assignment?.isLoggable),
  isBillable: toBoolean(assignment?.isBillable),
  shouldDeductSession: toBoolean(assignment?.shouldDeductSession),
  weekNumber: assignment?.weekNumber ?? null,
  dayNumber: assignment?.dayNumber ?? null,
  exerciseCount: assignment?.exerciseCount ?? 0,
  firstExerciseName: compactString(assignment?.firstExerciseName),
});

const selectActivePlan = (plans) => (
  plans.find((plan) => plan.status === 'active')
  || null
);

const statusWhere = (Op) => (
  Op?.in ? { [Op.in]: ACTIVE_STATUSES } : ACTIVE_STATUSES
);

export async function buildClientTrainingVaultContext({
  clientId,
  WorkoutPlan,
  Op,
  today,
} = {}) {
  if (!clientId || !WorkoutPlan?.findAll) {
    return {
      available: false,
      reason: 'workout_plan_model_unavailable',
      defaultHorizonKey: 'six_month',
      primaryPlanId: null,
      primaryHorizonKey: null,
      filledHorizonKeys: [],
      slots: [],
      todayAssignment: safeAssignmentSummary(null),
    };
  }

  const rows = await WorkoutPlan.findAll({
    where: {
      userId: clientId,
      status: statusWhere(Op),
    },
    order: [['updatedAt', 'DESC']],
    limit: 14,
  });

  const plans = (Array.isArray(rows) ? rows : []).map(toPlainObject).filter(Boolean);
  const activePlan = selectActivePlan(plans);
  const currentSession = activePlan ? extractCurrentSession(activePlan) : null;
  const overview = buildClientTrainingOverview({
    activePlan,
    plans,
    currentSession,
    today,
  });
  const catalog = overview.trainingPlanCatalog;

  return {
    available: plans.length > 0,
    defaultHorizonKey: catalog.defaultHorizonKey,
    primaryPlanId: catalog.primaryPlanId == null ? null : String(catalog.primaryPlanId),
    primaryHorizonKey: catalog.primaryHorizonKey,
    filledHorizonKeys: catalog.filledHorizonKeys,
    slots: catalog.slots.map(safeSlotSummary),
    todayAssignment: safeAssignmentSummary(overview.todayAssignment),
  };
}
