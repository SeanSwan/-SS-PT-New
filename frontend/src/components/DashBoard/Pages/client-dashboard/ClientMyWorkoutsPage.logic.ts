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
export const CLIENT_WORKOUTS_RETURN_TO = '/dashboard/client/workouts';
export const CLIENT_WORKOUTS_COACH_PROMPT =
  "Teach me my workouts tab from my workout history. Help me decide what to log today and choose one safe next training action.";

export interface ClientWorkoutsCoachSnapshot {
  workouts: readonly WorkoutSession[];
  page: number;
  now?: Date;
}

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

function formatPageVolume(totalVolume: number): string {
  if (totalVolume >= 1000) return `${(totalVolume / 1000).toFixed(1)}k lbs`;
  return `${Math.max(0, Math.round(totalVolume))} lbs`;
}

export function buildClientWorkoutsCoachPrompt(snapshot?: ClientWorkoutsCoachSnapshot): string {
  if (!snapshot) return CLIENT_WORKOUTS_COACH_PROMPT;

  const workouts = Array.isArray(snapshot.workouts) ? snapshot.workouts : [];
  const now = snapshot.now ?? new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentCount = workouts.filter((workout) => new Date(workout.date) >= weekAgo).length;
  const totalVolume = workouts.reduce((sum, workout) => sum + Math.max(0, Number(workout.totalWeight) || 0), 0);
  const page = Number.isFinite(snapshot.page) && snapshot.page > 0 ? Math.floor(snapshot.page) : 1;

  return [
    'Teach me my workouts tab from my workout history.',
    `Current page snapshot: ${workouts.length} workouts on this page; ${recentCount} in the last 7 days; ${formatPageVolume(totalVolume)} page volume; page ${page}.`,
    'Give me the safest next training action in one simple step: log today, review progression, or ask my trainer a question.',
  ].join(' ');
}

export function buildClientWorkoutsCoachPath(snapshot?: ClientWorkoutsCoachSnapshot): string {
  return `/dashboard/client/coach-assistant?${new URLSearchParams({
    intent: 'log_self_workout',
    source: 'client-workouts',
    returnTo: CLIENT_WORKOUTS_RETURN_TO,
    teachPrompt: buildClientWorkoutsCoachPrompt(snapshot),
  }).toString()}`;
}
