/**
 * useUserChallenges Hook
 * =======================
 * Fetches user challenges from /api/v1/gamification/users/:userId/challenges
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export interface UserChallenge {
  id: number;
  userId: number;
  isCompleted: boolean;
  joinedAt: string;
  challenge: {
    id: number;
    title: string;
    description?: string;
    creator?: string;
    type?: string;
    difficulty?: string;
  };
}

interface UseUserChallengesReturn {
  challenges: UserChallenge[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserChallenges = (userId?: number): UseUserChallengesReturn => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchChallenges = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(`/api/v1/gamification/users/${targetUserId}/challenges`);

      if (response.data.success) {
        setChallenges(response.data.challenges || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch challenges');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return { challenges, loading, error, refetch: fetchChallenges };
};

export default useUserChallenges;
