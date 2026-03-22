/**
 * ============================================================================
 * FILE: useAnalytics.ts
 * PURPOSE: React hook for fetching real analytics data from backend API
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a reusable hook that fetches analytics data
 * from the /api/analytics/:userId/* endpoints. Handles loading, error, and
 * caching states. Used by Victory charts to display real workout data instead
 * of hardcoded demo data.
 *
 * HOW IT FITS IN THE APP: Victory Chart Component → useAnalytics(userId, endpoint) → GET /api/analytics/:userId/*
 * KEY DECISIONS: Uses SWR-like stale-while-revalidate pattern with useRef cache.
 *   SWR library deferred until package.json includes it — using manual fetch + cache for now.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../services/api.service';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface AnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache TTL: 5 minutes (stale-while-revalidate)
const CACHE_TTL = 5 * 60 * 1000;

// In-memory cache shared across hook instances
const analyticsCache = new Map<string, CacheEntry<unknown>>();

// ─────────────────────────────────────────────────────────────
// SECTION: Main hook
// PURPOSE: Fetch analytics data with caching and dedup
// ─────────────────────────────────────────────────────────────

/**
 * Fetch analytics data for a specific user and endpoint.
 * Caches results for 5 minutes and deduplicates in-flight requests.
 *
 * @param userId - User ID to fetch analytics for
 * @param endpoint - Analytics endpoint (e.g., 'dashboard', 'strength-profile')
 * @param enabled - Set false to skip fetching (e.g., when userId is unknown)
 * @returns { data, loading, error, refetch }
 */
export function useAnalytics<T = unknown>(
  userId: number | string | undefined,
  endpoint: string,
  enabled = true
) {
  const [state, setState] = useState<AnalyticsState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Track in-flight requests to prevent duplicates
  const inflightRef = useRef<AbortController | null>(null);

  const cacheKey = userId ? `analytics:${userId}:${endpoint}` : '';

  const fetchData = useCallback(async () => {
    if (!userId || !enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    // Check cache first
    const cached = analyticsCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState({ data: cached.data, loading: false, error: null });
      return;
    }

    // If stale cache exists, show it while revalidating
    if (cached) {
      setState(prev => ({ ...prev, data: cached.data, loading: true }));
    }

    // Abort any in-flight request
    if (inflightRef.current) {
      inflightRef.current.abort();
    }

    const controller = new AbortController();
    inflightRef.current = controller;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiService.get(`/api/analytics/${userId}/${endpoint}`, {
        signal: controller.signal,
      });

      const data = response.data as T;

      // Update cache
      analyticsCache.set(cacheKey, { data, timestamp: Date.now() });

      if (!controller.signal.aborted) {
        setState({ data, loading: false, error: null });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof Error && err.name === 'CanceledError') return;

      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      if (!controller.signal.aborted) {
        setState(prev => ({ ...prev, loading: false, error: message }));
      }
    } finally {
      if (inflightRef.current === controller) {
        inflightRef.current = null;
      }
    }
  }, [userId, endpoint, enabled]);

  useEffect(() => {
    fetchData();

    return () => {
      // Always abort and null the controller on unmount/dep change
      if (inflightRef.current) {
        inflightRef.current.abort();
        inflightRef.current = null;
      }
    };
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Specialized hooks for common analytics endpoints
// PURPOSE: Typed wrappers for Big 6 + NASM charts
// ─────────────────────────────────────────────────────────────

export interface DashboardAnalytics {
  totalWorkouts: number;
  totalVolume: number;
  avgIntensity: number;
  currentStreak: number;
  weightEntries?: Array<{ date: string; weight: number }>;
  [key: string]: unknown;
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}

export interface FrequencyData {
  weeklyAverage: number;
  monthlyTotal: number;
  dailyCounts: Array<{ date: string; count: number }>;
  [key: string]: unknown;
}

export interface StrengthProfile {
  muscleGroups: Array<{ group: string; score: number }>;
  [key: string]: unknown;
}

export interface VolumeProgression {
  weeks: Array<{ week: string; volume: number }>;
  [key: string]: unknown;
}

export const useDashboardAnalytics = (userId?: number | string) =>
  useAnalytics<DashboardAnalytics>(userId, 'dashboard', !!userId);

export const usePersonalRecords = (userId?: number | string) =>
  useAnalytics<{ records: PersonalRecord[] }>(userId, 'personal-records', !!userId);

export const useFrequencyStats = (userId?: number | string) =>
  useAnalytics<FrequencyData>(userId, 'frequency', !!userId);

export const useStrengthProfile = (userId?: number | string) =>
  useAnalytics<StrengthProfile>(userId, 'strength-profile', !!userId);

export const useVolumeProgression = (userId?: number | string) =>
  useAnalytics<VolumeProgression>(userId, 'volume-progression', !!userId);

export const useNasmProgress = (userId?: number | string) =>
  useAnalytics(userId, 'nasm-progress', !!userId);

export const useExerciseHistory = (userId?: number | string) =>
  useAnalytics(userId, 'exercise-history', !!userId);

// ─────────────────────────────────────────────────────────────
// SECTION: Cache utilities
// PURPOSE: Eviction + invalidation for the in-memory analytics cache
// ─────────────────────────────────────────────────────────────

// Periodically evict expired entries to prevent unbounded memory growth
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of analyticsCache.entries()) {
      if (now - (entry as CacheEntry<unknown>).timestamp > CACHE_TTL) {
        analyticsCache.delete(key);
      }
    }
  }, CACHE_TTL);
}

/** Invalidate a specific cache entry (e.g., after workout save) */
export const invalidateAnalyticsCache = (userId: number | string, endpoint?: string) => {
  if (endpoint) {
    analyticsCache.delete(`analytics:${userId}:${endpoint}`);
  } else {
    // Invalidate all entries for this user
    for (const key of analyticsCache.keys()) {
      if (key.startsWith(`analytics:${userId}:`)) {
        analyticsCache.delete(key);
      }
    }
  }
};

export default useAnalytics;
