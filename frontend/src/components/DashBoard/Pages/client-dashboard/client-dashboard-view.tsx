import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { Exercise as ExerciseType, RecommendedExercisesResponse } from '../../../../services/exercise-service';
import { ClientProgressData } from '../../../../services/client-progress-service';
import { useToast } from '../../../../hooks/use-toast';

  // Import icons
import {
  Activity,
  Award,
  BarChart2,
  Calendar,
  Dumbbell,
  Flame,
  Heart,
  PlayCircle,
  Repeat,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Zap,
  // Exercise type icons
  Shield,
  RefreshCw,
  FastForward,
  Anchor,
  Grid as GridIcon, // Renamed to avoid conflict
  // Body part icons
  CheckCircle,
  Plus
} from 'lucide-react';

// Material UI
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material';

// Styled components
import {
  PageContainer,
  ContentContainer,
  DashboardGrid,
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  ProgressBarContainer,
  ProgressBarLabel,
  ProgressBarName,
  ProgressBarValue,
  StyledLinearProgress,
  LevelBadge,
  LevelInfo,
  LevelName,
  LevelDescription,
  LevelProgress,
  NextLevelContainer,
  AchievementGrid,
  AchievementItem,
  ExerciseRow,
  ExerciseIcon,
  ExerciseInfo,
  ExerciseName,
  ExerciseDetails,
  ExerciseLevel,
  StatsGrid,
  StatCard,
  StatValue,
  StatLabel,
  containerVariants,
  itemVariants,
  staggeredItemVariants
} from './styled-client-dashboard';

// Define types for client progress
interface ProgressLevel {
  level: number;
  name: string;
  description: string;
  progress: number;
  totalNeeded: number;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  dateUnlocked?: string;
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  level: number;
  sets: number;
  reps: number;
  muscleGroups: string[];
  icon: string;
}

// Convert backend Exercise type to our frontend Exercise interface
const convertToExercise = (backendExercise: ExerciseType): Exercise => {
  return {
    id: backendExercise.id,
    name: backendExercise.name,
    type: backendExercise.exerciseType,
    level: backendExercise.difficulty,
    sets: backendExercise.recommendedSets || 3,
    reps: backendExercise.recommendedReps || 10,
    muscleGroups: backendExercise.primaryMuscles || [],
    icon: getIconForExerciseType(backendExercise.exerciseType)
  };
};

// Helper to get appropriate icon based on exercise type
const getIconForExerciseType = (type: string): string => {
  switch (type) {
    case 'core': return 'Anchor';
    case 'balance': return 'Shield';
    case 'stability': return 'Anchor';
    case 'flexibility': return 'Activity';
    case 'calisthenics': return 'Activity';
    case 'isolation': return 'Target';
    case 'stabilizers': return 'Anchor';
    case 'injury_prevention': return 'Shield';
    case 'injury_recovery': return 'RefreshCw';
    case 'compound': return 'Dumbbell';
    default: return 'Dumbbell';
  }
};

interface NasmCategory {
  type: string;
  name: string;
  level: number;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

interface BodyPartProgress {
  name: string;
  level: number;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

/**
 * Client Dashboard View
 * Displays client's progress through the NASM-based fitness protocol
 * with gamification elements and level tracking from 0-1000
 */
const ClientDashboardView: React.FC = () => {
  const { authAxios, user, services } = useAuth();
  const { toast } = useToast();
  
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
    { type: 'core', name: 'Core & Stability', level: 0, progress: 0, icon: <Anchor size={16} />, color: 'primary' },
    { type: 'balance', name: 'Balance', level: 0, progress: 0, icon: <Shield size={16} />, color: 'info' },
    { type: 'flexibility', name: 'Flexibility', level: 0, progress: 0, icon: <Activity size={16} />, color: 'secondary' },
    { type: 'calisthenics', name: 'Calisthenics', level: 0, progress: 0, icon: <Activity size={16} />, color: 'warning' },
    { type: 'isolation', name: 'Isolation', level: 0, progress: 0, icon: <Target size={16} />, color: 'success' },
    { type: 'stabilizers', name: 'Stabilizers', level: 0, progress: 0, icon: <Anchor size={16} />, color: 'primary' },
    { type: 'injury_prevention', name: 'Injury Prevention', level: 0, progress: 0, icon: <Shield size={16} />, color: 'error' },
    { type: 'injury_recovery', name: 'Injury Recovery', level: 0, progress: 0, icon: <RefreshCw size={16} />, color: 'success' }
  ]);
  
