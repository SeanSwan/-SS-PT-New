import type {
  MuscleGroupVolume,
  OneRMProgression,
  RPEPoint,
} from './workoutAnalyticsUtils';

export const WORKOUT_ANALYTICS_DEFAULT_LIMIT = 50;

export interface WorkoutSession {
  id: string;
  title: string;
  date: string;
  duration: number;
  intensity: number | null;
  status: string;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  notes?: string;
  logs: WorkoutLogEntry[];
}

export interface WorkoutLogEntry {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
  exerciseNote?: string;
}

export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM?: number;
}

export interface WeeklyVolume {
  week: string;
  volume: number;
  workoutCount: number;
}

export interface ExerciseFrequency {
  name: string;
  count: number;
  totalVolume: number;
}

export interface WorkoutCalendarEntry {
  date: string;
  count: number;
}

export interface IntensityPoint {
  date: string;
  intensity: number;
}

export interface AnalyticsData {
  sessions: WorkoutSession[];
  weeklyVolume: WeeklyVolume[];
  exerciseFrequency: ExerciseFrequency[];
  intensityTrend: IntensityPoint[];
  workoutCalendar: WorkoutCalendarEntry[];
  personalRecords: PersonalRecord[];
  oneRMProgression: OneRMProgression[];
  muscleGroupVolume: MuscleGroupVolume[];
  rpeTrend: RPEPoint[];
  summary: {
    totalWorkouts: number;
    totalExercises: number;
    totalVolume: number;
    avgIntensity: number | null;
    avgRPE: number | null;
    longestStreak: number;
  };
}

export interface UseWorkoutAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export type { MuscleGroupVolume, OneRMProgression, RPEPoint };
