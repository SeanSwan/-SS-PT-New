/**
 * workoutPlannerHorizonSwap.helpers
 * =================================
 *
 * Pure helpers for swapping/removing exercises inside a GENERATED multi-week
 * plan's Detailed Schedule (Month > Week > Day drill-down). The single-day
 * Plan Builder has its own swap path (planExercises rows); this module covers
 * `generatedPlan.weeks[].days|sessions[].exercises[]` immutably so dirty-state
 * signatures and the auto-regenerating plan PDF pick the change up on save.
 */

import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlan, GeneratedPlanWeek, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

export interface BuilderSwapTarget {
  kind: 'builder';
  rowId: string;
  exerciseName: string;
}

export interface HorizonSwapTarget {
  kind: 'horizon';
  /** matched against week.weekNumber (unique across the plan) */
  weekNumber: number;
  /** POSITION in the week's days/sessions array (not day.dayNumber) */
  dayIndex: number;
  exerciseIndex: number;
  exerciseName: string;
}

export type PlannerSwapTarget = BuilderSwapTarget | HorizonSwapTarget;

type HorizonExercise = GeneratedPlanWeekDay['exercises'][number];

const daysOf = (week: GeneratedPlanWeek): GeneratedPlanWeekDay[] | null => {
  if (Array.isArray(week.days) && week.days.length > 0) return week.days;
  if (Array.isArray(week.sessions) && week.sessions.length > 0) return week.sessions;
  return null;
};

const targetDay = (plan: GeneratedPlan | null, target: HorizonSwapTarget): GeneratedPlanWeekDay | null => {
  const week = plan?.weeks?.find(w => w.weekNumber === target.weekNumber);
  const days = week ? daysOf(week) : null;
  return days?.[target.dayIndex] ?? null;
};

const exerciseDisplayName = (exercise: HorizonExercise | undefined): string => (
  (exercise?.exerciseName || exercise?.name || '').trim()
);

/** True while the target still points at the exercise it was opened on. */
export const isHorizonSwapTargetValid = (plan: GeneratedPlan | null, target: HorizonSwapTarget): boolean => {
  const day = targetDay(plan, target);
  const exercise = day?.exercises?.[target.exerciseIndex];
  return !!exercise && exerciseDisplayName(exercise).toLowerCase() === target.exerciseName.trim().toLowerCase();
};

/** Duplicate-guard: the replacement already appears elsewhere in the same day. */
export const isDuplicateInHorizonDay = (
  plan: GeneratedPlan | null,
  target: HorizonSwapTarget,
  replacement: ExerciseSlim,
): boolean => {
  const day = targetDay(plan, target);
  if (!day) return false;
  const name = replacement.name.trim().toLowerCase();
  return day.exercises.some((exercise, index) => (
    index !== target.exerciseIndex
    && (exerciseDisplayName(exercise).toLowerCase() === name || exercise.exerciseId === replacement.id)
  ));
};

const mapTargetExercises = (
  plan: GeneratedPlan,
  target: HorizonSwapTarget,
  update: (exercises: HorizonExercise[]) => HorizonExercise[],
): GeneratedPlan => ({
  ...plan,
  weeks: (plan.weeks ?? []).map((week) => {
    if (week.weekNumber !== target.weekNumber) return week;
    const key = Array.isArray(week.days) && week.days.length > 0 ? 'days' : 'sessions';
    const days = daysOf(week);
    if (!days) return week;
    return {
      ...week,
      [key]: days.map((day, dayIndex) => (
        dayIndex === target.dayIndex ? { ...day, exercises: update(day.exercises ?? []) } : day
      )),
    };
  }),
});

/**
 * Replace the targeted movement, keeping the slot's programming
 * (sets/reps/tempo/rest/notes). Clears the rotation-fallback flag — the
 * trainer's explicit pick supersedes the generator's fallback marker.
 */
export const applyHorizonSwap = (
  plan: GeneratedPlan,
  target: HorizonSwapTarget,
  replacement: ExerciseSlim,
): GeneratedPlan => mapTargetExercises(plan, target, exercises => exercises.map((exercise, index) => (
  index === target.exerciseIndex
    ? {
      ...exercise,
      exerciseId: replacement.id,
      exerciseName: replacement.name,
      name: replacement.name,
      rotationFallback: false,
    }
    : exercise
)));

export const removeHorizonExercise = (
  plan: GeneratedPlan,
  target: HorizonSwapTarget,
): GeneratedPlan => mapTargetExercises(plan, target, exercises => (
  exercises.filter((_, index) => index !== target.exerciseIndex)
));

/** Fields a dictated planner_update_exercise may change on a day slot. */
export interface HorizonExerciseFieldUpdates {
  sets?: number;
  reps?: string | number;
  tempo?: string;
  restSeconds?: number;
}

/** Update only the provided programming fields on the targeted day slot. */
export const updateHorizonExerciseFields = (
  plan: GeneratedPlan,
  target: HorizonSwapTarget,
  updates: HorizonExerciseFieldUpdates,
): GeneratedPlan => mapTargetExercises(plan, target, exercises => exercises.map((exercise, index) => (
  index === target.exerciseIndex
    ? {
      ...exercise,
      ...(updates.sets !== undefined ? { sets: updates.sets } : {}),
      ...(updates.reps !== undefined ? { reps: updates.reps } : {}),
      ...(updates.tempo !== undefined ? { tempo: updates.tempo } : {}),
      ...(updates.restSeconds !== undefined ? { restSeconds: updates.restSeconds } : {}),
    }
    : exercise
)));

/** Append a dictated exercise to the targeted day (Week/Day addressed like swaps). */
export const addHorizonExercise = (
  plan: GeneratedPlan,
  target: Pick<HorizonSwapTarget, 'weekNumber' | 'dayIndex'>,
  exercise: ExerciseSlim,
  programming: HorizonExerciseFieldUpdates,
): GeneratedPlan => mapTargetExercises(
  plan,
  { kind: 'horizon', exerciseIndex: -1, exerciseName: exercise.name, ...target },
  exercises => [...exercises, {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    name: exercise.name,
    sets: programming.sets,
    reps: programming.reps,
    tempo: programming.tempo,
    restSeconds: programming.restSeconds,
    rotationFallback: false,
  }],
);
