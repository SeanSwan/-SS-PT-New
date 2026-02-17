import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, DialogActions, Button, CircularProgress, Typography, Chip } from '../../../ui/primitives/components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import useWindowSize from '../../../../hooks/useWindowSize';

// Import icon components
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  ChevronDown,
  Dumbbell,
  Flame,
  Heart,
  Medal,
  PlayCircle,
  Repeat,
  Star,
  Stats,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap,
  Clock,
  Check,
  X,
  Plus,
  Gift,
  Unlock,
  Lock,
  Video,
  MessageCircle,
  Bell,
  Menu,
  Settings,
  ChevronUp,
  Info,
  HelpCircle,
  BookOpen,
  Share2,
  CheckCircle,
  PieChart,
  Layers,
  RefreshCw,
  AlertTriangle,
  Smile,
  ThumbsUp,
  Coffee,
  Music,
  MapPin,
  FileText,
  Move,
  Upload
} from 'lucide-react';

// Import layout components
import DashboardLayout from './components/layout/DashboardLayout';

// Import card components
import OverallProgressCard from './components/cards/OverallProgressCard';
import ScheduledSessionsCard from './components/cards/ScheduledSessionsCard';

// Import progress components
import NasmCategoryProgress from './components/progress/NasmCategoryProgress';

// Import exercise components
import KeyExerciseProgress from './components/exercises/KeyExerciseProgress';
import RecommendedExercises from './components/exercises/RecommendedExercises';

// Import achievement components
import AchievementsCard from './components/achievements/AchievementsCard';

// Import gamification components
import ChallengesCard from './components/gamification/ChallengesCard';
import RewardsCard from './components/gamification/RewardsCard';
import AchievementNotification from './components/gamification/AchievementNotification';

// Import types
import {
  ProgressLevel,
  Achievement,
  Challenge,
  Exercise,
  NasmCategory,
  BodyPartProgress,
  ActivitySummary,
  UserStats,
  KeyExercises,
  Reward,
  ScheduledSession
} from './types';

import { PageContainer } from './components/styled-components';

/**
 * Enhanced Client Dashboard Component
 * Displays client's fitness progress with gamification elements
 */
