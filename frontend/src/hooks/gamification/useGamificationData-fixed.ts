import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';

// Define types for our gamification system (Enhanced with better typing)
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
  fulfillmentDetails?: unknown;
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
    points?: number; // Added for better typing
  };
}

// Enhanced options interface
interface UseGamificationDataOptions {
  userId?: string;
  enableRealTimeUpdates?: boolean;
  cacheTime?: number;
  refetchInterval?: number;
}

// Error interface
interface GamificationError {
  message: string;
  code?: string;
  details?: unknown;
}

// Query result types
interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Enhanced Custom hook to manage gamification data using React Query
 * 
 * Key improvements:
 * - Better TypeScript typing
 * - Optimized caching strategies  
 * - Enhanced error handling
 * - Performance optimizations
 * - Memoized calculations
 * - Better separation of concerns
 */
export const useGamificationData = (options: UseGamificationDataOptions = {}) => {
  const { 
    userId, 
    enableRealTimeUpdates = false,
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    refetchInterval = enableRealTimeUpdates ? 30000 : false // 30 seconds if real-time enabled
  } = options;
  
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Determine which user to fetch data for
  const targetUserId = userId || user?.id;
  
  // Optimized query keys with better invalidation strategies
  const queryKeys = useMemo(() => ({
    profile: ['gamification', 'profile', targetUserId] as const,
    achievements: ['gamification', 'achievements'] as const,
    rewards: ['gamification', 'rewards'] as const,
    leaderboard: ['gamification', 'leaderboard'] as const,
    milestones: ['gamification', 'milestones'] as const,
  }), [targetUserId]);
  
  // Enhanced profile fetcher with better error handling
  const fetchProfile = useCallback(async (): Promise<GamificationProfile> => {
    try {
      // In production, this would be a real API call:
      // const response = await authAxios.get(`/api/gamification/users/${targetUserId}/profile`);
      // return response.data.profile;
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enhanced mock data with all required fields
      const mockProfile: GamificationProfile = {
        id: targetUserId || '1',
        firstName: user?.firstName || 'John',
        lastName: user?.lastName || 'Doe',
        username: user?.username || 'johndoe',
        photo: user?.photo,
        points: 4800,
        level: 24,
        tier: 'silver',
        streakDays: 8,
        achievements: [],
        rewards: [],
        milestones: [],
        leaderboardPosition: 2,
        recentTransactions: [
          {
            id: '1',
            points: 50,
            balance: 4800,
            transactionType: 'earn',
            source: 'workout_completion',
            description: 'Completed Full Body Workout',
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
          },
          {
            id: '2',
            points: 25,
            balance: 4750,
            transactionType: 'earn',
            source: 'streak_bonus',
            description: 'Daily Streak Bonus',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
          },
          {
            id: '3',
            points: 100,
            balance: 4725,
            transactionType: 'earn',
            source: 'achievement_earned',
            description: 'Achievement Unlocked: 7-Day Streak Master',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() // 6 hours ago
          }
        ],
        nextMilestone: {
          id: '3',
          name: 'Gold Badge',
          description: 'Earn 20,000 points to unlock Gold tier rewards',
          targetPoints: 20000,
          tier: 'gold',
          bonusPoints: 1000,
          icon: 'Award',
          isActive: true
        },
        nextLevelProgress: 65,
        nextLevelPoints: 2500,
        nextTierProgress: 24,
        nextTier: 'gold',
        
        // Enhanced progress snapshots for better chart data
        progressSnapshots: [
          { date: '2024-04-01', points: 3800, level: 20, achievements: 2, tier: 'silver' },
          { date: '2024-04-08', points: 4200, level: 22, achievements: 3, tier: 'silver' },
          { date: '2024-04-15', points: 4500, level: 23, achievements: 3, tier: 'silver' },
          { date: '2024-04-22', points: 4650, level: 23, achievements: 4, tier: 'silver' },
          { date: '2024-04-29', points: 4800, level: 24, achievements: 4, tier: 'silver' }
        ],
        
        // Enhanced streak calendar with better data patterns
        streakCalendar: generateStreakCalendar()
      };
      
      return mockProfile;
    } catch (error) {
      console.error('Error fetching gamification profile:', error);
      throw new GamificationError(
        error instanceof Error ? error.message : 'Failed to fetch profile',
        'PROFILE_FETCH_ERROR',
        error
      );
    }
  }, [authAxios, targetUserId, user]);
  
  // Enhanced achievements fetcher
  const fetchAchievements = useCallback(async (): Promise<Achievement[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      return []; // Mock achievements would be here
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw new GamificationError(
        'Failed to fetch achievements',
        'ACHIEVEMENTS_FETCH_ERROR',
        error
      );
    }
  }, [authAxios]);
  
  // Enhanced rewards fetcher
  const fetchRewards = useCallback(async (): Promise<Reward[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      return []; // Mock rewards would be here
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw new GamificationError(
        'Failed to fetch rewards',
        'REWARDS_FETCH_ERROR',
        error
      );
    }
  }, [authAxios]);
  
  // Enhanced leaderboard fetcher
  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          userId: 'user1',
          overallLevel: 58,
          client: {
            id: 'user1',
            firstName: 'Alice',
            lastName: 'Williams',
            username: 'awilliams',
            photo: '/images/avatar1.jpg',
            points: 12500
          }
        },
        {
          userId: targetUserId || 'user2',
          overallLevel: 45,
          client: {
            id: targetUserId || 'user2',
            firstName: user?.firstName || 'John',
            lastName: user?.lastName || 'Doe',
            username: user?.username || 'johndoe',
            photo: user?.photo || '/images/avatar2.jpg',
            points: 4800
          }
        },
        {
          userId: 'user3',
          overallLevel: 42,
          client: {
            id: 'user3',
            firstName: 'Sam',
            lastName: 'Johnson',
            username: 'samjohnson',
            photo: '/images/avatar3.jpg',
            points: 4200
          }
        },
        {
          userId: 'user4',
          overallLevel: 36,
          client: {
            id: 'user4',
            firstName: 'Emily',
            lastName: 'Davis',
            username: 'emilyd',
            photo: '/images/avatar4.jpg',
            points: 3600
          }
        },
        {
          userId: 'user5',
          overallLevel: 28,
          client: {
            id: 'user5',
            firstName: 'Mike',
            lastName: 'Brown',
            username: 'mikeb',
            photo: '/images/avatar5.jpg',
            points: 2800
          }
        }
      ];
      
      return mockLeaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw new GamificationError(
        'Failed to fetch leaderboard',
        'LEADERBOARD_FETCH_ERROR',
        error
      );
    }
  }, [authAxios, targetUserId, user]);
  
  // Optimized React Query hooks with enhanced configurations
  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled: !!targetUserId,
    staleTime: cacheTime,
    refetchOnWindowFocus: false,
    refetchInterval,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx), but do retry on server errors (5xx)
      if (error instanceof GamificationError && error.code?.startsWith('4')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const achievementsQuery = useQuery({
    queryKey: queryKeys.achievements,
    queryFn: fetchAchievements,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  const rewardsQuery = useQuery({
    queryKey: queryKeys.rewards,
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  const leaderboardQuery = useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: fetchLeaderboard,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    refetchInterval: enableRealTimeUpdates ? 60000 : false, // 1 minute for leaderboard
    retry: 2
  });
  
  // Enhanced reward redemption mutation
  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      // Simulate API call with proper error handling
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const reward = rewardsQuery.data?.find(r => r.id === rewardId);
      if (!reward) {
        throw new GamificationError('Reward not found', 'REWARD_NOT_FOUND');
      }
      
      const profile = profileQuery.data;
      if (!profile || reward.pointCost > profile.points) {
        throw new GamificationError('Insufficient points', 'INSUFFICIENT_POINTS');
      }
      
      if (reward.stock <= 0) {
        throw new GamificationError('Reward out of stock', 'OUT_OF_STOCK');
      }
      
      return { success: true, reward, pointsSpent: reward.pointCost };
    },
    onSuccess: (data, rewardId) => {
      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.profile, (oldData: GamificationProfile | undefined) => {
        if (!oldData) return oldData;
        
        const reward = rewardsQuery.data?.find(r => r.id === rewardId);
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
              reward: reward
            }
          ],
          recentTransactions: [
            {
              id: Date.now().toString(),
              points: reward.pointCost,
              balance: oldData.points - reward.pointCost,
              transactionType: 'spend' as const,
              source: 'reward_redemption',
              description: `Reward Redeemed: ${reward.name}`,
              createdAt: new Date().toISOString()
            },
            ...oldData.recentTransactions.slice(0, 9) // Keep only the 10 most recent
          ]
        };
      });
      
      // Update rewards cache
      queryClient.setQueryData(queryKeys.rewards, (oldData: Reward[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(r => 
          r.id === rewardId 
            ? { ...r, stock: r.stock - 1, redemptionCount: r.redemptionCount + 1 } 
            : r
        );
      });
      
      toast({
        title: "Success!",
        description: `You've successfully redeemed: ${data.reward.name}`,
        variant: "default"
      });
    },
    onError: (error: GamificationError) => {
      console.error('Error redeeming reward:', error);
      
      let errorMessage = "Failed to redeem reward.";
      switch (error.code) {
        case 'REWARD_NOT_FOUND':
          errorMessage = "This reward is no longer available.";
          break;
        case 'INSUFFICIENT_POINTS':
          errorMessage = "You don't have enough points for this reward.";
          break;
        case 'OUT_OF_STOCK':
          errorMessage = "This reward is currently out of stock.";
          break;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  // Utility functions with proper memoization
  const invalidateProfile = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  }, [queryClient, queryKeys.profile]);
  
  const invalidateLeaderboard = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard });
  }, [queryClient, queryKeys.leaderboard]);
  
  const invalidateAll = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['gamification'] })
    ]);
  }, [queryClient]);
  
  // Memoized loading and error states
  const isLoading = useMemo(() => 
    profileQuery.isLoading || achievementsQuery.isLoading || rewardsQuery.isLoading || leaderboardQuery.isLoading,
    [profileQuery.isLoading, achievementsQuery.isLoading, rewardsQuery.isLoading, leaderboardQuery.isLoading]
  );
  
  const hasError = useMemo(() => 
    profileQuery.isError || achievementsQuery.isError || rewardsQuery.isError || leaderboardQuery.isError,
    [profileQuery.isError, achievementsQuery.isError, rewardsQuery.isError, leaderboardQuery.isError]
  );
  
  const error = useMemo(() => 
    profileQuery.error || achievementsQuery.error || rewardsQuery.error || leaderboardQuery.error,
    [profileQuery.error, achievementsQuery.error, rewardsQuery.error, leaderboardQuery.error]
  );
  
  return {
    // Data queries with enhanced typing
    profile: profileQuery as QueryResult<GamificationProfile>,
    achievements: achievementsQuery as QueryResult<Achievement[]>,
    rewards: rewardsQuery as QueryResult<Reward[]>,
    leaderboard: leaderboardQuery as QueryResult<LeaderboardEntry[]>,
    
    // Mutations
    redeemReward: redeemRewardMutation.mutate,
    isRedeeming: redeemRewardMutation.isPending,
    
    // Utility methods
    invalidateProfile,
    invalidateLeaderboard,
    invalidateAll,
    
    // Loading states
    isLoading,
    isFetching: profileQuery.isFetching || achievementsQuery.isFetching || rewardsQuery.isFetching || leaderboardQuery.isFetching,
    
    // Error states
    hasError,
    error,
    
    // Query client for advanced usage
    queryClient,
    queryKeys
  };
};

// Helper function to generate realistic streak calendar data
function generateStreakCalendar(): StreakDay[] {
  const today = new Date();
  const calendar: StreakDay[] = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    const dayOfWeek = date.getDay();
    let completed = false;
    let points = 0;
    
    // Create realistic workout patterns
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays
      completed = Math.random() > 0.3;
      if (completed) {
        points = Math.floor(Math.random() * 30) + 30; // 30-60 points
      }
    } else { // Weekends
      completed = Math.random() > 0.7;
      if (completed) {
        points = Math.floor(Math.random() * 20) + 20; // 20-40 points
      }
    }
    
    // Ensure the last 8 days have workouts for the streak
    if (i < 8) {
      completed = true;
      points = Math.floor(Math.random() * 30) + 30;
    }
    
    calendar.push({
      date: date.toISOString().split('T')[0],
      completed,
      points
    });
  }
  
  return calendar;
}

// Custom error class for better error handling
class GamificationError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'GamificationError';
  }
}

export default useGamificationData;
