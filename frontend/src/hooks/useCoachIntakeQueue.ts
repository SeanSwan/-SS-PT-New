/**
 * useCoachIntakeQueue.ts
 * ======================
 * React hook for the unified Swan Coach intake queue summary.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCoachIntakeHealth,
  type CoachIntakeHealth,
  getCoachIntakeRetention,
  type CoachIntakeRetention,
  getCoachIntakeRetentionPurgePlan,
  type CoachIntakeRetentionPurgePlan,
  listCoachIntakeItems,
  type CoachIntakeItem,
} from '../services/coachIntakeService';
import { subscribeCoachProposalActions } from '../services/coachProposalActionEvents';
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
  preparedDrafts: 0,
  pendingDrafts: 0,
  applyingDrafts: 0,
  approvedDrafts: 0,
  appliedDrafts: 0,
  rejectedDrafts: 0,
  failedDrafts: 0,
};

export interface CoachIntakeQueueState {
  items: CoachIntakeItem[];
  summary: PlaudIntakeSummary;
  isLoading: boolean;
  error: PlaudApiError | null;
  health: CoachIntakeHealth | null;
  retention: CoachIntakeRetention | null;
  retentionPurgePlan: CoachIntakeRetentionPurgePlan | null;
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
  const [health, setHealth] = useState<CoachIntakeHealth | null>(null);
  const [retention, setRetention] = useState<CoachIntakeRetention | null>(null);
  const [retentionPurgePlan, setRetentionPurgePlan] = useState<CoachIntakeRetentionPurgePlan | null>(null);
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
      setHealth(null);
      setRetention(null);
      setRetentionPurgePlan(null);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const [response, healthResult, retentionResult, purgePlanResult] = await Promise.all([
        listCoachIntakeItems({ scope, limit }),
        getCoachIntakeHealth().catch(() => null),
        getCoachIntakeRetention().catch(() => null),
        getCoachIntakeRetentionPurgePlan().catch(() => null),
      ]);
      const nextItems = response.items || [];
      if (!isMountedRef.current) return nextItems;
      setItems(nextItems);
      setSummary(response.summary);
      setHealth(healthResult);
      setRetention(retentionResult);
      setRetentionPurgePlan(purgePlanResult);
      return nextItems;
    } catch (err) {
      if (!isMountedRef.current) return [];
      setError(err as PlaudApiError);
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setHealth(null);
      setRetention(null);
      setRetentionPurgePlan(null);
      return [];
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [scope, limit, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeCoachProposalActions(() => {
      void refresh();
    });
  }, [enabled, refresh]);

  return { items, summary, isLoading, error, health, retention, retentionPurgePlan, refresh };
}

export default useCoachIntakeQueue;
