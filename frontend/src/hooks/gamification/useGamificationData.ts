/**
 * useGamificationData Hook
 * ========================
 * React Query-based hook for fetching and caching gamification data.
 *
 * Architecture:
 *   AuthContext (authAxios) -> React Query -> API endpoints -> Cached state
 *
 * Endpoints consumed:
 *   GET /api/v1/gamification/profile       -> user level, tier, points, stats
 *   GET /api/v1/gamification/achievements  -> user's earned achievements w/ progress
 *   GET /api/v1/gamification/achievements/available -> all available achievement templates
 *
 * Backward compatibility:
 *   This hook preserves the same return shape as the previous mock-data version
 *   so that existing consumers (client-gamification-view-enhanced, SocialPage,
 *   useSocialFeed, etc.) continue to work without modification.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import { useCallback, useMemo } from 'react';
import {
  type TierName,
  type SkillTree,
  type UserAchievement as NewUserAchievement,
  type GamificationProfile as NewGamificationProfile,
  type LevelProgress,
  getLevelProgress,
  TIER_DISPLAY,
} from '../../types/gamification';

// Re-export the new types for consumers that import them from this file
export type { TierName, SkillTree, LevelProgress };
export {
  getLevelProgress,
  TIER_DISPLAY,
  calculateLevel,
  pointsForLevel,
  getTier,
} from '../../types/gamification';

// ─── Legacy types preserved for backward compatibility ──────────────────────
// Existing consumers import these interfaces from this file.
// We keep them so downstream code compiles without changes.

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
  badgeImageUrl?: string;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  earnedAt: string;
  progress: number;
  isCompleted: boolean;
  pointsAwarded: number;
  achievement: Achievement;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

export interface UserReward {
  id: string;
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  pointsCost: number;
  fulfillmentDetails?: any;
  reward: Reward;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  bonusPoints: number;
  icon: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface PointTransaction {
  id: string;
  points: number;
  balance: number;
  transactionType: 'earn' | 'spend' | 'adjustment' | 'bonus' | 'expire';
  source: string;
  description: string;
  createdAt: string;
}

export interface StreakDay {
  date: string;
  completed: boolean;
  points: number;
}

export interface ProgressSnapshot {
  date: string;
  points: number;
  level: number;
  achievements: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface GamificationProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  streakDays: number;
  achievements: UserAchievement[];
  rewards: UserReward[];
  milestones: { id: string; milestoneId: string; milestone: Milestone }[];
  primaryBadge?: Achievement;
  leaderboardPosition: number;
  recentTransactions: PointTransaction[];
  nextMilestone?: Milestone;
  nextLevelProgress: number;
  nextLevelPoints: number;
  nextTierProgress: number;
  nextTier?: 'silver' | 'gold' | 'platinum';
  progressSnapshots?: ProgressSnapshot[];
  streakCalendar?: StreakDay[];
}

export interface LeaderboardEntry {
  overallLevel: number;
  userId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
}

// ─── Tier mapping helper ────────────────────────────────────────────────────
// Maps new TierName values to the legacy 4-tier system used by existing UI.

function mapTierToLegacy(tier: TierName): 'bronze' | 'silver' | 'gold' | 'platinum' {
  switch (tier) {
    case 'bronze_forge':     return 'bronze';
    case 'silver_edge':      return 'silver';
    case 'titanium_core':    return 'gold';
    case 'obsidian_warrior': return 'platinum';
    case 'crystalline_swan': return 'platinum';
    default:                 return 'bronze';
  }
}

function getNextLegacyTier(
  currentTier: 'bronze' | 'silver' | 'gold' | 'platinum'
): 'silver' | 'gold' | 'platinum' | undefined {
  switch (currentTier) {
    case 'bronze':  return 'silver';
    case 'silver':  return 'gold';
    case 'gold':    return 'platinum';
    case 'platinum': return undefined;
    default:        return undefined;
  }
}

// ─── Achievement mapping ────────────────────────────────────────────────────
// Maps new UserAchievement shape to legacy Achievement/UserAchievement.

function mapAchievementToLegacy(ua: NewUserAchievement): UserAchievement {
  return {
    id: ua.id,
    achievementId: ua.achievementId,
    earnedAt: ua.earnedAt || new Date().toISOString(),
    progress: ua.progress,
    isCompleted: ua.isCompleted,
    pointsAwarded: ua.pointsAwarded,
    achievement: {
      id: ua.achievement?.id || ua.achievementId,
      name: ua.achievement?.name || ua.achievement?.title || 'Achievement',
      description: ua.achievement?.description || '',
      icon: ua.achievement?.iconEmoji || '🏆',
      pointValue: ua.achievement?.xpReward || ua.pointsAwarded,
      requirementType: ua.achievement?.category || 'milestone',
      requirementValue: ua.achievement?.requiredPoints || ua.maxProgress,
      tier: 'bronze', // legacy field - not meaningful in new system
      isActive: true,
      badgeImageUrl: ua.achievement?.iconUrl,
    },
  };
}

// ─── Options ────────────────────────────────────────────────────────────────

interface UseGamificationDataOptions {
  userId?: string;
}

// ─── The Hook ───────────────────────────────────────────────────────────────

/**
 * Custom hook to manage gamification data using React Query.
 * Fetches real data from the gamification API endpoints and provides
 * caching, refetching, and backward-compatible return values.
 */
