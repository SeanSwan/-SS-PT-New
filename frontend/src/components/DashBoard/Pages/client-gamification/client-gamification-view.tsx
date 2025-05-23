import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  Badge,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';

// Import icons
import {
  Award,
  Gift,
  TrendingUp,
  Trophy,
  Star,
  Dumbbell,
  Heart,
  Target,
  Medal,
  Clock,
  Calendar,
  CheckCircle,
  Sparkles,
  Zap,
  Users,
  AlertCircle,
  Tag,
  DollarSign
} from 'lucide-react';

// Import styled components
import {
  PageContainer,
  ContentContainer,
  StyledCard,
  CardHeader,
  CardTitle,
  AchievementGrid,
  AchievementItem,
  AchievementIcon,
  AchievementName,
  AchievementDescription,
  AchievementReward,
  AchievementBadge,
  UnlockedOverlay,
  MilestoneTrack,
  MilestoneLine,
  MilestoneNode,
  MilestoneLabel,
  MilestoneValue,
  ProgressContainer,
  ProgressHeader,
  ProgressTitle,
  ProgressValue,
  StyledProgress,
  RewardGrid,
  RewardItem,
  RewardHeader,
  RewardIcon,
  RewardContent,
  RewardName,
  RewardDescription,
  RewardFooter,
  RewardPoints,
  RewardBadge
} from '../admin-gamification/styled-gamification-system';

// Define types for our gamification system
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

