/**
 * FILE: useGhostMode.ts
 * PURPOSE: Fetch ghost-mode state through authAxios with safe user paths.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { GAMIFICATION_SAFE_ERROR_COPY, getGamificationUserPath } from '../../utils/gamificationPath';
import type {
  GhostComparisonResult,
  GhostConfig,
  GhostData,
  GhostResponse,
} from './GhostModeTypes';

const API_BASE = '/api/gamification';

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

const unwrapGamificationPayload = <T,>(payload: unknown): T => {
  const envelope = payload as { success?: unknown; data?: unknown } | null | undefined;
  if (envelope?.success === false) {
    throw new Error('Gamification request failed');
  }
  return (envelope?.success === true ? envelope.data : payload) as T;
};

export function useGhostMode({ userId, category, autoLoad = false }: UseGhostModeOptions): UseGhostModeReturn {
  const { authAxios } = useAuth();
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GhostConfig | null>(null);
  const [comparisonResult, setComparisonResult] = useState<GhostComparisonResult | null>(null);
  const [pendingActivation, setPendingActivation] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    authAxios.get(`${API_BASE}/ghost/config`)
      .then((res) => {
        if (!cancelled && mountedRef.current) {
          setConfig(unwrapGamificationPayload<GhostConfig>(res.data));
        }
      })
      .catch(() => {
        // Config is optional for the mounted preview.
      });

    return () => {
      cancelled = true;
    };
  }, [authAxios]);

  const loadGhost = useCallback(async (cat?: string) => {
    const params = new URLSearchParams();
    if (cat || category) params.set('category', (cat || category)!);
    const query = params.toString();
    const ghostPath = getGamificationUserPath(userId, `/ghost${query ? `?${query}` : ''}`);

    if (!ghostPath) {
      setIsLoading(false);
      setError(null);
      setGhostData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}${ghostPath}`;
      const res = await authAxios.get(url);
      const response = unwrapGamificationPayload<GhostResponse>(res.data);

      if (!mountedRef.current) return;

      if (response.hasGhost && response.ghost) {
        setGhostData(response.ghost);
      } else {
        setGhostData(null);
        setError('No ghost data available yet.');
      }
    } catch {
      if (mountedRef.current) {
        setError(GAMIFICATION_SAFE_ERROR_COPY);
        setGhostData(null);
        setComparisonResult(null);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [userId, category, authAxios]);

  useEffect(() => {
    if (autoLoad && getGamificationUserPath(userId, '/ghost')) {
      loadGhost();
    }
  }, [autoLoad, userId, loadGhost]);

  const toggle = useCallback(() => {
    setIsActive((previous) => {
      const next = !previous;
      if (next && !ghostData) {
        setPendingActivation(true);
      }
      return next;
    });
  }, [ghostData]);

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
    const comparePath = getGamificationUserPath(userId, '/ghost/compare');
    if (!ghostData || !comparePath) return null;

    try {
      const res = await authAxios.post(`${API_BASE}${comparePath}`, {
        ghostData,
        currentWorkoutData,
      });
      const result = unwrapGamificationPayload<GhostComparisonResult>(res.data);
      if (mountedRef.current) setComparisonResult(result);
      return result;
    } catch {
      if (mountedRef.current) {
        setComparisonResult(null);
        setError(GAMIFICATION_SAFE_ERROR_COPY);
      }
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
