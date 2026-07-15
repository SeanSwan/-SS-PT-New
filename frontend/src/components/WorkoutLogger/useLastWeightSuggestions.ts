/**
 * HOOK: useLastWeightSuggestions
 * Parent: WorkoutLogger (blueprint dictation-planner-logger S5).
 * PURPOSE: One fetch per loaded exercise-name set → Map of the client's last
 * logged weight per exercise (`GET /api/workout-logs/last-weights`). Set rows
 * use it for placeholder + tap-to-fill chips. FAIL-SILENT: any error logs a
 * console.warn and the logger behaves exactly as before (no suggestions).
 * Never auto-commits a weight (06-bans §9).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import type { ExerciseEntry } from '../../services/nasmApiService';

export interface LastWeightSuggestion {
  weight: number;
  reps: number | null;
  at: string | null;
}

/** Mirror of backend workoutLastWeightService normalizeExerciseName. */
export function normalizeLastWeightName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useLastWeightSuggestions({ clientId, exercises }: {
  clientId: number | null;
  exercises: ExerciseEntry[];
}): {
  suggestions: Map<string, LastWeightSuggestion>;
  getLastWeight: (exerciseName: string) => LastWeightSuggestion | null;
} {
  const [suggestions, setSuggestions] = useState<Map<string, LastWeightSuggestion>>(new Map());
  const fetchedKeyRef = useRef<string>('');

  const names = [...new Set(exercises.map((e) => e.exerciseName).filter(Boolean))].sort();
  const fetchKey = clientId && names.length ? `${clientId}|${names.join(',')}` : '';

  useEffect(() => {
    if (!fetchKey || fetchedKeyRef.current === fetchKey) return;
    fetchedKeyRef.current = fetchKey;
    let cancelled = false;
    void (async () => {
      try {
        const query = `clientId=${clientId}&names=${encodeURIComponent(names.join(','))}`;
        const res = await apiService.get(`/api/workout-logs/last-weights?${query}`);
        const weights = res?.data?.success ? res.data.weights : null;
        if (cancelled || !weights || typeof weights !== 'object') return;
        const next = new Map<string, LastWeightSuggestion>();
        for (const [key, value] of Object.entries(weights as Record<string, LastWeightSuggestion>)) {
          const weight = Number(value?.weight);
          if (!Number.isFinite(weight) || weight <= 0) continue;
          next.set(key, {
            weight,
            reps: Number.isFinite(Number(value?.reps)) ? Number(value.reps) : null,
            at: typeof value?.at === 'string' ? value.at : null,
          });
        }
        setSuggestions(next);
      } catch (err) {
        // Fail-silent by contract — suggestions are an enhancement, never a blocker.
        console.warn('[LastWeightSuggestions] fetch failed — no suggestions shown', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const getLastWeight = useCallback((exerciseName: string): LastWeightSuggestion | null => (
    suggestions.get(normalizeLastWeightName(exerciseName)) ?? null
  ), [suggestions]);

  return { suggestions, getLastWeight };
}
