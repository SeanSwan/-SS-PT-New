/**
 * Workout MCP Types
 * 
 * ENHANCED - Type definitions for the Workout MCP service
 * Added AI integration properties and enhanced interfaces
 * 
 * @module types/mcp/workout.types
 */

import { McpApiResponse, SuccessResponse, ServerStatus, AiEnhancedResponse } from './service.types';

/**
 * Overall workout progress data - ENHANCED
 */
export interface WorkoutProgress extends AiEnhancedResponse {
  lastUpdated: string;
  bodyStats: {
    weight: {
      current: number;
      previous: number;
      unit: string;
    };
    bodyFat: {
      current: number;
      previous: number;
      unit: string;
    };
    muscle: {
      current: number;
      previous: number;
      unit: string;
    };
    bmi: {
      current: number;
      previous: number;
    };
  };
  nasmProtocol: {
    overall: number;
    categories: {
      name: string;
      level: number;
      progress: number;
    }[];
  };
  bodyParts: {
    name: string;
    progress: number;
  }[];
  keyExercises: {
    name: string;
    current: number;
    previous: number;
    unit: string;
    trend: string;
  }[];
  achievements: string[];
  achievementDates: Record<string, string>;
  workoutsCompleted: number;
  totalExercisesPerformed: number;
  streakDays: number;
  totalMinutes: number;
  overallLevel: number;
  experiencePoints: number;
  nasmProtocolData: {
    name: string;
    progress: number;
  }[];
  monthlyProgress: {
    month: string;
    weight: number;
    strength: number;
    cardio: number;
    flexibility: number;
  }[];
}

/**
 * Workout statistics - ENHANCED
 */
export interface WorkoutStatistics extends AiEnhancedResponse {
  totalWorkouts: number;
  totalMinutes: number;
  averageDuration: number;
  weekdayBreakdown: number[];
  exerciseBreakdown: {
    name: string;
    category: string;
    count: number;
  }[];
  muscleGroupBreakdown: {
    name: string;
    shortName: string;
    count: number;
  }[];
  intensityTrends: {
    week: string;
    volume: number;
    intensity: number;
  }[];
}

/**
 * Training program data - ENHANCED
 */
export interface TrainingProgramData {
  activeProgram: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    progress: number;
    daysPerWeek: number;
    currentWeek: number;
    totalWeeks: number;
    aiGenerated?: boolean;
    generatedContent?: string;
  };
  upcomingWorkouts: {
    id: string;
    name: string;
    date: string;
    duration: number;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: number;
    }[];
    aiOptimized?: boolean;
  }[];
  completedWorkouts: {
    id: string;
    name: string;
    date: string;
    duration: number;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: number;
      completed: boolean;
    }[];
    performance: number;
    feedback: string;
  }[];
}

/**
 * Workout recommendation - ENHANCED
 */
export interface WorkoutRecommendation extends AiEnhancedResponse {
  id: string;
  name: string;
  description: string;
  duration: number;
  difficulty: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    rest: number;
  }[];
}

/**
 * Body measurement data
 */
export interface BodyMeasurement {
  date: string;
  weight: number;
  bodyFat: number;
  chest: number;
  waist: number;
  hips: number;
  arms: number;
  thighs: number;
  calves: number;
}

/**
 * Parameters for getting client progress
 */
export interface GetClientProgressParams {
  userId: string;
}

/**
 * Parameters for getting workout statistics
 */
export interface GetWorkoutStatisticsParams {
  userId: string;
  includeExerciseBreakdown?: boolean;
  includeMuscleGroupBreakdown?: boolean;
  timeRange?: string;
}

/**
 * Parameters for getting client training program
 */
export interface GetClientTrainingProgramParams {
  userId: string;
}

/**
 * Parameters for logging a workout
 */
export interface LogWorkoutParams {
  userId: string;
  workoutId: string;
  exercises: any[];
  duration: number;
  feedback?: string;
}

/**
 * Parameters for getting workout recommendations
 */
export interface GetWorkoutRecommendationsParams {
  userId: string;
  focus?: string;
  duration?: number;
  equipment?: string[];
}

/**
 * Parameters for getting body measurements
 */
export interface GetBodyMeasurementsParams {
  userId: string;
}

/**
 * Parameters for logging a workout session
 */
export interface LogWorkoutSessionParams {
  session: any;
}

/**
 * Parameters for logging food intake
 */
export interface LogFoodIntakeParams {
  userId: string;
  foodIntake: any;
}

/**
 * Workout MCP API interface
 */
export interface WorkoutMcpApi {
  checkServerStatus: () => Promise<McpApiResponse<ServerStatus>>;
  getClientProgress: (params: GetClientProgressParams) => Promise<McpApiResponse<{ progress: WorkoutProgress }>>;
  getWorkoutStatistics: (params: GetWorkoutStatisticsParams) => Promise<McpApiResponse<WorkoutStatistics>>;
  getClientTrainingProgram: (params: GetClientTrainingProgramParams) => Promise<McpApiResponse<{ program: TrainingProgramData }>>;
  logWorkout: (params: LogWorkoutParams) => Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>>;
  getWorkoutRecommendations: (params: GetWorkoutRecommendationsParams) => Promise<McpApiResponse<{ recommendations: WorkoutRecommendation[] }>>;
  getBodyMeasurements: (params: GetBodyMeasurementsParams) => Promise<McpApiResponse<{ measurements: BodyMeasurement[] }>>;
  logWorkoutSession: (params: LogWorkoutSessionParams) => Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>>;
  logFoodIntake: (params: LogFoodIntakeParams) => Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>>;
}