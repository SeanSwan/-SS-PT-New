/**
 * ============================================================================
 * FILE: useGhostMode.ts
 * PURPOSE: Custom hook for Ghost Mode data fetching and comparison logic
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches ghost data from the API, manages active/inactive
 * state, and provides comparison results during an active workout.
 *
 * HOW IT FITS IN THE APP: Used by GhostModeBanner to load ghost data and by
 * the workout logger to get real-time comparison deltas.
 *
 * KEY DECISIONS: Uses authAxios from AuthContext (not native fetch) for
 * centralized 401 handling and token refresh flows.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type {
  GhostData,
  GhostResponse,
  GhostComparisonResult,
  GhostConfig,
} from './GhostModeTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const API_BASE = '/api/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

interface UseGhostModeOptions {
  userId: number;
  category?: string;
  autoLoad?: boolean;
}

interface UseGhostModeReturn {
  ghostData: GhostData | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  config: GhostConfig | null;
  comparisonResult: GhostComparisonResult | null;
  toggle: () => void;
  loadGhost: (category?: string) => Promise<void>;
  runComparison: (currentWorkoutData: {
    totalVolume: number;
    exercises: Array<{ name: string; exerciseId?: number; volume: number }>;
  }) => Promise<GhostComparisonResult | null>;
}

export function useGhostMode({ userId, category, autoLoad = false }: UseGhostModeOptions): UseGhostModeReturn {
  const { authAxios } = useAuth();
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GhostConfig | null>(null);
  const [comparisonResult, setComparisonResult] = useState<GhostComparisonResult | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Load ghost config once
  useEffect(() => {
    let cancelled = false;
    authAxios.get(`${API_BASE}/ghost/config`)
      .then(res => {
        if (!cancelled && mountedRef.current) {
          const data = res.data;
          setConfig(data.success ? data.data : data);
        }
      })
      .catch(() => { /* config is optional, don't block */ });
    return () => { cancelled = true; };
  }, [authAxios]);

  const loadGhost = useCallback(async (cat?: string) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cat || category) params.set('category', (cat || category)!);
      const url = `${API_BASE}/users/${userId}/ghost${params.toString() ? `?${params}` : ''}`;

      const res = await authAxios.get(url);
      const response: GhostResponse = res.data.success ? res.data.data : res.data;

      if (mountedRef.current) {
        if (response.hasGhost && response.ghost) {
          setGhostData(response.ghost);
        } else {
          setGhostData(null);
          setError(response.message || 'No ghost data available');
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load ghost');
        setGhostData(null);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [userId, category, authAxios]);

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad && userId) {
      loadGhost();
    }
  }, [autoLoad, userId, loadGhost]);

  // Fix: async loadGhost moved OUT of state updater into a useEffect
  const [pendingActivation, setPendingActivation] = useState(false);

  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev;
      if (next && !ghostData) {
        setPendingActivation(true);
      }
      return next;
    });
  }, [ghostData]);

  // Load ghost data when activation is pending (moved out of state updater)
  useEffect(() => {
    if (pendingActivation) {
      setPendingActivation(false);
      loadGhost();
    }
  }, [pendingActivation, loadGhost]);

  const runComparison = useCallback(async (currentWorkoutData: {
    totalVolume: number;
    exercises: Array<{ name: string; exerciseId?: number; volume: number }>;
  }): Promise<GhostComparisonResult | null> => {
    if (!ghostData || !userId) return null;
    try {
      const res = await authAxios.post(`${API_BASE}/users/${userId}/ghost/compare`, {
        ghostData,
        currentWorkoutData,
      });
      const result: GhostComparisonResult = res.data.success ? res.data.data : res.data;
      if (mountedRef.current) setComparisonResult(result);
      return result;
    } catch {
      return null;
    }
  }, [ghostData, userId, authAxios]);

  return {
    ghostData,
    isActive,
    isLoading,
    error,
    config,
    comparisonResult,
    toggle,
    loadGhost,
    runComparison,
  };
}
