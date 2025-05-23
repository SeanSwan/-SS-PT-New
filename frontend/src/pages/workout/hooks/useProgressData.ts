/**
 * useProgressData Hook
 * ===================
 * Custom hook to fetch and manage client progress data
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  ClientProgressData, 
  WorkoutStatistics,
  SkillData,
  WeekdayData,
  ExerciseTypeData,
  MuscleGroupData,
  IntensityTrendData
} from '../types/progress.types';

interface UseProgressDataProps {
  userId?: string;
  timeRange: string;
}

interface UseProgressDataReturn {
  progress: ClientProgressData | null;
  statistics: WorkoutStatistics | null;
  safeProgress: ClientProgressData;
  safeStats: WorkoutStatistics;
  loading: boolean;
  error: string | null;
  skillData: SkillData[];
  weekdayData: WeekdayData[];
  exerciseTypeData: ExerciseTypeData[];
  intensityTrendData: IntensityTrendData[];
  topExercises: any[];
  muscleGroupData: MuscleGroupData[];
}

/**
 * Default empty progress data
 */
const defaultProgress: ClientProgressData = {
  userId: 'unknown',
  strengthLevel: 0,
  cardioLevel: 0,
  flexibilityLevel: 0,
  balanceLevel: 0,
  coreLevel: 0,
  totalWorkouts: 0,
  totalSets: 0,
  totalReps: 0,
  totalWeight: 0,
  totalExercises: 0,
  lastWorkoutDate: new Date().toISOString(),
  currentStreak: 0
};

/**
 * Default empty statistics data
 */
const defaultStats: WorkoutStatistics = {
  totalWorkouts: 0,
  totalDuration: 0,
  totalExercises: 0,
  totalSets: 0,
  totalReps: 0,
  totalWeight: 0,
  averageIntensity: 0,
  weekdayBreakdown: [0, 0, 0, 0, 0, 0, 0],
  exerciseBreakdown: [],
  muscleGroupBreakdown: [],
  intensityTrends: []
};

/**
 * Mock data for development/testing
 */
const mockProgress: ClientProgressData = {
  userId: 'mock-user-id',
  strengthLevel: 5,
  cardioLevel: 3,
  flexibilityLevel: 4,
  balanceLevel: 2,
  coreLevel: 6,
  totalWorkouts: 25,
  totalSets: 450,
  totalReps: 3600,
  totalWeight: 12000,
  totalExercises: 300,
  lastWorkoutDate: new Date().toISOString(),
  currentStreak: 3
};

/**
 * Mock statistics for development/testing
 */
const mockStatistics: WorkoutStatistics = {
  totalWorkouts: 25,
  totalDuration: 1500, // 25 hours in minutes
  totalExercises: 300,
  totalSets: 450,
  totalReps: 3600,
  totalWeight: 12000,
  averageIntensity: 7.5,
  weekdayBreakdown: [2, 5, 4, 5, 3, 4, 2],
  exerciseBreakdown: [
    { id: '1', name: 'Squats', count: 20, sets: 60, reps: 480, totalWeight: 3000, category: 'strength' },
    { id: '2', name: 'Bench Press', count: 18, sets: 54, reps: 432, totalWeight: 2800, category: 'strength' },
    { id: '3', name: 'Deadlift', count: 15, sets: 45, reps: 360, totalWeight: 3500, category: 'strength' },
    { id: '4', name: 'Pull Ups', count: 12, sets: 36, reps: 288, totalWeight: 900, category: 'strength' },
    { id: '5', name: 'Running', count: 10, sets: 10, reps: 10, totalWeight: 0, category: 'cardio' }
  ],
  muscleGroupBreakdown: [
    { id: '1', name: 'Quadriceps', shortName: 'Quads', count: 30, bodyRegion: 'lower_body' },
    { id: '2', name: 'Chest', shortName: 'Chest', count: 25, bodyRegion: 'upper_body' },
    { id: '3', name: 'Back', shortName: 'Back', count: 22, bodyRegion: 'upper_body' },
    { id: '4', name: 'Hamstrings', shortName: 'Hams', count: 18, bodyRegion: 'lower_body' },
    { id: '5', name: 'Shoulders', shortName: 'Delts', count: 15, bodyRegion: 'upper_body' },
    { id: '6', name: 'Core', shortName: 'Core', count: 12, bodyRegion: 'core' }
  ],
  intensityTrends: [
    { week: 'W1', averageIntensity: 5.5 },
    { week: 'W2', averageIntensity: 6.2 },
    { week: 'W3', averageIntensity: 6.8 },
    { week: 'W4', averageIntensity: 7.5 }
  ]
};

/**
 * Custom hook for fetching and managing progress data
 */