interface UserAchievement {
  id: string;
  achievementId: string;
  earnedAt: string;
  progress: number;
  isCompleted: boolean;
  pointsAwarded: number;
  achievement: Achievement;
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

interface UserReward {
  id: string;
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
  pointsCost: number;
  fulfillmentDetails?: any;
  reward: Reward;
}

interface Milestone {
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

interface PointTransaction {
  id: string;
  points: number;
  balance: number;
  transactionType: 'earn' | 'spend' | 'adjustment' | 'bonus' | 'expire';
  source: string;
  description: string;
  createdAt: string;
}

interface StreakDay {
  date: string;
  completed: boolean;
  points: number;
}

interface ProgressSnapshot {
  date: string;
  points: number;
  level: number;
  achievements: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface GamificationProfile {
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
      id={`gamification-tabpanel-${index}`}
      aria-labelledby={`gamification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `gamification-tab-${index}`,
    'aria-controls': `gamification-tabpanel-${index}`,
  };
}

/**
 * Client Gamification Dashboard
 * View for clients to see their progress, achievements, and rewards
 */
// Lazy-load the progress chart component to improve initial load time
const ProgressChart = lazy(() => import('./components/ProgressChart'));

/**
 * Client Gamification Dashboard with optimized performance and loading
 * View for clients to see their progress, achievements, and rewards
 */
const ClientGamificationView: React.FC = () => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  
  // State with performance optimizations
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rewardDialogOpen, setRewardDialogOpen] = useState<boolean>(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemingReward, setRedeemingReward] = useState<boolean>(false);
  const [lastMonth, setLastMonth] = useState<number>(0); // Points gained in last month
  const [chartLoading, setChartLoading] = useState<boolean>(false); // For chart loading state
  
  // Handle tab change with performance optimization
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Only load chart data when Progress tab is selected (index 4)
    if (newValue === 4 && !chartLoading) {
      setChartLoading(true);
    }
  }, [chartLoading]);
  
  // Load data
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([
        fetchProfile(),
        fetchAchievements(),
        fetchRewards(),
        fetchMilestones(),
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  
  // Fetch profile data
  const fetchProfile = async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get(`/api/gamification/users/${user.id}/profile`);
      // const data = response.data.profile;
      
      // For demo purposes, we're using mock data
      const mockProfile: GamificationProfile = {
        id: user?.id || '1',
        firstName: user?.firstName || 'John',
        lastName: user?.lastName || 'Doe',
        username: user?.username || 'johndoe',
        photo: user?.photo,
        points: 4800,
        level: 24,
        tier: 'silver',
        streakDays: 8,
        achievements: [
          {
            id: '1',
            achievementId: '1',
            earnedAt: '2024-04-15T00:00:00.000Z',
            progress: 100,
            isCompleted: true,
            pointsAwarded: 100,
            achievement: {
              id: '1',
              name: 'Fitness Starter',
              description: 'Complete 5 workout sessions',
              icon: 'Award',
              pointValue: 100,
              requirementType: 'session_count',
              requirementValue: 5,
              tier: 'bronze',
              isActive: true
            }
          },
          {
            id: '2',
            achievementId: '2',
            earnedAt: '2024-04-20T00:00:00.000Z',
            progress: 100,
            isCompleted: true,
            pointsAwarded: 150,
            achievement: {
              id: '2',
              name: 'Exercise Explorer',
              description: 'Try 15 different exercises',
              icon: 'Dumbbell',
              pointValue: 150,
              requirementType: 'exercise_count',
              requirementValue: 15,
              tier: 'bronze',
              isActive: true
            }
          },
          {
            id: '3',
            achievementId: '3',
            earnedAt: '2024-04-25T00:00:00.000Z',
            progress: 100,
            isCompleted: true,
            pointsAwarded: 250,
            achievement: {
              id: '3',
              name: 'Level 10 Champion',
              description: 'Reach level 10 in your fitness journey',
              icon: 'TrendingUp',
              pointValue: 250,
              requirementType: 'level_reached',
              requirementValue: 10,
              tier: 'silver',
              isActive: true
            }
          },
          {
            id: '4',
            achievementId: '4',
            earnedAt: '2024-04-28T00:00:00.000Z',
            progress: 100,
            isCompleted: true,
            pointsAwarded: 200,
            achievement: {
              id: '4',
              name: 'Squat Master',
              description: 'Perform 100 squats',
              icon: 'Target',
              pointValue: 200,
              requirementType: 'specific_exercise',
              requirementValue: 100,
              tier: 'silver',
              isActive: true
            }
          }
        ],
        rewards: [
          {
            id: '1',
            rewardId: '2',
            redeemedAt: '2024-04-22T00:00:00.000Z',
            status: 'fulfilled',
            pointsCost: 500,
            reward: {
              id: '2',
              name: 'Water Bottle',
              description: 'Branded fitness water bottle',
              icon: 'Heart',
              pointCost: 500,
              tier: 'bronze',
              stock: 15,
              isActive: true,
              redemptionCount: 7
            }
          }
        ],
        milestones: [
          {
            id: '1',
            milestoneId: '1',
            milestone: {
              id: '1',
              name: 'Bronze Badge',
              description: 'Earn 1,000 points to unlock Bronze tier rewards',
              targetPoints: 1000,
              tier: 'bronze',
              bonusPoints: 200,
              icon: 'Award',
              isActive: true
            }
          },
          {
            id: '2',
            milestoneId: '2',
            milestone: {
              id: '2',
              name: 'Silver Badge',
              description: 'Earn 5,000 points to unlock Silver tier rewards',
              targetPoints: 5000,
              tier: 'silver',
              bonusPoints: 500,
              icon: 'Award',
              isActive: true
            }
          }
        ],
        leaderboardPosition: 2,
        recentTransactions: [
          {
            id: '1',
            points: 50,
            balance: 4800,
            transactionType: 'earn',
            source: 'workout_completion',
            description: 'Completed workout session',
            createdAt: '2024-05-01T09:30:00.000Z'
          },
          {
            id: '2',
            points: 20,
            balance: 4750,
            transactionType: 'earn',
            source: 'streak_bonus',
            description: 'Streak Bonus: 8 days',
            createdAt: '2024-05-01T09:30:00.000Z'
          },
          {
            id: '3',
            points: 100,
            balance: 4730,
            transactionType: 'earn',
            source: 'achievement_earned',
            description: 'Achievement Earned: Consistency King',
            createdAt: '2024-04-28T10:15:00.000Z'
          },
          {
            id: '4',
            points: 500,
            balance: 4630,
            transactionType: 'spend',
            source: 'reward_redemption',
            description: 'Reward Redeemed: Water Bottle',
            createdAt: '2024-04-22T14:20:00.000Z'
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
      
      // Calculate points gained in last month
      if (mockSnapshots.length >= 2) {
        const oldestSnapshot = mockSnapshots[0];
        const newestSnapshot = mockSnapshots[mockSnapshots.length - 1];
        setLastMonth(newestSnapshot.points - oldestSnapshot.points);
      }
      
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
      
      setProfile(enhancedProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profile data.",
        variant: "destructive"
      });
    }
  };
  
  // Fetch all achievements with performance optimization
  const fetchAchievements = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/achievements?isActive=true');
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
      toast({
        title: "Error",
        description: "Failed to fetch achievements.",
        variant: "destructive"
      });
    }
  };
  
  // Fetch all rewards with performance optimization
  const fetchRewards = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/rewards?isActive=true');
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
      toast({
        title: "Error",
        description: "Failed to fetch rewards.",
        variant: "destructive"
      });
    }
  };
  
  // Fetch all milestones with performance optimization
  const fetchMilestones = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/milestones?isActive=true');
      // const data = response.data.milestones;
      
      // For demo purposes, we're using mock data
      const mockMilestones: Milestone[] = [
        {
          id: '1',
          name: 'Bronze Badge',
          description: 'Earn 1,000 points to unlock Bronze tier rewards',
          targetPoints: 1000,
          tier: 'bronze',
          bonusPoints: 200,
          icon: 'Award',
          isActive: true
        },
        {
          id: '2',
          name: 'Silver Badge',
          description: 'Earn 5,000 points to unlock Silver tier rewards',
          targetPoints: 5000,
          tier: 'silver',
          bonusPoints: 500,
          icon: 'Award',
          isActive: true
        },
        {
          id: '3',
          name: 'Gold Badge',
          description: 'Earn 20,000 points to unlock Gold tier rewards',
          targetPoints: 20000,
          tier: 'gold',
          bonusPoints: 1000,
          icon: 'Award',
          isActive: true
        },
        {
          id: '4',
          name: 'Platinum Badge',
          description: 'Earn 50,000 points to unlock Platinum tier rewards',
          targetPoints: 50000,
          tier: 'platinum',
          bonusPoints: 2000,
          icon: 'Award',
          isActive: true
        }
      ];
      
      setMilestones(mockMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: "Error",
        description: "Failed to fetch milestones.",
        variant: "destructive"
      });
    }
  };
  
  // Fetch leaderboard with performance optimization
  const fetchLeaderboard = useCallback(async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/leaderboard?limit=5');
      // const data = response.data.leaderboard;
      
      // For demo purposes, we're using mock data
      const mockLeaderboard = [
        {
          id: 'user1',
          firstName: 'Alice',
          lastName: 'Williams',
          username: 'awilliams',
          photo: null,
          points: 11500,
          level: 36,
          tier: 'gold'
        },
        {
          id: user?.id || 'user2',
          firstName: user?.firstName || 'John',
          lastName: user?.lastName || 'Doe',
          username: user?.username || 'johndoe',
          photo: user?.photo || null,
          points: 4800,
          level: 24,
          tier: 'silver'
        },
        {
          id: 'user3',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          photo: null,
          points: 2300,
          level: 15,
          tier: 'silver'
        },
        {
          id: 'user4',
          firstName: 'Bob',
          lastName: 'Johnson',
          username: 'bjohnson',
          photo: null,
          points: 750,
          level: 8,
          tier: 'bronze'
        },
        {
          id: 'user5',
          firstName: 'Mike',
          lastName: 'Brown',
          username: 'mbrown',
          photo: null,
          points: 450,
          level: 5,
          tier: 'bronze'
        }
      ];
      
      setLeaderboard(mockLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leaderboard.",
        variant: "destructive"
      });
    }
  };
  
  // Redeem a reward with performance optimization
  const handleRedeemReward = useCallback(async (rewardId: string) => {
    if (!user?.id) return;
    
    setRedeemingReward(true);
    
    try {
      // This would be a real API call in production
      // await authAxios.post(`/api/gamification/users/${user.id}/rewards/${rewardId}/redeem`);
      
      // For demo purposes, we'll just update the state
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      if (profile && reward.pointCost > profile.points) {
        throw new Error('Insufficient points');
      }
      
      // Update profile points
      if (profile) {
        setProfile({
          ...profile,
          points: profile.points - reward.pointCost,
          rewards: [
            ...profile.rewards,
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
              balance: profile.points - reward.pointCost,
              transactionType: 'spend',
              source: 'reward_redemption',
              description: `Reward Redeemed: ${reward.name}`,
              createdAt: new Date().toISOString()
            },
            ...profile.recentTransactions
          ]
        });
      }
      
      // Update reward stock
      setRewards(rewards.map(r => 
        r.id === rewardId 
          ? { ...r, stock: r.stock - 1, redemptionCount: r.redemptionCount + 1 } 
          : r
      ));
      
      toast({
        title: "Success",
        description: `You've successfully redeemed: ${reward.name}`,
        variant: "default"
      });
      
