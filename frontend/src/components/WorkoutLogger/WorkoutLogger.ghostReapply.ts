/**
 * WorkoutLogger.ghostReapply (Phase 2.1b)
 * =======================================
 * Fixes the cold-cache gap in ghost prefill: when a trainer adds a NEW
 * exercise, addExercise reads the prefill cache synchronously BEFORE the
 * async history fetch resolves, so the first set lands as zeros. After
 * the fetch warms the cache, this pure helper patches the warm values
 * back onto the just-added exercise — but ONLY when the row still has
 * its single untouched zero set. User-entered values, completed sets,
 * and multi-set rows are never clobbered.
 */

interface ReapplySetLike {
  weight: number;
  reps: number;
  completed?: boolean;
  tempo?: string;
  restTime?: number;
}

interface ReapplyGhostData {
  weight: number;
  reps: number;
  tempo?: string;
  restTime?: number;
}

export function reapplyGhostPreFill<T extends { loggerExerciseId?: string; sets: S[] }, S extends ReapplySetLike>(
  exercises: T[],
  loggerExerciseId: string,
  ghost: ReapplyGhostData | null | undefined,
): T[] {
  if (!ghost || (!ghost.weight && !ghost.reps)) return exercises;
  const index = exercises.findIndex((ex) => ex.loggerExerciseId === loggerExerciseId);
  if (index === -1) return exercises;
  const target = exercises[index];
  if (target.sets.length !== 1) return exercises;
  const only = target.sets[0];
  if (only.completed || only.weight !== 0 || only.reps !== 0) return exercises;

  const patched = {
    ...only,
    weight: ghost.weight || 0,
    reps: ghost.reps || 0,
    ...(ghost.tempo ? { tempo: ghost.tempo } : {}),
    ...(ghost.restTime ? { restTime: ghost.restTime } : {}),
  };
  return exercises.map((ex, i) => (i === index ? { ...ex, sets: [patched] } : ex));
}
