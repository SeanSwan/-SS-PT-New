/**
 * WorkoutMcpService
 * 
 * Service for interacting with the Workout MCP server.
 * Handles workout data, progress tracking, and training programs.
 * Provides methods for tracking fitness progress, managing training programs, and logging workouts.
 * 
 * This service is used by both the client and admin dashboards to ensure data synchronization
 * between different views of the application. It exposes methods for retrieving workout progress,
 * statistics, training programs, and recommendations, as well as logging workout sessions and
 * food intake.
 * 
 * @module services/mcp/workoutMcpService
 */

import {
  WorkoutMcpApi,
  ServerStatus,
  WorkoutProgress,
  WorkoutStatistics,
  TrainingProgramData,
  WorkoutRecommendation,
  BodyMeasurement,
  McpApiResponse,
  SuccessResponse,
  GetClientProgressParams,
  GetWorkoutStatisticsParams,
  GetClientTrainingProgramParams,
  LogWorkoutParams,
  GetWorkoutRecommendationsParams,
  GetBodyMeasurementsParams,
  LogWorkoutSessionParams,
  LogFoodIntakeParams
} from '../../types/mcp/workout.types';

// Mock data for development
const mockData = {
  progress: {
    lastUpdated: new Date().toISOString(),
    bodyStats: {
      weight: {
        current: 75.5,
        previous: 76.2,
        unit: 'kg'
      },
      bodyFat: {
        current: 18.2,
        previous: 19.5,
        unit: '%'
      },
      muscle: {
        current: 32.5,
        previous: 31.8,
        unit: 'kg'
      },
      bmi: {
        current: 24.2,
        previous: 24.5
      }
    },
    nasmProtocol: {
      overall: 72,
      categories: [
        { name: 'Core', level: 3, progress: 80 },
        { name: 'Balance', level: 2, progress: 65 },
        { name: 'Stabilization', level: 3, progress: 75 },
        { name: 'Flexibility', level: 2, progress: 60 },
        { name: 'Strength', level: 3, progress: 85 }
      ]
    },
    bodyParts: [
      { name: 'Chest', progress: 75 },
      { name: 'Back', progress: 80 },
      { name: 'Arms', progress: 65 },
      { name: 'Shoulders', progress: 60 },
      { name: 'Core', progress: 85 },
      { name: 'Legs', progress: 70 }
    ],
    keyExercises: [
      { name: 'Bench Press', current: 85, previous: 80, unit: 'kg', trend: 'up' },
      { name: 'Squat', current: 110, previous: 105, unit: 'kg', trend: 'up' },
      { name: 'Deadlift', current: 130, previous: 125, unit: 'kg', trend: 'up' },
      { name: 'Pull-ups', current: 12, previous: 10, unit: 'reps', trend: 'up' },
      { name: 'Overhead Press', current: 55, previous: 52.5, unit: 'kg', trend: 'up' },
      { name: 'Plank', current: 120, previous: 90, unit: 'sec', trend: 'up' }
    ],
    achievements: [
      'core-10', 
      'balance-10', 
      'flexibility-10', 
      'calisthenics-10', 
      'overall-50'
    ],
    achievementDates: {
      'core-10': '2024-04-15T10:00:00Z',
      'balance-10': '2024-04-20T15:30:00Z',
      'flexibility-10': '2024-04-25T09:15:00Z',
      'calisthenics-10': '2024-05-01T14:45:00Z',
      'overall-50': '2024-05-05T11:20:00Z'
    },
    workoutsCompleted: 45,
    totalExercisesPerformed: 548,
    streakDays: 5,
    totalMinutes: 2780,
    overallLevel: 8,
    experiencePoints: 2450,
    // NASM data formatted for chart visualization
    nasmProtocolData: [
      { name: 'Core', progress: 80 },
      { name: 'Balance', progress: 65 },
      { name: 'Stability', progress: 75 },
      { name: 'Flexibility', progress: 60 },
      { name: 'Calisthenics', progress: 85 },
      { name: 'Isolation', progress: 70 },
      { name: 'Stabilizers', progress: 68 }
    ],
    // Monthly progress data for charts
    monthlyProgress: [
      { month: 'Jan', weight: 78.5, strength: 60, cardio: 55, flexibility: 50 },
      { month: 'Feb', weight: 77.2, strength: 65, cardio: 58, flexibility: 53 },
      { month: 'Mar', weight: 76.8, strength: 67, cardio: 63, flexibility: 55 },
      { month: 'Apr', weight: 75.5, strength: 70, cardio: 67, flexibility: 60 },
      { month: 'May', weight: 75.0, strength: 73, cardio: 70, flexibility: 65 },
      { month: 'Jun', weight: 74.5, strength: 75, cardio: 72, flexibility: 68 }
    ]
  },
  trainingProgram: {
    activeProgram: {
      id: 'program-1',
      name: 'Hypertrophy Focus',
      description: 'A 12-week program designed to maximize muscle growth',
      startDate: '2024-04-01T00:00:00Z',
      endDate: '2024-06-24T00:00:00Z',
      progress: 65,
      daysPerWeek: 4,
      currentWeek: 8,
      totalWeeks: 12
    },
    upcomingWorkouts: [
      {
        id: 'workout-15',
        name: 'Upper Body Strength',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration: 60,
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '6-8', rest: 90 },
          { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 90 },
          { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 60 },
          { name: 'Pull-ups', sets: 3, reps: '8-10', rest: 60 },
          { name: 'Lateral Raises', sets: 3, reps: '10-12', rest: 45 },
          { name: 'Tricep Extensions', sets: 3, reps: '10-12', rest: 45 }
        ]
      },
      {
        id: 'workout-16',
        name: 'Lower Body Strength',
        date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        duration: 60,
        exercises: [
          { name: 'Squats', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Romanian Deadlifts', sets: 4, reps: '6-8', rest: 120 },
          { name: 'Leg Press', sets: 3, reps: '8-10', rest: 90 },
          { name: 'Leg Curls', sets: 3, reps: '10-12', rest: 60 },
          { name: 'Calf Raises', sets: 4, reps: '12-15', rest: 45 },
          { name: 'Ab Rollouts', sets: 3, reps: '10-12', rest: 45 }
        ]
      }
    ],
    completedWorkouts: [
      {
        id: 'workout-14',
        name: 'Upper Body Volume',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        duration: 65,
        exercises: [
          { name: 'Incline Bench Press', sets: 4, reps: '8-10', rest: 60, completed: true },
          { name: 'Lat Pulldowns', sets: 4, reps: '8-10', rest: 60, completed: true },
          { name: 'Cable Side Laterals', sets: 3, reps: '12-15', rest: 45, completed: true },
          { name: 'Cable Rows', sets: 3, reps: '10-12', rest: 45, completed: true },
          { name: 'Dips', sets: 3, reps: '10-12', rest: 45, completed: true },
          { name: 'Face Pulls', sets: 3, reps: '12-15', rest: 45, completed: true }
        ],
        performance: 95, // Percentage of planned workout completed
        feedback: 'Great pump, felt strong today'
      },
      {
        id: 'workout-13',
        name: 'Lower Body Volume',
        date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        duration: 70,
        exercises: [
          { name: 'Front Squats', sets: 4, reps: '8-10', rest: 90, completed: true },
          { name: 'Hack Squats', sets: 3, reps: '10-12', rest: 60, completed: true },
          { name: 'Leg Extensions', sets: 3, reps: '12-15', rest: 45, completed: true },
          { name: 'Seated Leg Curls', sets: 3, reps: '12-15', rest: 45, completed: true },
          { name: 'Seated Calf Raises', sets: 4, reps: '15-20', rest: 30, completed: true },
          { name: 'Hanging Leg Raises', sets: 3, reps: '10-15', rest: 45, completed: true }
        ],
        performance: 90,
        feedback: 'Legs are sore but feeling stronger each week'
      }
    ]
  }
};

