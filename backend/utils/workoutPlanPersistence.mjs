/**
 * Workout Plan Persistence Utility
 * =================================
 * Shared logic for persisting AI-generated and coach-approved workout plans.
 * Eliminates duplication between generateWorkoutPlan and approveDraftPlan.
 *
 * Architecture:
 *   1. Pre-flight validation (exercise count limits, name checks)
 *   2. Bulk exercise name resolution via exerciseLookup utility
 *   3. WorkoutPlan → WorkoutPlanDay → WorkoutPlanDayExercise creation
 *   4. Returns created plan metadata + unmatched exercises list
 */
import logger from './logger.mjs';
import { createWorkoutPlanRecord } from '../services/workoutPlanMutationService.mjs';
import { transitionWorkoutPlanLifecycle } from '../services/workoutPlanLifecycleService.mjs';
import { buildExerciseLookupMap, findExerciseByName } from './exerciseLookup.mjs';
import {
  buildWorkoutPlanData,
  inferWorkoutPlanHorizonKey,
  normalizeDayType,
  normalizeOptPhase,
  TRAINER_LED_WORKOUT_PLAN_METADATA,
} from './workoutPlanPersistencePlanData.mjs';

export {
  ALLOWED_DAY_TYPES,
  ALLOWED_OPT_PHASES,
  OPT_PHASE_KEY_BY_NUMBER,
  inferWorkoutPlanHorizonKey,
  normalizeDayType,
  normalizeOptPhase,
  TRAINER_LED_WORKOUT_PLAN_METADATA,
  toOptPhaseKey,
} from './workoutPlanPersistencePlanData.mjs';

// ── Constants ──────────────────────────────────────────────────

export const MAX_EXERCISES_PER_DAY = 50;

// ── Pre-flight Validation ──────────────────────────────────────

/**
 * Validate plan structure before any database writes.
 * Returns { valid, error } — call before starting a transaction.
 *
 * @param {Object} plan - The AI plan or approved draft
 * @returns {{ valid: boolean, error?: { status: number, body: Object } }}
 */
export function preflightValidatePlan(plan) {
  const days = Array.isArray(plan?.days) ? plan.days : [];

  for (let i = 0; i < days.length; i++) {
    const day = days[i] || {};
    const dayNumber = Number.isFinite(Number(day.dayNumber)) ? Number(day.dayNumber) : i + 1;
    const exercises = Array.isArray(day.exercises) ? day.exercises : [];

    if (exercises.length > MAX_EXERCISES_PER_DAY) {
      return {
        valid: false,
        error: {
          status: 422,
          body: {
            success: false,
            message: `Day ${dayNumber} has ${exercises.length} exercises, which exceeds the maximum of ${MAX_EXERCISES_PER_DAY}`,
            code: 'EXERCISE_LIMIT_EXCEEDED',
          },
        },
      };
    }

    for (const ex of exercises) {
      const name = ex?.name ? String(ex.name).trim() : '';
      if (!name) {
        return {
          valid: false,
          error: {
            status: 422,
            body: {
              success: false,
              message: `Day ${dayNumber} has an exercise with a missing name`,
              code: 'INVALID_EXERCISE_NAME',
            },
          },
        };
      }
    }
  }

  return { valid: true };
}

// ── Main Persistence Function ──────────────────────────────────

/**
 * Persist a workout plan to the database.
 *
 * @param {Object} options
 * @param {Object} options.plan - The AI plan object (planName, summary, durationWeeks, days[])
 * @param {number} options.userId - Target client user ID
 * @param {Object} options.models - { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise }
 * @param {Transaction} options.transaction - Active Sequelize transaction
 * @param {string[]} [options.tags=['ai_generated']] - Tags for the plan
 * @returns {Promise<{ workoutPlan: Model, createdExerciseCount: number, unmatchedExercises: Array }>}
 * @throws {Error} If no exercises could be matched (caller should rollback)
 */
