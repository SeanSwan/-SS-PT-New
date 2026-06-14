/**
 * Exercise display helpers for the admin workout planner.
 * Keep source/library metadata intact while removing vendor prefixes from UI
 * labels and generated PDF preview copies.
 */

import type { GeneratedPlan, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

const NASM_PREFIX = /^NASM(?:\s*[-:]\s*|\s+)/i;

export function formatWorkoutPlannerExerciseName(name: string | null | undefined): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Unknown Exercise';

  const withoutPrefix = trimmed.replace(NASM_PREFIX, '').trim();
  return withoutPrefix || trimmed;
}

type GeneratedExercise = GeneratedPlanWeekDay['exercises'][number];

const formatGeneratedExercise = (exercise: GeneratedExercise): GeneratedExercise => {
  if (exercise.exerciseName) {
    return {
      ...exercise,
      exerciseName: formatWorkoutPlannerExerciseName(exercise.exerciseName),
    };
  }

  if (exercise.name) {
    return {
      ...exercise,
      name: formatWorkoutPlannerExerciseName(exercise.name),
    };
  }

  return exercise;
};

const formatGeneratedDay = (day: GeneratedPlanWeekDay): GeneratedPlanWeekDay => ({
  ...day,
  exercises: day.exercises.map(formatGeneratedExercise),
});

export function withDisplayExerciseNamesForExport(plan: GeneratedPlan): GeneratedPlan {
  if (!Array.isArray(plan.weeks) || plan.weeks.length === 0) return plan;

  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      days: week.days?.map(formatGeneratedDay),
      sessions: week.sessions?.map(formatGeneratedDay),
    })),
  };
}
