/**
 * WorkoutLogger.recentExercises
 * -----------------------------
 * Persisted "recently picked" exercises for the Rolodex (Slice 10 — least
 * clicks: repeat exercises are the common case in real training, so the last
 * picks become one-tap chips instead of type -> scroll -> select).
 *
 * Storage mirrors WorkoutLogger.preferences: keyed GLOBALLY so it follows the
 * operator across clients, fail-soft on every localStorage access (private
 * mode / quota must never block logging). Only {id, name} is persisted — the
 * exercise LIBRARY stays the source of truth; chips resolve against the live
 * catalog and silently drop entries that no longer exist.
 */

export interface RecentExerciseRef {
  id: string;
  name: string;
}

const RECENT_EXERCISES_KEY = 'ss-workout-logger-recent-exercises';
export const RECENT_EXERCISES_CAP = 8;

export const readRecentExercises = (): RecentExerciseRef[] => {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(RECENT_EXERCISES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is RecentExerciseRef => (
        Boolean(e) && typeof e.id === 'string' && typeof e.name === 'string'
      ))
      .slice(0, RECENT_EXERCISES_CAP);
  } catch {
    return [];
  }
};

export const recordRecentExercise = (exercise: { id: string | number; name: string }): void => {
  try {
    if (typeof window === 'undefined') return;
    const id = String(exercise.id);
    const next: RecentExerciseRef[] = [
      { id, name: exercise.name },
      ...readRecentExercises().filter((e) => e.id !== id),
    ].slice(0, RECENT_EXERCISES_CAP);
    window.localStorage.setItem(RECENT_EXERCISES_KEY, JSON.stringify(next));
  } catch {
    // Never block a workout log on a convenience feature.
  }
};
