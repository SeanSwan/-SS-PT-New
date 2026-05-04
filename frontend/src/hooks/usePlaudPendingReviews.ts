/**
 * usePlaudPendingReviews.ts
 * ==========================
 * React hook for the failsafe-resume surface: lists trainer's pending
 * merge_requests so they can pick up after browser-close / power-outage.
 *
 * Phase 3 Slice 3.10 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.5.
 *
 * Filters out approved + discarded by default — those don't need the
 * trainer's attention. Surfaces processing/completed/failed so the
 * trainer sees:
 *   - in-flight merges (processing, may stall)
 *   - awaiting review (completed)
 *   - interrupted (failed with MERGE_PROCESSING_STALE or other code)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listMergeRequests,
  getMergeRequest,
  discardMergeRequest,
  type MergeRequestSummary,
  type MergeRequestDetail,
} from '../services/plaudMergeService';
import { PlaudApiError } from '../services/plaudClipService';

const DEFAULT_STATUS_FILTER = 'processing,completed,failed';

export interface PlaudPendingReviewsState {
  reviews: MergeRequestSummary[];
  isLoading: boolean;
  error: PlaudApiError | null;
  refresh: () => Promise<void>;
  loadDetail: (mergeRequestId: string) => Promise<MergeRequestDetail | null>;
  discard: (mergeRequestId: string) => Promise<void>;
}

export function usePlaudPendingReviews({
  statusFilter = DEFAULT_STATUS_FILTER,
  limit = 20,
}: {
  statusFilter?: string;
  limit?: number;
} = {}): PlaudPendingReviewsState {
  const [reviews, setReviews] = useState<MergeRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<PlaudApiError | null>(null);

  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { mergeRequests } = await listMergeRequests({ status: statusFilter, limit });
      if (!isMountedRef.current) return;
      setReviews(mergeRequests);
    } catch (err) {
      if (!isMountedRef.current) return;
      // PLAUD_DISABLED: empty list, no error
      if (err instanceof PlaudApiError && err.code === 'PLAUD_DISABLED') {
        setReviews([]);
      } else {
        setError(err as PlaudApiError);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [statusFilter, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadDetail = useCallback(async (mergeRequestId: string): Promise<MergeRequestDetail | null> => {
    try {
      const { mergeRequest } = await getMergeRequest(mergeRequestId);
      return mergeRequest;
    } catch (err) {
      // 410 MERGE_CIPHER_PURGED is expected when 24h TTL hit; surface
      // gracefully via error state rather than throwing.
      if (isMountedRef.current) setError(err as PlaudApiError);
      return null;
    }
  }, []);

  const discard = useCallback(async (mergeRequestId: string): Promise<void> => {
    // Optimistic remove
    setReviews((prev) => prev.filter((r) => r.mergeRequestId !== mergeRequestId));
    try {
      await discardMergeRequest(mergeRequestId);
    } catch (err) {
      await refresh();
      if (isMountedRef.current) setError(err as PlaudApiError);
    }
  }, [refresh]);

  return {
    reviews,
    isLoading,
    error,
    refresh,
    loadDetail,
    discard,
  };
}

export default usePlaudPendingReviews;
