/**
 * useExerciseSearch — Client-side exercise search with Web Worker
 * ───────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Fetches full exercise list on mount, caches in a Web Worker,
 *   then performs instant fuzzy search on every keystroke.
 *   Falls back to main-thread search if Worker fails.
 *
 * HOW IT FITS IN THE APP:
 *   NASMExerciseRolodex → useExerciseSearch() → exercises + isSearching
 *
 * KEY DECISIONS:
 *   - Worker over API for search: <1ms vs 100ms+ network round-trip
 *   - API fallback (loadExercises) kept for initial load failure recovery
 *   - 5-min staleness check on exercise cache
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../../services/api.service';
import {
  type ExerciseSlim,
  createExerciseSearchWorker,
  searchExercisesSync,
} from './exerciseSearchWorker';

export type { ExerciseSlim } from './exerciseSearchWorker';

interface UseExerciseSearchReturn {
  /** Filtered results based on current query + category */
  results: ExerciseSlim[];
  /** Full cached exercise list (for counts, etc.) */
  allExercises: ExerciseSlim[];
  /** True during initial load or active search */
  isSearching: boolean;
  /** True while fetching the full exercise list from API */
  isLoading: boolean;
  /** Update the search query */
  setQuery: (q: string) => void;
  /** Update the active body part category filter */
  setCategory: (cat: string | null) => void;
  /** Current query */
  query: string;
  /** Current category */
  category: string | null;
  /** Force refresh the exercise cache */
  refresh: () => void;
}

export function useExerciseSearch(): UseExerciseSearchReturn {
  const [allExercises, setAllExercises] = useState<ExerciseSlim[]>([]);
  const [results, setResults] = useState<ExerciseSlim[]>([]);
  const [query, setQueryState] = useState('');
  const [category, setCategoryState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const exerciseCacheRef = useRef<ExerciseSlim[]>([]);
  const lastFetchRef = useRef<number>(0);

  // ── Initialize Worker ──
  useEffect(() => {
    workerRef.current = createExerciseSearchWorker();

    if (workerRef.current) {
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'RESULTS') {
          setResults(e.data.exercises);
          setIsSearching(false);
        }
      };
      workerRef.current.onerror = () => {
        // Worker failed — fall back to sync search
        workerRef.current = null;
      };
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // ── Fetch exercises from API ──
  const fetchExercises = useCallback(async () => {
    // Staleness check: don't refetch within 5 minutes
    if (Date.now() - lastFetchRef.current < 300_000 && exerciseCacheRef.current.length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const api = new ApiService();
      const res = await api.get('/api/exercises/all');
      // ApiService returns AxiosResponse — unwrap .data safely
      const payload = res?.data ?? res;
      const body = (typeof payload === 'object' && payload !== null) ? payload : {};
      if (body.success && Array.isArray(body.exercises)) {
        // Sanitize each exercise to guarantee ExerciseSlim shape
        const parseArr = (v: unknown): string[] => {
          if (Array.isArray(v)) return v as string[];
          if (typeof v === 'string') {
            try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch { return v ? [v] : []; }
          }
          return [];
        };
        const exercises: ExerciseSlim[] = body.exercises.map((ex: Record<string, unknown>) => ({
          id: String(ex?.id ?? ''),
          name: String(ex?.name ?? 'Unknown Exercise'),
          exerciseKey: String(ex?.exerciseKey ?? ex?.id ?? ''),
          exerciseType: String(ex?.exerciseType ?? 'exercise'),
          bodyPartCategory: String(ex?.bodyPartCategory ?? 'Full Body'),
          primaryMuscles: Array.isArray(ex?.primaryMuscles) ? ex.primaryMuscles as string[] : [],
          difficulty: Number(ex?.difficulty) || 1,
          equipment: parseArr(ex?.equipment),
          equipmentNeeded: parseArr(ex?.equipmentNeeded),
          source: String(ex?.source ?? 'swanstudios'),
          description: (ex?.description as string) || undefined,
          easyVariation: (ex?.easyVariation as string) || undefined,
          hardVariation: (ex?.hardVariation as string) || undefined,
          kneeMod: (ex?.kneeMod as string) || undefined,
          shoulderMod: (ex?.shoulderMod as string) || undefined,
          ankleMod: (ex?.ankleMod as string) || undefined,
          wristMod: (ex?.wristMod as string) || undefined,
          backMod: (ex?.backMod as string) || undefined,
          elbowMod: (ex?.elbowMod as string) || undefined,
          footMod: (ex?.footMod as string) || undefined,
          hipMod: (ex?.hipMod as string) || undefined,
        }));
        exerciseCacheRef.current = exercises;
        setAllExercises(exercises);
        lastFetchRef.current = Date.now();

        // Send to worker
        workerRef.current?.postMessage({ type: 'CACHE', exercises });

        // Set initial results (no query = show all for browsing)
        if (!query) {
          setResults(exercises);
        }
      }
    } catch (err) {
      console.error('Failed to load exercise list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // ── Search when query or category changes ──
  useEffect(() => {
    if (exerciseCacheRef.current.length === 0) return;

    setIsSearching(true);

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'SEARCH', query, category });
    } else {
      // Sync fallback — still fast for 500 exercises
      const found = searchExercisesSync(exerciseCacheRef.current, query, category);
      setResults(found);
      setIsSearching(false);
    }
  }, [query, category]);

  const setQuery = useCallback((q: string) => setQueryState(q), []);
  const setCategory = useCallback((cat: string | null) => setCategoryState(cat), []);
  const refresh = useCallback(() => {
    lastFetchRef.current = 0;
    fetchExercises();
  }, [fetchExercises]);

  return {
    results,
    allExercises,
    isSearching,
    isLoading,
    setQuery,
    setCategory,
    query,
    category,
    refresh,
  };
}
