/**
 * useCurrentWorkout Hook
 * ======================
 * Fetches the client's current active workout plan
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import { useState, useEffect, useCallback } from 'react';

// API Base URL for production/development compatibility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

interface Exercise {
  id: string | number;
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  videoUrl?: string;
}

interface WorkoutDay {
  id: string | number;
  dayNumber: number;
  name: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  durationWeeks: number;
  difficulty?: number;
  tags: string[];
  days: WorkoutDay[];
  frequency: string;
  duration: string;
}

interface UseCurrentWorkoutResult {
  data: WorkoutPlan | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * @param userId - The user ID to fetch workout for
 * @param isClient - Optional flag to indicate if the target user is a client.
 *                   If explicitly false, skips API call (prevents 404 for non-client users).
 */
export function useCurrentWorkout(userId?: number, isClient?: boolean): UseCurrentWorkoutResult {
  const [data, setData] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkout = useCallback(async () => {
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
      const response = await fetch(`${API_BASE_URL}/api/workouts/${userId}/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        // If no plan exists, that's okay - not an error
        if (response.status === 200 && result.data === null) {
          setData(null);
        } else {
          setError(result?.message || 'Failed to fetch workout plan');
        }
      } else {
        setData(result.data);
      }
    } catch (err) {
      console.error('Error fetching workout:', err);
      setError('Network error fetching workout plan');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isClient]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchWorkout
  };
}

export default useCurrentWorkout;
