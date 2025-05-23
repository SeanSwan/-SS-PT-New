/**
 * Progress Types
 * =============
 * Type definitions for client progress data
 */

// Types for client progress data
export interface ClientProgressData {
  userId: string;
  strengthLevel: number;
  cardioLevel: number;
  flexibilityLevel: number;
  balanceLevel: number;
  coreLevel: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalExercises: number;
  lastWorkoutDate: string;
  currentStreak: number;
  personalRecords?: Record<string, Array<{
    setId: string;
    weight: number;
    reps: number;
    date: string;
  }>>;
}

// Types for workout statistics
export interface WorkoutStatistics {
  totalWorkouts: number;
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageIntensity: number;
  weekdayBreakdown: number[];
  exerciseBreakdown?: Array<{
    id: string;
    name: string;
    count: number;
    sets: number;
    reps: number;
    totalWeight: number;
    category: string;
  }>;
  muscleGroupBreakdown?: Array<{
    id: string;
    name: string;
    shortName: string;
    count: number;
    bodyRegion: string;
  }>;
  intensityTrends?: Array<{
    week: string;
    averageIntensity: number;
  }>;
  recentWorkouts?: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    exerciseCount: number;
    intensity: number;
  }>;
}

// Types for chart data
export interface SkillData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface WeekdayData {
  day: string;
  count: number;
}

export interface ExerciseTypeData {
  name: string;
  value: number;
}

export interface IntensityTrendData {
  week: string;
  averageIntensity: number;
}

export interface MuscleGroupData {
  name: string;
  value: number;
}
