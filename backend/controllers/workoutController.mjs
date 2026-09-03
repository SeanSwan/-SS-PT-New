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
 * - Reusability (service methods called from multiple controllers, API jobs, scheduled jobs)
 * - Testability (service layer unit tests without HTTP mocking)
 * - First-party API Integration (workoutService.mjs backs Swan Coach workout generation)
 *
 * WHY Authorization Checks in Controller (Not Service)?
 * - HTTP context required (req.user.id, req.user.role from JWT)
 * - Service layer remains agnostic (reusable in non-HTTP contexts like scheduled jobs)
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
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { parseSessionListQuery } from '../utils/workoutSessionQuery.mjs';

/**
 * Get all workout sessions for a user
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getWorkoutSessions(req, res) {
  try {
    const userId = req.params.userId || req.user.id;

    // Query-parameter validation, ported from routes/workoutSessionRoutes.mjs
    // (SWA-75, 2026-07-30). That router's `GET /` did this properly and was
    // UNREACHABLE — /api/workout is mounted ahead of /api/workout/sessions, so
    // every real list request landed HERE, where `limit` was parsed with a bare
    // parseInt and passed into the query with no cap at all: `?limit=1000000` was
    // a valid request. The careful validation guarded a door nobody could open.
    //
    // parseSessionListQuery preserves the page → offset translation this
    // controller already did for useDashboardQueries.useWorkoutSessions (which
    // sends { limit, page }), keeps explicit offset winning over page, and also
    // accepts the retired router's sortBy/sortDirection spelling so callers built
    // against that contract are not silently ignored.
    const parsed = parseSessionListQuery(req.query);
    if (!parsed.ok) {
      return errorResponse(res, 400, parsed.message);
    }

    const { status } = req.query;

    // Ask for ONE more row than the caller wants. If it comes back there is
    // another page, and we learned that without a second COUNT query over a
    // table that grows for the life of every client's membership. The extra row
    // is sliced off before it reaches the client.
    //
    // `hasMore` is additive: `sessions` keeps its exact previous shape, so every
    // existing consumer is untouched. Without it a paginated client cannot tell
    // "that is all of it" from "the window ended here", and a truncated history
    // reads as a complete one (Blueprint v2 S8 / D7).
    const requestedLimit = parsed.value.limit;
    const probeLimit = typeof requestedLimit === 'number' ? requestedLimit + 1 : undefined;

    const fetched = await workoutService.getWorkoutSessions(userId, {
      limit: probeLimit,
      offset: parsed.value.offset,
      status,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
      sort: parsed.value.sort,
      order: parsed.value.order
    });

    const rows = Array.isArray(fetched) ? fetched : [];
    const hasMore = typeof requestedLimit === 'number' && rows.length > requestedLimit;
    const sessions = hasMore ? rows.slice(0, requestedLimit) : fetched;

    return successResponse(res, {
      sessions,
      limit: requestedLimit ?? null,
      offset: parsed.value.offset ?? null,
      hasMore
    });
  } catch (error) {
    // Canonical-surface-audit 2026-04-13: silent-failure mask removed.
    // The prior `if (error.name === 'SequelizeDatabaseError' && error.message?.includes('does not exist'))`
    // shortcut swallowed real schema drift (it hid `column "exercise.category" does not exist`
    // for years, which in turn made every client dashboard show zero data under the old code path).
    // Every unexpected error now propagates as a logged 500 so drift surfaces loudly.
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
    
    // Authorize: owner (client/user), admin, or a trainer with an ACTIVE
    // assignment to the session's owner. The old check let ANY trainer through
    // (no assignment gate) and its int-vs-string compare denied real owners.
    //
    // 404, NOT 403, on an unauthorized READ (SWA-75, 2026-07-31). A 403 here is an
    // existence oracle: it tells a non-owner that the id they guessed is real, and
    // session ids are sequential integers, so the whole space is enumerable. The
    // response must be byte-identical to the miss branch above — same status, same
    // message — or the distinction leaks anyway.
    //
    // Denial is unchanged and still enforced by assertAssignmentOrAdmin; only the
    // status code stops revealing existence. This restores the posture the retired
    // /api/workout/sessions GET /:id had by design, and matches the surviving
    // /:id/handoff route on that router.
    //
    // READS ONLY. updateWorkoutSession and deleteWorkoutSession deliberately keep
    // 403: the retired router did the same, a write cannot succeed either way, and
    // a trainer who has just lost an assignment needs to know WHY their save failed
    // rather than being told the client's session vanished.
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, session.userId))) {
      return errorResponse(res, 404, 'Workout session not found');
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
    const { clientRequestId } = req.body;
    if (clientRequestId !== undefined && (
      typeof clientRequestId !== 'string'
      || clientRequestId.length === 0
      || clientRequestId.length > 64
    )) {
      return errorResponse(res, 400, 'Invalid workout retry key');
    }

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields = [
      'title', 'description', 'plannedStartTime', 'actualStartTime', 'actualEndTime',
      'status', 'notes', 'workoutPlanId', 'exercises', 'duration', 'sessionDate',
      'nasmPhase', 'targetMuscleGroups', 'difficulty', 'type', 'intensity',
      'clientRequestId'
    ];
    const sessionData = { userId: req.body.userId || req.user.id };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) sessionData[field] = req.body[field];
    }

    // Authorize creating-for-another: self, admin, or an assigned trainer.
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, sessionData.userId))) {
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
    
    // Authorize: owner, admin, or an assigned trainer.
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, existingSession.userId))) {
      return errorResponse(res, 403, 'You are not authorized to update this session');
    }

    // Whitelist allowed fields — never allow userId/trainerId injection
    const updateAllowed = [
      'title', 'description', 'status', 'notes', 'duration', 'sessionDate',
      'actualStartTime', 'actualEndTime', 'exercises', 'nasmPhase',
      'targetMuscleGroups', 'difficulty', 'type', 'completedAt'
    ];
    const sessionData = {};
    for (const field of updateAllowed) {
      if (req.body[field] !== undefined) sessionData[field] = req.body[field];
    }
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
    
    // Authorize: owner, admin, or an assigned trainer.
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, existingSession.userId))) {
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

    // Authorize: self, admin, or an assigned trainer (no blanket trainer read).
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, userId))) {
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

    // Authorize: self, admin, or an assigned trainer (no blanket trainer read).
    if (!(await assertAssignmentOrAdmin(req.user.id, req.user.role, userId))) {
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
    const requestedUserId = req.params.userId || req.query.userId;
    const libraryMode =
      requestedUserId === 'admin-library' &&
      (req.user.role === 'admin' || req.user.role === 'trainer');
    const userId = libraryMode ? 'admin-library' : (requestedUserId || req.user.id);
    
    // Authorize (outside the shared admin/trainer library): self, admin, or an
    // assigned trainer — a trainer can't pull recommendations for an unassigned user.
    if (!libraryMode && !(await assertAssignmentOrAdmin(req.user.id, req.user.role, userId))) {
      return errorResponse(res, 403, 'You are not authorized to get recommendations for this user');
    }
    
    // Extract query parameters
    const { 
      goal, 
      difficulty,
      equipment,
      muscleGroups,
      muscleGroupNames,
      bodyRegions,
      excludeExercises,
      limit,
      rehabFocus,
      optPhase
    } = req.query;
    const parsedLimit = Number.parseInt(String(limit), 10);
    const normalizedLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : undefined;
    
    // Process array parameters
    const processedParams = {
      goal,
      difficulty,
      equipment: equipment ? (Array.isArray(equipment) ? equipment : [equipment]) : undefined,
      muscleGroups: muscleGroups ? (Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups]) : undefined,
      muscleGroupNames: muscleGroupNames ? (Array.isArray(muscleGroupNames) ? muscleGroupNames : [muscleGroupNames]) : undefined,
      bodyRegions: bodyRegions ? (Array.isArray(bodyRegions) ? bodyRegions : [bodyRegions]) : undefined,
      excludeExercises: excludeExercises ? (Array.isArray(excludeExercises) ? excludeExercises : [excludeExercises]) : undefined,
      limit: limit ? normalizedLimit : undefined,
      rehabFocus: rehabFocus === 'true',
      optPhase,
      libraryMode
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
    // Whitelist allowed fields — force trainerId to current user (never from req.body)
    const planAllowed = [
      'title', 'name', 'description', 'goal', 'difficulty', 'durationWeeks',
      'workoutsPerWeek', 'template', 'active', 'nasmPhase', 'exercises',
      'clientId', 'status'
    ];
    const planData = { trainerId: req.user.id };
    for (const field of planAllowed) {
      if (req.body[field] !== undefined) planData[field] = req.body[field];
    }

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

    // Validate target userId — prevent generating sessions attributed to another user
    const targetUserId = userId || req.user.id;
    if (targetUserId !== req.user.id && existingPlan.trainerId !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You are not authorized to generate sessions for this user');
    }
    // Ensure target user matches the plan's client (if plan has a clientId)
    if (existingPlan.clientId && targetUserId !== existingPlan.clientId && req.user.role !== 'admin') {
      return errorResponse(res, 400, 'Target user does not match the plan client');
    }

    const sessions = await workoutService.generateWorkoutSessions(planId, {
      startDate,
      weeks: weeks ? parseInt(weeks) : undefined,
      userId: targetUserId
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
