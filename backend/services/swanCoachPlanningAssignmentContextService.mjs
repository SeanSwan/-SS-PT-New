/**
 * Swan Coach planning assignment context service.
 *
 * Formats read-only assignment semantics for active workout-plan days so
 * Swan Coach can guide logging without implying paid-session deduction.
 */

import { buildClientTrainingOverview } from './clientTrainingReadModelService.mjs';
import {
  asArray,
  firstPresent,
  getWeekDaysOrSessions,
  tryParse,
} from './swanCoachPlanningShapeHelpers.mjs';
import { extractCurrentSession } from './workoutPlanShapeService.mjs';

function compactString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function safeScalar(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).slice(0, 80);
}

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const integerLabel = (label, value) => {
  const parsed = positiveInteger(value);
  return parsed ? `${label} ${parsed}` : null;
};

function homeworkPosition(summary) {
  const parts = [
    integerLabel('Week', summary?.todayWeekNumber),
    integerLabel('Day', summary?.todayDayNumber),
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

const hasTodayHomework = summary => summary?.assignmentType === 'homework';

function hasHomeworkContext(summary) {
  if (!summary) return false;
  return hasTodayHomework(summary) || Boolean(positiveInteger(summary.recentCompletedCount));
}

function todayHomeworkLines(summary) {
  if (!hasTodayHomework(summary)) return [];
  return [
    `Today Homework: ${compactString(summary.todayStatus) || 'planned'}${homeworkPosition(summary)}`,
    `Today Homework Exercises: ${positiveInteger(summary.todayExerciseCount) || 0}`,
  ];
}

function recentHomeworkLines(summary) {
  const lastCompletedAt = safeScalar(summary.lastCompletedAt);
  return [
    `Recent Homework Logs: ${positiveInteger(summary.recentCompletedCount) || 0}`,
    lastCompletedAt ? `Last Homework Log: ${lastCompletedAt}` : null,
  ].filter(Boolean);
}

function formatHomeworkSummaryContext(summary) {
  if (!hasHomeworkContext(summary)) return '';
  return [
    '--- HOMEWORK SUMMARY ---',
    ...todayHomeworkLines(summary),
    ...recentHomeworkLines(summary),
  ].join('\n');
}

function findWeek(weeks, weekNumber) {
  return weeks.find(week => Number(week.weekNumber) === weekNumber)
    || weeks[weekNumber - 1]
    || null;
}

function findDayOrSession(entries, dayNumber) {
  return entries.find(entry => Number(entry.dayNumber) === dayNumber)
    || entries.find(entry => Number(entry.sessionNumber) === dayNumber)
    || entries[dayNumber - 1]
    || null;
}

function buildSparseCurrentSession(planData, weekNumber, dayNumber) {
  const week = findWeek(asArray(planData?.weeks), weekNumber);
  const session = findDayOrSession(getWeekDaysOrSessions(week), dayNumber);
  if (!session) return null;

  return {
    weekNumber,
    dayNumber,
    dayLabel: firstPresent(session.dayLabel, session.name, session.title, `Day ${dayNumber}`),
    session,
    exercises: asArray(session.exercises),
  };
}

function buildOverviewPlan(plan, planData, weekNumber, dayNumber) {
  return {
    id: firstPresent(plan.id, plan.plan_id),
    title: plan.title,
    status: plan.status || 'active',
    durationWeeks: firstPresent(plan.duration_weeks, plan.durationWeeks),
    currentWeek: weekNumber,
    currentDay: dayNumber,
    nasmPhase: firstPresent(plan.nasm_phase, plan.nasmPhase),
    createdBy: firstPresent(plan.created_by, plan.createdBy),
    metadata: tryParse(plan.metadata) || {},
    planData,
  };
}

function buildAssignmentOverview(plan, planData, weekNumber, dayNumber, assignmentCompletions) {
  const overviewPlan = buildOverviewPlan(plan, planData, weekNumber, dayNumber);
  const currentSession = buildSparseCurrentSession(planData, weekNumber, dayNumber)
    || extractCurrentSession(overviewPlan);
  return buildClientTrainingOverview({
    activePlan: overviewPlan,
    plans: [overviewPlan],
    currentSession,
    assignmentCompletions,
  });
}

const yesNo = value => value ? 'yes' : 'no';
const billingLabel = assignment => assignment.isBillable ? 'billable' : 'non-billable';
const optionalLine = (label, value) => value ? `${label}: ${value}` : null;
const visibleAssignment = assignment => assignment && assignment.assignmentType !== 'none';

function assignmentSemanticsLines(assignment) {
  return [
    '--- ASSIGNMENT SEMANTICS ---',
    `Assignment Type: ${assignment.assignmentType}`,
    optionalLine('Assignment Status', compactString(assignment.status)),
    `Session Type: ${assignment.sessionType}`,
    `Loggable: ${yesNo(assignment.isLoggable)}`,
    `Billing: ${billingLabel(assignment)}`,
    `Deduct Paid Session: ${yesNo(assignment.shouldDeductSession)}`,
    optionalLine('CTA', compactString(assignment.ctaLabel)),
    optionalLine('Completed Form', safeScalar(assignment.completion?.formId)),
    optionalLine('Assignment Key', assignment.assignmentKey),
  ].filter(Boolean);
}

export function formatAssignmentContext(
  plan,
  planData,
  weekNumber,
  dayNumber,
  assignmentCompletions = [],
) {
  const { todayAssignment, homeworkSummary } = buildAssignmentOverview(
    plan,
    planData,
    weekNumber,
    dayNumber,
    assignmentCompletions,
  );
  if (!visibleAssignment(todayAssignment)) return '';

  return [
    ...assignmentSemanticsLines(todayAssignment),
    formatHomeworkSummaryContext(homeworkSummary),
  ].filter(Boolean).join('\n');
}
