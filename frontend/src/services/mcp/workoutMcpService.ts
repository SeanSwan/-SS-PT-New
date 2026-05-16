/**
 * Retired Workout MCP compatibility adapter.
 *
 * Older dashboard modules still import this MCP-named service. The production
 * runtime no longer uses separate MCP servers, so this adapter routes reads and
 * writes to SwanStudios REST APIs or returns honest empty states. It never calls
 * the retired bridge, localhost MCP ports, or generated pretend workout data.
 */

import productionApiService from '../api.service';
import type {
  BodyMeasurement,
  GetBodyMeasurementsParams,
  GetClientProgressParams,
  GetClientTrainingProgramParams,
  GetWorkoutRecommendationsParams,
  GetWorkoutStatisticsParams,
  LogFoodIntakeParams,
  LogWorkoutParams,
  LogWorkoutSessionParams,
  TrainingProgramData,
  WorkoutMcpApi,
  WorkoutProgress,
  WorkoutRecommendation,
  WorkoutStatistics
} from '../../types/mcp/workout.types';
import type { McpApiResponse, ServerStatus, SuccessResponse } from '../../types/mcp/service.types';

class McpServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public fallbackMode = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'McpServiceError';
  }
}

const unwrap = (response: any) => response?.data?.data || response?.data || {};

const emptyProgress = (): WorkoutProgress => ({
  lastUpdated: new Date().toISOString(),
  bodyStats: {
    weight: { current: 0, previous: 0, unit: 'lb' },
    bodyFat: { current: 0, previous: 0, unit: '%' },
    muscle: { current: 0, previous: 0, unit: 'lb' },
    bmi: { current: 0, previous: 0 }
  },
  nasmProtocol: { overall: 0, categories: [] },
  bodyParts: [],
  keyExercises: [],
  achievements: [],
  achievementDates: {},
  workoutsCompleted: 0,
  totalExercisesPerformed: 0,
  streakDays: 0,
  totalMinutes: 0,
  overallLevel: 1,
  experiencePoints: 0,
  nasmProtocolData: [],
  monthlyProgress: []
});

const emptyStats = (): WorkoutStatistics => ({
  totalWorkouts: 0,
  totalMinutes: 0,
  averageDuration: 0,
  weekdayBreakdown: [0, 0, 0, 0, 0, 0, 0],
  exerciseBreakdown: [],
  muscleGroupBreakdown: [],
  intensityTrends: []
});

const emptyProgram = (): TrainingProgramData => ({
  activeProgram: {
    id: '',
    name: 'No active training program',
    description: '',
    startDate: '',
    endDate: '',
    progress: 0,
    daysPerWeek: 0,
    currentWeek: 0,
    totalWeeks: 0
  },
  upcomingWorkouts: [],
  completedWorkouts: []
});

const workoutMcpApi: WorkoutMcpApi = {
  checkServerStatus: async (): Promise<McpApiResponse<ServerStatus>> => ({
    data: {
      status: 'disabled',
      version: 'N/A',
      uptime: 'N/A',
      message: 'Workout MCP retired. SwanStudios workout APIs are active.'
    }
  }),

  getClientProgress: async ({ userId }: GetClientProgressParams): Promise<McpApiResponse<{ progress: WorkoutProgress }>> => {
    try {
      const response = await productionApiService.get(`/api/workout/progress/${userId}`);
      const data = unwrap(response);
      return { data: { progress: data.progress || data || emptyProgress() } };
    } catch {
      return { data: { progress: emptyProgress() } };
    }
  },

  getWorkoutStatistics: async ({ userId }: GetWorkoutStatisticsParams): Promise<McpApiResponse<WorkoutStatistics>> => {
    try {
      const response = await productionApiService.get(`/api/workout/statistics/${userId}`);
      return { data: unwrap(response) || emptyStats() };
    } catch {
      return { data: emptyStats() };
    }
  },

  getClientTrainingProgram: async ({ userId }: GetClientTrainingProgramParams): Promise<McpApiResponse<{ program: TrainingProgramData }>> => {
    try {
      const response = await productionApiService.get(`/api/workout-plans/client/${userId}`);
      const data = unwrap(response);
      return { data: { program: data.program || data.plan || emptyProgram() } };
    } catch {
      return { data: { program: emptyProgram() } };
    }
  },

  logWorkout: async (params: LogWorkoutParams): Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>> => {
    const response = await productionApiService.post('/api/workout/sessions', params);
    const data = unwrap(response);
    return { data: { success: true, pointsEarned: data.pointsEarned || data.xpAwarded || 0, ...data } };
  },

  getWorkoutRecommendations: async (
    params: GetWorkoutRecommendationsParams
  ): Promise<McpApiResponse<{ recommendations: WorkoutRecommendation[] }>> => {
    try {
      const response = await productionApiService.post('/api/workout/recommendations', params);
      const data = unwrap(response);
      return { data: { recommendations: data.recommendations || data.workouts || [] } };
    } catch {
      return { data: { recommendations: [] } };
    }
  },

  getBodyMeasurements: async ({ userId }: GetBodyMeasurementsParams): Promise<McpApiResponse<{ measurements: BodyMeasurement[] }>> => {
    try {
      const response = await productionApiService.get(`/api/client/analytics/body-measurements?userId=${userId}`);
      const data = unwrap(response);
      return { data: { measurements: data.measurements || [] } };
    } catch {
      return { data: { measurements: [] } };
    }
  },

  logWorkoutSession: async ({ session }: LogWorkoutSessionParams): Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>> => {
    const response = await productionApiService.post('/api/workout/sessions', session);
    const data = unwrap(response);
    return { data: { success: true, pointsEarned: data.pointsEarned || data.xpAwarded || 0, ...data } };
  },

  logFoodIntake: async (_params: LogFoodIntakeParams): Promise<McpApiResponse<SuccessResponse & { pointsEarned: number }>> => ({
    data: {
      success: true,
      pointsEarned: 0,
      message: 'Nutrition logging is handled by /api/macros.'
    }
  })
};

export { workoutMcpApi, McpServiceError };
export default workoutMcpApi;
