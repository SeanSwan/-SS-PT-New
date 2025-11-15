/**
 * Workout Controller (Workout Session & Plan Management)
 * =======================================================
 *
 * Purpose: Controller for workout session tracking, progress monitoring, statistics,
 * exercise recommendations, and trainer-created workout plans with service layer delegation
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Workout Management System
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐      ┌─────────────────┐
 * │  Client/Trainer     │─────▶│  Workout         │─────▶│  Workout        │─────▶│  PostgreSQL     │
 * │  Dashboard (React)  │      │  Controller      │      │  Service        │      │  (4 tables)     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘      └─────────────────┘
 *                                       │                         │
 *                                       │ (authorization)         │ (business logic)
 *                                       ▼                         ▼
 *                              ┌──────────────────┐      ┌──────────────────┐
 *                              │  RBAC Checks     │      │  Exercise Library│
 *                              │  (owner/role)    │      │  NASM Integration│
 *                              └──────────────────┘      └──────────────────┘
 *
 * Database Schema (4 tables):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ workout_sessions                                            │
 *   │ ├─id (PK, UUID)                                             │
 *   │ ├─userId (FK → users.id) - Client performing workout        │
 *   │ ├─planId (FK → workout_plans.id, nullable)                  │
 *   │ ├─sessionDate (DATE)                                        │
 *   │ ├─duration (INTEGER, minutes)                               │
 *   │ ├─status (ENUM: planned, in_progress, completed, skipped)   │
 *   │ ├─exercises (JSONB) - Array of exercise sets                │
 *   │ ├─notes (TEXT)                                              │
 *   │ ├─createdAt, updatedAt, deletedAt                           │
 *   │ └─────────────────────────────────────────────────────────  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ workout_plans                                               │
 *   │ ├─id (PK, UUID)                                             │
 *   │ ├─clientId (FK → users.id) - Client assigned to plan        │
 *   │ ├─trainerId (FK → users.id) - Trainer who created plan      │
 *   │ ├─name (STRING) - Plan name                                 │
 *   │ ├─description (TEXT)                                        │
 *   │ ├─goal (STRING: strength, hypertrophy, endurance, etc.)     │
 *   │ ├─difficulty (STRING: beginner, intermediate, advanced)     │
 *   │ ├─durationWeeks (INTEGER)                                   │
 *   │ ├─workoutsPerWeek (INTEGER)                                 │
 *   │ ├─template (JSONB) - Workout session templates              │
 *   │ ├─active (BOOLEAN)                                          │
 *   │ ├─createdAt, updatedAt, deletedAt                           │
 *   │ └─────────────────────────────────────────────────────────  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ client_progress (linked via userId)                         │
 *   │ - Tracks client fitness metrics over time                   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ exercise_library (NASM-aligned exercise database)           │
 *   │ - Used for recommendations and validation                   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Entity Relationships:
 *
 *   workout_sessions ─────▶ users (userId) [client]
 *   workout_sessions ─────▶ workout_plans (planId) [optional]
 *   workout_plans ─────▶ users (clientId) [assigned client]
 *   workout_plans ─────▶ users (trainerId) [creator]
 *
 * Controller Methods (13 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD                       ACCESS         PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ getWorkoutSessions           Client/T/A     Get user's sessions (filtered)   │
 * │ getWorkoutSessionById        Owner/T/A      Get single session by ID         │
 * │ createWorkoutSession         Client/T/A     Create new workout session       │
 * │ updateWorkoutSession         Owner/T/A      Update session details           │
 * │ deleteWorkoutSession         Owner/T/A      Soft delete session              │
 * │ getClientProgress            Owner/T/A      Get client fitness metrics       │
 * │ getWorkoutStatistics         Owner/T/A      Get analytics (time-based)       │
 * │ getExerciseRecommendations   Client/T/A     NASM-based exercise suggestions  │
 * │ createWorkoutPlan            Trainer/Admin  Create workout plan template     │
 * │ getWorkoutPlanById           Owner/T/A      Get plan by ID                   │
 * │ updateWorkoutPlan            Creator/Admin  Update plan template             │
 * │ deleteWorkoutPlan            Creator/Admin  Soft delete plan                 │
 * │ generateWorkoutSessions      Owner/T/A      Generate sessions from plan      │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Mermaid Sequence Diagram (Workout Session Creation):
 *
 * ```mermaid
 * sequenceDiagram
 *   participant Client
 *   participant Controller
 *   participant Service
 *   participant Database
 *
 *   Client->>Controller: POST /api/workout/sessions
 *   Note over Controller: Extract userId from JWT
 *   Controller->>Controller: Check authorization (owner/trainer/admin)
 *   alt Unauthorized
 *     Controller-->>Client: 403 Forbidden
 *   end
 *   Controller->>Service: createWorkoutSession(sessionData)
 *   Service->>Database: INSERT INTO workout_sessions
 *   Database-->>Service: New session record
 *   Service-->>Controller: Session object
 *   Controller-->>Client: 201 Created { session }
 * ```
 *
 * Authorization Model:
 *
 *   Role-Based Access Control (RBAC):
 *   - Client: Can manage own sessions/view own progress
 *   - Trainer: Can create plans + manage assigned client sessions
 *   - Admin: Full access to all sessions/plans
 *
 *   Ownership Validation:
 *   - Sessions: userId === req.user.id OR role in ['admin', 'trainer']
 *   - Plans: clientId === req.user.id OR trainerId === req.user.id OR role === 'admin'
 *   - Cross-user operations: Trainer/Admin can create sessions for clients
 *
 * Query Parameters (getWorkoutStatistics):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ PARAMETER                    TYPE           PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ startDate                    ISO String     Filter start date                │
 * │ endDate                      ISO String     Filter end date                  │
 * │ includeExerciseBreakdown     Boolean        Top exercises by volume          │
 * │ includeMuscleGroupBreakdown  Boolean        Muscle group distribution        │
 * │ includeWeekdayBreakdown      Boolean        Best training days               │
 * │ includeIntensityTrends       Boolean        Intensity progression over time  │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Business Logic:
 *
 * WHY Service Layer Delegation?
 * - Separation of concerns (controller handles HTTP, service handles business logic)
 * - Reusability (service methods called from multiple controllers, MCP server, scheduled jobs)
 * - Testability (service layer unit tests without HTTP mocking)
 * - MCP Server Integration (workoutService.mjs exposed to MCP server for AI workout generation)
 *
 * WHY Authorization Checks in Controller (Not Service)?
 * - HTTP context required (req.user.id, req.user.role from JWT)
 * - Service layer remains agnostic (reusable in non-HTTP contexts like MCP server)
 * - Centralized authorization logic (consistent across all routes)
 * - Security-first architecture (fail early with 403 before service logic)
 *
 * WHY Trainer Can Create Plans But Client Cannot?
 * - Trainers have fitness expertise (program design, periodization, NASM principles)
 * - Quality control (prevents unsafe client-created plans)
 * - Client can track sessions but needs trainer guidance for structured plans
 * - Admin can override (manual plan creation for special cases)
 *
 * WHY NASM-Based Exercise Recommendations?
 * - Evidence-based exercise selection (OPT Model alignment)
 * - Injury prevention (rehab focus, contraindication filtering)
 * - Progressive overload (difficulty/phase-based recommendations)
 * - Equipment filtering (home vs gym workouts)
 *
 * WHY Generate Sessions from Plan (Not Manual Entry)?
 * - Reduces trainer workload (bulk session creation for 4-12 week plans)
 * - Consistency (plan template ensures correct exercise progression)
 * - Client convenience (pre-populated workout calendar)
 * - Flexible start date (plan reusable for multiple clients)
 *
 * Security Model:
 * - JWT authentication required for all endpoints (protect middleware in routes)
 * - Ownership validation (users can only access own data unless trainer/admin)
 * - Cross-user access restricted to trainer/admin roles
 * - Service layer does NOT perform authorization (delegated to controller)
 * - Plan creation restricted to trainer/admin roles
 *
 * Error Handling:
 * - 403: Forbidden (user not authorized to access resource)
 * - 404: Not Found (session/plan does not exist)
 * - 500: Server error (service layer failures, database errors)
 *
 * Dependencies:
 * - workoutService.mjs (business logic layer)
 * - responseUtils.mjs (successResponse, errorResponse utilities)
 * - logger.mjs (Winston logger)
 * - authMiddleware.mjs (protect, authorize middleware in routes)
 *
 * Performance Considerations:
 * - Service layer handles database queries (controller remains lightweight)
 * - Statistics endpoint supports optional breakdowns (reduce payload size)
 * - Pagination supported via limit/offset (getWorkoutSessions)
 * - JSONB exercises column (flexible schema for varied workout structures)
 *
 * Testing Strategy:
 * - Unit tests for authorization logic (owner/role checks)
 * - Integration tests for service layer delegation
 * - Test cross-user access restrictions
 * - Test query parameter processing (statistics, recommendations)
 * - Mock workoutService for isolated controller tests
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
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