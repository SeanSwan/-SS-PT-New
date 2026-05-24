/**
 * useGamificationData Hook
 * ========================
 * React Query orchestration for the SwanStudios gamification dashboard data.
 *
 * Endpoints consumed:
 * - GET /api/v1/gamification/profile
 * - GET /api/v1/gamification/achievements
 * - GET /api/v1/gamification/rewards
 * - GET /api/v1/gamification/leaderboard
 *
 * Data-shape compatibility lives in gamificationMappers.ts so this hook stays
 * focused on fetching, caching, invalidation, and mutation wiring.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import {
  getLevelProgress,
  type LevelProgress,
  type SkillTree,
  type TierName,
} from '../../types/gamification';
import {
  buildEmptyProfile,
  buildFallbackProfile,
  buildLegacyProfile,
  mapAchievementTemplateToLegacy,
  mapFallbackAchievementToLegacy,
} from './gamificationMappers';
import type {
  Achievement,
  GamificationProfile,
  LeaderboardEntry,
  Reward,
} from './gamificationLegacyTypes';
import { logger } from '@/utils/logger';

export type { TierName, SkillTree, LevelProgress };
export type {
  Achievement,
  GamificationProfile,
  LeaderboardEntry,
  Milestone,
  PointTransaction,
  ProgressSnapshot,
  Reward,
  StreakDay,
  UserAchievement,
  UserReward,
} from './gamificationLegacyTypes';
export {
  calculateLevel,
  getLevelProgress,
  getTier,
  pointsForLevel,
  TIER_DISPLAY,
} from '../../types/gamification';

interface UseGamificationDataOptions {
  userId?: string;
}

export const useGamificationData = (options: UseGamificationDataOptions = {}) => {
  const { userId } = options;
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const keys = {
    profile: ['gamification', 'profile', targetUserId],
    achievements: ['gamification', 'achievements'],
    rewards: ['gamification', 'rewards'],
    leaderboard: ['gamification', 'leaderboard'],
  };

  const profileQuery = useQuery({
    queryKey: keys.profile,
    queryFn: async (): Promise<GamificationProfile> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/profile');
        const raw = data?.profile || data;
        if (!raw || typeof raw.points !== 'number') {
          throw new Error('Invalid gamification profile response');
        }
        return buildLegacyProfile({ raw, targetUserId, user });
      } catch (error: any) {
        logger.warn(
          '[Gamification] Primary profile endpoint failed, trying fallback:',
          error.message
        );

        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallback = data?.data;
          if (fallback?.user) {
            return buildFallbackProfile(fallback.user, targetUserId, user);
          }
        } catch (fallbackError) {
          logger.warn('[Gamification] Fallback endpoint also failed:', fallbackError);
        }

        return buildEmptyProfile(targetUserId, user);
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const achievementsQuery = useQuery({
    queryKey: keys.achievements,
    queryFn: async (): Promise<Achievement[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/achievements');
        const rawList: any[] = data?.achievements || data || [];
        return rawList.map(mapAchievementTemplateToLegacy);
      } catch (error: any) {
        logger.warn('[Gamification] Achievements endpoint failed:', error.message);

        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallbackAchievements = data?.data?.achievements || [];
          return fallbackAchievements.map(mapFallbackAchievementToLegacy);
        } catch (fallbackError) {
          logger.warn('[Gamification] Achievements fallback also failed:', fallbackError);
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const rewardsQuery = useQuery({
    queryKey: keys.rewards,
    queryFn: async (): Promise<Reward[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/rewards');
        return data?.rewards || data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const leaderboardQuery = useQuery({
    queryKey: keys.leaderboard,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/leaderboard');
        return data?.leaderboard || data || [];
      } catch {
        return [];
      }
    },
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const levelProgress = useMemo(() => {
    return getLevelProgress(profileQuery.data?.points ?? 0);
  }, [profileQuery.data?.points]);

  const achievementsBySkillTree = useMemo(() => {
    const grouped: Record<string, Achievement[]> = {};
    for (const achievement of achievementsQuery.data || []) {
      const key = achievement.requirementType || 'other';
      grouped[key] = [...(grouped[key] || []), achievement];
    }
    return grouped;
  }, [achievementsQuery.data]);

  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      if (!targetUserId) throw new Error('Cannot redeem reward without an authenticated user');
      const { data } = await authAxios.post(`/api/v1/gamification/users/${targetUserId}/rewards/${rewardId}/redeem`);
      return data;
    },
    onSuccess: (data, rewardId) => {
      queryClient.setQueryData(keys.profile, (oldData: GamificationProfile | undefined) => {
        const reward = rewardsQuery.data?.find((item) => item.id === rewardId);
        if (!oldData || !reward) return oldData;

        return {
          ...oldData,
          points: oldData.points - reward.pointCost,
          rewards: [
            ...oldData.rewards,
            {
              id: Date.now().toString(),
              rewardId: reward.id,
              redeemedAt: new Date().toISOString(),
              status: 'pending' as const,
              pointsCost: reward.pointCost,
              reward,
            },
          ],
          recentTransactions: [
            {
              id: Date.now().toString(),
              points: reward.pointCost,
              balance: oldData.points - reward.pointCost,
              transactionType: 'spend' as const,
              source: 'reward_redemption',
              description: `Reward Redeemed: ${reward.name}`,
              createdAt: new Date().toISOString(),
            },
            ...oldData.recentTransactions,
          ],
        };
      });

      queryClient.setQueryData(keys.rewards, (oldData: Reward[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((reward) =>
          reward.id === rewardId
            ? { ...reward, stock: reward.stock - 1, redemptionCount: reward.redemptionCount + 1 }
            : reward
        );
      });

      toast({
        title: 'Success',
        description: `You've successfully redeemed: ${data?.reward?.name || 'your reward'}`,
        variant: 'default',
      });
    },
    onError: (error: any) => {
      console.error('[Gamification] Error redeeming reward:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error.message || 'Failed to redeem reward.',
        variant: 'destructive',
      });
    },
  });

  const invalidateProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.profile });
  }, [queryClient, keys.profile]);

  const invalidateLeaderboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.leaderboard });
  }, [queryClient, keys.leaderboard]);

  const refetch = useCallback(() => {
    profileQuery.refetch();
    achievementsQuery.refetch();
  }, [profileQuery, achievementsQuery]);

  return {
    profile: profileQuery,
    achievements: achievementsQuery,
    rewards: rewardsQuery,
    leaderboard: leaderboardQuery,
    levelProgress,
    achievementsBySkillTree,
    redeemReward: redeemRewardMutation.mutate,
    isRedeeming: redeemRewardMutation.isPending,
    invalidateProfile,
    invalidateLeaderboard,
    refetch,
    isLoading:
      profileQuery.isLoading ||
      achievementsQuery.isLoading ||
      rewardsQuery.isLoading ||
      leaderboardQuery.isLoading,
    hasError:
      profileQuery.isError ||
      achievementsQuery.isError ||
      rewardsQuery.isError ||
      leaderboardQuery.isError,
    error:
      profileQuery.error ||
      achievementsQuery.error ||
      rewardsQuery.error ||
      leaderboardQuery.error,
  };
};
