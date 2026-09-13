/**
 * useExerciseSearch — Client-side exercise search with a module Worker
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Fetches the exercise library once per mounted consumer, caches it for five
 *   minutes, and runs current-query search through the shared scorer (Worker
 *   when available, synchronous fallback otherwise).
 *
 * HOW IT FITS IN THE APP:
 *   NASMExerciseRolodex / Bootcamp ExerciseRolodexPanel / Planner rolodex
 *     → useExerciseSearch() → results + load/search state
 *
 * STATE OWNERSHIP (S03 / R-H13 contract):
 *   - Fetch owns the catalog, catalogRevision and load state.
 *   - Query/category own results and search state; they never trigger a fetch.
 *   - Every accepted catalog gets a monotonic catalogRevision. Every requested
 *     query/category gets a monotonic searchSequence. A Worker reply settles
 *     state only when BOTH ids still match the current pair.
 *   - loadState: 'loading' | 'ready' | 'empty' | 'error' | 'stale'.
 *     loadError remains for failed INITIAL load compatibility.
 *   - A loaded-but-empty catalog is a real result, not "never loaded".
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../../services/api.service';
import {
  type ExerciseSlim,
  createExerciseSearchWorker,
} from './exerciseSearchWorker';
import { searchExercises } from './exerciseSearchCore';
import { normalizeExerciseCatalog } from './exerciseSearchCatalog';

export type { ExerciseSlim } from './exerciseSearchWorker';

export type ExerciseSearchLoadState = 'loading' | 'ready' | 'empty' | 'error' | 'stale';

const CACHE_TTL_MS = 300_000;
const LIBRARY_FAILURE_MESSAGE = 'The exercise library failed to load.';

interface UseExerciseSearchReturn {
  /** Filtered results for the current query + category */
  results: ExerciseSlim[];
  /** Full accepted catalog (for counts and headless search) */
  allExercises: ExerciseSlim[];
  /** True while a query is being computed (Worker round-trip or fallback) */
  isSearching: boolean;
  /** True while a network fetch is in flight */
  isLoading: boolean;
  /** Set only when the INITIAL library load failed and no catalog exists */
  loadError: string | null;
  /** Additive honest load state for recovery UI */
  loadState: ExerciseSearchLoadState;
  /** Set when an explicit refresh failed but a usable catalog is still shown */
  refreshError: string | null;
  setQuery: (q: string) => void;
  setCategory: (cat: string | null) => void;
  query: string;
  category: string | null;
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
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [hasCatalog, setHasCatalog] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);
  const catalogRef = useRef<ExerciseSlim[]>([]);
  const hasCatalogRef = useRef(false);
  const catalogRevisionRef = useRef(0);
  const searchSequenceRef = useRef(0);
  const fetchSequenceRef = useRef(0);
  const queryRef = useRef('');
  const categoryRef = useRef<string | null>(null);
  const lastFetchRef = useRef(0);

  /** Release an owned Worker exactly once. */
  const releaseWorker = useCallback((target: Worker | null) => {
    if (!target || workerRef.current !== target) return;
    workerRef.current = null;
    try {
      target.terminate();
    } catch {
      /* the Worker is already gone */
    }
  }, []);

  /** Settle results only for the still-current (catalogRevision, searchSequence). */
  const settleSearch = useCallback((rows: ExerciseSlim[], sequence: number, revision: number) => {
    if (!mountedRef.current) return;
    if (sequence !== searchSequenceRef.current || revision !== catalogRevisionRef.current) return;
    setResults(rows);
    setIsSearching(false);
  }, []);

  /** Run the current query/category through the Worker, else the shared scorer. */
  const runSearch = useCallback((nextQuery: string, nextCategory: string | null) => {
    if (!hasCatalogRef.current) return;

    searchSequenceRef.current += 1;
    const sequence = searchSequenceRef.current;
    const revision = catalogRevisionRef.current;
    const worker = workerRef.current;

    if (worker) {
      setIsSearching(true);
      try {
        worker.postMessage({
          type: 'SEARCH',
          query: nextQuery,
          category: nextCategory,
          catalogRevision: revision,
          searchSequence: sequence,
        });
        return;
      } catch {
        // An unserializable/failed postMessage must not strand busy state.
        releaseWorker(worker);
      }
    }

    settleSearch(searchExercises(catalogRef.current, nextQuery, nextCategory), sequence, revision);
  }, [releaseWorker, settleSearch]);

  // ── Own the Worker for this consumer's lifetime ──
  useEffect(() => {
    mountedRef.current = true;
    const worker = createExerciseSearchWorker();
    workerRef.current = worker;

    if (worker) {
      const handleWorkerFailure = () => {
        if (workerRef.current !== worker) return;
        releaseWorker(worker);
        // Replay the latest query/category against the current catalog.
        runSearch(queryRef.current, categoryRef.current);
      };

      worker.onmessage = (event: MessageEvent) => {
        if (workerRef.current !== worker) return;
        const message = event?.data;
        if (!message || message.type !== 'RESULTS') return;
        if (message.catalogRevision !== catalogRevisionRef.current) return;
        if (message.searchSequence !== searchSequenceRef.current) return;
        settleSearch(message.exercises ?? [], message.searchSequence, message.catalogRevision);
      };
      worker.onerror = handleWorkerFailure;
      worker.onmessageerror = handleWorkerFailure;
    }

    return () => {
      mountedRef.current = false;
      releaseWorker(worker);
    };
  }, [releaseWorker, runSearch, settleSearch]);

  // ── Fetch + accept the catalog (never re-run because of typing) ──
  const loadCatalog = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force === true;
    const hadCatalog = hasCatalogRef.current;
    // F4: claim freshness SYNCHRONOUSLY, before the first await, and no longer
    // require `hadCatalog`. The stamp was set only on SUCCESS and the guard
    // required an existing catalog, so a StrictMode effect replay ran twice in one
    // tick, both saw `hasCatalogRef === false`, and both fetched the library.
    // Scope note: separate hook INSTANCES are NOT deduped, by design — the cache
    // is per-consumer and cacheClaim.test.tsx asserts that on purpose.
    if (!force && Date.now() - lastFetchRef.current < CACHE_TTL_MS) return;

    lastFetchRef.current = Date.now();

    fetchSequenceRef.current += 1;
    const fetchSequence = fetchSequenceRef.current;

    if (mountedRef.current) {
      setIsLoading(true);
      // F3: `refreshError` is deliberately NOT cleared here. Clearing it at load
      // start made `stale && isLoading` impossible, so resolveLibraryState's
      // documented "stale beats refreshing" ordering was unreachable — a retry
      // flipped to `refreshing`, which renders NO notice, and the Retry button
      // lives inside that notice. Clicking it blanked the pane, button included.
      // Keeping the error until SUCCESS keeps the notice up with "Retrying…".
    }

    let rows: ExerciseSlim[] | null = null;
    try {
      const api = new ApiService();
      const res = await api.get('/api/exercises/library');
      // ApiService returns AxiosResponse — unwrap .data safely.
      const payload = res?.data ?? res;
      const body = (typeof payload === 'object' && payload !== null) ? payload : {};
      // A malformed top-level body is a failure, not a successful empty list.
      if (body.success && Array.isArray(body.exercises)) {
        rows = normalizeExerciseCatalog(body.exercises);
      }
    } catch (err) {
      console.error('Failed to load exercise list:', err);
    }

    // Only the latest fetch may touch catalog, load status and refresh errors.
    if (!mountedRef.current || fetchSequence !== fetchSequenceRef.current) return;

    setIsLoading(false);

    if (!rows) {
      // Defensive, NOT load-bearing today (review finding 5): the only non-forced
      // caller is the once-per-mount effect; retries go through refresh().
      lastFetchRef.current = 0;
      // Honest-state contract: a failed load must never masquerade as
      // "no exercises found".
      if (hadCatalog) setRefreshError(LIBRARY_FAILURE_MESSAGE);
      else setLoadError(LIBRARY_FAILURE_MESSAGE);
      return;
    }

    catalogRef.current = rows;
    hasCatalogRef.current = true;
    catalogRevisionRef.current += 1;
    lastFetchRef.current = Date.now();
    setAllExercises(rows);
    setHasCatalog(true);
    setLoadError(null);
    setRefreshError(null);

    workerRef.current?.postMessage({
      type: 'CACHE',
      exercises: rows,
      catalogRevision: catalogRevisionRef.current,
    });

    // Search the CURRENT query/category — never a stale captured one.
    runSearch(queryRef.current, categoryRef.current);
  }, [runSearch]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // ── Search whenever the query/category actually changes ──
  useEffect(() => {
    runSearch(query, category);
  }, [query, category, runSearch]);

  // HOSTILE-REVIEW FIX (frontend F2): invalidate ONLY when the value actually
  // changes. The sequence must never advance without a replacement request — a
  // same-value setter (handleSelect's setQuery('') while the query is already
  // empty, or a recent-chip tap during the initial blank search) previously
  // bumped it with no new SEARCH behind it, so the in-flight reply was discarded
  // and isSearching stayed true FOREVER.
  const setQuery = useCallback((q: string) => {
    if (queryRef.current === q) return;
    queryRef.current = q;
    searchSequenceRef.current += 1;
    setQueryState(q);
  }, []);

  const setCategory = useCallback((cat: string | null) => {
    if (categoryRef.current === cat) return;
    categoryRef.current = cat;
    searchSequenceRef.current += 1;
    setCategoryState(cat);
  }, []);

  const refresh = useCallback(() => {
    lastFetchRef.current = 0;
    void loadCatalog({ force: true });
  }, [loadCatalog]);

  const loadState: ExerciseSearchLoadState = loadError
    ? 'error'
    : !hasCatalog
      ? 'loading'
      : refreshError
        ? 'stale'
        : allExercises.length === 0
          ? 'empty'
          : 'ready';

  return {
    results,
    allExercises,
    isSearching,
    isLoading,
    loadError,
    loadState,
    refreshError,
    setQuery,
    setCategory,
    query,
    category,
    refresh,
  };
}
