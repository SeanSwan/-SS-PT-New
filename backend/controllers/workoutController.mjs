/**
 * Workout Controller
 * =================
 * Controller for all workout-related endpoints.
 * 
 * Enhanced with additional endpoints for MCP server integration.
 */

import workoutService from '../services/workoutService.mjs';
import { errorResponse, successResponse } from '../utils/responseUtils.mjs';
import logger from '../utils/logger.mjs';

/**
 * Get all workout sessions for a user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getWorkoutSessions(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Extract query parameters
    const { limit, offset, status, startDate, endDate, sort, order } = req.query;
    
    // Get sessions
    const sessions = await workoutService.getWorkoutSessions(userId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      status,
      startDate,
      endDate,
      sort,
      order
    });
    
    return successResponse(res, { sessions });
  } catch (error) {
    logger.error(`Error getting workout sessions: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout sessions', error);
  }
}

/**
 * Get a workout session by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getWorkoutSessionById(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await workoutService.getWorkoutSessionById(sessionId);
    
    if (!session) {
      return errorResponse(res, 404, 'Workout session not found');
    }
    
    // Check if the user is authorized to view this session
    if (session.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to view this session');
    }
    
    return successResponse(res, { session });
  } catch (error) {
    logger.error(`Error getting workout session: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout session', error);
  }
}

/**
 * Create a new workout session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function createWorkoutSession(req, res) {
  try {
    const sessionData = {
      ...req.body,
      userId: req.body.userId || req.user.id
    };
    
    // Check if the user is authorized to create a session for another user
    if (sessionData.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to create sessions for other users');
    }
    
    const session = await workoutService.createWorkoutSession(sessionData);
    
    return successResponse(res, { session }, 201);
  } catch (error) {
    logger.error(`Error creating workout session: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to create workout session', error);
  }
}

/**
 * Update a workout session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function updateWorkoutSession(req, res) {
  try {
    const { sessionId } = req.params;
    
    // Get the existing session to check authorization
    const existingSession = await workoutService.getWorkoutSessionById(sessionId);
    
    if (!existingSession) {
      return errorResponse(res, 404, 'Workout session not found');
    }
    
    // Check if the user is authorized to update this session
    if (existingSession.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to update this session');
    }
    
    const sessionData = req.body;
    const session = await workoutService.updateWorkoutSession(sessionId, sessionData);
    
    return successResponse(res, { session });
  } catch (error) {
    logger.error(`Error updating workout session: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to update workout session', error);
  }
}

/**
 * Delete a workout session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function deleteWorkoutSession(req, res) {
  try {
    const { sessionId } = req.params;
    
    // Get the existing session to check authorization
    const existingSession = await workoutService.getWorkoutSessionById(sessionId);
    
    if (!existingSession) {
      return errorResponse(res, 404, 'Workout session not found');
    }
    
    // Check if the user is authorized to delete this session
    if (existingSession.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to delete this session');
    }
    
    await workoutService.deleteWorkoutSession(sessionId);
    
    return successResponse(res, { message: 'Workout session deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting workout session: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to delete workout session', error);
  }
}

/**
 * Get client progress
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getClientProgress(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if the user is authorized to view this progress
    if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to view this progress');
    }
    
    const progress = await workoutService.getClientProgress(userId);
    
    return successResponse(res, { progress });
  } catch (error) {
    logger.error(`Error getting client progress: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get client progress', error);
  }
}

/**
 * Get workout statistics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getWorkoutStatistics(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if the user is authorized to view these statistics
    if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to view these statistics');
    }
    
    // Extract query parameters
    const { 
      startDate, 
      endDate,
      includeExerciseBreakdown,
      includeMuscleGroupBreakdown,
      includeWeekdayBreakdown,
      includeIntensityTrends
    } = req.query;
    
    const statistics = await workoutService.getWorkoutStatistics(userId, {
      startDate,
      endDate,
      includeExerciseBreakdown: includeExerciseBreakdown === 'true',
      includeMuscleGroupBreakdown: includeMuscleGroupBreakdown === 'true',
      includeWeekdayBreakdown: includeWeekdayBreakdown === 'true',
      includeIntensityTrends: includeIntensityTrends === 'true'
    });
    
    return successResponse(res, { statistics });
  } catch (error) {
    logger.error(`Error getting workout statistics: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout statistics', error);
  }
}

/**
 * Get exercise recommendations
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getExerciseRecommendations(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if the user is authorized to get recommendations for this user
    if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to get recommendations for this user');
    }
    
    // Extract query parameters
    const { 
      goal, 
      difficulty,
      equipment,
      muscleGroups,
      excludeExercises,
      limit,
      rehabFocus,
      optPhase
    } = req.query;
    
    // Process array parameters
    const processedParams = {
      goal,
      difficulty,
      equipment: equipment ? (Array.isArray(equipment) ? equipment : [equipment]) : undefined,
      muscleGroups: muscleGroups ? (Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups]) : undefined,
      excludeExercises: excludeExercises ? (Array.isArray(excludeExercises) ? excludeExercises : [excludeExercises]) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      rehabFocus: rehabFocus === 'true',
      optPhase
    };
    
    const exercises = await workoutService.getExerciseRecommendations(userId, processedParams);
    
    return successResponse(res, { exercises });
  } catch (error) {
    logger.error(`Error getting exercise recommendations: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get exercise recommendations', error);
  }
}

/**
 * Create a workout plan
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function createWorkoutPlan(req, res) {
  try {
    const planData = {
      ...req.body,
      trainerId: req.body.trainerId || req.user.id
    };
    
    // Check if the user is authorized to create a plan
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to create workout plans');
    }
    
    const plan = await workoutService.createWorkoutPlan(planData);
    
    return successResponse(res, { plan }, 201);
  } catch (error) {
    logger.error(`Error creating workout plan: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to create workout plan', error);
  }
}

/**
 * Get a workout plan by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getWorkoutPlanById(req, res) {
  try {
    const { planId } = req.params;
    const plan = await workoutService.getWorkoutPlanById(planId);
    
    if (!plan) {
      return errorResponse(res, 404, 'Workout plan not found');
    }
    
    // Check if the user is authorized to view this plan
    if (plan.clientId !== req.user.id && plan.trainerId !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to view this plan');
    }
    
    return successResponse(res, { plan });
  } catch (error) {
    logger.error(`Error getting workout plan: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout plan', error);
  }
}

/**
 * Update a workout plan
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function updateWorkoutPlan(req, res) {
  try {
    const { planId } = req.params;
    
    // Get the existing plan to check authorization
    const existingPlan = await workoutService.getWorkoutPlanById(planId);
    
    if (!existingPlan) {
      return errorResponse(res, 404, 'Workout plan not found');
    }
    
    // Check if the user is authorized to update this plan
    if (existingPlan.trainerId !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to update this plan');
    }
    
    const planData = req.body;
    const plan = await workoutService.updateWorkoutPlan(planId, planData);
    
    return successResponse(res, { plan });
  } catch (error) {
    logger.error(`Error updating workout plan: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to update workout plan', error);
  }
}

/**
 * Delete a workout plan
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function deleteWorkoutPlan(req, res) {
  try {
    const { planId } = req.params;
    
    // Get the existing plan to check authorization
    const existingPlan = await workoutService.getWorkoutPlanById(planId);
    
    if (!existingPlan) {
      return errorResponse(res, 404, 'Workout plan not found');
    }
    
    // Check if the user is authorized to delete this plan
    if (existingPlan.trainerId !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to delete this plan');
    }
    
    await workoutService.deleteWorkoutPlan(planId);
    
    return successResponse(res, { message: 'Workout plan deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting workout plan: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to delete workout plan', error);
  }
}

/**
 * Generate workout sessions from a plan
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function generateWorkoutSessions(req, res) {
  try {
    const { planId } = req.params;
    
    // Get the existing plan to check authorization
    const existingPlan = await workoutService.getWorkoutPlanById(planId);
    
    if (!existingPlan) {
      return errorResponse(res, 404, 'Workout plan not found');
    }
    
    // Check if the user is authorized to generate sessions from this plan
    if (existingPlan.clientId !== req.user.id && existingPlan.trainerId !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to generate sessions from this plan');
    }
    
    // Extract generation options
    const { startDate, weeks, userId } = req.body;
    
    const sessions = await workoutService.generateWorkoutSessions(planId, {
      startDate,
      weeks: weeks ? parseInt(weeks) : undefined,
      userId: userId || req.user.id
    });
    
    return successResponse(res, { sessions });
  } catch (error) {
    logger.error(`Error generating workout sessions: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to generate workout sessions', error);
  }
}

export default {
  getWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
  getClientProgress,
  getWorkoutStatistics,
  getExerciseRecommendations,
  createWorkoutPlan,
  getWorkoutPlanById,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  generateWorkoutSessions
};