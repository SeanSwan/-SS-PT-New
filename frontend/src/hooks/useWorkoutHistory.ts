/**
 * useWorkoutHistory Hook
 * ======================
 * Fetches recent workout history for a client.
 */

import { useState, useEffect, useCallback } from 'react';

export interface WorkoutHistoryEntry {
  id: string | number;
  name: string;
  date: string;
  duration?: string | null;
  exercises?: number;
  type?: string;
}

interface UseWorkoutHistoryResult {
  data: WorkoutHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkoutHistory(userId?: number, limit = 5): UseWorkoutHistoryResult {
  const [data, setData] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workouts/${userId}/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch workout history');
        setData([]);
      } else {
        setData(Array.isArray(result.data) ? result.data : []);
      }
    } catch (err) {
      console.error('Error fetching workout history:', err);
      setError('Network error fetching workout history');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchHistory
  };
}

export default useWorkoutHistory;
