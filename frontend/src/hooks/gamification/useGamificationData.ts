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
import { getLevelProgress, type LevelProgress, type SkillTree, type TierName } from '../../types/gamification';
import {
  buildFallbackProfile,
  buildLegacyProfile,
  mapAchievementTemplatesToLegacy,
  mapFallbackAchievementsToLegacy,
} from './gamificationMappers';
import type { Achievement, GamificationProfile, LeaderboardEntry, Reward } from './gamificationLegacyTypes';
import {
  buildRewardRedemptionProof,
  buildRewardRedemptionCachePatch,
  getSafeGamificationRewardSuccessDescription,
  getSafeGamificationRewardTransactionDescription,
  getSafeGamificationIdSegment,
  getSafeGamificationToastDescription,
} from './gamificationRewardRedemption';
import { asGamificationCollection } from './gamificationMapperGuards';
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

interface UseGamificationDataOptions { userId?: string; }
export { getSafeGamificationIdSegment, getSafeGamificationToastDescription };

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
      } catch {
        logger.warn('[Gamification] Primary profile endpoint failed; trying fallback.');

        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallback = data?.data;
          if (fallback?.user) {
            return buildFallbackProfile(fallback.user, targetUserId, user);
          }
        } catch {
          logger.warn('[Gamification] Fallback endpoint also failed.');
        }

        throw new Error('Gamification profile unavailable');
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
        const rawList = asGamificationCollection<unknown>(data, 'achievements');
        return mapAchievementTemplatesToLegacy(rawList);
      } catch {
        logger.warn('[Gamification] Achievements endpoint failed; trying fallback.');

        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallbackAchievements = asGamificationCollection<unknown>(data?.data, 'achievements');
          return mapFallbackAchievementsToLegacy(fallbackAchievements);
        } catch {
          logger.warn('[Gamification] Achievements fallback also failed.');
          // Returning [] here made React Query record SUCCESS with an empty
          // list, so `isError` stayed false and NO consumer could tell an
          // outage from "you have earned nothing". Rethrow so the query is
          // actually in an error state and resolveDataStatus can see it.
          throw new Error('Achievements unavailable');
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
        return asGamificationCollection<Reward>(data, 'rewards', { idKeys: ['id', 'rewardId'] });
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
        return asGamificationCollection<LeaderboardEntry>(data, 'leaderboard', {
          idKeys: ['id', 'userId', '_id'],
          recordKeys: ['client', 'user'],
          numberKeys: ['points', 'totalPoints', 'score', 'overallLevel', 'level'],
        });
      } catch {
        return [];
      }
    },
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const levelProgress = useMemo(() => {
    return getLevelProgress(profileQuery.data?.lifetimePointsEarned ?? profileQuery.data?.points ?? 0);
  }, [profileQuery.data?.lifetimePointsEarned, profileQuery.data?.points]);

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
      const userIdSegment = getSafeGamificationIdSegment(targetUserId);
      const rewardIdSegment = getSafeGamificationIdSegment(rewardId);
      if (!userIdSegment || !rewardIdSegment) throw new Error('Invalid reward redemption request');
      const { data } = await authAxios.post(`/api/v1/gamification/users/${userIdSegment}/rewards/${rewardIdSegment}/redeem`);
      if (data?.success === false) throw new Error('Reward redemption failed');
      return data;
    },
    onSuccess: (data, rewardId) => {
      const reward = rewardsQuery.data?.find((item) => item.id === rewardId);
      const cachePatch = buildRewardRedemptionCachePatch(reward);
      const redemptionProof = buildRewardRedemptionProof(data, rewardId);
      const currentPoints = Number(profileQuery.data?.points);
      const rawPointCost = redemptionProof?.pointsCost ?? cachePatch?.pointCost;
      const pointCost = typeof rawPointCost === 'number' && Number.isFinite(rawPointCost) ? rawPointCost : null;

      if (
        !reward
        || !cachePatch
        || !redemptionProof
        || redemptionProof.rewardId !== reward.id
        || !Number.isFinite(currentPoints)
        || pointCost === null
        || currentPoints < pointCost
      ) {
        queryClient.invalidateQueries({ queryKey: keys.profile });
        queryClient.invalidateQueries({ queryKey: keys.rewards });
      } else {
        const nextBalance = currentPoints - pointCost;

        queryClient.setQueryData(keys.profile, (oldData: GamificationProfile | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            points: nextBalance,
            rewards: [
              ...oldData.rewards,
              {
                id: redemptionProof.id,
                rewardId: redemptionProof.rewardId,
                redeemedAt: redemptionProof.redeemedAt,
                status: redemptionProof.status,
                pointsCost: pointCost,
                reward,
              },
            ],
            recentTransactions: [
              {
                id: `reward-redemption-${redemptionProof.id}`,
                points: pointCost,
                balance: nextBalance,
                transactionType: 'spend' as const,
                source: 'reward_redemption',
                description: getSafeGamificationRewardTransactionDescription(reward.name),
                createdAt: redemptionProof.redeemedAt,
              },
              ...oldData.recentTransactions,
            ],
          };
        });

        queryClient.setQueryData(keys.rewards, (oldData: Reward[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((item) =>
            item.id === rewardId
              ? {
                  ...item,
                  stock: cachePatch.nextStock,
                  redemptionCount: cachePatch.nextRedemptionCount,
                }
              : item
          );
        });
      }

      toast({
        title: 'Success',
        description: getSafeGamificationRewardSuccessDescription(data?.reward?.name, reward?.name),
        variant: 'default',
      });
    },
    onError: (error: unknown) => {
      logger.warn('[Gamification] Reward redemption failed.');
      toast({
        title: 'Error',
        description: getSafeGamificationToastDescription(error),
        variant: 'destructive',
      });
    },
  });

  const invalidateProfile = useCallback(() => queryClient.invalidateQueries({ queryKey: keys.profile }), [queryClient, keys.profile]);

  const invalidateLeaderboard = useCallback(() => queryClient.invalidateQueries({ queryKey: keys.leaderboard }), [queryClient, keys.leaderboard]);

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
    isLoading: [profileQuery, achievementsQuery, rewardsQuery, leaderboardQuery].some((query) => query.isLoading),
    hasError: [profileQuery, achievementsQuery, rewardsQuery, leaderboardQuery].some((query) => query.isError),
    error: profileQuery.error || achievementsQuery.error || rewardsQuery.error || leaderboardQuery.error,
  };
};
