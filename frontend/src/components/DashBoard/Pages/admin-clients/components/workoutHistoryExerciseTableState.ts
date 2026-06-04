import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';

export interface WorkoutHistoryExerciseTableState {
  hasTempo: boolean;
  hasRest: boolean;
  hasRPE: boolean;
  hasWeight: boolean;
  exerciseGroups: Array<[string, WorkoutLogEntry[]]>;
}

export function buildWorkoutHistoryExerciseTableState(
  logs: WorkoutLogEntry[],
): WorkoutHistoryExerciseTableState {
  const groups = new Map<string, WorkoutLogEntry[]>();
  for (const log of logs) {
    if (!groups.has(log.exerciseName)) {
      groups.set(log.exerciseName, []);
    }
    groups.get(log.exerciseName)!.push(log);
  }

  return {
    hasTempo: logs.some((log) => Boolean(log.tempo)),
    hasRest: logs.some((log) => Boolean(log.rest && log.rest > 0)),
    hasRPE: logs.some((log) => Boolean(log.rpe && log.rpe > 0)),
    hasWeight: logs.some((log) => log.weight > 0),
    exerciseGroups: Array.from(groups.entries()),
  };
}
