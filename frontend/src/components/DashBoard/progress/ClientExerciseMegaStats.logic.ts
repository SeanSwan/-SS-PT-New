/**
 * Pure data helpers for the client exercise mega-stats board.
 *
 * These functions live outside the React component module so Fast Refresh
 * keeps a component-only boundary while compatibility imports retain the
 * stable row-key and sanitization contracts.
 */

export interface ExerciseMegaStatPoint {
  x: string;
  y: number;
  sets?: number;
}

export const getExerciseMegaStatRowKey = (
  exercise: ExerciseMegaStatPoint,
): string => {
  const exerciseName = exercise.x.trim().toLowerCase() || 'unknown-exercise';
  return 'exercise-mega-stat|' + exerciseName;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const sanitizeExerciseMegaStats = (
  exercises: ExerciseMegaStatPoint[],
): ExerciseMegaStatPoint[] => {
  if (!Array.isArray(exercises)) return [];

  return exercises.reduce<ExerciseMegaStatPoint[]>((rows, exercise) => {
    const x = typeof exercise?.x === 'string' ? exercise.x.trim() : '';
    const y = toFiniteNumber(exercise?.y);
    if (!x || y <= 0) return rows;

    rows.push({ x, y, sets: Math.max(toFiniteNumber(exercise?.sets), 0) });
    return rows;
  }, []);
};
