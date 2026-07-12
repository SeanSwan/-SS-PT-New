/**
 * Exercise display helpers for the admin workout planner.
 * Keep source/library metadata intact while removing vendor prefixes from UI
 * labels and generated PDF preview copies.
 */

import type { GeneratedPlan, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

const NASM_PREFIX = /^NASM(?:\s*[-:]\s*|\s+)/i;
// A DB slug reads as one hyphen/underscore-joined token with NO spaces, e.g.
// "Sport-Golf-Single-Leg-Romanian-Deadlift-Dumbbell". Human-entered names keep
// their spaces ("Single-Arm NASM Row", "T-Bar Row"), so the presence of a space
// is the signal to leave a name verbatim.
const SLUG_LIKE = /^[^\s]*[-_][^\s]*$/;

export function formatWorkoutPlannerExerciseName(name: string | null | undefined): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Unknown Exercise';

  const withoutPrefix = trimmed.replace(NASM_PREFIX, '').trim() || trimmed;

  // Humanize raw DB slugs so a client never sees "Sport-Golf-Single-Leg-..."
  // printed on their plan. Only touch slug-shaped names (no spaces + a
  // separator); spaced, human-entered names pass through unchanged.
  if (SLUG_LIKE.test(withoutPrefix)) {
    return withoutPrefix.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return withoutPrefix;
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
