/**
 * useClientStats Hook
 * ===================
 * Fetches lightweight client stats summary for dashboard cards.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ClientStatsSummary {
  totalWorkouts: number;
  sleepAvg: number | null;
  goalConsistency: number | null;
}

interface UseClientStatsResult {
  data: ClientStatsSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * @param userId - The user ID to fetch stats for
 * @param isClient - Optional flag to indicate if the target user is a client.
 *                   If explicitly false, skips API call (prevents 404 for non-client users).
 */
export function useClientStats(userId?: number, isClient?: boolean): UseClientStatsResult {
  const [data, setData] = useState<ClientStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    // Skip API call if no userId or if explicitly marked as non-client
    if (!userId || isClient === false) {
      setIsLoading(false);
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/stats/${userId}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch client stats');
        setData(null);
      } else {
        setData(result.data || null);
      }
    } catch (err) {
      console.error('Error fetching client stats:', err);
      setError('Network error fetching client stats');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isClient]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats
  };
}

export default useClientStats;
