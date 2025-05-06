/**
 * useWorkoutProgress Hook
 * ======================
 * Custom hook to access and manage workout progress data from Redux
 */

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchClientProgress,
  fetchWorkoutStatistics,
  setSelectedClient,
  setTimeRange,
} from '../store/slices/workoutSlice';
import { 
  SkillData,
  WeekdayData,
  ExerciseTypeData,
  IntensityTrendData,
  MuscleGroupData,
} from '../pages/workout/types/progress.types';

// Define the return type for the hook
interface UseWorkoutProgressReturn {
  // Data
  progress: any;
  statistics: any;
  selectedClientId: string | null;
  timeRange: string;
  
  // Loading states
  progressLoading: boolean;
  statisticsLoading: boolean;
  
  // Error states
  progressError: string | null;
  statisticsError: string | null;
  
  // Computed data for charts
  skillData: SkillData[];
  weekdayData: WeekdayData[];
  exerciseTypeData: ExerciseTypeData[];
  intensityTrendData: IntensityTrendData[];
  topExercises: any[];
  muscleGroupData: MuscleGroupData[];
  
  // Actions
  handleTimeRangeChange: (newTimeRange: string) => void;
  handleClientChange: (clientId: string) => void;
  refreshData: () => void;
}

/**
 * Custom hook for accessing and managing workout progress data
 */
export const useWorkoutProgress = (
  userId?: string
): UseWorkoutProgressReturn => {
  const dispatch = useAppDispatch();
  
  // Get data from Redux store
  const {
    clientProgress,
    statistics,
    selectedClientId,
    timeRange,
  } = useAppSelector(state => state.workout);
  
  // Destructure for easier access
  const progress = clientProgress.data;
  const statistics_data = statistics.data;
  const progressLoading = clientProgress.loading;
  const statisticsLoading = statistics.loading;
  const progressError = clientProgress.error;
  const statisticsError = statistics.error;
  
  // Set the selected client when userId changes
  useEffect(() => {
    if (userId) {
      dispatch(setSelectedClient(userId));
    }
  }, [userId, dispatch]);
  
  // Fetch progress and statistics when selected client or time range changes
  useEffect(() => {
    if (selectedClientId) {
      dispatch(fetchClientProgress(selectedClientId));
      dispatch(fetchWorkoutStatistics({ 
        userId: selectedClientId, 
        timeRange 
      }));
    }
  }, [selectedClientId, timeRange, dispatch]);
  
  // Event handlers
  const handleTimeRangeChange = (newTimeRange: string) => {
    dispatch(setTimeRange(newTimeRange));
  };
  
  const handleClientChange = (clientId: string) => {
    dispatch(setSelectedClient(clientId));
  };
  
  const refreshData = () => {
    if (selectedClientId) {
      dispatch(fetchClientProgress(selectedClientId));
      dispatch(fetchWorkoutStatistics({ 
        userId: selectedClientId, 
        timeRange 
      }));
    }
  };
  
  // Memoized computed values for chart data
  
  // Skill radar chart data
  const skillData: SkillData[] = useMemo(() => {
    if (!progress) return [];
    
    return [
      { subject: 'Strength', value: progress.strengthLevel, fullMark: 10 },
      { subject: 'Cardio', value: progress.cardioLevel, fullMark: 10 },
      { subject: 'Flexibility', value: progress.flexibilityLevel, fullMark: 10 },
      { subject: 'Balance', value: progress.balanceLevel, fullMark: 10 },
      { subject: 'Core', value: progress.coreLevel, fullMark: 10 }
    ];
  }, [progress]);
  
  // Weekday breakdown data
  const weekdayData: WeekdayData[] = useMemo(() => {
    if (!statistics_data?.weekdayBreakdown) return [];
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return statistics_data.weekdayBreakdown.map((count: number, index: number) => ({
      day: weekdays[index],
      count
    }));
  }, [statistics_data]);
  
  // Exercise type breakdown data
  const exerciseTypeData: ExerciseTypeData[] = useMemo(() => {
    if (!statistics_data?.exerciseBreakdown) return [];
    
    // Group exercises by category
    const categoryMap: Record<string, number> = {};
    
    statistics_data.exerciseBreakdown.forEach((exercise: any) => {
      const category = exercise.category || 'other';
      categoryMap[category] = (categoryMap[category] || 0) + exercise.count;
    });
    
    // Convert to array
    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));
  }, [statistics_data]);
  
  // Intensity trend data
  const intensityTrendData: IntensityTrendData[] = useMemo(() => {
    return statistics_data?.intensityTrends || [];
  }, [statistics_data]);
  
  // Top exercises data
  const topExercises = useMemo(() => {
    if (!statistics_data?.exerciseBreakdown) return [];
    
    // Sort by count and take top 5
    return [...statistics_data.exerciseBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [statistics_data]);
  
  // Muscle group data
  const muscleGroupData: MuscleGroupData[] = useMemo(() => {
    if (!statistics_data?.muscleGroupBreakdown) return [];
    
    // Sort by count and take top 6
    return [...statistics_data.muscleGroupBreakdown]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(group => ({
        name: group.shortName,
        value: group.count
      }));
  }, [statistics_data]);
  
  return {
    progress,
    statistics: statistics_data,
    selectedClientId,
    timeRange,
    progressLoading,
    statisticsLoading,
    progressError,
    statisticsError,
    skillData,
    weekdayData,
    exerciseTypeData,
    intensityTrendData,
    topExercises,
    muscleGroupData,
    handleTimeRangeChange,
    handleClientChange,
    refreshData,
  };
};

export default useWorkoutProgress;
