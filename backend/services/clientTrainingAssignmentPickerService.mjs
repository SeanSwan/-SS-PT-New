/**
 * Client Training Assignment Picker Service
 * =========================================
 * Builds read-only generated-plan/day choices for the Workout Logger. The
 * picker may load any generated day as a draft, but only the active current
 * assignment is flagged as safe to submit as a planned assignment.
 */

import { buildPlanAssignmentSemantics, normalizeAssignmentType } from './clientTrainingAssignmentSemanticsService.mjs';
import { applyAssignmentCompletion } from './clientTrainingAssignmentCompletionService.mjs';

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const firstCompactString = (...values) => values.map(compactString).find(Boolean) || null;
const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const isActivePlan = (plan) => compactString(plan?.status)?.toLowerCase() === 'active';
const planUpdatedTime = (plan) => {
  const value = plan?.updatedAt || plan?.createdAt || plan?.startDate;
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirstNonEmptyArray = (...candidates) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
};

const toExerciseName = (entry) => (
  firstCompactString(entry?.exerciseName, entry?.name, entry?.exercise?.name, entry?.exercise?.exerciseName)
  || 'Unknown Exercise'
);

const toPickerExercise = (entry, index) => {
  const exercise = toPlainObject(entry) || {};
  const name = toExerciseName(exercise);
  return {
    id: exercise.id || exercise.exerciseId || `plan-exercise-${index + 1}`,
    exerciseId: exercise.exerciseId || exercise.id || null,
    name,
    exerciseName: name,
    sets: exercise.sets ?? exercise.setScheme ?? 3,
    reps: exercise.reps ?? exercise.targetReps ?? exercise.repGoal ?? '10',
    targetReps: exercise.targetReps ?? exercise.reps ?? exercise.repGoal ?? '10',
    restSeconds: exercise.restSeconds ?? exercise.restTime ?? exercise.restPeriod ?? null,
    restTime: exercise.restTime ?? exercise.restSeconds ?? exercise.restPeriod ?? 60,
    tempo: exercise.tempo || '',
    notes: exercise.notes || '',
  };
};

const dayEntriesForPlan = (planData = {}) => {
  const weeks = Array.isArray(planData.weeks) ? planData.weeks : [];
  if (weeks.length > 0) {
    return weeks.flatMap((rawWeek, weekIndex) => {
      const week = toPlainObject(rawWeek) || {};
      const weekNumber = toPositiveInteger(week.weekNumber ?? week.week, weekIndex + 1);
      return pickFirstNonEmptyArray(week.days, week.sessions).map((rawDay, dayIndex) => ({
        week,
        weekNumber,
        day: toPlainObject(rawDay) || {},
        dayIndex,
      }));
    });
  }

  return pickFirstNonEmptyArray(planData.days, planData.sessions, planData.weeklySchedule)
    .map((rawDay, dayIndex) => ({
      week: null,
      weekNumber: 1,
      day: toPlainObject(rawDay) || {},
      dayIndex,
    }));
};

const dayStatus = (day = {}) => {
  const status = compactString(day.status)?.toLowerCase();
  if (status) return status;
  return day.completed === true || day.isCompleted === true ? 'completed' : 'planned';
};

const assignmentTypeForDay = (plan, day, exerciseCount) => normalizeAssignmentType(
  day.assignmentType || day.dayType || day.type || day.category || buildPlanAssignmentSemantics(plan).defaultAssignmentType,
  exerciseCount,
);

const assignmentTitle = (plan, day, dayNumber, type) => firstCompactString(
  day.title,
  day.dayLabel,
  day.name,
  type === 'rest' ? 'Recovery Day' : null,
  `${firstCompactString(plan?.title, plan?.name, 'Training Plan')} Day ${dayNumber}`,
);

const assignmentKeyFor = ({ planId, weekNumber, dayNumber, type }) => (
  planId ? `${planId}:w${weekNumber || 1}:d${dayNumber || 1}:${type}` : null
);

const isCurrentPlanDay = (plan, weekNumber, dayNumber) => (
  isActivePlan(plan)
  && Number(plan.currentWeek || 1) === Number(weekNumber || 1)
  && Number(plan.currentDay || 1) === Number(dayNumber || 1)
);

const buildPickerAssignment = ({ plan, rawPlan, weekNumber, day, dayIndex, today, assignmentCompletions }) => {
  const planId = rawPlan.id ?? null;
  const dayNumber = toPositiveInteger(day.dayNumber ?? day.sessionNumber ?? day.day, dayIndex + 1);
  const exercises = (Array.isArray(day.exercises) ? day.exercises : []).map(toPickerExercise);
  const exerciseCount = exercises.length;
  const assignmentType = assignmentTypeForDay(rawPlan, day, exerciseCount);
  const status = dayStatus(day);
  const assignmentKey = assignmentKeyFor({ planId, weekNumber, dayNumber, type: assignmentType });
  const current = isCurrentPlanDay(rawPlan, weekNumber, dayNumber);
  const completed = status === 'completed';
  const rest = assignmentType === 'rest';
  const trainerSession = assignmentType === 'trainer_session';
  const isLoadable = exerciseCount > 0 && !completed && !rest;
  const canSubmitPlannedAssignment = current && isLoadable && !trainerSession;
  const assignment = {
    id: assignmentKey || `${planId || 'plan'}:w${weekNumber}:d${dayNumber}`,
    assignmentId: assignmentKey,
    assignmentKey,
    assignmentType,
    sessionType: trainerSession ? 'trainer-led' : 'solo',
    source: 'workout_plan',
    planId,
    planTitle: firstCompactString(rawPlan.title, rawPlan.name) || 'Training Plan',
    planStatus: compactString(rawPlan.status) || 'draft',
    isCurrent: current,
    isLoadable,
    canSubmitPlannedAssignment,
    isBillable: trainerSession,
    shouldDeductSession: trainerSession && day.shouldDeductSession === true,
    status,
    title: assignmentTitle(rawPlan, day, dayNumber, assignmentType),
    scheduledDate: current ? today : null,
    weekNumber,
    dayNumber,
    dayLabel: firstCompactString(day.dayLabel, day.name, `Day ${dayNumber}`),
    exerciseCount,
    firstExerciseName: exercises[0]?.exerciseName || null,
    exercises,
    submitMode: canSubmitPlannedAssignment ? 'planned_assignment' : 'draft_only',
  };
  const completedAssignment = applyAssignmentCompletion(assignment, assignmentCompletions);
  return completedAssignment === assignment
    ? assignment
    : { ...completedAssignment, isLoadable: false, canSubmitPlannedAssignment: false, submitMode: 'draft_only' };
};

export const buildClientTrainingAssignmentPicker = ({
  plans = [],
  today = new Date().toISOString().slice(0, 10),
  assignmentCompletions = [],
  limit = 160,
} = {}) => {
  const planRows = (Array.isArray(plans) ? plans : [])
    .map((plan) => toPlainObject(plan))
    .filter(Boolean)
    .sort((a, b) => Number(isActivePlan(b)) - Number(isActivePlan(a)) || planUpdatedTime(b) - planUpdatedTime(a));

  const assignments = planRows.flatMap((rawPlan) => {
    const planData = toPlainObject(rawPlan.planData || rawPlan.plan_data) || {};
    return dayEntriesForPlan(planData).map(({ weekNumber, day, dayIndex }) => buildPickerAssignment({
      plan: rawPlan,
      rawPlan,
      weekNumber,
      day,
      dayIndex,
      today,
      assignmentCompletions,
    }));
  });

  return assignments
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent))
    .slice(0, limit);
};
