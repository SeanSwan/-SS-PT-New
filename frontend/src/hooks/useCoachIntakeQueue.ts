/**
 * useCoachIntakeQueue.ts
 * ======================
 * React hook for the unified Swan Coach intake queue summary.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listCoachIntakeItems,
  type CoachIntakeItem,
} from '../services/coachIntakeService';
import type { PlaudIntakeSummary } from '../services/plaudIntakeService';
import { PlaudApiError } from '../services/plaudClipService';

const EMPTY_SUMMARY: PlaudIntakeSummary = {
  total: 0,
  actionable: 0,
  today: 0,
  unprocessed: 0,
  processing: 0,
  readyReview: 0,
  failed: 0,
  needsClient: 0,
};

export interface CoachIntakeQueueState {
  items: CoachIntakeItem[];
  summary: PlaudIntakeSummary;
  isLoading: boolean;
  error: PlaudApiError | null;
  refresh: () => Promise<CoachIntakeItem[]>;
}

export function useCoachIntakeQueue({
  scope = 'actionable',
  limit = 6,
  enabled = true,
}: {
  scope?: string;
  limit?: number;
  enabled?: boolean;
} = {}): CoachIntakeQueueState {
  const [items, setItems] = useState<CoachIntakeItem[]>([]);
  const [summary, setSummary] = useState<PlaudIntakeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PlaudApiError | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refresh = useCallback(async (): Promise<CoachIntakeItem[]> => {
    if (!enabled) {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setError(null);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await listCoachIntakeItems({ scope, limit });
      const nextItems = response.items || [];
      if (!isMountedRef.current) return nextItems;
      setItems(nextItems);
      setSummary(response.summary);
      return nextItems;
    } catch (err) {
      if (!isMountedRef.current) return [];
      setError(err as PlaudApiError);
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      return [];
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [scope, limit, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, summary, isLoading, error, refresh };
}

export default useCoachIntakeQueue;
