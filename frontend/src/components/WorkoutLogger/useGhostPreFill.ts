/**
 * ┌─── HOOK: useGhostPreFill ──────────────────────────────────┐
 * │ PURPOSE: Fetch & cache previous workout data for a client   │
 * │ so new sets auto-populate with last session's values.       │
 * │                                                              │
 * │ Shares the same API + cache as GhostDataRow but returns     │
 * │ structured data for pre-filling inputs.                      │
 * │                                                              │
 * │ Returns: getPreFill(exerciseName, setIndex) => ExerciseSet  │
 * │          getOverload(exerciseName, setIndex) => suggestion   │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useCallback, useRef, useState } from 'react';
import apiService from '../../services/api.service';

export interface PreFillData {
  weight: number;
  reps: number;
  rpe?: number;
  tempo?: string;
  restTime?: number;
}

export interface OverloadSuggestion {
  type: 'weight' | 'reps';
  current: number;
  suggested: number;
  label: string;
}

// Module-level cache shared across all hook instances
const preFillCache = new Map<string, PreFillData[] | null>();
/** Batch 4: newest-first top-set weight per past workout (glance trend). */
const trendCache = new Map<string, number[]>();

// Compound movements get +5 lbs suggestion, isolation gets +2.5
const COMPOUND_PATTERNS = /squat|deadlift|bench|press|row|pull.?up|chin.?up|lunge|clean|snatch|thrust/i;

/**
 * @param clientId  The client whose prior-session data feeds ghost pre-fill.
 * @param options.skip  When true, the hook becomes a no-op: no network
 *   requests fire and lookups return undefined. Used on the client
 *   self-log route where the underlying `/api/admin/clients/:id/workouts`
 *   endpoint is admin-only and would 403 for every call. Ghost pre-fill
 *   is a speed feature, not a correctness feature — skipping it keeps
 *   the client route clean of forbidden requests without losing any
 *   logger functionality.
 *
 *   2026-04-18 Codex round 4 fix — was hitting /api/admin/clients/:id/workouts
 *   as 403 noise on every client self-log session.
 */
