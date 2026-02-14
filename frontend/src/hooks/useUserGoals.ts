/**
 * useUserGoals Hook
 * ==================
 * Fetches user goals from /api/v1/gamification/users/:userId/goals
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export interface UserGoal {
  id: number;
  userId: number;
  title: string;
  description?: string;
  category?: string;
  targetValue?: number;
  currentValue?: number;
  progress?: number;
  status?: string;
  deadline?: string;
}

interface GoalsSummary {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
}

interface UseUserGoalsReturn {
  goals: UserGoal[];
  summary: GoalsSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserGoals = (userId?: number): UseUserGoalsReturn => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchGoals = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(`/api/v1/gamification/users/${targetUserId}/goals`);

      if (response.data.success) {
        setGoals(response.data.goals || []);
        setSummary(response.data.summary || null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch goals');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return { goals, summary, loading, error, refetch: fetchGoals };
};

export default useUserGoals;