export async function persistWorkoutPlan({
  plan,
  userId,
  actorId,
  sequelize,
  models,
  transaction,
  tags = ['ai_generated'],
}) {
  const { WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, Exercise } = models;
  const unmatchedExercises = [];
  let createdExerciseCount = 0;

  const parsedDurationWeeks = Number(plan.durationWeeks);
  const durationWeeks = Number.isFinite(parsedDurationWeeks)
    ? Math.max(1, Math.min(52, Math.floor(parsedDurationWeeks)))
    : 4;
  const planData = buildWorkoutPlanData(plan, durationWeeks);
  const sourceType = tags.includes('coach_approved') ? 'coach_approved' : 'ai_generated';
  const horizonKey = inferWorkoutPlanHorizonKey(durationWeeks);


  // Create the plan record. Keep planData populated because current-plan and
  // logger handoff routes read the JSONB shape, not the normalized child rows.
  let workoutPlan = await createWorkoutPlanRecord({
    WorkoutPlan,
    transaction,
    values: {
      userId,
      title: plan.planName || 'AI Workout Plan',
      description: plan.summary || 'AI-generated workout plan',
      durationWeeks,
      status: 'draft',
      currentWeek: 1,
      currentDay: 1,
      planData,
      createdBy: 'swan_coach_planning',
      metadata: {
        planSource: 'swan_coach_planning',
        sourceType,
        planHorizon: horizonKey,
        horizonKey,
        planDurationKey: horizonKey,
        ...TRAINER_LED_WORKOUT_PLAN_METADATA,
      },
      tags,
    },
  });

  const days = Array.isArray(plan.days) ? plan.days : [];

  // Bulk-fetch all exercise names for O(1) lookups
  const allExerciseNames = days.flatMap(day =>
    (Array.isArray(day?.exercises) ? day.exercises : [])
      .map(ex => ex?.name ? String(ex.name).trim() : '')
      .filter(Boolean)
  );

  const exerciseLookupMap = await buildExerciseLookupMap(Exercise, allExerciseNames, transaction);

  // Create days and exercises
  for (let i = 0; i < days.length; i++) {
    const day = days[i] || {};
    const dayNumber = Number.isFinite(Number(day.dayNumber)) ? Number(day.dayNumber) : i + 1;

    const workoutPlanDay = await WorkoutPlanDay.create({
      workoutPlanId: workoutPlan.id,
      dayNumber,
      name: day.name || `Day ${dayNumber}`,
      focus: day.focus || null,
      dayType: normalizeDayType(day.dayType),
      optPhase: normalizeOptPhase(day.optPhase),
      notes: day.notes || null,
      warmupInstructions: day.warmupInstructions || null,
      cooldownInstructions: day.cooldownInstructions || null,
      estimatedDuration: Number.isFinite(Number(day.estimatedDuration))
        ? Number(day.estimatedDuration)
        : null,
      sortOrder: Number.isFinite(Number(day.sortOrder)) ? Number(day.sortOrder) : i + 1,
    }, { transaction });

    const exercises = Array.isArray(day.exercises) ? day.exercises : [];

    for (let j = 0; j < exercises.length; j++) {
      const exercise = exercises[j] || {};
      const exerciseName = exercise.name ? String(exercise.name).trim() : '';

      // Try bulk map first, then individual lookup as fallback
      let exerciseRecord = exerciseLookupMap.get(exerciseName.toLowerCase()) || null;
      if (!exerciseRecord && exerciseName) {
        exerciseRecord = await findExerciseByName(Exercise, exerciseName, transaction);
      }

      if (!exerciseRecord) {
        unmatchedExercises.push({ dayNumber, name: exerciseName });
        continue;
      }

      await WorkoutPlanDayExercise.create({
        workoutPlanDayId: workoutPlanDay.id,
        exerciseId: exerciseRecord.id,
        orderInWorkout: Number.isFinite(Number(exercise.orderInWorkout))
          ? Number(exercise.orderInWorkout)
          : j + 1,
        setScheme: exercise.setScheme || null,
        repGoal: exercise.repGoal || null,
        restPeriod: Number.isFinite(Number(exercise.restPeriod))
          ? Number(exercise.restPeriod)
          : null,
        tempo: exercise.tempo || null,
        intensityGuideline: exercise.intensityGuideline || null,
        notes: exercise.notes || null,
        isOptional: Boolean(exercise.isOptional),
      }, { transaction });

      createdExerciseCount++;
    }
  }

  if (createdExerciseCount === 0) {
    const error = new Error('No exercises matched existing library entries');
    error.code = 'NO_EXERCISE_MATCHES';
    error.unmatchedExercises = unmatchedExercises;
    throw error;
  }

  const activation = await transitionWorkoutPlanLifecycle({
    sequelize,
    WorkoutPlan,
    transaction,
    planId: workoutPlan.id,
    action: 'activate',
    actorId,
    derivativeReason: sourceType === 'coach_approved'
      ? 'coach_approved_plan_save'
      : 'ai_generated_plan_save',
  });
  workoutPlan = activation.plan;

  return { workoutPlan, createdExerciseCount, unmatchedExercises };
}
