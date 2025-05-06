/**
 * Workout Planner Service
 * =====================
 * Service for handling workout plans API requests
 */

import api from './api';
import {
  WorkoutPlan,
  WorkoutPlansResponse,
  WorkoutPlanResponse,
  FetchPlansParams,
  SavePlanParams,
  ClonePlanParams
} from '../pages/workout/types/plan.types';

/**
 * Workout Planner Service
 * Handles all API requests related to workout plans
 */
const workoutPlannerService = {
  /**
   * Get all workout plans
   * @param params Query parameters for filtering, pagination, and sorting
   */
  getWorkoutPlans: async (params: FetchPlansParams): Promise<WorkoutPlansResponse> => {
    try {
      const response = await api.get('/api/workout/plans', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching workout plans:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific workout plan by ID
   * @param planId The ID of the workout plan to fetch
   */
  getWorkoutPlan: async (planId: string): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.get(`/api/workout/plans/${planId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workout plan with ID ${planId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new workout plan
   * @param plan The workout plan data to create
   */
  createWorkoutPlan: async (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.post('/api/workout/plans', plan);
      return response.data;
    } catch (error) {
      console.error('Error creating workout plan:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing workout plan
   * @param planId The ID of the workout plan to update
   * @param plan The updated workout plan data
   */
  updateWorkoutPlan: async (planId: string, plan: Partial<WorkoutPlan>): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.put(`/api/workout/plans/${planId}`, plan);
      return response.data;
    } catch (error) {
      console.error(`Error updating workout plan with ID ${planId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a workout plan
   * @param planId The ID of the workout plan to delete
   */
  deleteWorkoutPlan: async (planId: string): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete(`/api/workout/plans/${planId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting workout plan with ID ${planId}:`, error);
      throw error;
    }
  },
  
  /**
   * Clone an existing workout plan
   * @param params Parameters for cloning a plan
   */
  cloneWorkoutPlan: async (params: ClonePlanParams): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.post('/api/workout/plans/clone', params);
      return response.data;
    } catch (error) {
      console.error(`Error cloning workout plan with ID ${params.sourcePlanId}:`, error);
      throw error;
    }
  },
  
  /**
   * Archive a workout plan
   * @param planId The ID of the workout plan to archive
   */
  archiveWorkoutPlan: async (planId: string): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.post(`/api/workout/plans/${planId}/archive`);
      return response.data;
    } catch (error) {
      console.error(`Error archiving workout plan with ID ${planId}:`, error);
      throw error;
    }
  },
  
  /**
   * Restore an archived workout plan
   * @param planId The ID of the workout plan to restore
   */
  restoreWorkoutPlan: async (planId: string): Promise<WorkoutPlanResponse> => {
    try {
      const response = await api.post(`/api/workout/plans/${planId}/restore`);
      return response.data;
    } catch (error) {
      console.error(`Error restoring workout plan with ID ${planId}:`, error);
      throw error;
    }
  }
};

export default workoutPlannerService;
