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
  /** Honest-state: set when the library failed to load and no cache exists */
  loadError: string | null;
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
  const [loadError, setLoadError] = useState<string | null>(null);

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
      // 2026-04-17: switched from /api/exercises/all (trainer/admin-only)
      // to /api/exercises/library (any authenticated user). The client
      // self-log surface mounted at /dashboard/client/log-workout used
      // to 403 on the old endpoint; the library endpoint returns the
      // same payload shape but is role-open.
      const res = await api.get('/api/exercises/library');
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
        const toOptionalString = (v: unknown): string | undefined => (
          typeof v === 'string' && v.trim() ? v : undefined
        );
        const toOptionalNumber = (v: unknown): number | undefined => {
          if (typeof v === 'number' && Number.isFinite(v)) return v;
          if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v);
          return undefined;
        };
        const toCatalogVideoSample = (value: unknown): ExerciseSlim['catalogVideoSample'] => {
          if (!value || typeof value !== 'object') return null;
          const sample = value as Record<string, unknown>;
          return {
            title: toOptionalString(sample.title) ?? null,
            source: toOptionalString(sample.source) ?? null,
            videoUrl: toOptionalString(sample.videoUrl) ?? null,
            thumbnailUrl: toOptionalString(sample.thumbnailUrl) ?? null,
            durationSeconds: toOptionalNumber(sample.durationSeconds) ?? null,
          };
        };
        const exercises: ExerciseSlim[] = body.exercises.map((ex: Record<string, unknown>) => ({
          id: String(ex?.id ?? ''),
          name: String(ex?.name ?? 'Unknown Exercise'),
          exerciseKey: String(ex?.exerciseKey ?? ex?.id ?? ''),
          exerciseType: String(ex?.exerciseType ?? 'exercise'),
          bodyPartCategory: String(ex?.bodyPartCategory ?? 'Full Body'),
          primaryMuscles: parseArr(ex?.primaryMuscles),
          secondaryMuscles: parseArr(ex?.secondaryMuscles),
          difficulty: Number(ex?.difficulty) || 1,
          equipment: parseArr(ex?.equipment),
          equipmentNeeded: parseArr(ex?.equipmentNeeded),
          source: String(ex?.source ?? 'swanstudios'),
          description: (ex?.description as string) || undefined,
          videoUrl: toOptionalString(ex?.videoUrl),
          previewVideoUrl: toOptionalString(ex?.previewVideoUrl),
          imageUrl: toOptionalString(ex?.imageUrl),
          thumbnailUrl: toOptionalString(ex?.thumbnailUrl),
          catalogVideoSample: toCatalogVideoSample(ex?.catalogVideoSample),
          defaultTempo: toOptionalString(ex?.defaultTempo),
          defaultRestSeconds: toOptionalNumber(ex?.defaultRestSeconds),
          recommendedSets: toOptionalNumber(ex?.recommendedSets),
          recommendedReps: toOptionalNumber(ex?.recommendedReps),
          recommendedDuration: toOptionalNumber(ex?.recommendedDuration),
          restInterval: toOptionalNumber(ex?.restInterval),
          optPhases: parseArr(ex?.optPhases),
          nasmMovementPattern: toOptionalString(ex?.nasmMovementPattern),
          canBePerformedAtHome: Boolean(ex?.canBePerformedAtHome),
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
        setLoadError(null);
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
      // Honest-state contract: never let a failed library load masquerade
      // as "no exercises found" — surface it so the UI can offer a retry.
      if (exerciseCacheRef.current.length === 0) {
        setLoadError('The exercise library failed to load.');
      }
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
    loadError,
    setQuery,
    setCategory,
    query,
    category,
    refresh,
  };
}
