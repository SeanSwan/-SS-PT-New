/**
 * Client Training Read Model Service
 * ==================================
 *
 * Pure builders for SwanStudios client training overview contracts.
 * These functions intentionally avoid DB, HTTP, and Sequelize imports so
 * dashboard, trainer/admin routes, and Swan Coach dispatchers can share the
 * same plan-catalog and today-assignment semantics.
 */
// fallow-ignore-file complexity
import { DEFAULT_PLAN_HORIZON_KEY, PLAN_HORIZONS, normalizePlanHorizonKey } from './clientTrainingPlanHorizonService.mjs';
import { buildPlanAssignmentSemantics, normalizeAssignmentType } from './clientTrainingAssignmentSemanticsService.mjs';
import { applyAssignmentCompletion } from './clientTrainingAssignmentCompletionService.mjs';
import { buildCompletedAssignmentFromLoggedCompletion } from './clientTrainingCompletedAssignmentReadService.mjs';
import { buildHomeworkSummary } from './clientTrainingHomeworkSummaryService.mjs';
import { extractWorkoutPlanPdfAttachment } from './workoutPlanPdfAttachmentService.mjs';

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const firstCompactString = (...values) => values.map(compactString).find(Boolean) || null;
const todayDateOnly = () => new Date().toISOString().slice(0, 10);
const isDateOnlyString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const parseDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const normalizeDateOnly = (value) => (
  isDateOnlyString(value) ? value : (value ? parseDateOnly(value) : null) || todayDateOnly()
);
const isDurationHorizon = (slot) => slot.key !== 'one_day';
const horizonScore = (slot, durationWeeks) => (
  Math.abs(slot.durationWeeks - durationWeeks) * 1000 - slot.durationWeeks
);
const findClosestDurationHorizon = (durationWeeks) => (
  PLAN_HORIZONS
    .filter(isDurationHorizon)
    .sort((a, b) => horizonScore(a, durationWeeks) - horizonScore(b, durationWeeks))[0]
  || null
);
const inferPlanHorizonKey = (plan) => {
  const raw = toPlainObject(plan) || {};
  const metadata = toPlainObject(raw.metadata) || {};
  const explicit = normalizePlanHorizonKey(
    metadata.planHorizon
    || metadata.horizonKey
    || metadata.durationPreset
    || metadata.planDurationKey,
  );
  if (explicit) return explicit;

  const durationWeeks = toPositiveInteger(raw.durationWeeks);
  const exact = PLAN_HORIZONS.find((slot) => (
    slot.key !== 'one_day' && slot.durationWeeks === durationWeeks
  ));
  if (exact) return exact.key;
  if (!durationWeeks) return 'six_month';
  const closest = findClosestDurationHorizon(durationWeeks);
  return closest?.key || 'six_month';
};
const planUpdatedTime = (plan) => {
  const raw = toPlainObject(plan) || {};
  const value = [raw.updatedAt, raw.createdAt, raw.startDate].find(Boolean);
  return value ? new Date(value).getTime() || 0 : 0;
};
const hasPrimaryMetadata = (plan) => {
  const metadata = toPlainObject(plan.metadata) || {};
  return metadata.isPrimaryPlan === true || metadata.primary === true;
};
const isActivePlan = (plan) => firstCompactString(toPlainObject(plan)?.status)?.toLowerCase() === 'active';
const isActivePrimaryPlan = (plan) => isActivePlan(plan) && hasPrimaryMetadata(plan);
const samePlanId = (plan, planId) => Boolean(planId) && String(plan.id) === String(planId);
const selectPrimaryPlan = (planRows, explicitPrimaryPlanId) => {
  const matchers = [
    (plan) => samePlanId(plan, explicitPrimaryPlanId),
    isActivePrimaryPlan,
    isActivePlan,
    hasPrimaryMetadata,
    (plan) => inferPlanHorizonKey(plan) === DEFAULT_PLAN_HORIZON_KEY,
    () => true,
  ];
  return matchers.map((matches) => planRows.find(matches)).find(Boolean) || null;
};
const planSummary = (plan, horizonKey, isPrimary) => {
  const raw = toPlainObject(plan) || {};
  const metadata = toPlainObject(raw.metadata) || {};
  const assignmentSemantics = buildPlanAssignmentSemantics(raw);
  return {
    id: raw.id ?? null,
    title: firstCompactString(raw.title, raw.name) ?? 'Training Plan',
    status: firstCompactString(raw.status) ?? 'draft',
    horizonKey,
    durationWeeks: toPositiveInteger(raw.durationWeeks, null),
    currentWeek: toPositiveInteger(raw.currentWeek, null),
    currentDay: toPositiveInteger(raw.currentDay, null),
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    nasmPhase: toPositiveInteger(raw.nasmPhase, null),
    createdBy: raw.createdBy ?? null,
    isPrimary,
    pdfFile: extractWorkoutPlanPdfAttachment(metadata),
    assignmentDefault: assignmentSemantics.defaultAssignmentType,
    billingIntent: assignmentSemantics.billingIntent,
    defaultShouldDeductSession: assignmentSemantics.shouldDeductSession,
  };
};
const comparePlanPreference = (primaryPlanId) => (a, b) => {
  const primaryDiff = Number(samePlanId(b, primaryPlanId)) - Number(samePlanId(a, primaryPlanId));
  if (primaryDiff) return primaryDiff;
  const activeDiff = Number(b.status === 'active') - Number(a.status === 'active');
  if (activeDiff) return activeDiff;
  return planUpdatedTime(b) - planUpdatedTime(a);
};
const findPlanForHorizon = (planRows, horizonKey, primaryPlanId) => (
  planRows
    .filter((plan) => inferPlanHorizonKey(plan) === horizonKey)
    .sort(comparePlanPreference(primaryPlanId))[0]
  || null
);
const buildTrainingPlanSlot = (horizon, planRows, primaryPlanId) => {
  const plan = findPlanForHorizon(planRows, horizon.key, primaryPlanId);
  const isPrimary = Boolean(plan && samePlanId(plan, primaryPlanId));
  return {
    horizonKey: horizon.key,
    label: horizon.label,
    durationWeeks: horizon.durationWeeks,
    durationDays: horizon.durationDays,
    isDefaultHorizon: horizon.isDefault,
    isFilled: Boolean(plan),
    isPrimary,
    plan: plan ? planSummary(plan, horizon.key, isPrimary) : null,
  };
};
const buildTrainingPlanCatalog = (plans = [], options = {}) => {
  const planRows = (Array.isArray(plans) ? plans : [])
    .map((plan) => toPlainObject(plan))
    .filter(Boolean);
  const primaryCandidate = selectPrimaryPlan(planRows, options.primaryPlanId);
  const primaryPlanId = primaryCandidate?.id ?? null;
  const primaryHorizonKey = primaryCandidate ? inferPlanHorizonKey(primaryCandidate) : null;
  const slots = PLAN_HORIZONS.map((horizon) => buildTrainingPlanSlot(horizon, planRows, primaryPlanId));

  return {
    defaultHorizonKey: DEFAULT_PLAN_HORIZON_KEY,
    primaryPlanId,
    primaryHorizonKey,
    filledHorizonKeys: slots.filter((slot) => slot.isFilled).map((slot) => slot.horizonKey),
    slots,
  };
};
const firstExerciseName = (exercises) => {
  const first = Array.isArray(exercises) ? exercises[0] : null;
  return firstCompactString(first?.exerciseName, first?.name, first?.exercise?.name);
};
const assignmentTitle = (plan, currentSession, type) => {
  const session = toPlainObject(currentSession?.session) || {};
  return firstCompactString(
    currentSession?.dayLabel,
    session.dayLabel,
    session.name,
    session.title,
    toPlainObject(plan)?.title,
  )
    || (type === 'rest' ? 'Recovery Day' : 'Today\'s Assignment');
};
const ASSIGNMENT_STATUSES = new Set(['planned', 'in_progress', 'completed', 'skipped', 'cancelled']);
const assignmentStatus = (session) => {
  const raw = compactString(session?.status)?.toLowerCase();
  const completed = session?.completed === true || session?.isCompleted === true;
  return ASSIGNMENT_STATUSES.has(raw) ? raw : completed ? 'completed' : 'planned';
};
const ctaForAssignment = ({ type, status, isLoggable }) => {
  if (status === 'completed') return 'Review Workout';
  if (type === 'trainer_session') return 'View Schedule';
  if (isLoggable) return type === 'trainer_session' ? 'Log Workout' : 'Log Assignment';
  return 'View Plan';
};
const pendingTodayAssignment = (today) => ({
  assignmentId: null,
  assignmentKey: null,
  assignmentType: 'none',
  sessionType: 'solo',
  status: 'none',
  source: 'none',
  isLoggable: false,
  isBillable: false,
  shouldDeductSession: false,
  title: 'Plan pending',
  scheduledDate: normalizeDateOnly(today),
  weekNumber: null,
  dayNumber: null,
  dayLabel: null,
  exerciseCount: 0,
  firstExerciseName: null,
  exercises: [],
  ctaLabel: 'View Plan',
});
const sessionExercises = (currentSession, session) => (
  Array.isArray(currentSession?.exercises)
    ? currentSession.exercises
    : Array.isArray(session.exercises)
      ? session.exercises
      : []
);

