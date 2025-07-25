import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Paper
} from '@mui/material';
import { 
  Trophy, 
  Gift, 
  Settings,
  Users
} from 'lucide-react';

// Import styled components
import { PageContainer } from './styled-gamification-system';

// Lazy load components for better initial load time
const AchievementManager = lazy(() => import('./components/AchievementManager'));
const RewardManager = lazy(() => import('./components/RewardManager'));
const GamificationSettings = lazy(() => import('./components/GamificationSettings'));

// New component for system analytics
const SystemAnalytics = lazy(() => import('./components/SystemAnalytics'));

// Import types and mock data
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Define interfaces
interface Achievement {
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

interface Reward {
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

interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

interface TierThreshold {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsRequired: number;
  levelRequired?: number;
}

interface LevelSettings {
  pointsPerLevel: number;
  levelCap: number;
  enableLevelCap: boolean;
}

interface SystemSettings {
  enableGamification: boolean;
  enableAchievements: boolean;
  enableRewards: boolean;
  enableLeaderboard: boolean;
  enableLevels: boolean;
  enableTiers: boolean;
  enableStreaks: boolean;
  notifyOnAchievement: boolean;
  notifyOnLevelUp: boolean;
  notifyOnReward: boolean;
  streakExpirationDays: number;
  pointsExpiration: {
    enabled: boolean;
    expirationDays: number;
  }
}

interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  achievements: number;
  streakDays: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-gamification-tabpanel-${index}`}
      aria-labelledby={`admin-gamification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-gamification-tab-${index}`,
    'aria-controls': `admin-gamification-tabpanel-${index}`,
  };
}

/**
 * AdminGamificationView Component
 * Master admin interface for managing the entire gamification system
 */
const AdminGamificationView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  
  // State with optimization for better performance
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [tierThresholds, setTierThresholds] = useState<TierThreshold[]>([]);
  const [levelSettings, setLevelSettings] = useState<LevelSettings>({
    pointsPerLevel: 500,
    levelCap: 100,
    enableLevelCap: false
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    enableGamification: true,
    enableAchievements: true,
    enableRewards: true,
    enableLeaderboard: true,
    enableLevels: true,
    enableTiers: true,
    enableStreaks: true,
    notifyOnAchievement: true,
    notifyOnLevelUp: true,
    notifyOnReward: true,
    streakExpirationDays: 3,
    pointsExpiration: {
      enabled: false,
      expirationDays: 365
    }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null); // For system analytics
  
  // Handle tab change with performance optimization
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Only fetch analytics data when analytics tab is selected
    if (newValue === 3 && !analyticsData) {
      fetchAnalyticsData();
    }
  }, [analyticsData]);
  
  // Load data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAchievements(),
      fetchRewards(),
      fetchSettings(),
      fetchLeaderboard()
    ])
    .catch((error) => {
      console.error('Error loading gamification data:', error);
      toast({
        title: "Error",
        description: "Failed to load gamification data. Please try again.",
        variant: "destructive"
      });
    })
    .finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Fetch analytics data for the new analytics tab
  const fetchAnalyticsData = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/admin/gamification/analytics');
      // const data = response.data;
      
      // For demo purposes, we're using mock data
      const mockAnalyticsData = {
        userEngagement: {
          totalUsers: 42,
          activeUsers: 35,
          engagementRate: 83,
          averagePointsPerUser: 2480,
          averageLevelPerUser: 12
        },
        achievementStats: {
          totalAchievementsEarned: 186,
          mostPopularAchievement: {
            id: '1',
            name: 'Fitness Starter',
            description: 'Complete 5 workout sessions',
            count: 38
          },
          leastPopularAchievement: {
            id: '7',
            name: 'Fitness Legend',
            description: 'Reach level 30 in your fitness journey',
            count: 2
          },
          achievementCompletionRate: 48
        },
        rewardStats: {
          totalRewardsRedeemed: 42,
          mostRedeemedReward: {
            id: '2',
            name: 'Water Bottle',
            description: 'Branded fitness water bottle',
            count: 15
          },
          leastRedeemedReward: {
            id: '4',
            name: '25% Off Next Package',
            description: 'Get 25% off your next training package',
            count: 3
          },
          totalPointsSpent: 56500
        },
        tierDistribution: [
          { tier: 'bronze', count: 18, percentage: 43 },
          { tier: 'silver', count: 15, percentage: 36 },
          { tier: 'gold', count: 7, percentage: 17 },
          { tier: 'platinum', count: 2, percentage: 4 }
        ],
        timeSeriesData: [
          { date: '2024-04-01', newUsers: 3, achievementsEarned: 12, pointsEarned: 4500, pointsSpent: 1500 },
          { date: '2024-04-08', newUsers: 5, achievementsEarned: 18, pointsEarned: 6200, pointsSpent: 2000 },
          { date: '2024-04-15', newUsers: 4, achievementsEarned: 15, pointsEarned: 5800, pointsSpent: 2500 },
          { date: '2024-04-22', newUsers: 6, achievementsEarned: 20, pointsEarned: 7400, pointsSpent: 3500 },
          { date: '2024-04-29', newUsers: 2, achievementsEarned: 14, pointsEarned: 5200, pointsSpent: 1800 }
        ]
      };
      
      setAnalyticsData(mockAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Fetch achievements with performance optimization
  const fetchAchievements = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/admin/gamification/achievements');
      // const data = response.data.achievements;
      
      // For demo purposes, we're using mock data
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          name: 'Fitness Starter',
          description: 'Complete 5 workout sessions',
          icon: 'Award',
          pointValue: 100,
          requirementType: 'session_count',
          requirementValue: 5,
          tier: 'bronze',
          isActive: true
        },
        {
          id: '2',
          name: 'Exercise Explorer',
          description: 'Try 15 different exercises',
          icon: 'Dumbbell',
          pointValue: 150,
          requirementType: 'exercise_count',
          requirementValue: 15,
          tier: 'bronze',
          isActive: true
        },
        {
          id: '3',
          name: 'Level 10 Champion',
          description: 'Reach level 10 in your fitness journey',
          icon: 'TrendingUp',
          pointValue: 250,
          requirementType: 'level_reached',
          requirementValue: 10,
          tier: 'silver',
          isActive: true
        },
        {
          id: '4',
          name: 'Squat Master',
          description: 'Perform 100 squats',
          icon: 'Target',
          pointValue: 200,
          requirementType: 'specific_exercise',
          requirementValue: 100,
          tier: 'silver',
          isActive: true
        },
        {
          id: '5',
          name: 'Consistency King',
          description: 'Maintain a 7-day workout streak',
          icon: 'Calendar',
          pointValue: 300,
          requirementType: 'streak_days',
          requirementValue: 7,
          tier: 'gold',
          isActive: true
        },
        {
          id: '6',
          name: 'Elite Athlete',
          description: 'Complete 50 workout sessions',
          icon: 'Trophy',
          pointValue: 500,
          requirementType: 'session_count',
          requirementValue: 50,
          tier: 'gold',
          isActive: true
        },
        {
          id: '7',
          name: 'Fitness Legend',
          description: 'Reach level 30 in your fitness journey',
          icon: 'Star',
          pointValue: 1000,
          requirementType: 'level_reached',
          requirementValue: 30,
          tier: 'platinum',
          isActive: true
        }
      ];
      
      setAchievements(mockAchievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }, []);
  
  // Fetch rewards with performance optimization
  const fetchRewards = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/admin/gamification/rewards');
      // const data = response.data.rewards;
      
      // For demo purposes, we're using mock data
      const mockRewards: Reward[] = [
        {
          id: '1',
          name: 'Free Session',
          description: 'Redeem for one free training session',
          icon: 'Calendar',
          pointCost: 1000,
          tier: 'bronze',
          stock: 10,
          isActive: true,
          redemptionCount: 3
        },
        {
          id: '2',
          name: 'Water Bottle',
          description: 'Branded fitness water bottle',
          icon: 'Heart',
          pointCost: 500,
          tier: 'bronze',
          stock: 15,
          isActive: true,
          redemptionCount: 7
        },
        {
          id: '3',
          name: 'Fitness T-Shirt',
          description: 'Exclusive branded fitness t-shirt',
          icon: 'Star',
          pointCost: 2000,
          tier: 'silver',
          stock: 8,
          isActive: true,
          redemptionCount: 2
        },
        {
          id: '4',
          name: '25% Off Next Package',
          description: 'Get 25% off your next training package',
          icon: 'Tag',
          pointCost: 3500,
          tier: 'gold',
          stock: 5,
          isActive: true,
          redemptionCount: 1
        },
        {
          id: '5',
          name: 'Fitness Assessment',
          description: 'Complete fitness assessment with personalized report',
          icon: 'Heart',
          pointCost: 1500,
          tier: 'silver',
          stock: 10,
          isActive: true,
          redemptionCount: 4
        }
      ];
      
      setRewards(mockRewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  }, []);
  
  // Fetch settings with performance optimization
  const fetchSettings = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/admin/gamification/settings');
      // const data = response.data;
      
      // For demo purposes, we're using mock data
      const mockPointValues: PointValue[] = [
        { id: 'workout_completion', name: 'Workout Completion', description: 'Completed a workout session', pointValue: 50 },
        { id: 'exercise_completion', name: 'Exercise Completion', description: 'Completed an exercise', pointValue: 10 },
        { id: 'streak_bonus', name: 'Streak Bonus', description: 'Maintained a workout streak', pointValue: 20 },
        { id: 'assessment_completion', name: 'Assessment Completion', description: 'Completed a fitness assessment', pointValue: 100 },
        { id: 'referral_bonus', name: 'Referral Bonus', description: 'Referred a new client', pointValue: 200 },
        { id: 'special_achievement', name: 'Special Achievement', description: 'Earned a special achievement', pointValue: 150 },
      ];
      
      const mockTierThresholds: TierThreshold[] = [
        { tier: 'bronze', pointsRequired: 1000 },
        { tier: 'silver', pointsRequired: 5000 },
        { tier: 'gold', pointsRequired: 20000 },
        { tier: 'platinum', pointsRequired: 50000 }
      ];
      
      const mockLevelSettings: LevelSettings = {
        pointsPerLevel: 500,
        levelCap: 100,
        enableLevelCap: false
      };
      
      const mockSystemSettings: SystemSettings = {
        enableGamification: true,
        enableAchievements: true,
        enableRewards: true,
        enableLeaderboard: true,
        enableLevels: true,
        enableTiers: true,
        enableStreaks: true,
        notifyOnAchievement: true,
        notifyOnLevelUp: true,
        notifyOnReward: true,
        streakExpirationDays: 3,
        pointsExpiration: {
          enabled: false,
          expirationDays: 365
        }
      };
      
      setPointValues(mockPointValues);
      setTierThresholds(mockTierThresholds);
      setLevelSettings(mockLevelSettings);
      setSystemSettings(mockSystemSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }, []);
  
  // Fetch leaderboard with performance optimization
  const fetchLeaderboard = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/admin/gamification/leaderboard?limit=10');
      // const data = response.data.leaderboard;
      
      // For demo purposes, we're using mock data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          id: 'user1',
          firstName: 'Alice',
          lastName: 'Williams',
          username: 'awilliams',
          points: 11500,
          level: 36,
          tier: 'gold',
          achievements: 15,
          streakDays: 12
        },
        {
          id: 'user2',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          points: 4800,
          level: 24,
          tier: 'silver',
          achievements: 10,
          streakDays: 8
        },
        {
          id: 'user3',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          points: 2300,
          level: 15,
          tier: 'silver',
          achievements: 8,
          streakDays: 3
        },
        {
          id: 'user4',
          firstName: 'Bob',
          lastName: 'Johnson',
          username: 'bjohnson',
          points: 750,
          level: 8,
          tier: 'bronze',
          achievements: 3,
          streakDays: 0
        },
        {
          id: 'user5',
          firstName: 'Mike',
          lastName: 'Brown',
          username: 'mbrown',
          points: 450,
          level: 5,
          tier: 'bronze',
          achievements: 2,
          streakDays: 1
        }
      ];
      
      setLeaderboard(mockLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }, []);
  
  // Achievement management handlers with performance optimization
  const handleCreateAchievement = useCallback(async (achievement: Omit<Achievement, 'id'>) => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.post('/api/admin/gamification/achievements', achievement);
      // const newAchievement = response.data.achievement;
      
      // For demo purposes, we'll just update the state
      const newAchievement: Achievement = {
        ...achievement,
        id: Date.now().toString()
      };
      
      setAchievements([...achievements, newAchievement]);
      
      toast({
        title: "Success",
        description: "Achievement created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast({
        title: "Error",
        description: "Failed to create achievement",
        variant: "destructive"
      });
    }
  }, [achievements, toast]);
  
  const handleUpdateAchievement = useCallback(async (id: string, updatedFields: Partial<Achievement>) => {
    try {
      // This would be a real API call in production
      // await authAxios.patch(`/api/admin/gamification/achievements/${id}`, updatedFields);
      
      // For demo purposes, we'll just update the state
      const updatedAchievements = achievements.map(achievement => 
        achievement.id === id ? { ...achievement, ...updatedFields } : achievement
      );
      
      setAchievements(updatedAchievements);
      
      toast({
        title: "Success",
        description: "Achievement updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast({
        title: "Error",
        description: "Failed to update achievement",
        variant: "destructive"
      });
    }
  }, [achievements, toast]);
  
  const handleDeleteAchievement = useCallback(async (id: string) => {
    try {
      // Confirm deletion (in a real app, this would be a modal)
      const confirmed = window.confirm("Are you sure you want to delete this achievement? This action cannot be undone.");
      
      if (!confirmed) return;
      
      // This would be a real API call in production
      // await authAxios.delete(`/api/admin/gamification/achievements/${id}`);
      
      // For demo purposes, we'll just update the state
      const filteredAchievements = achievements.filter(achievement => achievement.id !== id);
      
      setAchievements(filteredAchievements);
      
      toast({
        title: "Success",
        description: "Achievement deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast({
        title: "Error",
        description: "Failed to delete achievement",
        variant: "destructive"
      });
    }
  }, [achievements, toast]);
  
  const handleToggleAchievementStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      // This would be a real API call in production
      // await authAxios.patch(`/api/admin/gamification/achievements/${id}`, { isActive });
      
      // For demo purposes, we'll just update the state
      const updatedAchievements = achievements.map(achievement => 
        achievement.id === id ? { ...achievement, isActive } : achievement
      );
      
      setAchievements(updatedAchievements);
      
      toast({
        title: "Success",
        description: `Achievement ${isActive ? 'activated' : 'deactivated'} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error toggling achievement status:', error);
      toast({
        title: "Error",
        description: "Failed to update achievement status",
        variant: "destructive"
      });
    }
  }, [achievements, toast]);
  
  // Reward management handlers with performance optimization
  const handleCreateReward = useCallback(async (reward: Omit<Reward, 'id' | 'redemptionCount'>) => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.post('/api/admin/gamification/rewards', reward);
      // const newReward = response.data.reward;
      
      // For demo purposes, we'll just update the state
      const newReward: Reward = {
        ...reward,
        id: Date.now().toString(),
        redemptionCount: 0
      };
      
      setRewards([...rewards, newReward]);
      
      toast({
        title: "Success",
        description: "Reward created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      toast({
        title: "Error",
        description: "Failed to create reward",
        variant: "destructive"
      });
    }
  }, [rewards, toast]);
  
  const handleUpdateReward = useCallback(async (id: string, updatedFields: Partial<Reward>) => {
    try {
      // This would be a real API call in production
      // await authAxios.patch(`/api/admin/gamification/rewards/${id}`, updatedFields);
      
      // For demo purposes, we'll just update the state
      const updatedRewards = rewards.map(reward => 
        reward.id === id ? { ...reward, ...updatedFields } : reward
      );
      
      setRewards(updatedRewards);
      
      toast({
        title: "Success",
        description: "Reward updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      toast({
        title: "Error",
        description: "Failed to update reward",
        variant: "destructive"
      });
    }
  }, [rewards, toast]);
  
  const handleDeleteReward = useCallback(async (id: string) => {
    try {
      // Confirm deletion (in a real app, this would be a modal)
      const confirmed = window.confirm("Are you sure you want to delete this reward? This action cannot be undone.");
      
      if (!confirmed) return;
      
      // This would be a real API call in production
      // await authAxios.delete(`/api/admin/gamification/rewards/${id}`);
      
      // For demo purposes, we'll just update the state
      const filteredRewards = rewards.filter(reward => reward.id !== id);
      
      setRewards(filteredRewards);
      
      toast({
        title: "Success",
        description: "Reward deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive"
      });
    }
  }, [rewards, toast]);
  
  const handleToggleRewardStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      // This would be a real API call in production
      // await authAxios.patch(`/api/admin/gamification/rewards/${id}`, { isActive });
      
      // For demo purposes, we'll just update the state
      const updatedRewards = rewards.map(reward => 
        reward.id === id ? { ...reward, isActive } : reward
      );
      
      setRewards(updatedRewards);
      
      toast({
        title: "Success",
        description: `Reward ${isActive ? 'activated' : 'deactivated'} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error toggling reward status:', error);
      toast({
        title: "Error",
        description: "Failed to update reward status",
        variant: "destructive"
      });
    }
  }, [rewards, toast]);
  
  const handleUpdateRewardStock = useCallback(async (id: string, stock: number) => {
    try {
      // This would be a real API call in production
      // await authAxios.patch(`/api/admin/gamification/rewards/${id}`, { stock });
      
      // For demo purposes, we'll just update the state
      const updatedRewards = rewards.map(reward => 
        reward.id === id ? { ...reward, stock } : reward
      );
      
      setRewards(updatedRewards);
      
      toast({
        title: "Success",
        description: "Reward stock updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating reward stock:', error);
      toast({
        title: "Error",
        description: "Failed to update reward stock",
        variant: "destructive"
      });
    }
  }, [rewards, toast]);
  
  // Settings management handlers with performance optimization
  const handleUpdatePointValues = useCallback(async (updatedPointValues: PointValue[]) => {
    try {
      // This would be a real API call in production
      // await authAxios.put('/api/admin/gamification/settings/point-values', { pointValues: updatedPointValues });
      
      // For demo purposes, we'll just update the state
      setPointValues(updatedPointValues);
    } catch (error) {
      console.error('Error updating point values:', error);
      toast({
        title: "Error",
        description: "Failed to update point values",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateTierThresholds = useCallback(async (updatedTierThresholds: TierThreshold[]) => {
    try {
      // This would be a real API call in production
      // await authAxios.put('/api/admin/gamification/settings/tier-thresholds', { tierThresholds: updatedTierThresholds });
      
      // For demo purposes, we'll just update the state
      setTierThresholds(updatedTierThresholds);
    } catch (error) {
      console.error('Error updating tier thresholds:', error);
      toast({
        title: "Error",
        description: "Failed to update tier thresholds",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateLevelSettings = useCallback(async (updatedLevelSettings: LevelSettings) => {
    try {
      // This would be a real API call in production
      // await authAxios.put('/api/admin/gamification/settings/level-settings', { levelSettings: updatedLevelSettings });
      
      // For demo purposes, we'll just update the state
      setLevelSettings(updatedLevelSettings);
    } catch (error) {
      console.error('Error updating level settings:', error);
      toast({
        title: "Error",
        description: "Failed to update level settings",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateSystemSettings = useCallback(async (updatedSystemSettings: SystemSettings) => {
    try {
      // This would be a real API call in production
      // await authAxios.put('/api/admin/gamification/settings/system-settings', { systemSettings: updatedSystemSettings });
      
      // For demo purposes, we'll just update the state
      setSystemSettings(updatedSystemSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast({
        title: "Error",
        description: "Failed to update system settings",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleSaveSettings = useCallback(async () => {
    try {
      // In a real app, we would save all settings in one go or in a transaction
      // await authAxios.post('/api/admin/gamification/settings/save', {
      //   pointValues,
      //   tierThresholds,
      //   levelSettings,
      //   systemSettings
      // });
      
      // For demo purposes, we'll just show a success message
      toast({
        title: "Success",
        description: "Gamification settings saved successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save gamification settings",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleRestoreDefaults = useCallback(async () => {
    try {
      // Confirm restore (in a real app, this would be a modal)
      const confirmed = window.confirm("Are you sure you want to restore default settings? This will reset all gamification settings to their factory defaults.");
      
      if (!confirmed) return;
      
      // This would be a real API call in production
      // await authAxios.post('/api/admin/gamification/settings/restore-defaults');
      // const response = await authAxios.get('/api/admin/gamification/settings');
      // const data = response.data;
      
      // For demo purposes, we'll just reset to our mock defaults
      await fetchSettings();
      
      toast({
        title: "Success",
        description: "Gamification settings restored to defaults",
        variant: "default"
      });
    } catch (error) {
      console.error('Error restoring default settings:', error);
      toast({
        title: "Error",
        description: "Failed to restore default settings",
        variant: "destructive"
      });
    }
  }, [fetchSettings, toast]);
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '50vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Loading fallback component for lazy-loaded tabs
  const TabLoadingFallback = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <PageContainer role="main" aria-label="Gamification management dashboard">
      <Typography variant="h4" component="h1" gutterBottom>
        Gamification System Administration
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1">
          Manage achievements, rewards, and system settings for your gamification platform. Use this dashboard to create engaging experiences that motivate your clients.
        </Typography>
      </Box>
      
      {/* Enhanced tabs with analytics */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="Gamification management tabs"
          variant="scrollable"
          scrollButtons="auto"
          role="tablist"
        >
          <Tab 
            label="Achievements" 
            icon={<Trophy size={16} />} 
            iconPosition="start" 
            {...a11yProps(0)} 
            aria-label="Manage achievements and badges"
          />
          <Tab 
            label="Rewards" 
            icon={<Gift size={16} />} 
            iconPosition="start" 
            {...a11yProps(1)} 
            aria-label="Manage rewards and redemptions"
          />
          <Tab 
            label="System Settings" 
            icon={<Settings size={16} />} 
            iconPosition="start" 
            {...a11yProps(2)} 
            aria-label="Configure gamification settings"
          />
          <Tab 
            label="Analytics" 
            icon={<Users size={16} />} 
            iconPosition="start" 
            {...a11yProps(3)} 
            aria-label="View gamification analytics and reports"
          />
        </Tabs>
      </Box>
      
      {/* Achievement Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Suspense fallback={<TabLoadingFallback />}>
          <AchievementManager 
            achievements={achievements}
            onCreateAchievement={handleCreateAchievement}
            onUpdateAchievement={handleUpdateAchievement}
            onDeleteAchievement={handleDeleteAchievement}
            onToggleStatus={handleToggleAchievementStatus}
          />
        </Suspense>
      </TabPanel>
      
      {/* Reward Management Tab */}
      <TabPanel value={tabValue} index={1}>
        <Suspense fallback={<TabLoadingFallback />}>
          <RewardManager 
            rewards={rewards}
            onCreateReward={handleCreateReward}
            onUpdateReward={handleUpdateReward}
            onDeleteReward={handleDeleteReward}
            onToggleStatus={handleToggleRewardStatus}
            onUpdateStock={handleUpdateRewardStock}
          />
        </Suspense>
      </TabPanel>
      
      {/* System Settings Tab */}
      <TabPanel value={tabValue} index={2}>
        <Suspense fallback={<TabLoadingFallback />}>
          <GamificationSettings 
            pointValues={pointValues}
            tierThresholds={tierThresholds}
            levelSettings={levelSettings}
            systemSettings={systemSettings}
            onUpdatePointValues={handleUpdatePointValues}
            onUpdateTierThresholds={handleUpdateTierThresholds}
            onUpdateLevelSettings={handleUpdateLevelSettings}
            onUpdateSystemSettings={handleUpdateSystemSettings}
            onSaveSettings={handleSaveSettings}
            onRestoreDefaults={handleRestoreDefaults}
          />
        </Suspense>
      </TabPanel>

      {/* New Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Suspense fallback={<TabLoadingFallback />}>
          <SystemAnalytics data={analyticsData} />
        </Suspense>
      </TabPanel>
    </PageContainer>
  );
};

export default React.memo(AdminGamificationView);