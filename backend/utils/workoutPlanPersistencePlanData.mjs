/**
 * Workout Plan Persistence Plan Data Helpers
 * ==========================================
 * Normalizes approved AI workout drafts into the JSONB shape consumed by
 * current-plan, logger, and Coach handoff routes. Also owns the active-plan
 * demotion invariant required before inserting a new active WorkoutPlan row.
 */
import { PLAN_HORIZONS } from '../services/clientTrainingPlanHorizonService.mjs';
import {
  normalizeWorkoutPlanDataForPersistence,
  sanitizeWorkoutPlanMetadataForPersistence,
} from '../services/workoutPlanDataPrivacyService.mjs';

export const ALLOWED_DAY_TYPES = new Set([
  'training',
  'active_recovery',
  'rest',
  'assessment',
  'specialization',
]);

export const ALLOWED_OPT_PHASES = new Set([
  'stabilization_endurance',
  'strength_endurance',
  'hypertrophy',
  'maximal_strength',
  'power',
]);

export const OPT_PHASE_KEY_BY_NUMBER = {
  1: 'stabilization_endurance',
  2: 'strength_endurance',
  3: 'hypertrophy',
  4: 'maximal_strength',
  5: 'power',
};

export const TRAINER_LED_WORKOUT_PLAN_ASSIGNMENT_DEFAULTS = Object.freeze({
  defaultAssignmentType: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  shouldDeductSession: false,
});

export const TRAINER_LED_WORKOUT_PLAN_METADATA = Object.freeze({
  assignmentDefault: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  defaultShouldDeductSession: false,
});

const DURATION_HORIZONS = PLAN_HORIZONS.filter((slot) => slot.key !== 'one_day');

const horizonScore = (slot, durationWeeks) => Math.abs(slot.durationWeeks - durationWeeks);

export function inferWorkoutPlanHorizonKey(durationWeeks) {
  const parsed = Number(durationWeeks);
  if (!Number.isFinite(parsed) || parsed <= 0) return 'six_month';
  const exact = DURATION_HORIZONS.find((slot) => slot.durationWeeks === parsed);
  if (exact) return exact.key;
  return DURATION_HORIZONS
    .slice()
    .sort((a, b) => horizonScore(a, parsed) - horizonScore(b, parsed))[0]?.key || 'six_month';
}

export function normalizeDayType(dayType) {
  if (!dayType || typeof dayType !== 'string') return 'training';
  return ALLOWED_DAY_TYPES.has(dayType) ? dayType : 'training';
}

export function normalizeOptPhase(optPhase) {
  if (!optPhase || typeof optPhase !== 'string') return null;
  return ALLOWED_OPT_PHASES.has(optPhase) ? optPhase : null;
}

export function toOptPhaseKey(optPhase) {
  if (!optPhase) return null;
  if (typeof optPhase === 'string') return normalizeOptPhase(optPhase);
  if (typeof optPhase === 'number') return OPT_PHASE_KEY_BY_NUMBER[optPhase] || null;
  if (typeof optPhase === 'object' && typeof optPhase?.phase === 'number') {
    return OPT_PHASE_KEY_BY_NUMBER[optPhase.phase] || null;
  }
  return null;
}

const finiteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const positiveIntegerOrFallback = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const normalizeExerciseForPlanData = (exercise, index) => {
  const name = exercise?.name ? String(exercise.name).trim() : `Exercise ${index + 1}`;
  const rest = finiteNumberOrNull(exercise?.restPeriod ?? exercise?.restSeconds ?? exercise?.restTime);

  return {
    exerciseName: name,
    name,
    sets: exercise?.sets ?? exercise?.setScheme ?? null,
    setScheme: exercise?.setScheme ?? exercise?.sets ?? null,
    reps: exercise?.reps ?? exercise?.repGoal ?? null,
    repGoal: exercise?.repGoal ?? exercise?.reps ?? null,
    targetReps: exercise?.targetReps ?? exercise?.repGoal ?? exercise?.reps ?? null,
    restSeconds: rest,
    restTime: rest,
    restPeriod: rest,
    tempo: exercise?.tempo || null,
    intensityGuideline: exercise?.intensityGuideline || null,
    notes: exercise?.notes || null,
    isOptional: Boolean(exercise?.isOptional),
  };
};

const normalizeDayForPlanData = (day, index) => {
  const dayNumber = positiveIntegerOrFallback(day?.dayNumber, index + 1);
  const name = day?.name ? String(day.name).trim() : `Day ${dayNumber}`;
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];

  return {
    dayNumber,
    name,
    dayName: name,
    dayLabel: name,
    focus: day?.focus || null,
    dayType: normalizeDayType(day?.dayType),
    estimatedDuration: finiteNumberOrNull(day?.estimatedDuration),
    warmupInstructions: day?.warmupInstructions || null,
    cooldownInstructions: day?.cooldownInstructions || null,
    exercises: exercises.map(normalizeExerciseForPlanData),
  };
};

const clonePlanDataDay = (day) => ({
  ...day,
  exercises: day.exercises.map((exercise) => ({ ...exercise })),
});

export function buildWorkoutPlanData(plan, durationWeeks) {
  const days = Array.isArray(plan?.days)
    ? plan.days.map(normalizeDayForPlanData)
    : [];
  const weeks = Array.from({ length: durationWeeks }, (_, index) => ({
    weekNumber: index + 1,
    days: days.map(clonePlanDataDay),
  }));

  return normalizeWorkoutPlanDataForPersistence({
    sourceShape: 'ai_workout_draft_days',
    planSummary: {
      durationWeeks,
      sessionsPerWeek: days.length,
      totalSessions: days.length * durationWeeks,
      primaryGoal: plan?.primaryGoal || plan?.goal || null,
      startingPhase: plan?.startingPhase || null,
    },
    days: days.map(clonePlanDataDay),
    weeks,
    assignmentDefaults: { ...TRAINER_LED_WORKOUT_PLAN_ASSIGNMENT_DEFAULTS },
    recommendations: Array.isArray(plan?.recommendations) ? plan.recommendations : [],
  });
}

const DEMOTED_WORKOUT_PLAN_METADATA = Object.freeze({ isPrimaryPlan: false, primary: false });

const activePlanMetadata = (plan) => {
  const metadata = plan?.metadata && typeof plan.metadata === 'object' && !Array.isArray(plan.metadata)
    ? plan.metadata
    : {};
  return sanitizeWorkoutPlanMetadataForPersistence({
    ...metadata,
    ...DEMOTED_WORKOUT_PLAN_METADATA,
  });
};

export async function demoteActiveWorkoutPlansForUser(WorkoutPlan, userId, transaction) {
  if (typeof WorkoutPlan?.findAll === 'function') {
    const activePlans = await WorkoutPlan.findAll({
      where: { userId, status: 'active' },
      transaction,
    });

    if (Array.isArray(activePlans) && activePlans.length > 0) {
      let demotedWithInstances = false;
      for (const activePlan of activePlans) {
        if (typeof activePlan?.update !== 'function') continue;
        await activePlan.update({
          status: 'paused',
          metadata: activePlanMetadata(activePlan),
        }, { transaction });
        demotedWithInstances = true;
      }
      if (demotedWithInstances) return;
    }
  }

  if (typeof WorkoutPlan?.update === 'function') {
    await WorkoutPlan.update({ status: 'paused' }, {
      where: { userId, status: 'active' },
      transaction,
    });
  }
}