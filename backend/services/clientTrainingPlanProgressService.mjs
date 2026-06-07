/**
 * Client Training Plan Progress Service
 * =====================================
 *
 * Advances an active WorkoutPlan after a verified, non-billable planned
 * assignment log is saved through the canonical DailyWorkoutForm route.
 */

const NON_BILLABLE_ASSIGNMENT_TYPES = new Set(['homework', 'active_recovery']);

const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const sameId = (a, b) => String(a) === String(b);
const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const isNonBillablePlannedAssignment = (assignment = {}) => (
  assignment.source === 'workout_plan'
  && NON_BILLABLE_ASSIGNMENT_TYPES.has(assignment.assignmentType)
  && assignment.isBillable === false
  && assignment.shouldDeductSession === false
);

const clonePlanData = (planData) => {
  if (!planData || typeof planData !== 'object') return { weeks: [] };
  try {
    return JSON.parse(JSON.stringify(planData));
  } catch {
    return { ...planData };
  }
};

const weekEntries = (week = {}) => {
  if (Array.isArray(week.days)) return { key: 'days', entries: week.days };
  if (Array.isArray(week.sessions)) return { key: 'sessions', entries: week.sessions };
  return { key: 'days', entries: [] };
};

const buildPlanLookupOptions = ({ assignment, clientId, transaction }) => {
  const options = {
    where: { id: assignment.planId, userId: clientId, status: 'active' },
    transaction,
  };
  if (transaction?.LOCK?.UPDATE) options.lock = transaction.LOCK.UPDATE;
  return options;
};

const markEntryCompleted = (entry = {}, { completedAt, dailyWorkoutFormId, workoutSessionId }) => ({
  ...entry,
  completed: true,
  completedAt,
  dailyWorkoutFormId,
  workoutSessionId,
  completionSource: 'daily_workout_form',
});

export const advancePlanAfterPlannedAssignmentLog = async ({
  WorkoutPlan,
  assignment,
  clientId,
  dailyWorkoutFormId,
  workoutSessionId,
  completedAt = new Date().toISOString(),
  transaction,
} = {}) => {
  const weekNumber = toPositiveInteger(assignment?.weekNumber);
  const dayNumber = toPositiveInteger(assignment?.dayNumber);
  if (!WorkoutPlan?.findOne || !isNonBillablePlannedAssignment(assignment) || !weekNumber || !dayNumber) {
    return { advanced: false, reason: 'not_applicable' };
  }

  const plan = await WorkoutPlan.findOne(buildPlanLookupOptions({ assignment, clientId, transaction }));
  if (!plan || !sameId(plan.id, assignment.planId)) return { advanced: false, reason: 'plan_not_found' };
  if (Number(plan.currentWeek) !== weekNumber || Number(plan.currentDay) !== dayNumber) {
    return { advanced: false, reason: 'cursor_mismatch' };
  }

  const planData = clonePlanData(plan.planData);
  const weeks = Array.isArray(planData.weeks) ? planData.weeks : [];
  const week = weeks[weekNumber - 1];
  const { key, entries } = weekEntries(week);
  const entry = entries[dayNumber - 1];
  if (!week || !entry) return { advanced: false, reason: 'entry_not_found' };

  entries[dayNumber - 1] = markEntryCompleted(entry, { completedAt, dailyWorkoutFormId, workoutSessionId });
  week[key] = entries;
  weeks[weekNumber - 1] = week;
  planData.weeks = weeks;

  let nextWeek = weekNumber;
  let nextDay = dayNumber + 1;
  let planCompleted = false;
  if (nextDay > entries.length) {
    nextWeek = weekNumber + 1;
    nextDay = 1;
    planCompleted = nextWeek > weeks.length;
  }

  const updatePayload = {
    planData,
    currentWeek: planCompleted ? weekNumber : nextWeek,
    currentDay: planCompleted ? dayNumber : nextDay,
    status: planCompleted ? 'completed' : 'active',
  };
  await plan.update(updatePayload, { transaction });

  return {
    advanced: true,
    planCompleted,
    planId: plan.id,
    previous: { week: weekNumber, day: dayNumber },
    next: planCompleted ? null : { week: nextWeek, day: nextDay },
  };
};
