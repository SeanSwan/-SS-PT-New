/**
 * Client Training Plan Progress Service
 * =====================================
 *
 * Advances an active WorkoutPlan after a verified planned assignment log is
 * saved through the canonical DailyWorkoutForm route. Non-billable homework
 * can advance directly; trainer sessions require scheduled-session context.
 */

const NON_BILLABLE_ASSIGNMENT_TYPES = new Set(['homework', 'active_recovery']);
const SCHEDULED_TRAINER_ASSIGNMENT_TYPES = new Set(['trainer_session']);
const WEEK_NUMBER_KEYS = ['weekNumber', 'week'];
const DAY_NUMBER_KEYS = ['dayNumber', 'sessionNumber', 'day'];

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

const isScheduledTrainerSessionAssignment = (assignment = {}) => (
  assignment.source === 'workout_plan'
  && SCHEDULED_TRAINER_ASSIGNMENT_TYPES.has(assignment.assignmentType)
  && assignment.isBillable === true
);

const canAdvancePlanAssignment = (assignment, { allowScheduledTrainerSession = false } = {}) => (
  isNonBillablePlannedAssignment(assignment)
  || (allowScheduledTrainerSession && isScheduledTrainerSessionAssignment(assignment))
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
  if (Array.isArray(week.days) && week.days.length > 0) return { key: 'days', entries: week.days };
  if (Array.isArray(week.sessions) && week.sessions.length > 0) return { key: 'sessions', entries: week.sessions };
  return { key: 'days', entries: [] };
};

const topLevelEntries = (planData = {}) => {
  if (Array.isArray(planData.days) && planData.days.length > 0) return { key: 'days', entries: planData.days };
  if (Array.isArray(planData.sessions) && planData.sessions.length > 0) return { key: 'sessions', entries: planData.sessions };
  if (Array.isArray(planData.weeklySchedule) && planData.weeklySchedule.length > 0) {
    return { key: 'weeklySchedule', entries: planData.weeklySchedule };
  }
  return { key: 'days', entries: [] };
};

const findNumberedEntry = (entries, targetNumber, fallbackIndex, keys) => {
  const explicitIndex = entries.findIndex((entry) => (
    entry && typeof entry === 'object' && keys.some((key) => Number(entry[key]) === targetNumber)
  ));
  const index = explicitIndex >= 0
    ? explicitIndex
    : entries[fallbackIndex] && typeof entries[fallbackIndex] === 'object' ? fallbackIndex : -1;
  return { entry: index >= 0 ? entries[index] : null, index };
};

const numberFromEntry = (entry, keys, fallback) => {
  for (const key of keys) {
    const value = toPositiveInteger(entry?.[key]);
    if (value) return value;
  }
  return fallback;
};

const resolveAssignmentEntryContext = (planData, weekNumber, dayNumber) => {
  const weeks = Array.isArray(planData.weeks) ? planData.weeks : [];
  if (weeks.length > 0) {
    const weekMatch = findNumberedEntry(weeks, weekNumber, weekNumber - 1, WEEK_NUMBER_KEYS);
    if (!weekMatch.entry) return null;
    const { key, entries } = weekEntries(weekMatch.entry);
    const dayMatch = findNumberedEntry(entries, dayNumber, dayNumber - 1, DAY_NUMBER_KEYS);
    if (!dayMatch.entry) return null;
    return {
      mode: 'weeks',
      weeks,
      week: weekMatch.entry,
      weekIndex: weekMatch.index,
      key,
      entries,
      entry: dayMatch.entry,
      entryIndex: dayMatch.index,
    };
  }

  const { key, entries } = topLevelEntries(planData);
  const dayMatch = findNumberedEntry(entries, dayNumber, dayNumber - 1, DAY_NUMBER_KEYS);
  if (!dayMatch.entry) return null;
  return { mode: 'top_level', key, entries, entry: dayMatch.entry, entryIndex: dayMatch.index };
};

const buildPlanLookupOptions = ({ assignment, clientId, transaction }) => {
  const options = {
    where: { id: assignment.planId, userId: clientId, status: 'active' },
    transaction,
  };
  if (transaction?.LOCK?.UPDATE) options.lock = transaction.LOCK.UPDATE;
  return options;
};

