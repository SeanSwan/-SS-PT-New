export interface WorkoutLog {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  title?: string;
  date: string;
  duration?: number;
  intensity?: number;
  totalSets?: number;
  totalReps?: number;
  totalWeight?: number;
  notes?: string;
  status?: string;
  logs?: WorkoutLog[];
}

export const CLIENT_WORKOUTS_PAGE_LIMIT = 50;

export function groupWorkoutLogsByExercise(logs: WorkoutLog[]): Record<string, WorkoutLog[]> {
  const groups: Record<string, WorkoutLog[]> = {};
  for (const log of logs) {
    const key = log.exerciseName || 'Unknown Exercise';
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.setNumber - b.setNumber);
  }
  return groups;
}