export function useGhostPreFill(
  clientId: number,
  options: { skip?: boolean } = {},
) {
  const { skip = false } = options;
  const [isLoading, setIsLoading] = useState(false);
  const fetchedExercises = useRef(new Set<string>());

  // Stable no-op for client self-mode (round 12 hardening 2026-04-18).
  // Returned in place of the real fetcher when `skip === true` so no
  // network call path is reachable through this hook at all. Ref-stable
  // via empty deps — consumers that memoize against this identity do
  // not re-render on unrelated state changes.
  const noOpFetchExerciseHistory = useCallback(async (_exerciseName: string) => {
    // Intentional no-op. Ghost pre-fill is a speed feature; skipping it
    // is correctness-neutral.
  }, []);

  // Fetch history for a specific exercise (if not cached)
  const fetchExerciseHistoryReal = useCallback(async (exerciseName: string) => {
    if (skip) return;
    const cacheKey = `${clientId}:${exerciseName}`;

    if (preFillCache.has(cacheKey) || fetchedExercises.current.has(cacheKey)) {
      return;
    }

    fetchedExercises.current.add(cacheKey);

    try {
      setIsLoading(true);
      const response = await apiService.get<{ success?: boolean; workouts?: any[] }>(
        `/api/admin/clients/${clientId}/workouts?limit=10`,
        { validateStatus: (status) => status < 500 },
      );

      if (response.status >= 400) {
        preFillCache.set(cacheKey, null);
        return;
      }

      const data = response.data;
      if (!data?.success || !data.workouts) {
        preFillCache.set(cacheKey, null);
        return;
      }

      // Batch 4: while we're here, cache the TREND — top set per workout
      // (newest first) across the whole response, for the glance chip.
      const trend: number[] = [];
      for (const workout of data.workouts) {
        const logs = workout.logs || workout.exercises || [];
        const tops = logs
          .filter((log: any) => log.exerciseName?.toLowerCase() === exerciseName.toLowerCase())
          .map((log: any) => Number(log.weight) || 0);
        if (tops.length > 0) trend.push(Math.max(...tops));
        if (trend.length >= 5) break;
      }
      trendCache.set(cacheKey, trend);

      // Find most recent workout containing this exercise
      for (const workout of data.workouts) {
        const logs = workout.logs || workout.exercises || [];
        const matching = logs.filter(
          (log: any) => log.exerciseName?.toLowerCase() === exerciseName.toLowerCase()
        );

        if (matching.length > 0) {
          const sets: PreFillData[] = matching.map((log: any) => ({
            weight: log.weight || 0,
            reps: log.reps || 0,
            rpe: log.rpe,
            tempo: log.tempo,
            restTime: log.rest || log.restTime,
          }));
          preFillCache.set(cacheKey, sets);
          return;
        }
      }

      preFillCache.set(cacheKey, null);
    } catch {
      preFillCache.set(cacheKey, null);
    } finally {
      setIsLoading(false);
    }
    // 2026-04-18 Phase 16.2 round 5 fix — `skip` must be in the deps array,
    // otherwise the memoized callback captures the initial skip value in a
    // stale closure. On the client self-route `skip` flips to true once
    // `isClientSelfMode` resolves, but the callback returned to consumers
    // (WorkoutLogger line ~696) kept firing the admin-only history fetch
    // because its closure still had `skip: false` from the first render.
    // Adding `skip` here means the callback re-memoizes when the flag
    // changes and the short-circuit actually takes effect.
    //
    // 2026-04-18 Phase 16.2 round 12 hardening — even with the inline
    // short-circuit above, consumers that memoize against the returned
    // callback identity (e.g. WorkoutLogger's `addExercise` useCallback
    // with `[ghostPreFill]` deps) could still fire a transiently-created
    // skip=false variant if React schedules a stale commit. The real
    // defense now lives at the return boundary: when skip=true the hook
    // returns `noOpFetchExerciseHistory` instead of this one, so there
    // is no code path from consumers to the network call at all.
  }, [clientId, skip]);

  // Active fetcher: ref-stable no-op when skipping, real fetcher otherwise.
  // Consumers never see the real fetcher while skip=true.
  const fetchExerciseHistory = skip ? noOpFetchExerciseHistory : fetchExerciseHistoryReal;

  /** Get pre-fill values for a specific set */
  const getTrend = useCallback((exerciseName: string): number[] => {
    return trendCache.get(`${clientId}:${exerciseName}`) ?? [];
  }, [clientId]);

  const getPreFill = useCallback((exerciseName: string, setIndex: number): PreFillData | null => {
    const cacheKey = `${clientId}:${exerciseName}`;
    const cached = preFillCache.get(cacheKey);
    if (!cached) return null;
    return cached[setIndex] || cached[cached.length - 1] || null;
  }, [clientId]);

  /** Get progressive overload suggestion for a set */
  const getOverload = useCallback((exerciseName: string, setIndex: number): OverloadSuggestion | null => {
    const preFill = getPreFill(exerciseName, setIndex);
    if (!preFill || preFill.weight === 0) return null;

    const isCompound = COMPOUND_PATTERNS.test(exerciseName);
    const weightBump = isCompound ? 5 : 2.5;

    // Suggest weight increase as primary overload
    return {
      type: 'weight',
      current: preFill.weight,
      suggested: preFill.weight + weightBump,
      label: `+${weightBump} lbs`,
    };
  }, [getPreFill]);

  /**
   * Pre-fill a new set with previous workout data.
   *
   * Phase 16 (2026-04-16): rating fields (rpe, formQuality) default to
   * null when no prior session recorded an explicit rating. Previously
   * `preFill?.rpe || 5` and `formQuality: 3` forced phantom neutral
   * defaults onto every new set — those values then flowed through the
   * save path into the canonical intensity/RPE charts and contaminated
   * the trend. Ghosted weight/reps are still kept because those are
   * legitimately "what you did last time" hints; subjective ratings
   * should never be assumed without explicit user input.
   */
  const createPreFilledSet = useCallback((
    exerciseName: string,
    setNumber: number,
  ) => {
    const preFill = getPreFill(exerciseName, setNumber - 1);

    return {
      setNumber,
      weight: preFill?.weight || 0,
      reps: preFill?.reps || 0,
      rpe: (typeof preFill?.rpe === 'number' && preFill.rpe > 0) ? preFill.rpe : null,
      tempo: preFill?.tempo || '',
      restTime: preFill?.restTime || 60,
      formQuality: null,
      notes: '',
    };
  }, [getPreFill]);

  return {
    isLoading,
    fetchExerciseHistory,
    getPreFill,
    getOverload,
    getTrend,
    createPreFilledSet,
  };
}