// Helper to simulate API delay
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// MCP service for workout features
const workoutMcpApi: WorkoutMcpApi = {
  /**
   * Check server status
   */
  checkServerStatus: async () => {
    await simulateDelay();
    
    return {
      data: {
        status: 'online',
        version: '1.0.0',
        uptime: '3 days, 12 hours',
        message: 'Workout MCP Server is running'
      }
    };
  },
  
  /**
   * Get client progress data
   */
  getClientProgress: async ({ userId }: { userId: string }) => {
    await simulateDelay();
    
    return {
      data: {
        progress: { ...mockData.progress }
      }
    };
  },
  
  /**
   * Get workout statistics
   */
  getWorkoutStatistics: async ({ 
    userId, 
    includeExerciseBreakdown = true,
    includeMuscleGroupBreakdown = true,
    timeRange = 'all'
  }: { 
    userId: string, 
    includeExerciseBreakdown?: boolean,
    includeMuscleGroupBreakdown?: boolean,
    timeRange?: string
  }) => {
    await simulateDelay();
    
    return {
      data: {
        totalWorkouts: 45,
        totalMinutes: 2780,
        averageDuration: 61.5,
        weekdayBreakdown: [3, 8, 7, 10, 9, 4, 4],
        exerciseBreakdown: [
          { name: 'Push-ups', category: 'bodyweight', count: 23 },
          { name: 'Pull-ups', category: 'bodyweight', count: 18 },
          { name: 'Squats', category: 'compound', count: 28 },
          { name: 'Bench Press', category: 'compound', count: 20 },
          { name: 'Deadlift', category: 'compound', count: 16 },
          { name: 'Lunges', category: 'bodyweight', count: 15 },
          { name: 'Bicep Curls', category: 'isolation', count: 22 },
          { name: 'Lateral Raises', category: 'isolation', count: 12 }
        ],
        muscleGroupBreakdown: [
          { name: 'Chest', shortName: 'Chest', count: 32 },
          { name: 'Back', shortName: 'Back', count: 28 },
          { name: 'Legs', shortName: 'Legs', count: 42 },
          { name: 'Shoulders', shortName: 'Shoulders', count: 18 },
          { name: 'Arms', shortName: 'Arms', count: 34 },
          { name: 'Core', shortName: 'Core', count: 25 }
        ],
        intensityTrends: [
          { week: 'Week 1', volume: 4500, intensity: 60 },
          { week: 'Week 2', volume: 5200, intensity: 65 },
          { week: 'Week 3', volume: 5000, intensity: 70 },
          { week: 'Week 4', volume: 5800, intensity: 72 },
          { week: 'Week 5', volume: 6000, intensity: 75 },
          { week: 'Week 6', volume: 6200, intensity: 80 }
        ]
      }
    };
  },
  
  /**
   * Get client training program
   */
  getClientTrainingProgram: async ({ userId }: { userId: string }) => {
    await simulateDelay();
    
    return {
      data: {
        program: { ...mockData.trainingProgram }
      }
    };
  },
  
  /**
   * Log workout
   */
  logWorkout: async ({ 
    userId, 
    workoutId, 
    exercises, 
    duration, 
    feedback 
  }: { 
    userId: string, 
    workoutId: string, 
    exercises: any[], 
    duration: number, 
    feedback?: string 
  }) => {
    await simulateDelay();
    
    return {
      data: {
        success: true,
        message: 'Workout logged successfully',
        pointsEarned: 50
      }
    };
  },
  
  /**
   * Get workout recommendations
   */
  getWorkoutRecommendations: async ({ 
    userId, 
    focus, 
    duration, 
    equipment 
  }: { 
    userId: string, 
    focus?: string, 
    duration?: number, 
    equipment?: string[] 
  }) => {
    await simulateDelay();
    
    return {
      data: {
        recommendations: [
          {
            id: 'rec-1',
            name: 'Quick Upper Body Blast',
            description: 'A focused upper body workout for strength and definition',
            duration: 30,
            difficulty: 'Intermediate',
            exercises: [
              { name: 'Push-ups', sets: 3, reps: '10-15', rest: 45 },
              { name: 'Dumbbell Rows', sets: 3, reps: '10-12', rest: 45 },
              { name: 'Shoulder Press', sets: 3, reps: '10-12', rest: 45 },
              { name: 'Bicep Curls', sets: 3, reps: '12-15', rest: 30 },
              { name: 'Tricep Dips', sets: 3, reps: '12-15', rest: 30 }
            ]
          },
          {
            id: 'rec-2',
            name: 'Core & Conditioning',
            description: 'A cardio and core focused workout to burn fat and build endurance',
            duration: 25,
            difficulty: 'Beginner',
            exercises: [
              { name: 'Jumping Jacks', sets: 1, reps: '60 seconds', rest: 30 },
              { name: 'Mountain Climbers', sets: 1, reps: '45 seconds', rest: 30 },
              { name: 'Plank', sets: 3, reps: '30 seconds', rest: 30 },
              { name: 'Russian Twists', sets: 3, reps: '20 total', rest: 30 },
              { name: 'High Knees', sets: 1, reps: '45 seconds', rest: 30 }
            ]
          }
        ]
      }
    };
  },
  
  /**
   * Get body measurements
   */
  getBodyMeasurements: async ({ userId }: { userId: string }) => {
    await simulateDelay();
    
    return {
      data: {
        measurements: [
          {
            date: '2024-05-01T00:00:00Z',
            weight: 75.5,
            bodyFat: 18.2,
            chest: 102,
            waist: 84,
            hips: 98,
            arms: 36,
            thighs: 58,
            calves: 38
          },
          {
            date: '2024-04-01T00:00:00Z',
            weight: 76.2,
            bodyFat: 19.5,
            chest: 101,
            waist: 86,
            hips: 99,
            arms: 35,
            thighs: 57,
            calves: 37.5
          },
          {
            date: '2024-03-01T00:00:00Z',
            weight: 77.0,
            bodyFat: 20.1,
            chest: 100,
            waist: 88,
            hips: 100,
            arms: 34.5,
            thighs: 56.5,
            calves: 37
          }
        ]
      }
    };
  },
  
  /**
   * Log workout session
   */
  logWorkoutSession: async ({ session }: { session: any }) => {
    await simulateDelay();
    
    return {
      data: {
        success: true,
        message: 'Workout session logged successfully',
        pointsEarned: 50
      }
    };
  },
  
  /**
   * Log food intake
   */
  logFoodIntake: async ({ userId, foodIntake }: { userId: string, foodIntake: any }) => {
    await simulateDelay();
    
    return {
      data: {
        success: true,
        message: 'Food intake logged successfully',
        pointsEarned: 25
      }
    };
  }
};

// Export as both default and named export for backward compatibility
export { workoutMcpApi };
export default workoutMcpApi;