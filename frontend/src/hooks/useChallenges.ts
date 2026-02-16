/**
 * useChallenges Hook
 * ==================
 * Fetches challenges from /api/v1/gamification/challenges and merges
 * with user participation data. Falls back to empty state if API
 * unavailable (e.g., migration not yet run).
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';

/* ─── Types matching ChallengesView ────────────────── */

export type ChallengeStatus = 'active' | 'upcoming' | 'completed';
export type ChallengeCategory = 'strength' | 'cardio' | 'consistency' | 'social';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  progress: number;       // 0-100
  participants: number;
  daysLeft?: number;
  startsIn?: string;
  reward: string;
  joined: boolean;
}

interface UseChallengesReturn {
  challenges: Challenge[];
  loading: boolean;
  error: string | null;
  isDemoData: boolean;
  joinChallenge: (id: string) => Promise<void>;
  leaveChallenge: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/* ─── Category mapping ─────────────────────────────── */

const CATEGORY_MAP: Record<string, ChallengeCategory> = {
  fitness: 'strength',
  nutrition: 'cardio',
  mindfulness: 'consistency',
  social: 'social',
  streak: 'consistency',
};

/* ─── Helpers ──────────────────────────────────────── */

function mapCategory(backendCategory: string): ChallengeCategory {
  return CATEGORY_MAP[backendCategory] || 'strength';
}

function deriveStatus(apiStatus: string, startDate: string, endDate: string): ChallengeStatus {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (apiStatus === 'completed' || apiStatus === 'archived') return 'completed';
  if (apiStatus === 'draft' || start > now) return 'upcoming';
  if (end < now) return 'completed';
  return 'active';
}

function computeDaysLeft(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function computeStartsIn(startDate: string): string {
  const diff = new Date(startDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'soon';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function formatReward(xpReward?: number, badgeName?: string): string {
  const parts: string[] = [];
  if (xpReward) parts.push(`${xpReward} XP`);
  if (badgeName) parts.push(badgeName);
  return parts.length > 0 ? parts.join(' + ') : 'XP Reward';
}

/* ─── Hook ─────────────────────────────────────────── */

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
      // Fetch all challenges (public endpoint, no auth required)
      const allRes = await apiService.get('/api/v1/gamification/challenges', {
        params: { status: 'all', limit: 50 },
      });

      if (!allRes.data?.success) {
        throw new Error(allRes.data?.message || 'Failed to fetch challenges');
      }

      const apiChallenges = allRes.data.challenges || [];

      // Fetch user participations if logged in
      let userParticipationIds = new Set<number>();
      let userProgressMap = new Map<number, number>();

      if (user?.id) {
        try {
          const userRes = await apiService.get(
            `/api/v1/gamification/users/${user.id}/challenges`,
            { params: { status: 'all', limit: 100 } }
          );

          if (userRes.data?.success) {
            const participations = userRes.data.challenges || [];
            for (const p of participations) {
              const challengeId = p.challengeId || p.challenge?.id;
              if (challengeId) {
                userParticipationIds.add(challengeId);
                userProgressMap.set(challengeId, p.progress || p.progressPercentage || 0);
              }
            }
          }
        } catch {
          // Non-critical — we just won't know joined/progress
        }
      }

      // Map API data to frontend interface
      const mapped: Challenge[] = apiChallenges
        .filter((c: any) => c.status !== 'cancelled')
        .map((c: any) => {
          const status = deriveStatus(c.status, c.startDate, c.endDate);
          const joined = userParticipationIds.has(c.id);
          const progress = joined ? (userProgressMap.get(c.id) || 0) : 0;

          const challenge: Challenge = {
            id: String(c.id),
            title: c.title,
            description: c.description || '',
            category: mapCategory(c.category),
            status,
            progress,
            participants: c.currentParticipants || 0,
            reward: formatReward(c.xpReward, c.badgeName),
            joined,
          };

          if (status === 'active') {
            challenge.daysLeft = computeDaysLeft(c.endDate);
          } else if (status === 'upcoming') {
            challenge.startsIn = computeStartsIn(c.startDate);
          }

          return challenge;
        });

      setChallenges(mapped);
      setIsDemoData(false);
    } catch (err: any) {
      console.warn('[useChallenges] API unavailable, falling back to empty state:', err.message);
      setChallenges([]);
      setIsDemoData(true);
      setError(null); // Don't show error — just flag as demo
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const joinChallenge = useCallback(async (id: string) => {
    try {
      const res = await apiService.post(`/api/v1/gamification/challenges/${id}/join`);
      if (res.data?.success) {
        await fetchChallenges(); // Refresh data
      }
    } catch (err: any) {
      console.error('[useChallenges] Join failed:', err.message);
    }
  }, [fetchChallenges]);

  const leaveChallenge = useCallback(async (id: string) => {
    try {
      const res = await apiService.delete(`/api/v1/gamification/challenges/${id}/leave`);
      if (res.data?.success) {
        await fetchChallenges();
      }
    } catch (err: any) {
      console.error('[useChallenges] Leave failed:', err.message);
    }
  }, [fetchChallenges]);

  return { challenges, loading, error, isDemoData, joinChallenge, leaveChallenge, refetch: fetchChallenges };
}

export default useChallenges;
