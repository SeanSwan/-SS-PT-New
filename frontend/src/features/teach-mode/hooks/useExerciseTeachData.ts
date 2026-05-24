/**
 * ============================================================================
 * FILE: useExerciseTeachData.ts
 * PURPOSE: Fetch deep exercise data for Teach Mode (lazy-loaded on demand)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches full exercise teach data from the dedicated
 * /api/exercises/:id/teach-mode endpoint. Caches results in-memory to make
 * switching between previously viewed exercises instantaneous.
 *
 * KEY DECISIONS:
 * - Hook-local loading/error state (per AI Village architecture consensus)
 * - In-memory cache Map for session persistence
 * - AbortController for request cancellation on rapid exercise switching
 * - `enabled` flag supports lazy-load pattern (only fetch when tab is active)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../../../services/api.service';
import type { ExerciseTeachData } from '../types/TeachModeContracts';

// ─────────────────────────────────────────────────────────────
// SECTION: In-Memory Cache
// ─────────────────────────────────────────────────────────────
const teachDataCache = new Map<string, ExerciseTeachData>();

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useExerciseTeachData(exerciseId: string | null, enabled = true) {
  const [data, setData] = useState<ExerciseTeachData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTeachData = useCallback(async (id: string) => {
    // Check cache first
    const cached = teachDataCache.get(id);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.get<{
        success?: boolean;
        teachData?: ExerciseTeachData;
        message?: string;
      }>(`/api/exercises/${id}/teach-mode`, {
        signal: abortRef.current.signal,
      });

      const json = response.data;
      if (!json.success || !json.teachData) {
        throw new Error(json.message || 'Invalid response');
      }

      const teachData: ExerciseTeachData = json.teachData;
      teachDataCache.set(id, teachData);
      setData(teachData);
      setError(null);
    } catch (err: any) {
      if (
        (err instanceof DOMException && err.name === 'AbortError')
        || err?.name === 'CanceledError'
        || err?.code === 'ERR_CANCELED'
      ) {
        return;
      }
      setError(err?.response?.data?.message || err?.message || 'Failed to load exercise data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when exerciseId changes and hook is enabled
  useEffect(() => {
    if (!exerciseId || !enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    fetchTeachData(exerciseId);

    return () => {
      abortRef.current?.abort();
    };
  }, [exerciseId, enabled, fetchTeachData]);

  const refetch = useCallback(() => {
    if (exerciseId) {
      teachDataCache.delete(exerciseId);
      fetchTeachData(exerciseId);
    }
  }, [exerciseId, fetchTeachData]);

  return { data, isLoading, error, refetch };
}
