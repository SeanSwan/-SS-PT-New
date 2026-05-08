/**
 * usePlaudIntakeQueue.ts
 * =======================
 * React hook for the unified PLAUD intake queue summary.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listPlaudIntakeItems,
  type PlaudIntakeItem,
  type PlaudIntakeSummary,
} from '../services/plaudIntakeService';
import { PlaudApiError } from '../services/plaudClipService';

const EMPTY_SUMMARY: PlaudIntakeSummary = {
  total: 0,
  actionable: 0,
  today: 0,
  unprocessed: 0,
  processing: 0,
  readyReview: 0,
  needsClarification: 0,
  duplicateHold: 0,
  failed: 0,
  needsClient: 0,
};

export interface PlaudIntakeQueueState {
  items: PlaudIntakeItem[];
  summary: PlaudIntakeSummary;
  isLoading: boolean;
  error: PlaudApiError | null;
  refresh: () => Promise<void>;
}

export function usePlaudIntakeQueue({
  scope = 'actionable',
  limit = 6,
  enabled = true,
}: {
  scope?: string;
  limit?: number;
  enabled?: boolean;
} = {}): PlaudIntakeQueueState {
  const [items, setItems] = useState<PlaudIntakeItem[]>([]);
  const [summary, setSummary] = useState<PlaudIntakeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PlaudApiError | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await listPlaudIntakeItems({ scope, limit });
      if (!isMountedRef.current) return;
      setItems(response.items);
      setSummary(response.summary);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof PlaudApiError && err.code === 'PLAUD_DISABLED') {
        setItems([]);
        setSummary(EMPTY_SUMMARY);
      } else {
        setError(err as PlaudApiError);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [scope, limit, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    items,
    summary,
    isLoading,
    error,
    refresh,
  };
}

export default usePlaudIntakeQueue;
