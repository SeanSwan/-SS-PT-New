/**
 * Swan Coach planning assignment context service.
 *
 * Formats read-only assignment semantics for active workout-plan days so
 * Swan Coach can guide logging without implying paid-session deduction.
 */

import { buildClientTrainingOverview } from './clientTrainingReadModelService.mjs';
import { extractCurrentSession } from './workoutPlanShapeService.mjs';

function tryParse(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

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

function homeworkPosition(summary) {
  const parts = [
    positiveInteger(summary?.todayWeekNumber) ? `Week ${positiveInteger(summary.todayWeekNumber)}` : null,
    positiveInteger(summary?.todayDayNumber) ? `Day ${positiveInteger(summary.todayDayNumber)}` : null,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

function formatHomeworkSummaryContext(summary) {
  if (!summary) return '';
  const hasTodayHomework = summary.assignmentType === 'homework';
  const recentCount = positiveInteger(summary.recentCompletedCount) || 0;
  if (!hasTodayHomework && recentCount === 0) return '';

  const todayStatus = compactString(summary.todayStatus) || 'planned';
  const exerciseCount = positiveInteger(summary.todayExerciseCount) || 0;
  const lastCompletedAt = safeScalar(summary.lastCompletedAt);

  return [
    '--- HOMEWORK SUMMARY ---',
    hasTodayHomework ? `Today Homework: ${todayStatus}${homeworkPosition(summary)}` : null,
    hasTodayHomework ? `Today Homework Exercises: ${exerciseCount}` : null,
    `Recent Homework Logs: ${recentCount}`,
    lastCompletedAt ? `Last Homework Log: ${lastCompletedAt}` : null,
  ].filter(Boolean).join('\n');
}

function getWeekDaysOrSessions(week) {
  if (!week || typeof week !== 'object') return [];
  const days = Array.isArray(week.days) ? week.days : [];
  const sessions = Array.isArray(week.sessions) ? week.sessions : [];
  return days.length > 0 ? days : sessions;
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

export function formatAssignmentContext(
  plan,
  planData,
  weekNumber,
  dayNumber,
  assignmentCompletions = [],
) {
  const overviewPlan = buildOverviewPlan(plan, planData, weekNumber, dayNumber);
  const currentSession = buildSparseCurrentSession(planData, weekNumber, dayNumber)
    || extractCurrentSession(overviewPlan);
  const { todayAssignment, homeworkSummary } = buildClientTrainingOverview({
    activePlan: overviewPlan,
    plans: [overviewPlan],
    currentSession,
    assignmentCompletions,
  });
  if (!todayAssignment || todayAssignment.assignmentType === 'none') return '';

  const status = compactString(todayAssignment.status);
  const ctaLabel = compactString(todayAssignment.ctaLabel);
  const completedFormId = safeScalar(todayAssignment.completion?.formId);
  const homeworkContext = formatHomeworkSummaryContext(homeworkSummary);

  return [
    '--- ASSIGNMENT SEMANTICS ---',
    `Assignment Type: ${todayAssignment.assignmentType}`,
    status ? `Assignment Status: ${status}` : null,
    `Session Type: ${todayAssignment.sessionType}`,
    `Loggable: ${todayAssignment.isLoggable ? 'yes' : 'no'}`,
    `Billing: ${todayAssignment.isBillable ? 'billable' : 'non-billable'}`,
    `Deduct Paid Session: ${todayAssignment.shouldDeductSession ? 'yes' : 'no'}`,
    ctaLabel ? `CTA: ${ctaLabel}` : null,
    completedFormId ? `Completed Form: ${completedFormId}` : null,
    todayAssignment.assignmentKey ? `Assignment Key: ${todayAssignment.assignmentKey}` : null,
    homeworkContext,
  ].filter(Boolean).join('\n');
}
