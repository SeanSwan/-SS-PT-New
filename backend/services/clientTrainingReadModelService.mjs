/**
 * Client Training Read Model Service
 * ==================================
 *
 * Pure builders for SwanStudios client training overview contracts.
 * These functions intentionally avoid DB, HTTP, and Sequelize imports so
 * dashboard, trainer/admin routes, and Swan Coach dispatchers can share the
 * same plan-catalog and today-assignment semantics.
 */

import {
  DEFAULT_PLAN_HORIZON_KEY,
  PLAN_HORIZONS,
  normalizePlanHorizonKey,
} from './clientTrainingPlanHorizonService.mjs';
import { extractWorkoutPlanPdfAttachment } from './workoutPlanPdfAttachmentService.mjs';

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const toPositiveInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const normalizeDateOnly = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

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

  const closest = PLAN_HORIZONS
    .filter((slot) => slot.key !== 'one_day')
    .reduce((best, slot) => {
      if (!best) return slot;
      const delta = Math.abs(slot.durationWeeks - durationWeeks);
      const bestDelta = Math.abs(best.durationWeeks - durationWeeks);
      if (delta < bestDelta) return slot;
      if (delta === bestDelta && slot.durationWeeks > best.durationWeeks) return slot;
      return best;
    }, null);
  return closest?.key || 'six_month';
};
const planUpdatedTime = (plan) => {
  const raw = toPlainObject(plan) || {};
  const value = raw.updatedAt || raw.createdAt || raw.startDate || null;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};
const selectPrimaryPlan = (planRows, explicitPrimaryPlanId) => {
  const byId = explicitPrimaryPlanId
    ? planRows.find((plan) => String(plan.id) === String(explicitPrimaryPlanId))
    : null;
  if (byId) return byId;
  return planRows.find((plan) => {
    const metadata = toPlainObject(plan.metadata) || {};
    return metadata.isPrimaryPlan === true || metadata.primary === true;
  })
    || planRows.find((plan) => plan.status === 'active')
    || planRows.find((plan) => inferPlanHorizonKey(plan) === DEFAULT_PLAN_HORIZON_KEY)
    || planRows[0]
    || null;
};

const planSummary = (plan, horizonKey, isPrimary) => {
  const raw = toPlainObject(plan) || {};
  const metadata = toPlainObject(raw.metadata) || {};
  return {
    id: raw.id ?? null,
    title: raw.title || raw.name || 'Training Plan',
    status: raw.status || 'draft',
    horizonKey,
    durationWeeks: toPositiveInteger(raw.durationWeeks, null),
    currentWeek: toPositiveInteger(raw.currentWeek, null),
    currentDay: toPositiveInteger(raw.currentDay, null),
    startDate: raw.startDate || null,
    endDate: raw.endDate || null,
    nasmPhase: toPositiveInteger(raw.nasmPhase, null),
    createdBy: raw.createdBy || null,
    isPrimary,
    pdfFile: extractWorkoutPlanPdfAttachment(metadata),
  };
};

const buildTrainingPlanCatalog = (plans = [], options = {}) => {
  const planRows = (Array.isArray(plans) ? plans : [])
    .map((plan) => toPlainObject(plan))
    .filter(Boolean);
  const primaryCandidate = selectPrimaryPlan(planRows, options.primaryPlanId);
  const primaryPlanId = primaryCandidate?.id ?? null;
  const primaryHorizonKey = primaryCandidate ? inferPlanHorizonKey(primaryCandidate) : null;

  const slots = PLAN_HORIZONS.map((horizon) => {
    const matches = planRows
      .filter((plan) => inferPlanHorizonKey(plan) === horizon.key)
      .sort((a, b) => {
        if (String(a.id) === String(primaryPlanId)) return -1;
        if (String(b.id) === String(primaryPlanId)) return 1;
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return planUpdatedTime(b) - planUpdatedTime(a);
      });
    const plan = matches[0] || null;
    const isPrimary = Boolean(plan && primaryPlanId && String(plan.id) === String(primaryPlanId));

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
  });

  return {
    defaultHorizonKey: DEFAULT_PLAN_HORIZON_KEY,
    primaryPlanId,
    primaryHorizonKey,
    filledHorizonKeys: slots.filter((slot) => slot.isFilled).map((slot) => slot.horizonKey),
    slots,
  };
};

