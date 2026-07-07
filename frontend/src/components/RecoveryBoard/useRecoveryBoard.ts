/**
 * useRecoveryBoard.ts — self-fetching hook for the Recovery Board (4B.4)
 * ========================================================================
 * GET /api/client/analytics/recovery-board (background request — never pops
 * the global paywall from a passive rail card) + POST completion with an
 * optimistic done-latch that reverts on failure (truthful states only).
 */
import { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api.service';

export interface RecoveryBoardItem {
  key: string;
  name: string;
  step: 'inhibit' | 'lengthen' | 'activate' | 'integrate';
  region: string | null;
  durationSec: number | null;
  reason: string | null;
}

export interface RecoveryBoardPayload {
  status: 'ready' | 'no-assessment';
  smrTargets: RecoveryBoardItem[];
  stretches: RecoveryBoardItem[];
  mobilityDrills: RecoveryBoardItem[];
  syndromeFocus: string[];
  cautionRegions: string[];
  intensityNote: string | null;
  daysSinceLastRecovery: number | null;
  starterMessage: string | null;
  disclaimers: string[];
}

export type RecoveryBoardStatus = 'loading' | 'ready' | 'no-assessment' | 'error';

export interface UseRecoveryBoardResult {
  status: RecoveryBoardStatus;
  board: RecoveryBoardPayload | null;
  completedKeys: Set<string>;
  completing: string | null;
  complete: (exerciseKey: string) => Promise<void>;
  refetch: () => void;
}

export function useRecoveryBoard(): UseRecoveryBoardResult {
  const [status, setStatus] = useState<RecoveryBoardStatus>('loading');
  const [board, setBoard] = useState<RecoveryBoardPayload | null>(null);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    apiService
      .get('/api/client/analytics/recovery-board', { _isBackgroundRequest: true } as never)
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data?.board as RecoveryBoardPayload | undefined;
        if (!payload) {
          setStatus('error');
          return;
        }
        setBoard(payload);
        setStatus(payload.status === 'ready' ? 'ready' : 'no-assessment');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const complete = useCallback(async (exerciseKey: string) => {
    setCompleting(exerciseKey);
    // Optimistic latch — reverted on failure so a failed POST never fakes a ✓.
    setCompletedKeys((prev) => new Set(prev).add(exerciseKey));
    try {
      await apiService.post('/api/client/analytics/recovery-board/complete', { exerciseKey });
    } catch {
      setCompletedKeys((prev) => {
        const next = new Set(prev);
        next.delete(exerciseKey);
        return next;
      });
    } finally {
      setCompleting(null);
    }
  }, []);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { status, board, completedKeys, completing, complete, refetch };
}

export default useRecoveryBoard;
