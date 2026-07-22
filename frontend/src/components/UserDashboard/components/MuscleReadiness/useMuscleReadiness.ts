/**
 * FILE: useMuscleReadiness.ts
 * PURPOSE: Auto-query the CC-1 muscle-readiness board on client-home mount.
 *          Read-only ambient — the trainer makes the call (indispensability law).
 *          Mirrors useRestoreToday: no client cache, every mount re-queries.
 * SOURCE TRUTH: GET /api/recovery/readiness → deterministic training-log ESTIMATE
 *          (no LLM). UI must carry the 'Recovery estimate' label.
 */
import { useEffect, useRef, useState } from 'react';
import apiService from '../../../../services/api.service';
import { logger } from '../../../../utils/logger';

export type ReadinessState = 'ready' | 'caution' | 'loading';

export interface ReadinessGroup {
  group: string;
  pct: number;
  state: ReadinessState;
  lastTrainedLocalDate: string | null;
}

export interface ReadinessBoard {
  source: 'training-log-estimate';
  todayLocalDate: string;
  groups: ReadinessGroup[];
}

interface ReadinessResponse {
  success: boolean;
  data: ReadinessBoard;
}

export interface MuscleReadinessHookState {
  board: ReadinessBoard | null;
  loading: boolean;
  error: boolean;
}

export function useMuscleReadiness(enabled: boolean): MuscleReadinessHookState {
  const [board, setBoard] = useState<ReadinessBoard | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(enabled));
  const [error, setError] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    cancelledRef.current = false;
    setLoading(true);
    setError(false);

    apiService.get<ReadinessResponse>('/api/recovery/readiness')
      .then((response) => {
        if (cancelledRef.current) return;
        if (response?.data?.success && response.data.data) {
          setBoard(response.data.data);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        logger.warn('muscle readiness fetch failed', { message: (err as Error)?.message });
        setError(true);
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });

    return () => { cancelledRef.current = true; };
  }, [enabled]);

  return { board, loading, error };
}