const assignmentTypeSource = (rawPlan, currentSession, session) => (
  currentSession?.assignmentType
  || session.assignmentType
  || session.dayType
  || session.type
  || session.category
  || buildPlanAssignmentSemantics(rawPlan).defaultAssignmentType
);

const isAssignmentLoggable = ({ exerciseCount, status, type }) => {
  if (type === 'trainer_session') return false;
  return exerciseCount > 0 && status !== 'completed' && type !== 'rest';
};

const assignmentKeyFor = ({ planId, weekNumber, dayNumber, type }) => (
  planId ? `${planId}:w${weekNumber || 1}:d${dayNumber || 1}:${type}` : null
);

const buildTodayAssignment = ({
  plan = null,
  currentSession = null,
  today = null,
  assignmentCompletions = [],
} = {}) => {
  const rawPlan = toPlainObject(plan) || null;
  if (!rawPlan) return pendingTodayAssignment(today);

  const session = toPlainObject(currentSession?.session) || {};
  const exercises = sessionExercises(currentSession, session);
  const exerciseCount = exercises.length;
  const type = normalizeAssignmentType(assignmentTypeSource(rawPlan, currentSession, session), exerciseCount);
  const status = assignmentStatus(session);
  const isLoggable = isAssignmentLoggable({ exerciseCount, status, type });
  const sessionType = type === 'trainer_session' ? 'trainer-led' : 'solo';
  const weekNumber = toPositiveInteger(currentSession?.weekNumber, rawPlan.currentWeek || null);
  const dayNumber = toPositiveInteger(currentSession?.dayNumber, rawPlan.currentDay || null);
  const assignmentKey = assignmentKeyFor({ planId: rawPlan.id, weekNumber, dayNumber, type });

  const assignment = {
    assignmentId: assignmentKey,
    assignmentKey,
    assignmentType: type,
    sessionType,
    status,
    source: 'workout_plan',
    isLoggable,
    isBillable: type === 'trainer_session',
    shouldDeductSession: type === 'trainer_session' && session.shouldDeductSession === true,
    title: assignmentTitle(rawPlan, currentSession, type),
    scheduledDate: normalizeDateOnly(today),
    weekNumber,
    dayNumber,
    dayLabel: currentSession?.dayLabel || session.dayLabel || session.name || null,
    exerciseCount,
    firstExerciseName: firstExerciseName(exercises),
    exercises,
    ctaLabel: ctaForAssignment({ type, status, isLoggable }),
  };
  const completedAssignment = applyAssignmentCompletion(assignment, assignmentCompletions);
  return completedAssignment !== assignment
    ? completedAssignment
    : buildCompletedAssignmentFromLoggedCompletion(assignmentCompletions, today) || assignment;
};

export const buildClientTrainingOverview = ({
  activePlan = null,
  plans = [],
  currentSession = null,
  today = null,
  assignmentCompletions = [],
  recentAssignmentCompletions = [],
} = {}) => {
  const todayAssignment = buildTodayAssignment({
    plan: activePlan,
    currentSession,
    today,
    assignmentCompletions,
  });
  const recentCompletions = recentAssignmentCompletions.length
    ? recentAssignmentCompletions
    : assignmentCompletions;

  return {
    todayAssignment,
    trainingPlanCatalog: buildTrainingPlanCatalog(plans.length ? plans : activePlan ? [activePlan] : []),
    homeworkSummary: buildHomeworkSummary({
      todayAssignment,
      recentAssignmentCompletions: recentCompletions,
    }),
  };
};
