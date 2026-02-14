/**
 * useGamificationProfile Hook
 * ============================
 * Fetches user gamification profile from /api/v1/gamification/users/:userId/profile
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export interface GamificationProfile {
  points: number;
  level: number;
  tier: string;
  streakDays: number;
  totalWorkouts: number;
  totalExercises: number;
  nextLevelProgress?: number;
  achievements?: any[];
  rewards?: any[];
  milestones?: any[];
}

interface UseGamificationProfileReturn {
  profile: GamificationProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useGamificationProfile = (userId?: number): UseGamificationProfileReturn => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(`/api/v1/gamification/users/${targetUserId}/profile`);

      if (response.data.success) {
        setProfile(response.data.profile);
      } else {
        throw new Error(response.data.message || 'Failed to fetch gamification profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load gamification profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
};

export default useGamificationProfile;
