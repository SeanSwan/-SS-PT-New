/**
 * Workout Session Service
 * ======================
 * Service for handling workout sessions API requests
 */

import api from './api';
import {
  WorkoutSession,
  WorkoutSessionsResponse,
  WorkoutSessionResponse,
  FetchSessionsParams,
  SaveSessionParams
} from '../pages/workout/types/session.types';

/**
 * Workout Session Service
 * Handles all API requests related to workout sessions
 */
const workoutSessionService = {
  /**
   * Get all workout sessions
   * @param params Query parameters for filtering, pagination, and sorting
   */
  getWorkoutSessions: async (params: FetchSessionsParams): Promise<WorkoutSessionsResponse> => {
    try {
      const response = await api.get('/api/workout/sessions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching workout sessions:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific workout session by ID
   * @param sessionId The ID of the workout session to fetch
   */
  getWorkoutSession: async (sessionId: string): Promise<WorkoutSessionResponse> => {
    try {
      const response = await api.get(`/api/workout/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workout session with ID ${sessionId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new workout session
   * @param session The workout session data to create
   */
  createWorkoutSession: async (session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSessionResponse> => {
    try {
      const response = await api.post('/api/workout/sessions', session);
      return response.data;
    } catch (error) {
      console.error('Error creating workout session:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing workout session
   * @param sessionId The ID of the workout session to update
   * @param session The updated workout session data
   */
  updateWorkoutSession: async (sessionId: string, session: Partial<WorkoutSession>): Promise<WorkoutSessionResponse> => {
    try {
      const response = await api.put(`/api/workout/sessions/${sessionId}`, session);
      return response.data;
    } catch (error) {
      console.error(`Error updating workout session with ID ${sessionId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a workout session
   * @param sessionId The ID of the workout session to delete
   */
  deleteWorkoutSession: async (sessionId: string): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/api/workout/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting workout session with ID ${sessionId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get workout session metrics and statistics
   * @param userId The user ID to get statistics for
   * @param params Query parameters for filtering (date range, etc.)
   */
  getSessionStatistics: async (userId: string, params?: {
    startDate?: string;
    endDate?: string;
    includeExerciseBreakdown?: boolean;
    includeMuscleGroupBreakdown?: boolean;
    includeWeekdayBreakdown?: boolean;
    includeIntensityTrends?: boolean;
  }) => {
    try {
      const response = await api.get(`/api/workout/sessions/statistics/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching session statistics for user ${userId}:`, error);
      throw error;
    }
  },
  
  /**
   * Start a workout session (real-time tracking)
   * @param session Initial session data
   */
  startWorkoutSession: async (session: Partial<Omit<WorkoutSession, 'id'>>): Promise<WorkoutSessionResponse> => {
    try {
      const response = await api.post('/api/workout/sessions/start', session);
      return response.data;
    } catch (error) {
      console.error('Error starting workout session:', error);
      throw error;
    }
  },
  
  /**
   * End an active workout session
   * @param sessionId The ID of the session to end
   * @param data Additional data to update when ending the session
   */
  endWorkoutSession: async (sessionId: string, data: {
    duration?: number;
    notes?: string;
  }): Promise<WorkoutSessionResponse> => {
    try {
      const response = await api.post(`/api/workout/sessions/${sessionId}/end`, data);
      return response.data;
    } catch (error) {
      console.error(`Error ending workout session with ID ${sessionId}:`, error);
      throw error;
    }
  }
};

export default workoutSessionService;