const normalizeAssignmentType = (value, exerciseCount) => {
  const raw = compactString(value)?.toLowerCase().replace(/[\s-]+/g, '_') || null;
  if (['trainer_session', 'trainer_led', 'trainer', 'in_person'].includes(raw)) return 'trainer_session';
  if (['active_recovery', 'recovery', 'mobility', 'flexibility'].includes(raw)) return 'active_recovery';
  if (raw === 'rest' || raw === 'rest_day') return 'rest';
  if (raw === 'assessment' || raw === 'screen') return 'assessment';
  if (raw === 'homework' || raw === 'solo' || raw === 'conditioning') return 'homework';
  return exerciseCount > 0 ? 'homework' : 'rest';
};

const firstExerciseName = (exercises) => {
  const first = Array.isArray(exercises) ? exercises[0] : null;
  return compactString(first?.exerciseName || first?.name || first?.exercise?.name);
};

const assignmentTitle = (plan, currentSession, type) => {
  const session = toPlainObject(currentSession?.session) || {};
  return compactString(currentSession?.dayLabel)
    || compactString(session.dayLabel || session.name || session.title)
    || compactString(toPlainObject(plan)?.title)
    || (type === 'rest' ? 'Recovery Day' : 'Today\'s Assignment');
};

const assignmentStatus = (session) => {
  const raw = compactString(session?.status)?.toLowerCase();
  if (['planned', 'in_progress', 'completed', 'skipped', 'cancelled'].includes(raw)) return raw;
  if (session?.completed === true || session?.isCompleted === true) return 'completed';
  return 'planned';
};

const ctaForAssignment = ({ type, status, isLoggable }) => {
  if (status === 'completed') return 'Review Workout';
  if (isLoggable) return type === 'trainer_session' ? 'Log Workout' : 'Log Assignment';
  return 'View Plan';
};

const buildTodayAssignment = ({ plan = null, currentSession = null, today = null } = {}) => {
  const rawPlan = toPlainObject(plan) || null;
  if (!rawPlan) {
    return {
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
    };
  }

  const session = toPlainObject(currentSession?.session) || {};
  const exercises = Array.isArray(currentSession?.exercises)
    ? currentSession.exercises
    : Array.isArray(session.exercises)
      ? session.exercises
      : [];
  const exerciseCount = exercises.length;
  const type = normalizeAssignmentType(
    currentSession?.assignmentType
    || session.assignmentType
    || session.dayType
    || session.type
    || session.category
    || toPlainObject(rawPlan.metadata)?.defaultAssignmentType,
    exerciseCount,
  );
  const status = assignmentStatus(session);
  const isLoggable = exerciseCount > 0 && status !== 'completed' && type !== 'rest';
  const sessionType = type === 'trainer_session' ? 'trainer-led' : 'solo';
  const weekNumber = toPositiveInteger(currentSession?.weekNumber, rawPlan.currentWeek || null);
  const dayNumber = toPositiveInteger(currentSession?.dayNumber, rawPlan.currentDay || null);
  const assignmentKey = rawPlan.id
    ? `${rawPlan.id}:w${weekNumber || 1}:d${dayNumber || 1}:${type}`
    : null;

  return {
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
};

export const buildClientTrainingOverview = ({
  activePlan = null,
  plans = [],
  currentSession = null,
  today = null,
} = {}) => ({
  todayAssignment: buildTodayAssignment({ plan: activePlan, currentSession, today }),
  trainingPlanCatalog: buildTrainingPlanCatalog(plans.length ? plans : activePlan ? [activePlan] : []),
});