export const useGamificationData = (options: UseGamificationDataOptions = {}) => {
  const { userId } = options;
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine which user to fetch data for (current user or specified user)
  const targetUserId = userId || user?.id;

  // Query keys
  const keys = {
    profile: ['gamification', 'profile', targetUserId],
    achievements: ['gamification', 'achievements'],
    rewards: ['gamification', 'rewards'],
    leaderboard: ['gamification', 'leaderboard'],
  };

  // ── Fetch gamification profile from real API ──────────────────────────

  const profileQuery = useQuery({
    queryKey: keys.profile,
    queryFn: async (): Promise<GamificationProfile> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/profile');

        // The API may return the profile at data.profile or data directly
        const raw: NewGamificationProfile | undefined = data?.profile || data;

        if (!raw || typeof raw.points !== 'number') {
          throw new Error('Invalid gamification profile response');
        }

        // Compute level progress client-side for consistency
        const lp = getLevelProgress(raw.points);
        const legacyTier = mapTierToLegacy(raw.tier || lp.tier);
        const nextTier = getNextLegacyTier(legacyTier);

        // Map recent achievements to legacy shape
        const legacyAchievements: UserAchievement[] = (raw.recentAchievements || []).map(
          mapAchievementToLegacy
        );

        // Build the legacy GamificationProfile shape that existing consumers expect
        const profile: GamificationProfile = {
          id: String(raw.userId ?? targetUserId ?? ''),
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          username: user?.username || '',
          photo: user?.profileImageUrl,
          points: raw.points,
          level: raw.level ?? lp.level,
          tier: legacyTier,
          streakDays: raw.stats?.streakDays ?? 0,
          achievements: legacyAchievements,
          rewards: [],
          milestones: [],
          leaderboardPosition: 0,
          recentTransactions: [],
          nextLevelProgress: lp.progressPercent,
          nextLevelPoints: lp.pointsNeededForNext,
          nextTierProgress: 0, // will be filled below
          nextTier: nextTier,
          progressSnapshots: undefined,
          streakCalendar: undefined,
        };

        // Compute tier progress
        if (nextTier) {
          const tierTargets: Record<string, number> = {
            silver: 5000,
            gold: 20000,
            platinum: 50000,
          };
          const target = tierTargets[nextTier] || 50000;
          profile.nextTierProgress = Math.min(100, (raw.points / target) * 100);
        }

        return profile;
      } catch (error: any) {
        // Graceful fallback: if the API is unavailable, try the simpler
        // profile/achievements endpoint as a backup
        console.warn('[Gamification] Primary profile endpoint failed, trying fallback:', error.message);

        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallback = data?.data;

          if (fallback?.user) {
            const points = fallback.user.points || 0;
            const lp = getLevelProgress(points);
            const legacyTier = mapTierToLegacy(lp.tier);
            const nextTier = getNextLegacyTier(legacyTier);

            return {
              id: String(targetUserId || ''),
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              username: user?.username || '',
              photo: user?.profileImageUrl,
              points,
              level: fallback.user.level || lp.level,
              tier: legacyTier,
              streakDays: fallback.user.streakDays || 0,
              achievements: [],
              rewards: [],
              milestones: [],
              leaderboardPosition: 0,
              recentTransactions: [],
              nextLevelProgress: lp.progressPercent,
              nextLevelPoints: lp.pointsNeededForNext,
              nextTierProgress: 0,
              nextTier: nextTier,
            };
          }
        } catch (fallbackError) {
          console.warn('[Gamification] Fallback endpoint also failed:', fallbackError);
        }

        // Return a minimal profile so the UI can still render
        const lp = getLevelProgress(0);
        return {
          id: String(targetUserId || ''),
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          username: user?.username || '',
          photo: user?.profileImageUrl,
          points: 0,
          level: 0,
          tier: 'bronze' as const,
          streakDays: 0,
          achievements: [],
          rewards: [],
          milestones: [],
          leaderboardPosition: 0,
          recentTransactions: [],
          nextLevelProgress: 0,
          nextLevelPoints: lp.pointsNeededForNext,
          nextTierProgress: 0,
          nextTier: 'silver' as const,
        };
      }
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Don't retry aggressively - fallback handles it
  });

  // ── Fetch achievements ────────────────────────────────────────────────

  const achievementsQuery = useQuery({
    queryKey: keys.achievements,
    queryFn: async (): Promise<Achievement[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/achievements');

        // API may return { achievements: [...] } or raw array
        const rawList: any[] = data?.achievements || data || [];

        return rawList.map((item) => {
          // Detect flat Achievement objects (from getAllAchievements) vs
          // UserAchievement records (which have a nested .achievement sub-object)
          const isFlat = item.name || item.title || item.iconEmoji;

          if (isFlat) {
            // Flat Achievement — map directly to legacy shape
            return {
              id: String(item.id),
              name: item.name || item.title || 'Achievement',
              description: item.description || '',
              icon: item.iconEmoji || item.iconUrl || '🏆',
              pointValue: item.xpReward || item.pointValue || 0,
              requirementType: item.category || item.skillTree || 'milestone',
              requirementValue: item.requiredPoints || 0,
              tier: 'bronze' as const,
              isActive: item.isActive !== false,
              badgeImageUrl: item.iconUrl,
              // Pass through extra fields for AboutSection
              rarity: item.rarity,
              skillTree: item.skillTree,
              xpReward: item.xpReward,
              iconEmoji: item.iconEmoji,
            };
          }

          // Nested UserAchievement record — use existing mapper
          const mapped = mapAchievementToLegacy(item as NewUserAchievement);
          return mapped.achievement;
        });
      } catch (error: any) {
        console.warn('[Gamification] Achievements endpoint failed:', error.message);

        // Fallback: try the profile achievements endpoint
        try {
          const { data } = await authAxios.get('/api/profile/achievements');
          const fallbackAchievements = data?.data?.achievements || [];

          return fallbackAchievements.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.iconUrl || '🏆',
            pointValue: 0,
            requirementType: a.category || 'milestone',
            requirementValue: 0,
            tier: 'bronze' as const,
            isActive: true,
            badgeImageUrl: a.iconUrl,
          }));
        } catch (fallbackError) {
          console.warn('[Gamification] Achievements fallback also failed:', fallbackError);
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── Fetch rewards (placeholder - endpoint TBD) ────────────────────────

  const rewardsQuery = useQuery({
    queryKey: keys.rewards,
    queryFn: async (): Promise<Reward[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/rewards');
        return data?.rewards || data || [];
      } catch {
        // Rewards endpoint may not exist yet - return empty gracefully
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── Fetch leaderboard (placeholder - endpoint TBD) ────────────────────

  const leaderboardQuery = useQuery({
    queryKey: keys.leaderboard,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      try {
        const { data } = await authAxios.get('/api/v1/gamification/leaderboard');
        return data?.leaderboard || data || [];
      } catch {
        // Leaderboard endpoint may not exist yet - return empty gracefully
        return [];
      }
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── Client-side level progress (instant, no API wait) ─────────────────

  const levelProgress = useMemo(() => {
    const points = profileQuery.data?.points ?? 0;
    return getLevelProgress(points);
  }, [profileQuery.data?.points]);

  // ── Achievements grouped by skill tree ────────────────────────────────

  const achievementsBySkillTree = useMemo(() => {
    const list = achievementsQuery.data || [];
    const grouped: Record<string, Achievement[]> = {};
    for (const a of list) {
      const key = a.requirementType || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }
    return grouped;
  }, [achievementsQuery.data]);

  // ── Mutation: redeem reward ───────────────────────────────────────────

  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data } = await authAxios.post(
        `/api/v1/gamification/rewards/${rewardId}/redeem`
      );
      return data;
    },
    onSuccess: (data, rewardId) => {
      // Optimistic update: deduct points from cached profile
      queryClient.setQueryData(
        keys.profile,
        (oldData: GamificationProfile | undefined) => {
          if (!oldData) return oldData;

          const reward = rewardsQuery.data?.find((r) => r.id === rewardId);
          if (!reward) return oldData;

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
        }
      );

      // Also update rewards cache
      queryClient.setQueryData(
        keys.rewards,
        (oldData: Reward[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((r) =>
            r.id === rewardId
              ? { ...r, stock: r.stock - 1, redemptionCount: r.redemptionCount + 1 }
              : r
          );
        }
      );

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

  // ── Invalidation helpers ──────────────────────────────────────────────

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

  // ── Return value (backward-compatible shape) ──────────────────────────

  return {
    // Data queries — returned as React Query result objects so consumers
    // can access .data, .isLoading, .isError etc.
    profile: profileQuery,
    achievements: achievementsQuery,
    rewards: rewardsQuery,
    leaderboard: leaderboardQuery,

    // New typed level progress (client-side computed)
    levelProgress,

    // Achievements grouped by category / skill tree
    achievementsBySkillTree,

    // Mutations
    redeemReward: redeemRewardMutation.mutate,
    isRedeeming: redeemRewardMutation.isPending,

    // Invalidation / refetch helpers
    invalidateProfile,
    invalidateLeaderboard,
    refetch,

    // Aggregate loading state
    isLoading:
      profileQuery.isLoading ||
      achievementsQuery.isLoading ||
      rewardsQuery.isLoading ||
      leaderboardQuery.isLoading,

    // Aggregate error state
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