const EnhancedClientDashboard: React.FC = () => {
  const { user, services } = useAuth();
  const { toast } = useToast();
  const { width } = useWindowSize();
  
  // State for tracked metrics
  const [points, setPoints] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastWorkout, setLastWorkout] = useState<string | null>(null);

  // State for client progress data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Overall level information
  const [overallLevel, setOverallLevel] = useState<ProgressLevel>({
    level: 0,
    name: 'Fitness Novice',
    description: 'You are just beginning your fitness journey',
    progress: 0,
    totalNeeded: 100
  });

  // NASM protocol categories progress
  const [nasmCategories, setNasmCategories] = useState<NasmCategory[]>([
    { type: 'core', name: 'Core & Stability', level: 0, progress: 0, icon: <Target size={16} />, color: 'primary' },
    { type: 'balance', name: 'Balance', level: 0, progress: 0, icon: <Activity size={16} />, color: 'info' },
    { type: 'flexibility', name: 'Flexibility', level: 0, progress: 0, icon: <Move size={16} />, color: 'secondary' },
    { type: 'calisthenics', name: 'Calisthenics', level: 0, progress: 0, icon: <Zap size={16} />, color: 'warning' },
    { type: 'isolation', name: 'Isolation', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'success' },
    { type: 'stabilizers', name: 'Stabilizers', level: 0, progress: 0, icon: <Target size={16} />, color: 'primary' },
    { type: 'injury_prevention', name: 'Injury Prevention', level: 0, progress: 0, icon: <Heart size={16} />, color: 'error' },
    { type: 'injury_recovery', name: 'Injury Recovery', level: 0, progress: 0, icon: <RefreshCw size={16} />, color: 'success' }
  ]);
  
  // Body part progress
  const [bodyPartProgress, setBodyPartProgress] = useState<BodyPartProgress[]>([
    { name: 'Glutes', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'primary' },
    { name: 'Calves', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'info' },
    { name: 'Shoulders', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'secondary' },
    { name: 'Hamstrings', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'warning' },
    { name: 'Abs', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'success' },
    { name: 'Chest', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'primary' }
  ]);
  
  // Exercise progression
  const [keyExercises, setKeyExercises] = useState<KeyExercises>({
    squats: { level: 0, progress: 0 },
    lunges: { level: 0, progress: 0 },
    planks: { level: 0, progress: 0 },
    reversePlanks: { level: 0, progress: 0 }
  });

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'core-10', name: 'Core Beginner', icon: <Target />, description: 'Reach level 10 in Core exercises', unlocked: false, points: 100 },
    { id: 'balance-10', name: 'Balanced Start', icon: <Activity />, description: 'Reach level 10 in Balance exercises', unlocked: false, points: 100 },
    { id: 'flexibility-10', name: 'First Stretch', icon: <Move />, description: 'Reach level 10 in Flexibility', unlocked: false, points: 100 },
    { id: 'calisthenics-10', name: 'Bodyweight Basics', icon: <Zap />, description: 'Reach level 10 in Calisthenics', unlocked: false, points: 100 },
    { id: 'squats-10', name: 'Squat Novice', icon: <Dumbbell />, description: 'Reach level 10 in Squats', unlocked: false, points: 150 },
    { id: 'lunges-10', name: 'Lunge Beginner', icon: <Dumbbell />, description: 'Reach level 10 in Lunges', unlocked: false, points: 150 },
    { id: 'planks-10', name: 'Plank Starter', icon: <Target />, description: 'Reach level 10 in Planks', unlocked: false, points: 150 },
    { id: 'overall-50', name: 'Fitness Journey', icon: <Award />, description: 'Reach overall level 50', unlocked: false, points: 500 },
    { id: 'streak-7', name: 'Weekly Warrior', icon: <Flame />, description: 'Maintain a 7-day workout streak', unlocked: false, points: 200 },
    { id: 'streak-30', name: 'Monthly Master', icon: <Flame />, description: 'Maintain a 30-day workout streak', unlocked: false, points: 500 },
    { id: 'workouts-10', name: 'Dedicated Athlete', icon: <Dumbbell />, description: 'Complete 10 workouts', unlocked: false, points: 200 },
    { id: 'workouts-50', name: 'Fitness Fanatic', icon: <Dumbbell />, description: 'Complete 50 workouts', unlocked: false, points: 500 }
  ]);

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: 'challenge-1',
      title: '30-Day Core Challenge',
      description: 'Complete 30 consecutive days of core exercises',
      reward: '500 points + Core Master Badge',
      progress: 12,
      goal: 30,
      endDate: '2025-06-05',
      active: true
    },
    {
      id: 'challenge-2',
      title: 'Strength Builder',
      description: 'Increase your max weight on 3 different exercises',
      reward: '300 points + Strength Badge',
      progress: 1,
      goal: 3,
      endDate: '2025-05-30',
      active: true
    },
    {
      id: 'challenge-3',
      title: 'Cardio Crusher',
      description: 'Complete 20 cardio sessions of at least 20 minutes',
      reward: '400 points + Cardio Badge',
      progress: 8,
      goal: 20,
      endDate: '2025-06-15',
      active: true
    }
  ]);

  // Rewards
  const [rewards, setRewards] = useState<Reward[]>([
    {
      id: 'reward-1',
      title: 'Free Session',
      description: 'One free personal training session',
      icon: '🏋️',
      requiredPoints: 1000,
      unlocked: false
    },
    {
      id: 'reward-2',
      title: 'Protein Shake',
      description: 'Free protein shake at the gym bar',
      icon: '🥤',
      requiredPoints: 500,
      unlocked: false
    },
    {
      id: 'reward-3',
      title: 'Exclusive Workout',
      description: 'Access to premium workout video',
      icon: '📹',
      requiredPoints: 750,
      unlocked: false
    },
    {
      id: 'reward-4',
      title: 'Gym Swag',
      description: 'Branded gym T-shirt',
      icon: '👕',
      requiredPoints: 1500,
      unlocked: false
    }
  ]);

  // Scheduled sessions
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([
    {
      id: 'session-1',
      title: 'Full Body Workout',
      date: '2025-05-07',
      time: '10:00 AM',
      duration: 60,
      trainerName: 'Mike Smith',
      location: 'Main Gym',
      type: 'Strength',
      isActive: true
    },
    {
      id: 'session-2',
      title: 'HIIT Training',
      date: '2025-05-09',
      time: '3:00 PM',
      duration: 45,
      trainerName: 'Mike Smith',
      location: 'Studio B',
      type: 'Cardio',
      isActive: false
    },
    {
      id: 'session-3',
      title: 'Flexibility Focus',
      date: '2025-05-12',
      time: '11:00 AM',
      duration: 60,
      trainerName: 'Mike Smith',
      location: 'Yoga Room',
      type: 'Flexibility',
      isActive: false
    }
  ]);

  // Activity summary for heatmap
  const [activitySummary, setActivitySummary] = useState<ActivitySummary[]>([]);

  // Recommended exercises
  const [recommendedExercises, setRecommendedExercises] = useState<Exercise[]>([]);

  // User stats
  const [userStats, setUserStats] = useState<UserStats>({
    workoutsCompleted: 12,
    totalExercisesPerformed: 156,
    streakDays: 3,
    totalMinutes: 420,
    calories: 12540,
    personalBests: 5
  });

  // UI state
  const [isNewAchievement, setIsNewAchievement] = useState<boolean>(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [showChallengesDialog, setShowChallengesDialog] = useState(false);

  // Initialize activity summary for heatmap (last 30 days)
  useEffect(() => {
    const today = new Date();
    const summary: ActivitySummary[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Random data for demonstration
      const hasWorkout = Math.random() > 0.6;
      summary.push({
        date: date.toISOString().split('T')[0],
        workouts: hasWorkout ? Math.floor(Math.random() * 2) + 1 : 0,
        exercises: hasWorkout ? Math.floor(Math.random() * 10) + 5 : 0,
        duration: hasWorkout ? Math.floor(Math.random() * 60) + 30 : 0,
        intensity: hasWorkout ? Math.floor(Math.random() * 5) : 0
      });
    }
    
    setActivitySummary(summary);
  }, []);

  // Load client progress data
  const fetchClientProgress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the client progress service if available
      if (services?.clientProgress?.getClientProgress) {
        const result = await services.clientProgress.getClientProgress();
        
        if (result && result.success) {
          processClientProgressData(result.progress);
        } else {
          // Fall back to mock data if service call wasn't successful
          useMockData();
        }
      } else {
        // Use mock data if service is not available
        useMockData();
      }
    } catch (err) {
      console.error('Error fetching client progress:', err);
      useMockData();
      
      toast({
        title: "Data Loading Notice",
        description: "Using demo data to showcase your fitness journey.",
        variant: "default"
      });
    } finally {
      setLoading(false);
    }
  };

  // Process client progress data from API
  const processClientProgressData = (progressData: any) => {
    // Update points
    setPoints(progressData.points || 2450);
    
    // Update streak data
    setStreak(progressData.streakDays || 3);
    setLastWorkout(progressData.lastWorkoutDate || '2025-05-05');
    
    // Update overall level
    setOverallLevel({
      level: progressData.overallLevel || 27,
      name: getLevelName(progressData.overallLevel || 27),
      description: getLevelDescription(progressData.overallLevel || 27),
      progress: progressData.experiencePoints || 65,
      totalNeeded: calculateXpForNextLevel(progressData.overallLevel || 27)
    });
    
    // Update other state variables as needed...
    // This would include updating NASM categories, body part progress, 
    // key exercises, achievements, etc. with real data
  };

  // Use mock data for demonstration
  const useMockData = () => {
    // Set mock points and streak data
    setPoints(2450);
    setStreak(3);
    setLastWorkout('2025-05-05');
    
    // Set a mock overall level
    setOverallLevel({
      level: 27,
      name: 'Fitness Enthusiast',
      description: 'You have established a consistent fitness routine',
      progress: 65,
      totalNeeded: 100
    });
    
    // Set mock NASM categories
    setNasmCategories([
      { type: 'core', name: 'Core & Stability', level: 35, progress: 70, icon: <Target size={16} />, color: 'primary' },
      { type: 'balance', name: 'Balance', level: 22, progress: 45, icon: <Activity size={16} />, color: 'info' },
      { type: 'flexibility', name: 'Flexibility', level: 40, progress: 25, icon: <Move size={16} />, color: 'secondary' },
      { type: 'calisthenics', name: 'Calisthenics', level: 30, progress: 60, icon: <Zap size={16} />, color: 'warning' },
      { type: 'isolation', name: 'Isolation', level: 18, progress: 30, icon: <Dumbbell size={16} />, color: 'success' },
      { type: 'stabilizers', name: 'Stabilizers', level: 25, progress: 50, icon: <Target size={16} />, color: 'primary' },
      { type: 'injury_prevention', name: 'Injury Prevention', level: 15, progress: 80, icon: <Heart size={16} />, color: 'error' },
      { type: 'injury_recovery', name: 'Injury Recovery', level: 10, progress: 20, icon: <RefreshCw size={16} />, color: 'success' }
    ]);
    
    // Set mock body part progress
    setBodyPartProgress([
      { name: 'Glutes', level: 38, progress: 75, icon: <Dumbbell size={16} />, color: 'primary' },
      { name: 'Calves', level: 25, progress: 40, icon: <Dumbbell size={16} />, color: 'info' },
      { name: 'Shoulders', level: 30, progress: 60, icon: <Dumbbell size={16} />, color: 'secondary' },
      { name: 'Hamstrings', level: 35, progress: 50, icon: <Dumbbell size={16} />, color: 'warning' },
      { name: 'Abs', level: 42, progress: 35, icon: <Dumbbell size={16} />, color: 'success' },
      { name: 'Chest', level: 28, progress: 65, icon: <Dumbbell size={16} />, color: 'primary' }
    ]);
    
    // Set mock key exercises
    setKeyExercises({
      squats: { level: 45, progress: 70 },
      lunges: { level: 32, progress: 60 },
      planks: { level: 40, progress: 80 },
      reversePlanks: { level: 28, progress: 50 }
    });
    
    // Set mock achievements with some unlocked
    setAchievements(prevAchievements => 
      prevAchievements.map(achievement => {
        // Make some achievements unlocked for demonstration
        if (['core-10', 'balance-10', 'flexibility-10', 'calisthenics-10', 'squats-10', 'lunges-10', 'planks-10'].includes(achievement.id)) {
          return {
            ...achievement,
            unlocked: true,
            dateUnlocked: achievement.id === 'core-10' ? '2025-02-15' :
                         achievement.id === 'balance-10' ? '2025-03-02' :
                         achievement.id === 'flexibility-10' ? '2025-02-20' :
                         achievement.id === 'calisthenics-10' ? '2025-03-10' :
                         achievement.id === 'squats-10' ? '2025-02-10' :
                         achievement.id === 'lunges-10' ? '2025-02-25' :
                         '2025-03-05'
          };
        }
        return achievement;
      })
    );
    
    // Set mock user stats
    setUserStats({
      workoutsCompleted: 12,
      totalExercisesPerformed: 156,
      streakDays: 3,
      totalMinutes: 420,
      calories: 12540,
      personalBests: 5
    });
    
    // Set mock rewards with one unlocked
    setRewards(prevRewards => 
      prevRewards.map(reward => 
        reward.id === 'reward-2' ? { ...reward, unlocked: true } : reward
      )
    );
    
    // Set mock recommended exercises
    setRecommendedExercises([
      {
        id: '1',
        name: 'Bodyweight Squats',
        type: 'core',
        level: 10,
        sets: 3,
        reps: 15,
        muscleGroups: ['Glutes', 'Quadriceps'],
        icon: <Dumbbell size={20} />
      },
      {
        id: '2',
        name: 'Bird Dog',
        type: 'core',
        level: 15,
        sets: 3,
        reps: 10,
        muscleGroups: ['Core', 'Lower Back'],
        icon: <Target size={20} />
      },
      {
        id: '3',
        name: 'Standing Hamstring Stretch',
        type: 'flexibility',
        level: 5,
        sets: 2,
        reps: 30,
        muscleGroups: ['Hamstrings', 'Lower Back'],
        icon: <Move size={20} />
      },
      {
        id: '4',
        name: 'Mountain Climbers',
        type: 'calisthenics',
        level: 18,
        sets: 3,
        reps: 20,
        muscleGroups: ['Core', 'Shoulders', 'Hip Flexors'],
        icon: <Zap size={20} />
      },
      {
        id: '5',
        name: 'Pike Push-Ups',
        type: 'calisthenics',
        level: 22,
        sets: 3,
        reps: 12,
        muscleGroups: ['Shoulders', 'Triceps', 'Core'],
        icon: <Zap size={20} />
      }
    ]);
  };

  // Helper function to get level name based on level number
  const getLevelName = (level: number): string => {
    if (level < 10) return 'Fitness Novice';
    if (level < 25) return 'Fitness Beginner';
    if (level < 50) return 'Fitness Enthusiast';
    if (level < 100) return 'Fitness Adept';
    if (level < 200) return 'Fitness Specialist';
    if (level < 350) return 'Fitness Expert';
    if (level < 500) return 'Fitness Master';
    if (level < 750) return 'Fitness Elite';
    return 'Fitness Champion';
  };
  
  // Helper function to get level description based on level number
  const getLevelDescription = (level: number): string => {
    if (level < 10) return 'You are just beginning your fitness journey';
    if (level < 25) return 'You are developing foundational fitness skills';
    if (level < 50) return 'You have established a consistent fitness routine';
    if (level < 100) return 'You are competent across multiple fitness domains';
    if (level < 200) return 'You have specialized knowledge in several fitness areas';
    if (level < 350) return 'You possess advanced understanding of fitness principles';
    if (level < 500) return 'You have mastered core fitness concepts and execution';
    if (level < 750) return 'You perform at an elite level in most fitness domains';
    return 'You have reached the pinnacle of fitness achievement';
  };
  
  // Helper function to calculate XP needed for next level
  const calculateXpForNextLevel = (currentLevel: number): number => {
    // A simple formula that increases XP requirements as levels increase
    return Math.floor(100 + (currentLevel * 25));
  };

  // Simulate unlocking a new achievement
  const simulateNewAchievement = () => {
    // Find a locked achievement to unlock
    const lockedAchievements = achievements.filter(a => !a.unlocked);
    
    if (lockedAchievements.length > 0) {
      const randomIndex = Math.floor(Math.random() * lockedAchievements.length);
      const achievementToUnlock = lockedAchievements[randomIndex];
      
      // Update the achievements state
      setAchievements(prevAchievements => 
        prevAchievements.map(a => 
          a.id === achievementToUnlock.id 
            ? { ...a, unlocked: true, dateUnlocked: new Date().toISOString() } 
            : a
        )
      );
      
      // Show achievement notification
      setNewAchievement(achievementToUnlock);
      setIsNewAchievement(true);
      
      // Update points
      setPoints(prevPoints => prevPoints + achievementToUnlock.points);
      
      // After 5 seconds, hide the notification
      setTimeout(() => {
        setIsNewAchievement(false);
      }, 5000);
    }
  };

  // Claim a reward
  const claimReward = (rewardId: string) => {
    // Find the reward
    const reward = rewards.find(r => r.id === rewardId);
    
    if (reward && points >= reward.requiredPoints && !reward.unlocked) {
      // Update the rewards state
      setRewards(prevRewards => 
        prevRewards.map(r => 
          r.id === rewardId ? { ...r, unlocked: true } : r
        )
      );
      
      // Deduct points
      setPoints(prevPoints => prevPoints - reward.requiredPoints);
      
      // Show toast notification
      toast({
        title: "Reward Claimed!",
        description: `You have claimed: ${reward.title}`,
        variant: "default"
      });
    } else if (reward && reward.unlocked) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed this reward.",
        variant: "default"
      });
    } else {
      toast({
        title: "Not Enough Points",
        description: "You don't have enough points to claim this reward.",
        variant: "destructive"
      });
    }
  };

  // Handle view all challenges
  const handleViewAllChallenges = () => {
    setShowChallengesDialog(true);
  };

  // Handle view all rewards
  const handleViewAllRewards = () => {
    setShowRewardsDialog(true);
  };

  // Handle start focused training
  const handleStartFocusedTraining = () => {
    toast({
      title: "Training Session Started",
      description: "Your focused training session has been started. Follow the guidance on screen.",
      variant: "default"
    });
  };

  // Handle schedule new session
  const handleScheduleNewSession = () => {
    toast({
      title: "Scheduling",
      description: "Opening the session scheduling interface.",
      variant: "default"
    });
  };

  // Load data on component mount
  useEffect(() => {
    fetchClientProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render challenges dialog
  const renderChallengesDialog = () => {
    return (
      <Dialog
        open={showChallengesDialog}
        onClose={() => setShowChallengesDialog(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          style: {
            background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px'
          }
        }}
      >
        <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={20} />
          Active Challenges
        </DialogTitle>
        <DialogContent>
          {challenges.map((challenge) => (
            <Box key={challenge.id} style={{ marginBottom: 16 }}>
              <ChallengesCard challenges={[challenge]} />
            </Box>
          ))}
        </DialogContent>
        <DialogActions style={{ padding: '24px' }}>
          <Button
            variant="outlined"
            onClick={() => setShowChallengesDialog(false)}
            style={{ borderRadius: '8px', padding: '8px 24px' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Render rewards dialog
  const renderRewardsDialog = () => {
    return (
      <Dialog
        open={showRewardsDialog}
        onClose={() => setShowRewardsDialog(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          style: {
            background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '15px'
          }
        }}
      >
        <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gift size={20} />
          Rewards Shop
          <Box style={{ marginLeft: 'auto', background: 'rgba(255, 255, 255, 0.1)', padding: '4px 16px', borderRadius: 8 }}>
            <Typography variant="body2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} /> {points} Points
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {rewards.map((reward) => (
              <Box
                key={reward.id}
                style={{
                  padding: 16,
                  borderRadius: '10px',
                  background: reward.unlocked ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${reward.unlocked ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                }}
              >
                <Box style={{ fontSize: '2rem', marginBottom: 8 }}>
                  {reward.icon}
                </Box>
                <Typography variant="subtitle1">
                  {reward.title}
                </Typography>
                <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 16 }}>
                  {reward.description}
                </Typography>

                <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip
                    label={`${reward.requiredPoints} pts`}
                    size="small"
                    style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  />

                  {reward.unlocked ? (
                    <Chip
                      label="Claimed"
                      size="small"
                      color="success"
                    />
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={points >= reward.requiredPoints ? <Unlock size={14} /> : <Lock size={14} />}
                      onClick={() => claimReward(reward.id)}
                      disabled={points < reward.requiredPoints}
                      style={{
                        opacity: points >= reward.requiredPoints ? 1 : 0.5,
                        fontSize: '0.8rem',
                        padding: '4px 12px'
                      }}
                    >
                      Claim
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: '24px' }}>
          <Button
            variant="outlined"
            onClick={() => setShowRewardsDialog(false)}
            style={{ borderRadius: '8px', padding: '8px 24px' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Loading state
  if (loading) {
    return (
      <PageContainer>
        <Box style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <CircularProgress size={60} style={{ color: '#00ffff', marginBottom: 24 }} />
          <Typography variant="h6">Loading your fitness dashboard...</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <DashboardLayout 
      points={points} 
      streak={streak}
      onViewChallenges={() => setShowChallengesDialog(true)}
      onViewRewards={() => setShowRewardsDialog(true)}
    >
      {/* Overall Progress Card */}
      <OverallProgressCard 
        overallLevel={overallLevel}
        userStats={userStats}
        activitySummary={activitySummary}
      />
      
      {/* NASM Protocol Progress Card */}
      <NasmCategoryProgress 
        nasmCategories={nasmCategories}
      />
      
      {/* Key Exercise Progress Card */}
      <KeyExerciseProgress 
        keyExercises={keyExercises}
        onStartTraining={handleStartFocusedTraining}
      />
      
      {/* Achievements Card */}
      <AchievementsCard 
        achievements={achievements}
      />
      
      {/* Recommended Exercises Card */}
      <RecommendedExercises 
        exercises={recommendedExercises}
      />
      
      {/* Challenges Card */}
      <ChallengesCard 
        challenges={challenges}
        onViewAllChallenges={handleViewAllChallenges}
      />
      
      {/* Rewards Card */}
      <RewardsCard 
        rewards={rewards}
        points={points}
        onClaimReward={claimReward}
        onViewAllRewards={handleViewAllRewards}
      />
      
      {/* Scheduled Sessions Card */}
      <ScheduledSessionsCard 
        sessions={scheduledSessions}
        onScheduleMore={handleScheduleNewSession}
      />
      
      {/* Achievement Notification */}
      <AchievementNotification 
        isVisible={isNewAchievement} 
        achievement={newAchievement}
      />
      
      {/* Dialogs */}
      {renderChallengesDialog()}
      {renderRewardsDialog()}
      
      {/* Debug Button - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 1000
          }}
        >
          <Button
            variant="contained"
            onClick={simulateNewAchievement}
            style={{ borderRadius: '8px' }}
          >
            Simulate Achievement
          </Button>
        </Box>
      )}
    </DashboardLayout>
  );
};

export default EnhancedClientDashboard;