export const useProgressData = ({ 
  userId, 
  timeRange 
}: UseProgressDataProps): UseProgressDataReturn => {
  const { user, authAxios } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<ClientProgressData | null>(null);
  const [statistics, setStatistics] = useState<WorkoutStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Safe versions that are guaranteed to exist
  const safeProgress = progress || defaultProgress;
  const safeStats = statistics || defaultStats;
  
  // Fetch progress and statistics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine which user to fetch data for
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) {
          setError('No user specified');
          setLoading(false);
          return;
        }
        
        // Use mock data for development/testing
        if (process.env.NODE_ENV === 'development' && (!user || user.id === 'temp-user-id' || targetUserId === 'temp-user-id')) {
          console.log('Using mock data for development');
          setProgress(mockProgress);
          setStatistics(mockStatistics);
          setLoading(false);
          return;
        }
        
        // Calculate date range based on selected time filter
        const getDateRange = () => {
          const now = new Date();
          const endDate = now.toISOString().split('T')[0];
          let startDate = '';
          
          switch (timeRange) {
            case '7days':
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              startDate = sevenDaysAgo.toISOString().split('T')[0];
              break;
            case '30days':
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              startDate = thirtyDaysAgo.toISOString().split('T')[0];
              break;
            case '90days':
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              startDate = ninetyDaysAgo.toISOString().split('T')[0];
              break;
            case 'year':
              const oneYearAgo = new Date(now);
              oneYearAgo.setFullYear(now.getFullYear() - 1);
              startDate = oneYearAgo.toISOString().split('T')[0];
              break;
            case 'all':
            default:
              // No start date constraint for 'all'
              startDate = '';
          }
          
          return { startDate, endDate };
        };
        
        const { startDate, endDate } = getDateRange();
        
        // Fetch client progress - Splitting calls for better error handling
        try {
          const progressResponse = await authAxios.get(`/api/client-progress/${targetUserId}`);
          if (progressResponse.data && progressResponse.data.progress) {
            setProgress(progressResponse.data.progress);
          } else {
            console.warn('Unexpected progress data format:', progressResponse.data);
          }
        } catch (progressErr: any) {
          console.error('Error fetching progress data:', progressErr);
          // Continue with statistics fetch even if progress fails
        }
        
        // Fetch workout statistics
        try {
          const statisticsResponse = await authAxios.get(`/api/workout/statistics/${targetUserId}`, {
            params: {
              startDate,
              endDate,
              includeExerciseBreakdown: true,
              includeMuscleGroupBreakdown: true,
              includeWeekdayBreakdown: true,
              includeIntensityTrends: true
            }
          });
          
          if (statisticsResponse.data && statisticsResponse.data.statistics) {
            setStatistics(statisticsResponse.data.statistics);
          } else {
            console.warn('Unexpected statistics data format:', statisticsResponse.data);
          }
        } catch (statsErr: any) {
          console.error('Error fetching statistics data:', statsErr);
          // Continue even if statistics fails
        }
        
        // If both APIs failed, show error
        if (!progress && !statistics) {
          setError('Failed to load progress and statistics data');
        }
      } catch (err: any) {
        console.error('Error fetching progress data:', err);
        setError(err.response?.data?.message || 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, user?.id, authAxios, timeRange]);
  
  // Computed data for charts
  
  // Function to get a summary of skill levels for radar chart
  const skillData: SkillData[] = safeProgress ? [
    { subject: 'Strength', value: safeProgress.strengthLevel, fullMark: 10 },
    { subject: 'Cardio', value: safeProgress.cardioLevel, fullMark: 10 },
    { subject: 'Flexibility', value: safeProgress.flexibilityLevel, fullMark: 10 },
    { subject: 'Balance', value: safeProgress.balanceLevel, fullMark: 10 },
    { subject: 'Core', value: safeProgress.coreLevel, fullMark: 10 }
  ] : [];
  
  // Function to format weekday breakdown data
  const weekdayData: WeekdayData[] = safeStats && safeStats.weekdayBreakdown ? 
    safeStats.weekdayBreakdown.map((count, index) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      count
    })) : [];
  
  // Function to get exercise type breakdown
  const exerciseTypeData: ExerciseTypeData[] = safeStats && safeStats.exerciseBreakdown ?
    (() => {
      // Group exercises by category
      const categoryMap: Record<string, number> = {};
      
      safeStats.exerciseBreakdown.forEach(exercise => {
        const category = exercise.category || 'other';
        categoryMap[category] = (categoryMap[category] || 0) + exercise.count;
      });
      
      // Convert to array
      return Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value
      }));
    })() : [];
  
  // Function to format intensity trends
  const intensityTrendData: IntensityTrendData[] = 
    safeStats && safeStats.intensityTrends ? 
    safeStats.intensityTrends : [];
  
  // Function to format top exercises
  const topExercises = safeStats && safeStats.exerciseBreakdown ?
    [...safeStats.exerciseBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) : [];
  
  // Function to get muscle group distribution
  const muscleGroupData: MuscleGroupData[] = safeStats && safeStats.muscleGroupBreakdown ?
    [...safeStats.muscleGroupBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(group => ({
        name: group.shortName,
        value: group.count
      })) : [];
  
  return {
    progress,
    statistics,
    safeProgress,
    safeStats,
    loading,
    error,
    skillData,
    weekdayData,
    exerciseTypeData,
    intensityTrendData,
    topExercises,
    muscleGroupData
  };
};
