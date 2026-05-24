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
import { logger } from '@/utils/logger';

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
  topExercises: ExerciseBreakdownEntry[];
  muscleGroupData: MuscleGroupData[];
}

type ExerciseBreakdownEntry = NonNullable<WorkoutStatistics['exerciseBreakdown']>[number];

interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.message
    ?? (error instanceof Error ? error.message : fallback);
};

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
  lastWorkoutDate: '',
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
 * Custom hook for fetching and managing progress data
 */
export const useProgressData = ({ 
  userId, 
  timeRange 
}: UseProgressDataProps): UseProgressDataReturn => {
  const { user, authAxios } = useAuth();
  const currentUserId = user?.id;
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
        const targetUserId = userId || currentUserId;
        
        if (!targetUserId) {
          setError('No user specified');
          setLoading(false);
          return;
        }
        
        // Calculate date range based on selected time filter
        const getDateRange = () => {
          const now = new Date();
          const endDate = now.toISOString().split('T')[0];
          let startDate = '';
          
          switch (timeRange) {
            case '7days': {
              const sevenDaysAgo = new Date(now);
              sevenDaysAgo.setDate(now.getDate() - 7);
              startDate = sevenDaysAgo.toISOString().split('T')[0];
              break;
            }
            case '30days': {
              const thirtyDaysAgo = new Date(now);
              thirtyDaysAgo.setDate(now.getDate() - 30);
              startDate = thirtyDaysAgo.toISOString().split('T')[0];
              break;
            }
            case '90days': {
              const ninetyDaysAgo = new Date(now);
              ninetyDaysAgo.setDate(now.getDate() - 90);
              startDate = ninetyDaysAgo.toISOString().split('T')[0];
              break;
            }
            case 'year': {
              const oneYearAgo = new Date(now);
              oneYearAgo.setFullYear(now.getFullYear() - 1);
              startDate = oneYearAgo.toISOString().split('T')[0];
              break;
            }
            case 'all':
            default:
              // No start date constraint for 'all'
              startDate = '';
          }
          
          return { startDate, endDate };
        };
        
        const { startDate, endDate } = getDateRange();
        let loadedProgress = false;
        let loadedStatistics = false;
        
        // Fetch client progress - Splitting calls for better error handling
        try {
          const progressResponse = await authAxios.get(`/api/client-progress/${targetUserId}`);
          if (progressResponse.data && progressResponse.data.progress) {
            setProgress(progressResponse.data.progress);
            loadedProgress = true;
          } else {
            logger.warn('Unexpected progress data format:', progressResponse.data);
          }
        } catch (progressErr: unknown) {
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
            loadedStatistics = true;
          } else {
            logger.warn('Unexpected statistics data format:', statisticsResponse.data);
          }
        } catch (statsErr: unknown) {
          console.error('Error fetching statistics data:', statsErr);
          // Continue even if statistics fails
        }
        
        // If both APIs failed, show error
        if (!loadedProgress && !loadedStatistics) {
          setError('Failed to load progress and statistics data');
        }
      } catch (err: unknown) {
        console.error('Error fetching progress data:', err);
        setError(getApiErrorMessage(err, 'Failed to load progress data'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, currentUserId, authAxios, timeRange]);
  
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