const markEntryCompleted = (
  entry = {},
  { completedAt, dailyWorkoutFormId, workoutSessionId, trainerNotes } = {},
) => ({
  ...entry,
  completed: true,
  completedAt,
  ...(dailyWorkoutFormId ? { dailyWorkoutFormId } : {}),
  ...(workoutSessionId ? { workoutSessionId } : {}),
  ...(trainerNotes ? { trainerNotes } : {}),
  completionSource: dailyWorkoutFormId ? 'daily_workout_form' : 'workout_plan_advance',
});

export const advancePlanDataCursor = ({
  planData: sourcePlanData,
  weekNumber,
  dayNumber,
  completedAt = new Date().toISOString(),
  dailyWorkoutFormId,
  workoutSessionId,
  trainerNotes,
} = {}) => {
  const planData = clonePlanData(sourcePlanData);
  const context = resolveAssignmentEntryContext(planData, weekNumber, dayNumber);
  if (!context) return { advanced: false, reason: 'entry_not_found' };

  context.entries[context.entryIndex] = markEntryCompleted(context.entry, {
    completedAt,
    dailyWorkoutFormId,
    workoutSessionId,
    trainerNotes,
  });
  if (context.mode === 'weeks') {
    context.week[context.key] = context.entries;
    context.weeks[context.weekIndex] = context.week;
    planData.weeks = context.weeks;
  } else {
    planData[context.key] = context.entries;
  }

  let nextWeek = weekNumber;
  let nextDay = numberFromEntry(context.entries[context.entryIndex + 1], DAY_NUMBER_KEYS, dayNumber + 1);
  let planCompleted = false;
  if (!context.entries[context.entryIndex + 1]) {
    const nextWeekEntry = context.mode === 'weeks' ? context.weeks[context.weekIndex + 1] : null;
    if (nextWeekEntry) {
      nextWeek = numberFromEntry(nextWeekEntry, WEEK_NUMBER_KEYS, weekNumber + 1);
      nextDay = numberFromEntry(weekEntries(nextWeekEntry).entries[0], DAY_NUMBER_KEYS, 1);
    } else {
      planCompleted = true;
      nextDay = dayNumber;
    }
  }

  return {
    advanced: true,
    planData,
    planCompleted,
    previous: { week: weekNumber, day: dayNumber },
    next: planCompleted ? null : { week: nextWeek, day: nextDay },
  };
};

export const advancePlanAfterPlannedAssignmentLog = async ({
  WorkoutPlan,
  assignment,
  clientId,
  dailyWorkoutFormId,
  workoutSessionId,
  completedAt = new Date().toISOString(),
  allowScheduledTrainerSession = false,
  transaction,
} = {}) => {
  const weekNumber = toPositiveInteger(assignment?.weekNumber);
  const dayNumber = toPositiveInteger(assignment?.dayNumber);
  if (
    !WorkoutPlan?.findOne
    || !canAdvancePlanAssignment(assignment, { allowScheduledTrainerSession })
    || !weekNumber
    || !dayNumber
  ) {
    return { advanced: false, reason: 'not_applicable' };
  }

  const plan = await WorkoutPlan.findOne(buildPlanLookupOptions({ assignment, clientId, transaction }));
  if (!plan || !sameId(plan.id, assignment.planId)) return { advanced: false, reason: 'plan_not_found' };
  if (Number(plan.currentWeek) !== weekNumber || Number(plan.currentDay) !== dayNumber) {
    return { advanced: false, reason: 'cursor_mismatch' };
  }

  const cursorAdvance = advancePlanDataCursor({
    planData: plan.planData,
    weekNumber,
    dayNumber,
    completedAt,
    dailyWorkoutFormId,
    workoutSessionId,
  });
  if (!cursorAdvance.advanced) return cursorAdvance;

  const updatePayload = {
    planData: cursorAdvance.planData,
    currentWeek: cursorAdvance.planCompleted ? weekNumber : cursorAdvance.next.week,
    currentDay: cursorAdvance.planCompleted ? dayNumber : cursorAdvance.next.day,
    status: cursorAdvance.planCompleted ? 'completed' : 'active',
  };
  await plan.update(updatePayload, { transaction });

  return {
    advanced: true,
    planCompleted: cursorAdvance.planCompleted,
    planId: plan.id,
    previous: cursorAdvance.previous,
    next: cursorAdvance.next,
  };
};
