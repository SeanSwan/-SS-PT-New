import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import { useCallback } from 'react';

// Define types for our gamification system
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

interface UseGamificationDataOptions {
  userId?: string;
}

/**
 * Custom hook to manage gamification data using React Query
 * Provides optimized data fetching, caching, and state management
 */
export const useGamificationData = (options: UseGamificationDataOptions = {}) => {
  const { userId } = options;
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Determine which user to fetch data for (current user or specified user)
  const targetUserId = userId || user?.id;
  
  // Generate query keys for React Query
  const keys = {
    profile: ['gamification', 'profile', targetUserId],
    achievements: ['gamification', 'achievements'],
    rewards: ['gamification', 'rewards'],
    leaderboard: ['gamification', 'leaderboard'],
    milestones: ['gamification', 'milestones'],
  };
  
  // Fetch user's gamification profile
  const fetchProfile = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get(`/api/gamification/users/${targetUserId}/profile`);
      // return response.data.profile;
      
      // For demo purposes, we're using mock data
      // Mock data implementation would go here - for now we'll simulate a 500ms delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock profile data similar to what's in the existing component
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
        achievements: [
          // Achievement data would be populated here
        ],
        rewards: [
          // Rewards data would be populated here
        ],
        milestones: [
          // Milestones data would be populated here
        ],
        leaderboardPosition: 2,
        recentTransactions: [
          // Transactions data would be populated here
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
        nextTier: 'gold'
      };
      
      // Mock progress snapshots for the last 30 days
      const mockSnapshots: ProgressSnapshot[] = [
        { date: '2024-04-01', points: 3800, level: 20, achievements: 2, tier: 'silver' },
        { date: '2024-04-08', points: 4200, level: 22, achievements: 3, tier: 'silver' },
        { date: '2024-04-15', points: 4500, level: 23, achievements: 3, tier: 'silver' },
        { date: '2024-04-22', points: 4650, level: 23, achievements: 4, tier: 'silver' },
        { date: '2024-04-29', points: 4800, level: 24, achievements: 4, tier: 'silver' }
      ];
      
      // Mock streak calendar for the last 30 days
      const today = new Date();
      const mockStreakCalendar: StreakDay[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        // Create some pattern of completed workouts
        // More likely to have workouts on weekdays, less on weekends
        const dayOfWeek = date.getDay();
        let completed = false;
        let points = 0;
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
          // Higher chance of completion on weekdays
          completed = Math.random() > 0.3; 
          if (completed) {
            points = Math.floor(Math.random() * 30) + 30; // 30-60 points
          }
        } else {
          // Lower chance of completion on weekends
          completed = Math.random() > 0.7;
          if (completed) {
            points = Math.floor(Math.random() * 20) + 20; // 20-40 points
          }
        }
        
        // Make sure the last 8 days have workouts to match the streak
        if (i < 8) {
          completed = true;
          points = Math.floor(Math.random() * 30) + 30;
        }
        
        mockStreakCalendar.push({
          date: date.toISOString().split('T')[0],
          completed,
          points
        });
      }
      
      const enhancedProfile = {
        ...mockProfile,
        progressSnapshots: mockSnapshots,
        streakCalendar: mockStreakCalendar
      };
      
      return enhancedProfile;
    } catch (error) {
      console.error('Error fetching gamification profile:', error);
      throw error;
    }
  }, [authAxios, targetUserId, user]);
  
  // Fetch all achievements
  const fetchAchievements = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/achievements?isActive=true');
      // return response.data.achievements;
      
      // For demo purposes, we're using mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockAchievements: Achievement[] = [
        // Mock achievements would be populated here
      ];
      
      return mockAchievements;
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }, [authAxios]);
  
  // Fetch all rewards
  const fetchRewards = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/rewards?isActive=true');
      // return response.data.rewards;
      
      // For demo purposes, we're using mock data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockRewards: Reward[] = [
        // Mock rewards would be populated here
      ];
      
      return mockRewards;
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  }, [authAxios]);
  
  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/leaderboard?limit=5');
      // return response.data.leaderboard;
      
      // For demo purposes, we're using mock data
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
            photo: '/images/avatar1.jpg'
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
            photo: user?.photo || '/images/avatar2.jpg'
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
            photo: '/images/avatar3.jpg'
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
            photo: '/images/avatar4.jpg'
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
            photo: '/images/avatar5.jpg'
          }
        }
      ];
      
      return mockLeaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }, [authAxios, targetUserId, user]);
  
  // Create React Query hooks
  const profileQuery = useQuery({
    queryKey: keys.profile,
    queryFn: fetchProfile,
    enabled: !!targetUserId, // Only run query if targetUserId is available
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  const achievementsQuery = useQuery({
    queryKey: keys.achievements,
    queryFn: fetchAchievements,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  const rewardsQuery = useQuery({
    queryKey: keys.rewards,
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  const leaderboardQuery = useQuery({
    queryKey: keys.leaderboard,
    queryFn: fetchLeaderboard,
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
  
  // Mutation for redeeming rewards
  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      // This would be a real API call in production
      // return await authAxios.post(`/api/gamification/users/${targetUserId}/rewards/${rewardId}/redeem`);
      
      // For demo purposes, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Find the reward to redeem
      const reward = rewardsQuery.data?.find(r => r.id === rewardId);
      
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      const profile = profileQuery.data;
      
      if (!profile || reward.pointCost > profile.points) {
        throw new Error('Insufficient points');
      }
      
      return { success: true, reward };
    },
    onSuccess: (data, rewardId) => {
      // Update the profile data in the cache
      queryClient.setQueryData(keys.profile, (oldData: GamificationProfile | undefined) => {
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
              status: 'pending',
              pointsCost: reward.pointCost,
              reward: reward
            }
          ],
          recentTransactions: [
            {
              id: Date.now().toString(),
              points: reward.pointCost,
              balance: oldData.points - reward.pointCost,
              transactionType: 'spend',
              source: 'reward_redemption',
              description: `Reward Redeemed: ${reward.name}`,
              createdAt: new Date().toISOString()
            },
            ...oldData.recentTransactions
          ]
        };
      });
      
      // Update the rewards data in the cache
      queryClient.setQueryData(keys.rewards, (oldData: Reward[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(r => 
          r.id === rewardId 
            ? { ...r, stock: r.stock - 1, redemptionCount: r.redemptionCount + 1 } 
            : r
        );
      });
      
      toast({
        title: "Success",
        description: `You've successfully redeemed: ${data.reward.name}`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to redeem reward.",
        variant: "destructive"
      });
    }
  });
  
  return {
    // Data queries
    profile: profileQuery,
    achievements: achievementsQuery,
    rewards: rewardsQuery,
    leaderboard: leaderboardQuery,
    
    // Mutations
    redeemReward: redeemRewardMutation.mutate,
    isRedeeming: redeemRewardMutation.isPending,
    
    // Utility methods
    invalidateProfile: () => queryClient.invalidateQueries({ queryKey: keys.profile }),
    invalidateLeaderboard: () => queryClient.invalidateQueries({ queryKey: keys.leaderboard }),
    
    // Loading states
    isLoading: profileQuery.isLoading || achievementsQuery.isLoading || rewardsQuery.isLoading || leaderboardQuery.isLoading,
    
    // Error states
    hasError: profileQuery.isError || achievementsQuery.isError || rewardsQuery.isError || leaderboardQuery.isError,
    error: profileQuery.error || achievementsQuery.error || rewardsQuery.error || leaderboardQuery.error,
  };
};