      setRewardDialogOpen(false);
      setSelectedReward(null);
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to redeem reward.",
        variant: "destructive"
      });
    } finally {
      setRedeemingReward(false);
    }
  };
  
  // Helper function to get icon component - memoized for performance
  const getIconComponent = useCallback((iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award />;
      case 'Gift': return <Gift />;
      case 'TrendingUp': return <TrendingUp />;
      case 'Star': return <Star />;
      case 'Trophy': return <Trophy />;
      case 'Heart': return <Heart />;
      case 'Target': return <Target />;
      case 'Zap': return <Zap />;
      case 'Calendar': return <Calendar />;
      case 'Clock': return <Clock />;
      case 'Dumbbell': return <Dumbbell />;
      case 'Medal': return <Medal />;
      case 'Tag': return <Tag />;
      case 'DollarSign': return <DollarSign />;
      default: return <Award />;
    }
  };
  
  // Helper function to format date - memoized for performance
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '50vh' 
      }}
        data-testid="loading-spinner"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (!profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Fitness Gamification
        </Typography>
        <Typography>
          Failed to load your gamification profile. Please try again later.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => fetchProfile()}
          data-testid="retry-button"
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  return (
    <PageContainer>
      <Typography variant="h4" component="h1" gutterBottom>
        Fitness Gamification
      </Typography>
      
      {/* Profile Summary Card */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                src={profile.photo || undefined}
                sx={{ width: 64, height: 64, mr: 2 }}
              >
                {profile.firstName[0]}{profile.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h2">
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={`Level ${profile.level}`}
                    color="primary" 
                    size="small"
                  />
                  <Chip 
                    label={profile.tier.toUpperCase()}
                    color={
                      profile.tier === 'bronze' ? 'default' :
                      profile.tier === 'silver' ? 'primary' :
                      profile.tier === 'gold' ? 'warning' :
                      'secondary'
                    }
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Star size={16} color="#FFC107" style={{ marginRight: 4 }} />
                <Typography variant="h6" component="span" fontWeight="bold">
                  {profile.points.toLocaleString()}
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                  points
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Badge 
                  badgeContent={profile.streakDays} 
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <Zap size={16} color="#1976D2" />
                </Badge>
                <Typography variant="body2" component="span" color="text.secondary">
                  day streak
                </Typography>
              </Box>
            </Box>
            
            {/* Next Level Progress */}
            <ProgressContainer>
              <ProgressHeader>
                <ProgressTitle>Progress to Level {profile.level + 1}</ProgressTitle>
                <ProgressValue>{Math.round(profile.nextLevelProgress)}%</ProgressValue>
              </ProgressHeader>
              <LinearProgress 
                variant="determinate" 
                value={profile.nextLevelProgress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </ProgressContainer>
            
            {/* Next Tier Progress */}
            {profile.nextTier && (
              <ProgressContainer>
                <ProgressHeader>
                  <ProgressTitle>Progress to {profile.nextTier.charAt(0).toUpperCase() + profile.nextTier.slice(1)} Tier</ProgressTitle>
                  <ProgressValue>{Math.round(profile.nextTierProgress)}%</ProgressValue>
                </ProgressHeader>
                <LinearProgress 
                  variant="determinate" 
                  value={profile.nextTierProgress} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color={
                    profile.nextTier === 'silver' ? 'primary' :
                    profile.nextTier === 'gold' ? 'warning' :
                    'secondary'
                  }
                />
              </ProgressContainer>
            )}
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Trophy size={18} /> STATS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.achievements.filter(a => a.isCompleted).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Achievements
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.leaderboardPosition}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leaderboard Rank
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.milestones.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Milestones
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.rewards.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rewards Redeemed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {profile.nextMilestone && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Next Milestone:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(0, 0, 0, 0.08)' }}>
                      {getIconComponent(profile.nextMilestone.icon)}
                    </Box>
                    <Typography variant="body2">{profile.nextMilestone.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({profile.points.toLocaleString()} / {profile.nextMilestone.targetPoints.toLocaleString()} pts)
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Monthly Progress */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }} data-testid="monthly-progress">
                <Typography variant="subtitle2" fontWeight="bold">
                  Last 30 Days: +{lastMonth.toLocaleString()} Points
                </Typography>
                <Typography variant="body2">
                  {lastMonth > 1000 ? 'Outstanding progress!' : 
                   lastMonth > 500 ? 'Excellent work!' : 
                   lastMonth > 100 ? 'Good effort!' : 'Keep going!'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="gamification tabs"
          variant="scrollable"
          scrollButtons="auto"
          data-testid="gamification-tabs"
        >
          <Tab label="Achievements" icon={<Medal size={16} />} iconPosition="start" {...a11yProps(0)} />
          <Tab label="Rewards" icon={<Gift size={16} />} iconPosition="start" {...a11yProps(1)} />
          <Tab label="Activity" icon={<Clock size={16} />} iconPosition="start" {...a11yProps(2)} />
          <Tab label="Leaderboard" icon={<Users size={16} />} iconPosition="start" {...a11yProps(3)} />
          <Tab label="Progress" icon={<TrendingUp size={16} />} iconPosition="start" {...a11yProps(4)} />
        </Tabs>
      </Box>
      
      {/* Achievement Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" component="h2" gutterBottom>
          Your Achievements
        </Typography>
        
        <AchievementGrid>
          {achievements.map((achievement) => {
            // Check if the user has earned this achievement
            const userAchievement = profile.achievements.find(ua => ua.achievementId === achievement.id);
            const isCompleted = !!userAchievement?.isCompleted;
            const progress = userAchievement?.progress || 0;
            
            return (
              <AchievementItem 
                key={achievement.id}
                tier={achievement.tier}
                whileHover={{ 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
              >
                <AchievementBadge tier={achievement.tier}>
                  {achievement.tier.toUpperCase()}
                </AchievementBadge>
                
                <AchievementIcon tier={achievement.tier}>
                  {getIconComponent(achievement.icon)}
                </AchievementIcon>
                
                <AchievementName>{achievement.name}</AchievementName>
                
                <AchievementDescription>
                  {achievement.description}
                </AchievementDescription>
                
                <Box sx={{ mt: 'auto', mb: 1, width: '100%' }}>
                  {/* Progress bar or completed indicator */}
                  {isCompleted ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <CheckCircle size={16} color="#4CAF50" />
                      <Typography variant="body2" color="success.main">
                        Completed on {formatDate(userAchievement?.earnedAt || '')}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ height: 6, borderRadius: 3 }}
                        color={
                          achievement.tier === 'bronze' ? 'primary' :
                          achievement.tier === 'silver' ? 'info' :
                          achievement.tier === 'gold' ? 'warning' :
                          'secondary'
                        }
                      />
                    </Box>
                  )}
                </Box>
                
                <AchievementReward>
                  <Star size={18} /> {achievement.pointValue} points
                </AchievementReward>
                
                {isCompleted && (
                  <UnlockedOverlay>
                    <Box sx={{ textAlign: 'center' }}>
                      <Sparkles size={40} color="#FFFFFF" style={{ marginBottom: 8 }} />
                      <Typography variant="h6" color="white">
                        Unlocked!
                      </Typography>
                    </Box>
                  </UnlockedOverlay>
                )}
              </AchievementItem>
            );
          })}
        </AchievementGrid>
      </TabPanel>
      
      {/* Rewards Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            Available Rewards
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Star size={18} color="#FFC107" style={{ marginRight: 8 }} />
            <Typography variant="h6" fontWeight="bold">
              {profile.points.toLocaleString()} points
            </Typography>
          </Box>
        </Box>
        
        <RewardGrid>
          {rewards.map((reward) => {
            // Check if the reward is available for this user's tier
            const tierValue = {
              'bronze': 1,
              'silver': 2,
              'gold': 3,
              'platinum': 4
            };
            
            const userTierValue = tierValue[profile.tier] || 0;
            const rewardTierValue = tierValue[reward.tier] || 0;
            const isTierAvailable = userTierValue >= rewardTierValue;
            const isAffordable = profile.points >= reward.pointCost;
            const isInStock = reward.stock > 0;
            const isAvailable = isTierAvailable && isInStock;
            
            // Check if user has already redeemed this reward
            const hasRedeemed = profile.rewards.some(ur => ur.rewardId === reward.id);
            
            return (
              <RewardItem 
                key={reward.id}
                tier={reward.tier}
                whileHover={{ 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                style={{ opacity: isAvailable ? 1 : 0.7 }}
              >
                <RewardBadge tier={reward.tier}>
                  {reward.tier.toUpperCase()}
                </RewardBadge>
                
                <RewardHeader>
                  <RewardIcon tier={reward.tier}>
                    {getIconComponent(reward.icon)}
                  </RewardIcon>
                  
                  <RewardContent>
                    <RewardName>{reward.name}</RewardName>
                    <RewardDescription>
                      {reward.description}
                    </RewardDescription>
                  </RewardContent>
                </RewardHeader>
                
                <Box sx={{ mt: 'auto' }}></Box>
                
                <RewardFooter>
                  <RewardPoints tier={reward.tier}>
                    <Star size={16} /> {reward.pointCost} points
                  </RewardPoints>
                  
                  {reward.stock <= 3 && (
                    <Chip 
                      label={`${reward.stock} left!`} 
                      size="small" 
                      color="error"
                    />
                  )}
                </RewardFooter>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={!isAvailable || !isAffordable}
                    onClick={() => {
                      setSelectedReward(reward);
                      setRewardDialogOpen(true);
                    }}
                    data-testid={`redeem-reward-${reward.id}`}
                  >
                    {isAffordable ? 'Redeem' : 'Not enough points'}
                  </Button>
                </Box>
                
                {!isTierAvailable && (
                  <UnlockedOverlay>
                    <Box sx={{ textAlign: 'center' }}>
                      <AlertCircle size={32} color="#FFFFFF" style={{ marginBottom: 8 }} />
                      <Typography variant="subtitle1" color="white">
                        Reach {reward.tier.toUpperCase()} tier to unlock
                      </Typography>
                    </Box>
                  </UnlockedOverlay>
                )}
                
                {isTierAvailable && reward.stock === 0 && (
                  <UnlockedOverlay>
                    <Box sx={{ textAlign: 'center' }}>
                      <AlertCircle size={32} color="#FFFFFF" style={{ marginBottom: 8 }} />
                      <Typography variant="subtitle1" color="white">
                        Out of stock
                      </Typography>
                    </Box>
                  </UnlockedOverlay>
                )}
              </RewardItem>
            );
          })}
        </RewardGrid>
        
        {profile.rewards.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Your Redeemed Rewards
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reward</TableCell>
                    <TableCell>Date Redeemed</TableCell>
                    <TableCell>Points</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profile.rewards.map((userReward) => (
                    <TableRow key={userReward.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(0, 0, 0, 0.08)' }}>
                            {getIconComponent(userReward.reward.icon)}
                          </Box>
                          <Box>
                            <Typography variant="body2">{userReward.reward.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{userReward.reward.description}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(userReward.redeemedAt)}</TableCell>
                      <TableCell>{userReward.pointsCost}</TableCell>
                      <TableCell>
                        <Chip 
                          label={userReward.status.charAt(0).toUpperCase() + userReward.status.slice(1)} 
                          color={
                            userReward.status === 'fulfilled' ? 'success' :
                            userReward.status === 'pending' ? 'warning' :
                            userReward.status === 'expired' ? 'error' :
                            'default'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </TabPanel>
      
      {/* Activity Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" component="h2" gutterBottom>
          Activity & Transactions
        </Typography>
        
        {/* Streak Calendar */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Workout Streak Calendar
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Zap size={16} color="#1976D2" />
              <Typography variant="body2" color="primary" fontWeight="bold">
                {profile.streakDays} Day Streak!
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }} data-testid="streak-calendar">
            {profile.streakCalendar?.map((day, index) => {
              const date = new Date(day.date);
              const isToday = new Date().toDateString() === date.toDateString();
              
              return (
                <Box
                  key={day.date}
                  sx={{
                    width: 34,
                    height: 34,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: day.completed ? 'success.light' : 'background.paper',
                    border: isToday ? '2px solid' : '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      zIndex: 1,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Typography variant="caption" fontWeight={isToday ? 'bold' : 'normal'}>
                    {date.getDate()}
                  </Typography>
                  {day.completed && (
                    <CheckCircle 
                      size={12} 
                      color="#4CAF50" 
                      style={{ position: 'absolute', bottom: 2, right: 2 }}
                    />
                  )}
                  {day.points > 0 && (
                    <Tooltip title={`${day.points} points earned`}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          position: 'absolute', 
                          top: -14, 
                          right: -5, 
                          bgcolor: 'primary.main', 
                          color: 'white', 
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem'
                        }}
                      >
                        {day.points}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', borderRadius: 1 }} />
              <Typography variant="caption">Workout Completed</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }} />
              <Typography variant="caption">No Workout</Typography>
            </Box>
          </Box>
        </Paper>
        
        {/* Transaction History */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
          Recent Transactions
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Points</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profile.recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right" sx={{ 
                    color: transaction.transactionType === 'earn' || transaction.transactionType === 'bonus' 
                      ? 'success.main' 
                      : 'error.main',
                    fontWeight: 'bold'
                  }}>
                    {transaction.transactionType === 'earn' || transaction.transactionType === 'bonus' 
                      ? `+${transaction.points}` 
                      : `-${transaction.points}`}
                  </TableCell>
                  <TableCell align="right">{transaction.balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Milestone Track */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Your Milestone Journey
          </Typography>
          
          <Card sx={{ p: 3, mb: 4 }}>
            <MilestoneTrack>
              <MilestoneLine />
              
              {milestones.map((milestone, index) => {
                // Check if user has reached this milestone
                const userMilestone = profile.milestones.find(um => um.milestoneId === milestone.id);
                const isReached = !!userMilestone;
                
                // Calculate if this is the current milestone (next one to reach)
                const isActive = !isReached && 
                  profile.points < milestone.targetPoints && 
                  (!profile.nextMilestone || profile.nextMilestone.id === milestone.id);
                
                // Calculate position percentage
                const position = (index / (milestones.length - 1)) * 100;
                
                return (
                  <Box key={milestone.id} sx={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}>
                    <MilestoneNode active={isActive} passed={isReached}>
                      {getIconComponent(milestone.icon)}
                    </MilestoneNode>
                    <MilestoneLabel active={isActive} passed={isReached}>
                      {milestone.name}
                    </MilestoneLabel>
                    <MilestoneValue active={isActive} passed={isReached}>
                      {milestone.targetPoints.toLocaleString()} pts
                    </MilestoneValue>
                  </Box>
                );
              })}
            </MilestoneTrack>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Earn bonus points when reaching each milestone!
              </Typography>
            </Box>
          </Card>
        </Box>
      </TabPanel>
      
      {/* Leaderboard Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" component="h2" gutterBottom>
          Fitness Leaderboard
        </Typography>
        
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {leaderboard.map((user, index) => {
            const isCurrentUser = user.id === profile.id;
            
            return (
              <Box 
                key={user.id}
                sx={{ 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: isCurrentUser ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'
                }}
              >
                <Box 
                  sx={{ 
                    minWidth: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mr: 2,
                    color: index <= 2 ? '#000' : 'text.secondary'
                  }}
                >
                  {index + 1}
                </Box>
                
                <Avatar 
                  src={user.photo || undefined}
                  sx={{ width: 40, height: 40, mr: 2 }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </Avatar>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight={isCurrentUser ? 'bold' : 'normal'}>
                    {user.firstName} {user.lastName} {isCurrentUser && '(You)'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Level {user.level}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Star size={16} color="#FFC107" style={{ marginRight: 4 }} />
                    <Typography variant="body1" fontWeight="bold">
                      {user.points.toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip 
                    label={user.tier.toUpperCase()} 
                    color={
                      user.tier === 'bronze' ? 'default' :
                      user.tier === 'silver' ? 'primary' :
                      user.tier === 'gold' ? 'warning' :
                      'secondary'
                    }
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            );
          })}
        </Paper>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<Users size={16} />}
          >
            View Full Leaderboard
          </Button>
        </Box>
      </TabPanel>

      {/* Progress Tab - Lazy loaded for performance */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" component="h2" gutterBottom>
          Progress Trends
        </Typography>

        {profile.progressSnapshots && profile.progressSnapshots.length > 0 ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Points Progress Over Time
                </Typography>
                <Box sx={{ height: 300, position: 'relative' }}>
                  {/* Enhanced chart component that's lazy loaded */}
                  <Suspense fallback={
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={40} />
                    </Box>
                  }>
                    <ProgressChart snapshots={profile.progressSnapshots} />
                  </Suspense>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Averages
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average Points per Week
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {Math.round(lastMonth / 4).toLocaleString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Points to Gold Tier
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {profile.nextTier === 'gold' ? 
                      (20000 - profile.points).toLocaleString() : 
                      'N/A'}
                  </Typography>
                  
                  {profile.nextTier === 'gold' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      At your current rate, you'll reach Gold in approximately {Math.ceil((20000 - profile.points) / (lastMonth / 4))} weeks.
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Level Progress
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    Level {profile.level} → {profile.level + 1}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={profile.nextLevelProgress} 
                    sx={{ height: 8, borderRadius: 4, mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(profile.nextLevelProgress)}% Complete
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Points Timeline
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Points</TableCell>
                        <TableCell>Achievements</TableCell>
                        <TableCell>Tier</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profile.progressSnapshots.map((snapshot, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(snapshot.date)}</TableCell>
                          <TableCell>{snapshot.level}</TableCell>
                          <TableCell>{snapshot.points.toLocaleString()}</TableCell>
                          <TableCell>{snapshot.achievements}</TableCell>
                          <TableCell>
                            <Chip 
                              label={snapshot.tier.toUpperCase()} 
                              color={
                                snapshot.tier === 'bronze' ? 'default' :
                                snapshot.tier === 'silver' ? 'primary' :
                                snapshot.tier === 'gold' ? 'warning' :
                                'secondary'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No progress data available yet. Check back after you've earned more points!
            </Typography>
          </Box>
        )}
      </TabPanel>
      
      {/* Reward Redemption Dialog */}
      <Dialog
        open={rewardDialogOpen}
        onClose={() => {
          if (!redeemingReward) {
            setRewardDialogOpen(false);
            setSelectedReward(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Redeem Reward</DialogTitle>
        <DialogContent>
          {selectedReward && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(0, 0, 0, 0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mr: 2
                }}>
                  {getIconComponent(selectedReward.icon)}
                </Box>
                <Box>
                  <Typography variant="h6">{selectedReward.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReward.description}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Your points:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {profile.points.toLocaleString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Cost:</Typography>
                <Typography variant="body1" fontWeight="bold" color={selectedReward.pointCost > profile.points ? 'error.main' : 'success.main'}>
                  {selectedReward.pointCost.toLocaleString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Remaining points:</Typography>
                <Typography variant="body1" fontWeight="bold" color={selectedReward.pointCost > profile.points ? 'error.main' : 'inherit'}>
                  {(profile.points - selectedReward.pointCost).toLocaleString()}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary">
                By redeeming this reward, the points will be deducted from your account. This action cannot be undone.
              </Typography>
              
              {selectedReward.pointCost > profile.points && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="error.main">
                    <AlertCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    You don't have enough points to redeem this reward.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setRewardDialogOpen(false);
              setSelectedReward(null);
            }}
            disabled={redeemingReward}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            disabled={!selectedReward || selectedReward.pointCost > profile.points || redeemingReward}
            onClick={() => selectedReward && handleRedeemReward(selectedReward.id)}
            data-testid="confirm-redemption-button"
          >
            {redeemingReward ? 'Redeeming...' : 'Confirm Redemption'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

// Create a folder with components if it doesn't exist already
// C:\Users\ogpsw\Desktop\quick-pt\SS-PT\frontend\src\components\DashBoard\Pages\client-gamification\components\ProgressChart.tsx

export default React.memo(ClientGamificationView);