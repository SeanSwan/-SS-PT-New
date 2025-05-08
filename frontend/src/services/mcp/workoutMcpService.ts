/**
 * Workout MCP Service
 * 
 * Service for interacting with the Workout MCP server that provides
 * AI-powered workout functionality for the SwanStudios fitness application.
 * Acts as a bridge between large language models (LLMs) and SwanStudios services.
 */

import axios from 'axios';
import { handleMcpError, notifyMcpError } from './utils/mcp-error-handler';

// Import configuration
import { MCP_CONFIG } from '../../config/env-config';

// Get base URL from configuration
const WORKOUT_MCP_URL = MCP_CONFIG.WORKOUT_MCP_URL;

// Auth token from environment or local storage
const getAuthToken = () => {
  return localStorage.getItem(MCP_CONFIG.AUTH_TOKEN_KEY) || process.env.REACT_APP_API_TOKEN || '';
};

// Create axios instance with default config
const mcpAxios = axios.create({
  baseURL: WORKOUT_MCP_URL,
  timeout: MCP_CONFIG.DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
mcpAxios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Wrap API calls with error handling
const handleRequest = async (requestFn: () => Promise<any>) => {
  try {
    return await requestFn();
  } catch (error) {
    const formattedError = handleMcpError(error, 'Workout');
    notifyMcpError(formattedError);
    throw formattedError;
  }
};

// Type definitions for workout MCP
export interface WorkoutRecommendationParams {
  userId: string;
  goal?: string;
  difficulty?: string;
  equipment?: string[];
  muscleGroups?: string[];
  excludeExercises?: string[];
  limit?: number;
  rehabFocus?: boolean;
  optPhase?: string;
}

export interface ClientProgressParams {
  userId: string;
}

export interface WorkoutStatisticsParams {
  userId: string;
  startDate?: string;
  endDate?: string;
  includeExerciseBreakdown?: boolean;
  includeMuscleGroupBreakdown?: boolean;
  includeWeekdayBreakdown?: boolean;
  includeIntensityTrends?: boolean;
}

export interface WorkoutSessionParams {
  session: any; // Full workout session data
}

export interface WorkoutPlanParams {
  trainerId: string;
  clientId: string;
  name: string;
  description: string;
  goal: string;
  startDate: string;
  endDate: string;
  daysPerWeek: number;
  focusAreas: string[];
  difficulty: string;
  optPhase: string;
  equipment: string[];
}

// API service for workout MCP
export const workoutMcpApi = {
  /**
   * Get personalized exercise recommendations
   */
  getWorkoutRecommendations: (params: WorkoutRecommendationParams) => 
    handleRequest(() => mcpAxios.post(`/tools/GetWorkoutRecommendations`, params)),
  
  /**
   * Get comprehensive progress data for a client
   */
  getClientProgress: (params: ClientProgressParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetClientProgress`, params)),
  
  /**
   * Get detailed workout statistics and metrics
   */
  getWorkoutStatistics: (params: WorkoutStatisticsParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GetWorkoutStatistics`, params)),
  
  /**
   * Create or update a workout session
   */
  logWorkoutSession: (params: WorkoutSessionParams) =>
    handleRequest(() => mcpAxios.post(`/tools/LogWorkoutSession`, params)),
  
  /**
   * Generate a personalized workout plan
   */
  generateWorkoutPlan: (params: WorkoutPlanParams) =>
    handleRequest(() => mcpAxios.post(`/tools/GenerateWorkoutPlan`, params)),
    
  /**
   * Track food intake and nutrition
   * Sends food intake data to be processed for nutritional information
   */
  logFoodIntake: (params: any) =>
    handleRequest(() => mcpAxios.post(`/tools/LogFoodIntake`, params)),
    
  /**
   * Check if the MCP server is running
   */
  checkServerStatus: () =>
    handleRequest(() => mcpAxios.get(`/`)),
};

export default workoutMcpApi;