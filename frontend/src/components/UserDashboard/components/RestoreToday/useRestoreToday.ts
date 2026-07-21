/**
 * FILE: useRestoreToday.ts
 * PURPOSE: Auto-query the Restore composition on client-home mount; persist
 *          ritual completions with optimistic checks (server is the truth —
 *          idempotent per client/local-day/exercise).
 * SPEC: RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md (Kimi H6/H8: no client
 *       cache — every mount re-queries so a 9pm logged workout flips the
 *       day-state on next load).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../../services/api.service';
import { logger } from '../../../../utils/logger';
import type {
  RestoreBlockKey,
  RestoreItem,
  RestoreTodayData,
  RestoreTodayState,
} from './RestoreCard.types';

interface RestoreTodayResponse {
  success: boolean;
  data: RestoreTodayData;
}

interface RestoreCompleteResponse {
  success: boolean;
  data: { exerciseId: string; alreadyCompleted: boolean; xpAwarded: number; levelUp: boolean };
}

export function useRestoreToday(enabled: boolean): RestoreTodayState {
  const [data, setData] = useState<RestoreTodayData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(enabled));
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [lastXpAwarded, setLastXpAwarded] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    cancelledRef.current = false;
    setLoading(true);
    setError(false);

    apiService.get<RestoreTodayResponse>('/api/recovery/today')
      .then((response) => {
        if (cancelledRef.current) return;
        const payload = response.data?.data;
        if (!payload) throw new Error('empty restore payload');
        setData(payload);
        setCompleted(new Set(payload.completedExerciseIds || []));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        logger.warn('Restore panel fetch failed', { message: (err as Error)?.message });
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, reloadToken]);

  const completeItem = useCallback(async (item: RestoreItem, blockKey: RestoreBlockKey) => {
    // Optimistic check; rolled back on failure. Server unique key makes repeats safe.
    setCompleted((current) => new Set(current).add(item.exerciseId));
    try {
      const response = await apiService.post<RestoreCompleteResponse>('/api/recovery/complete', {
        exerciseId: item.exerciseId,
        blockKey,
        dataSources: item.dataSources,
      });
      const result = response.data?.data;
      if (result && !result.alreadyCompleted && result.xpAwarded > 0) {
        setLastXpAwarded(result.xpAwarded);
      }
    } catch (err) {
      logger.warn('Restore completion failed', { message: (err as Error)?.message });
      setCompleted((current) => {
        const next = new Set(current);
        next.delete(item.exerciseId);
        return next;
      });
    }
  }, []);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, error, completed, completeItem, retry, lastXpAwarded };
}

export default useRestoreToday;