  // Body part progress
  const [bodyPartProgress, setBodyPartProgress] = useState<BodyPartProgress[]>([
    { name: 'Glutes', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'primary' },
    { name: 'Calves', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'info' },
    { name: 'Shoulders', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'secondary' },
    { name: 'Hamstrings', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'warning' },
    { name: 'Abs', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'success' },
    { name: 'Chest', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'primary' },
    { name: 'Biceps', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'info' },
    { name: 'Triceps', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'secondary' },
    { name: 'Tibialis Anterior', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'warning' },
    { name: 'Serratus Anterior', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'success' },
    { name: 'Latissimus Dorsi', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'primary' },
    { name: 'Hips', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'info' },
    { name: 'Lower Back', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'secondary' },
    { name: 'Wrists & Forearms', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'warning' },
    { name: 'Neck', level: 0, progress: 0, icon: <Dumbbell size={16} />, color: 'success' }
  ]);
  
  // Exercise progression
  const [keyExercises, setKeyExercises] = useState<{[key: string]: {level: number, progress: number}}>({
    squats: { level: 0, progress: 0 },
    lunges: { level: 0, progress: 0 },
    planks: { level: 0, progress: 0 },
    reversePlanks: { level: 0, progress: 0 }
  });
  
  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'core-10', name: 'Core Beginner', icon: 'Anchor', description: 'Reach level 10 in Core exercises', unlocked: false },
    { id: 'balance-10', name: 'Balanced Start', icon: 'Shield', description: 'Reach level 10 in Balance exercises', unlocked: false },
    { id: 'flexibility-10', name: 'First Stretch', icon: 'Activity', description: 'Reach level 10 in Flexibility', unlocked: false },
    { id: 'calisthenics-10', name: 'Bodyweight Basics', icon: 'Activity', description: 'Reach level 10 in Calisthenics', unlocked: false },
    { id: 'squats-10', name: 'Squat Novice', icon: 'Dumbbell', description: 'Reach level 10 in Squats', unlocked: false },
    { id: 'lunges-10', name: 'Lunge Beginner', icon: 'Dumbbell', description: 'Reach level 10 in Lunges', unlocked: false },
    { id: 'planks-10', name: 'Plank Starter', icon: 'Anchor', description: 'Reach level 10 in Planks', unlocked: false },
    { id: 'overall-50', name: 'Fitness Journey', icon: 'Award', description: 'Reach overall level 50', unlocked: false }
  ]);
  
  // Recommended exercises
  const [recommendedExercises, setRecommendedExercises] = useState<Exercise[]>([]);
  const [focusCategories, setFocusCategories] = useState<string[]>([]);
  
  // User stats
  const [userStats, setUserStats] = useState({
    workoutsCompleted: 12,
    totalExercisesPerformed: 156,
    streakDays: 3,
    totalMinutes: 420
  });
  
  // Load client progress data
  const fetchClientProgress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the client progress service
      const result = await services.clientProgress.getClientProgress();
      
      if (result && result.success) {
        // Process the data and update all state variables
        const progressData = result.progress;
        
        // Update overall level
        setOverallLevel({
          level: progressData.overallLevel,
          name: getLevelName(progressData.overallLevel),
          description: getLevelDescription(progressData.overallLevel),
          progress: progressData.experiencePoints,
          totalNeeded: calculateXpForNextLevel(progressData.overallLevel)
        });
        
        // Update NASM categories
        setNasmCategories(prevCategories => 
          prevCategories.map(category => ({
            ...category,
            level: progressData[`${category.type}Level`] || 0,
            progress: calculateLevelProgress(
              progressData[`${category.type}Level`] || 0, 
              progressData[`${category.type}ExperiencePoints`] || 0
            )
          }))
        );
        
        // Update body part progress
        const updatedBodyParts = bodyPartProgress.map(part => {
          const fieldName = part.name.toLowerCase().replace(/\s+/g, '');
          const levelField = `${fieldName}Level`;
          return {
            ...part,
            level: progressData[levelField] || 0,
            progress: Math.min(75, Math.max(25, Math.floor(Math.random() * 100))) // For demo, randomize progress
          };
        });
        setBodyPartProgress(updatedBodyParts);
        
        // Update key exercises
        setKeyExercises({
          squats: { 
            level: progressData.squatsLevel || 0, 
            progress: calculateLevelProgress(
              progressData.squatsLevel || 0, 
              progressData.squatsExperiencePoints || 0
            )
          },
          lunges: { 
            level: progressData.lungesLevel || 0, 
            progress: calculateLevelProgress(
              progressData.lungesLevel || 0, 
              progressData.lungesExperiencePoints || 0
            )
          },
          planks: { 
            level: progressData.planksLevel || 0, 
            progress: calculateLevelProgress(
              progressData.planksLevel || 0, 
              progressData.planksExperiencePoints || 0
            )
          },
          reversePlanks: { 
            level: progressData.reversePlanksLevel || 0, 
            progress: calculateLevelProgress(
              progressData.reversePlanksLevel || 0, 
              progressData.reversePlanksExperiencePoints || 0
            )
          },
        });
        
        // Update achievements
        if (progressData.achievements && Array.isArray(progressData.achievements)) {
          setAchievements(prevAchievements => 
            prevAchievements.map(achievement => ({
              ...achievement,
              unlocked: progressData.achievements.includes(achievement.id),
              dateUnlocked: progressData.achievementDates?.[achievement.id] || undefined
            }))
          );
        }
        
        // Fetch recommended exercises
        fetchRecommendedExercises();
        
        // Update user stats
        setUserStats({
          workoutsCompleted: progressData.workoutsCompleted || 0,
          totalExercisesPerformed: progressData.totalExercisesPerformed || 0,
          streakDays: progressData.streakDays || 0,
          totalMinutes: progressData.totalMinutes || 0
        });
        
      } else {
        // For demonstration, use mock data since the API is not fully implemented
        mockClientProgress();
      }
    } catch (err: any) {
      console.error('Error fetching client progress:', err);
      
      // For demonstration, use mock data
      mockClientProgress();
      
      setError('Failed to load progress data. Using sample data instead.');
      toast({
        title: "Data Loading Issue",
        description: "Using demo data while we connect to your profile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Mock data for demonstration
  const mockClientProgress = () => {
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
      { type: 'core', name: 'Core & Stability', level: 35, progress: 70, icon: <Anchor size={16} />, color: 'primary' },
      { type: 'balance', name: 'Balance', level: 22, progress: 45, icon: <Shield size={16} />, color: 'info' },
      { type: 'flexibility', name: 'Flexibility', level: 40, progress: 25, icon: <Activity size={16} />, color: 'secondary' },
      { type: 'calisthenics', name: 'Calisthenics', level: 30, progress: 60, icon: <Activity size={16} />, color: 'warning' },
      { type: 'isolation', name: 'Isolation', level: 18, progress: 30, icon: <Target size={16} />, color: 'success' },
      { type: 'stabilizers', name: 'Stabilizers', level: 25, progress: 50, icon: <Anchor size={16} />, color: 'primary' },
      { type: 'injury_prevention', name: 'Injury Prevention', level: 15, progress: 80, icon: <Shield size={16} />, color: 'error' },
      { type: 'injury_recovery', name: 'Injury Recovery', level: 10, progress: 20, icon: <RefreshCw size={16} />, color: 'success' }
    ]);
    
    // Set mock body part progress - just a sample few
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
    
    // Set mock achievements
    setAchievements([
      { id: 'core-10', name: 'Core Beginner', icon: 'Anchor', description: 'Reach level 10 in Core exercises', unlocked: true, dateUnlocked: '2024-02-15' },
      { id: 'balance-10', name: 'Balanced Start', icon: 'Shield', description: 'Reach level 10 in Balance exercises', unlocked: true, dateUnlocked: '2024-03-02' },
      { id: 'flexibility-10', name: 'First Stretch', icon: 'Activity', description: 'Reach level 10 in Flexibility', unlocked: true, dateUnlocked: '2024-02-20' },
      { id: 'calisthenics-10', name: 'Bodyweight Basics', icon: 'Activity', description: 'Reach level 10 in Calisthenics', unlocked: true, dateUnlocked: '2024-03-10' },
      { id: 'squats-10', name: 'Squat Novice', icon: 'Dumbbell', description: 'Reach level 10 in Squats', unlocked: true, dateUnlocked: '2024-02-10' },
      { id: 'lunges-10', name: 'Lunge Beginner', icon: 'Dumbbell', description: 'Reach level 10 in Lunges', unlocked: true, dateUnlocked: '2024-02-25' },
      { id: 'planks-10', name: 'Plank Starter', icon: 'Anchor', description: 'Reach level 10 in Planks', unlocked: true, dateUnlocked: '2024-03-05' },
      { id: 'overall-50', name: 'Fitness Journey', icon: 'Award', description: 'Reach overall level 50', unlocked: false }
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
  
  // Helper function to calculate level progress percentage
  const calculateLevelProgress = (level: number, xp: number): number => {
    const totalNeeded = calculateXpForNextLevel(level);
    return Math.min(Math.floor((xp / totalNeeded) * 100), 100);
  };
  
  // Helper to get achievement icon component
  const getAchievementIcon = (iconName: string): React.ReactNode => {
    switch (iconName) {
      case 'Anchor': return <Anchor size={24} />;
      case 'Shield': return <Shield size={24} />;
      case 'Activity': return <Activity size={24} />;
      case 'Dumbbell': return <Dumbbell size={24} />;
      case 'Award': return <Award size={24} />;
      default: return <Star size={24} />;
    }
  };
  
  // Fetch recommended exercises
  const fetchRecommendedExercises = async () => {
    try {
      const result = await services.exercise.getRecommendedExercises();
      
      if (result && result.success) {
        setFocusCategories(result.focusCategories);
        
        // Convert backend exercises to our frontend format
        const convertedExercises = result.recommendedExercises.map(convertToExercise);
        setRecommendedExercises(convertedExercises);
      }
    } catch (err) {
      console.error('Error fetching recommended exercises:', err);
      // Keep current state if error
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchClientProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Calculate progress percentage for next level
  const overallProgressPercentage = Math.floor((overallLevel.progress / overallLevel.totalNeeded) * 100);
  
  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Welcome Header */}
          <Box mb={3}>
            <Typography variant="h4" fontWeight="300" mb={1} component={motion.h4} variants={itemVariants}>
              Hi, {user?.firstName || 'Athlete'}!
            </Typography>
            <Typography variant="body1" color="rgba(255, 255, 255, 0.7)" component={motion.p} variants={itemVariants}>
              Track your NASM-based fitness progression and unlock achievements
            </Typography>
          </Box>
          
          {/* Main Dashboard Layout */}
          <DashboardGrid>
            {/* Overall Level Card */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <Trophy size={22} />
                  Overall Progress
                </CardTitle>
                <Tooltip title="Based on your cumulative progress across all exercise categories">
                  <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <BarChart2 size={18} />
                  </IconButton>
                </Tooltip>
              </CardHeader>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <LevelBadge level={overallLevel.level}>
                    {overallLevel.level}
                    <span>LEVEL</span>
                  </LevelBadge>
                  <LevelInfo>
                    <LevelName>{overallLevel.name}</LevelName>
                    <LevelDescription>{overallLevel.description}</LevelDescription>
                    <LevelProgress>
                      <StyledLinearProgress 
                        variant="determinate" 
                        value={overallProgressPercentage} 
                        color="secondary"
                      />
                      <NextLevelContainer>
                        <span>{overallLevel.progress} / {overallLevel.totalNeeded} XP</span>
                        <span>Next Level: {overallLevel.level + 1}</span>
                      </NextLevelContainer>
                    </LevelProgress>
                  </LevelInfo>
                </Box>
                
                {/* Quick Stats */}
                <StatsGrid>
                  <StatCard color="primary">
                    <StatValue color="primary">{userStats.workoutsCompleted}</StatValue>
                    <StatLabel>Workouts</StatLabel>
                  </StatCard>
                  <StatCard color="success">
                    <StatValue color="success">{userStats.streakDays}</StatValue>
                    <StatLabel>Day Streak</StatLabel>
                  </StatCard>
                  <StatCard color="info">
                    <StatValue color="info">{userStats.totalExercisesPerformed}</StatValue>
                    <StatLabel>Exercises</StatLabel>
                  </StatCard>
                  <StatCard color="warning">
                    <StatValue color="warning">{userStats.totalMinutes}</StatValue>
                    <StatLabel>Minutes</StatLabel>
                  </StatCard>
                </StatsGrid>
              </CardContent>
            </StyledCard>
            
            {/* NASM Protocol Progress Card */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <Activity size={22} />
                  NASM Protocol Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
                  Your progression through core NASM fitness protocol categories
                </Typography>
                
                {nasmCategories.map((category, index) => (
                  <ProgressBarContainer key={category.type}>
                    <ProgressBarLabel>
                      <ProgressBarName>
                        {category.icon}
                        {category.name}
                      </ProgressBarName>
                      <ProgressBarValue>Level {category.level}</ProgressBarValue>
                    </ProgressBarLabel>
                    <StyledLinearProgress 
                      variant="determinate" 
                      value={category.progress} 
                      color={category.color as any}
                    />
                  </ProgressBarContainer>
                ))}
              </CardContent>
            </StyledCard>
            
            {/* Key Exercise Progress */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <Dumbbell size={22} />
                  Key Exercise Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
                  Your progression in foundational NASM exercises
                </Typography>
                
                <ProgressBarContainer>
                  <ProgressBarLabel>
                    <ProgressBarName>
                      <Dumbbell size={16} />
                      Squats
                    </ProgressBarName>
                    <ProgressBarValue>Level {keyExercises.squats.level}</ProgressBarValue>
                  </ProgressBarLabel>
                  <StyledLinearProgress 
                    variant="determinate" 
                    value={keyExercises.squats.progress} 
                    color="primary"
                  />
                </ProgressBarContainer>
                
                <ProgressBarContainer>
                  <ProgressBarLabel>
                    <ProgressBarName>
                      <Dumbbell size={16} />
                      Lunges
                    </ProgressBarName>
                    <ProgressBarValue>Level {keyExercises.lunges.level}</ProgressBarValue>
                  </ProgressBarLabel>
                  <StyledLinearProgress 
                    variant="determinate" 
                    value={keyExercises.lunges.progress} 
                    color="secondary"
                  />
                </ProgressBarContainer>
                
                <ProgressBarContainer>
                  <ProgressBarLabel>
                    <ProgressBarName>
                      <Anchor size={16} />
                      Planks
                    </ProgressBarName>
                    <ProgressBarValue>Level {keyExercises.planks.level}</ProgressBarValue>
                  </ProgressBarLabel>
                  <StyledLinearProgress 
                    variant="determinate" 
                    value={keyExercises.planks.progress} 
                    color="success"
                  />
                </ProgressBarContainer>
                
                <ProgressBarContainer>
                  <ProgressBarLabel>
                    <ProgressBarName>
                      <Anchor size={16} />
                      Reverse Planks
                    </ProgressBarName>
                    <ProgressBarValue>Level {keyExercises.reversePlanks.level}</ProgressBarValue>
                  </ProgressBarLabel>
                  <StyledLinearProgress 
                    variant="determinate" 
                    value={keyExercises.reversePlanks.progress} 
                    color="warning"
                  />
                </ProgressBarContainer>
                
                <Box mt={2}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    fullWidth
                    startIcon={<PlayCircle size={18} />}
                    sx={{ 
                      borderRadius: '10px', 
                      py: 1.2, 
                      textTransform: 'none',
                      background: 'rgba(0, 255, 255, 0.05)'
                    }}
                  >
                    Start Focused Training
                  </Button>
                </Box>
              </CardContent>
            </StyledCard>
            
            {/* Achievements Card */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <Award size={22} />
                  Achievements
                </CardTitle>
                <Chip 
                  label={`${achievements.filter(a => a.unlocked).length}/${achievements.length}`} 
                  size="small"
                  sx={{ 
                    background: 'rgba(0, 255, 255, 0.15)',
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </CardHeader>
              <CardContent>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
                  Unlock achievements as you progress through your fitness journey
                </Typography>
                
                <AchievementGrid>
                  {achievements.map((achievement) => (
                    <AchievementItem
                      key={achievement.id}
                      unlocked={achievement.unlocked}
                      whileHover={{ y: -5 }}
                    >
                      <Tooltip 
                        title={
                          <>
                            <Typography variant="subtitle2">{achievement.name}</Typography>
                            <Typography variant="body2">{achievement.description}</Typography>
                            {achievement.dateUnlocked && (
                              <Typography variant="caption">
                                Unlocked: {new Date(achievement.dateUnlocked).toLocaleDateString()}
                              </Typography>
                            )}
                          </>
                        } 
                        arrow
                      >
                        <div className="achievement-icon">
                          {getAchievementIcon(achievement.icon)}
                        </div>
                      </Tooltip>
                      <div className="achievement-name">{achievement.name}</div>
                    </AchievementItem>
                  ))}
                </AchievementGrid>
              </CardContent>
            </StyledCard>
            
            {/* Recommended Exercises Card */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <Target size={22} />
                  Recommended Exercises
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
                  Personalized exercises based on your NASM protocol progression
                </Typography>
                
                {recommendedExercises.map((exercise) => (
                  <ExerciseRow key={exercise.id}>
                    <ExerciseIcon>
                      <Dumbbell size={20} />
                    </ExerciseIcon>
                    <ExerciseInfo>
                      <ExerciseName>{exercise.name}</ExerciseName>
                      <ExerciseDetails>
                        <span><Repeat size={14} /> {exercise.sets} sets × {exercise.reps} reps</span>
                        <span><Target size={14} /> {exercise.type}</span>
                      </ExerciseDetails>
                    </ExerciseInfo>
                    <ExerciseLevel level={exercise.level}>
                      Lvl {exercise.level}
                    </ExerciseLevel>
                  </ExerciseRow>
                ))}
                
                <Box mt={2}>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    fullWidth
                    startIcon={<Plus size={18} />}
                    sx={{ 
                      borderRadius: '10px', 
                      py: 1.2, 
                      textTransform: 'none',
                      background: 'rgba(120, 81, 169, 0.05)'
                    }}
                  >
                    View All Exercises
                  </Button>
                </Box>
              </CardContent>
            </StyledCard>
            
            {/* Body Part Progress Card */}
            <StyledCard component={motion.div} variants={itemVariants}>
              <CardHeader>
                <CardTitle>
                  <GridIcon size={22} />
                  Body Part Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" mb={2}>
                  Your progression in specific body part training
                </Typography>
                
                {bodyPartProgress.map((part, index) => (
                  <ProgressBarContainer key={part.name}>
                    <ProgressBarLabel>
                      <ProgressBarName>
                        {part.icon}
                        {part.name}
                      </ProgressBarName>
                      <ProgressBarValue>Level {part.level}</ProgressBarValue>
                    </ProgressBarLabel>
                    <StyledLinearProgress 
                      variant="determinate" 
                      value={part.progress} 
                      color={part.color as any}
                    />
                  </ProgressBarContainer>
                ))}
              </CardContent>
            </StyledCard>
          </DashboardGrid>
        </motion.div>
      </ContentContainer>
    </PageContainer>
  );
};

export default ClientDashboardView;