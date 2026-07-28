/**
 * useChallenges Hook
 * ==================
 * Fetches live challenge records and merges authenticated user participation
 * data for the dashboard-mounted Challenges tab. API failures render a safe
 * retryable unavailable state; this hook never manufactures challenge cards.
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';
import { logger } from '@/utils/logger';

import type { Challenge } from './useChallenges.normalization';
import { normalizeChallengeRecords } from './useChallenges.normalization';
export {
  normalizeChallengeForDashboard,
  normalizeChallengeRecords,
} from './useChallenges.normalization';
export type {
  Challenge,
  ChallengeCategory,
  ChallengeStatus,
  ChallengeWorkoutImpact,
} from './useChallenges.normalization';

interface UseChallengesReturn {
  challenges: Challenge[];
  loading: boolean;
  error: string | null;
  isDemoData: boolean;
  joinChallenge: (id: string) => Promise<boolean>;
  leaveChallenge: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const CHALLENGE_LIST_UNAVAILABLE_MESSAGE = 'Challenge list unavailable. Refresh to try again.';

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export function useChallenges(): UseChallengesReturn {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allRes = await apiService.get('/api/v1/gamification/challenges', {
        params: { status: 'all', limit: 50 },
      });

      if (!allRes.data?.success) {
        throw new Error(allRes.data?.message || 'Failed to fetch challenges');
      }

      const apiChallenges = asArray(allRes.data.challenges || allRes.data.data?.challenges);
      let participations: unknown[] = [];

      if (user?.id) {
        try {
          const userRes = await apiService.get(
            `/api/v1/gamification/users/${user.id}/challenges`,
            { params: { status: 'all', limit: 100 } }
          );

          if (userRes.data?.success) {
            participations = asArray(userRes.data.challenges || userRes.data.data?.challenges);
          }
        } catch {
          // Non-critical: public challenges still render without personal progress.
        }
      }

      setChallenges(normalizeChallengeRecords(apiChallenges, participations));
      setIsDemoData(false);
    } catch (err: any) {
      logger.warn('[useChallenges] API unavailable, showing retry state:', err.message);
      setChallenges([]);
      setIsDemoData(false);
      setError(CHALLENGE_LIST_UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const joinChallenge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiService.post(`/api/v1/gamification/challenges/${id}/join`);
      if (res.data?.success) {
        await fetchChallenges();
        return true;
      }
      return false;
    } catch (err: any) {
      logger.warn('[useChallenges] Join failed:', err.message);
      return false;
    }
  }, [fetchChallenges]);

  const leaveChallenge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiService.delete(`/api/v1/gamification/challenges/${id}/leave`);
      if (res.data?.success) {
        await fetchChallenges();
        return true;
      }
      return false;
    } catch (err: any) {
      logger.warn('[useChallenges] Leave failed:', err.message);
      return false;
    }
  }, [fetchChallenges]);

  return { challenges, loading, error, isDemoData, joinChallenge, leaveChallenge, refetch: fetchChallenges };
}

export default useChallenges;
