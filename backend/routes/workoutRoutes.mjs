/**
 * Workout Routes (Workout Session & Plan API)
 * ============================================
 *
 * Purpose: REST API for workout session tracking, progress monitoring, statistics,
 * exercise recommendations, and trainer-created workout plans
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Workout Management System
 *
 * Base Path: /api/workout
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client/Trainer     │─────▶│  Workout Routes  │─────▶│  Workout        │
 * │  Dashboard (React)  │      │  (This file)     │      │  Controller     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *                                       │
 *                                       │ (per-route middleware)
 *                                       ▼
 *                              ┌──────────────────┐
 *                              │  protect         │
 *                              │  authorize([...])│
 *                              └──────────────────┘
 *
 * API Endpoints (19 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                         MIDDLEWARE     PURPOSE              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ SESSION MANAGEMENT (6 endpoints)                                             │
 * │ GET     /sessions                        protect        Get user's sessions  │
 * │ GET     /sessions/user/:userId           protect+auth   Get client sessions  │
 * │ GET     /sessions/:sessionId             protect        Get session by ID    │
 * │ POST    /sessions                        protect        Create session       │
 * │ PUT     /sessions/:sessionId             protect        Update session       │
 * │ DELETE  /sessions/:sessionId             protect        Delete session       │
 * │                                                                               │
 * │ PROGRESS TRACKING (2 endpoints)                                              │
 * │ GET     /progress                        protect        Get own progress     │
 * │ GET     /progress/:userId                protect        Get client progress  │
 * │                                                                               │
 * │ STATISTICS & ANALYTICS (2 endpoints)                                         │
 * │ GET     /statistics                      protect        Get own stats        │
 * │ GET     /statistics/:userId              protect        Get client stats     │
 * │                                                                               │
 * │ EXERCISE RECOMMENDATIONS (2 endpoints)                                       │
 * │ GET     /recommendations                 protect        Get recommendations  │
 * │ GET     /recommendations/:userId         protect+auth   Get for client       │
 * │                                                                               │
 * │ WORKOUT PLANS (7 endpoints)                                                  │
 * │ GET     /plans                           protect        NOT IMPLEMENTED (501)│
 * │ GET     /plans/:planId                   protect        Get plan by ID       │
 * │ POST    /plans                           protect+auth   Create plan (T/A)    │
 * │ PUT     /plans/:planId                   protect        Update plan          │
 * │ DELETE  /plans/:planId                   protect        Delete plan          │
 * │ POST    /plans/:planId/generate          protect        Generate sessions    │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Middleware Strategy:
 *
 *   Per-Route Middleware (NOT global router.use):
 *   - protect: JWT authentication (all routes)
 *   - authorize(['admin', 'trainer']): Role check (cross-user endpoints, plan creation)
 *
 *   Authorization Pattern:
 *   - Own data: protect only (e.g., GET /sessions)
 *   - Cross-user: protect + authorize(['admin', 'trainer']) (e.g., GET /sessions/user/:userId)
 *   - Plan creation: protect + authorize(['admin', 'trainer']) (POST /plans)
 *
 * Route Groups:
 *
 * 1. Session Management (6 routes):
 *    - CRUD operations for workout sessions
 *    - Cross-user access for trainers (GET /sessions/user/:userId)
 *    - Authorization delegated to controller (ownership checks)
 *
 * 2. Progress Tracking (2 routes):
 *    - Client fitness metrics over time
 *    - Trainer/Admin can view client progress
 *
 * 3. Statistics & Analytics (2 routes):
 *    - Time-based workout statistics
 *    - Optional breakdowns (exercise, muscle group, weekday, intensity)
 *
 * 4. Exercise Recommendations (2 routes):
 *    - NASM-based exercise suggestions
 *    - Filters: goal, difficulty, equipment, muscle groups, rehab focus, OPT phase
 *
 * 5. Workout Plans (7 routes):
 *    - Trainer-created workout plan templates
 *    - Plan generation (bulk session creation)
 *    - Placeholder route (GET /plans - 501 Not Implemented)
 *
 * Mermaid Sequence Diagram (Workout Session Creation):
 *
 * ```mermaid
 * sequenceDiagram
 *   participant Client
 *   participant Routes
 *   participant Middleware
 *   participant Controller
 *   participant Service
 *
 *   Client->>Routes: POST /api/workout/sessions
 *   Routes->>Middleware: protect (JWT auth)
 *   alt Invalid Token
 *     Middleware-->>Client: 401 Unauthorized
 *   end
 *   Middleware->>Controller: createWorkoutSession(req, res)
 *   Controller->>Controller: Check ownership (userId === req.user.id)
 *   alt Not Authorized
 *     Controller-->>Client: 403 Forbidden
 *   end
 *   Controller->>Service: createWorkoutSession(sessionData)
 *   Service-->>Controller: New session object
 *   Controller-->>Client: 201 Created { session }
 * ```
 *
 * Business Logic:
 *
 * WHY Per-Route Middleware (Not Global router.use)?
 * - Flexible authorization (some endpoints allow clients, others require trainer/admin)
 * - Fine-grained access control (GET /sessions vs GET /sessions/user/:userId)
 * - Placeholder route compatibility (GET /plans does NOT require controller)
 * - Explicit middleware per route (easier to audit security)
 *
 * WHY Separate authorize() Calls for Cross-User Endpoints?
 * - Trainers need access to client sessions/progress/stats
 * - Clients should NOT access other clients' data
 * - Controller ownership checks provide additional layer (userId === req.user.id)
 * - Role-based middleware ensures only trainer/admin bypass ownership checks
 *
 * WHY Placeholder Route (GET /plans - 501 Not Implemented)?
 * - Frontend expects GET /plans endpoint for "My Plans" page
 * - Implementation deferred until plan listing UI is designed
 * - 501 status code (Not Implemented) signals "coming soon" to frontend
 * - Alternative: Filter plans by clientId (requires controller method)
 *
 * WHY Controller Delegation (Not Inline Handlers)?
 * - Service layer integration (workout business logic in workoutService.mjs)
 * - Testability (controller unit tests without routes)
 * - Code organization (controller focuses on authorization, service on business logic)
 * - Reusability (workoutService methods used by MCP server for AI workout generation)
 *
 * WHY Exercise Recommendations Endpoint?
 * - NASM OPT Model integration (phase-based exercise selection)
 * - Personalized workout suggestions (goal, difficulty, equipment, muscle groups)
 * - Injury prevention (rehab focus, contraindication filtering)
 * - Trainer tool (quick exercise search for plan creation)
 *
 * Security Model:
 * - All routes require JWT authentication (protect middleware)
 * - Cross-user access restricted to trainer/admin roles
 * - Controller enforces ownership checks (userId === req.user.id)
 * - Plan creation restricted to trainer/admin roles
 * - Service layer does NOT perform authorization (delegated to controller)
 *
 * Error Handling:
 * - 401: Unauthorized (invalid/missing JWT token)
 * - 403: Forbidden (user not authorized to access resource)
 * - 404: Not Found (session/plan does not exist)
 * - 501: Not Implemented (placeholder route)
 * - 500: Server error (controller/service layer failures)
 *
 * Dependencies:
 * - workoutController.mjs (all controller methods)
 * - authMiddleware.mjs (protect, authorize)
 * - express (router)
 *
 * Performance Considerations:
 * - Pagination supported via query params (limit, offset)
 * - Statistics endpoint supports optional breakdowns (reduce payload)
 * - Service layer handles database queries (routes remain lightweight)
 *
 * Testing Strategy:
 * - Integration tests for each route
 * - Test per-route middleware (protect, authorize)
 * - Test cross-user access restrictions
 * - Test placeholder route (501 response)
 * - Test query parameter forwarding to controller
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import workoutController from '../controllers/workoutController.mjs';

const router = express.Router();

// --- Session Routes ---

/**
 * @route GET /api/workout/sessions
 * @desc Get all workout sessions for the current user
 * @access Private
 */
router.get('/sessions', protect, workoutController.getWorkoutSessions);

/**
 * @route GET /api/workout/sessions/user/:userId
 * @desc Get all workout sessions for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/sessions/user/:userId', protect, authorize(['admin', 'trainer']), workoutController.getWorkoutSessions);

/**
 * @route GET /api/workout/sessions/:sessionId
 * @desc Get a specific workout session
 * @access Private
 */
router.get('/sessions/:sessionId', protect, workoutController.getWorkoutSessionById);

/**
 * @route POST /api/workout/sessions
 * @desc Create a new workout session
 * @access Private
 */
router.post('/sessions', protect, workoutController.createWorkoutSession);

/**
 * @route PUT /api/workout/sessions/:sessionId
 * @desc Update a workout session
 * @access Private
 */
router.put('/sessions/:sessionId', protect, workoutController.updateWorkoutSession);

/**
 * @route DELETE /api/workout/sessions/:sessionId
 * @desc Delete a workout session
 * @access Private
 */
router.delete('/sessions/:sessionId', protect, workoutController.deleteWorkoutSession);

// --- Progress Routes ---

/**
 * @route GET /api/workout/progress
 * @desc Get progress for the current user
 * @access Private
 */
router.get('/progress', protect, workoutController.getClientProgress);

/**
 * @route GET /api/workout/progress/:userId
 * @desc Get progress for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/progress/:userId', protect, workoutController.getClientProgress);

// --- Statistics Routes ---

/**
 * @route GET /api/workout/statistics
 * @desc Get workout statistics for the current user
 * @access Private
 */
router.get('/statistics', protect, workoutController.getWorkoutStatistics);

/**
 * @route GET /api/workout/statistics/:userId
 * @desc Get workout statistics for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/statistics/:userId', protect, workoutController.getWorkoutStatistics);

// --- Exercise Recommendation Routes ---

/**
 * @route GET /api/workout/recommendations
 * @desc Get exercise recommendations for the current user
 * @access Private
 */
router.get('/recommendations', protect, workoutController.getExerciseRecommendations);

/**
 * @route GET /api/workout/recommendations/:userId
 * @desc Get exercise recommendations for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/recommendations/:userId', protect, authorize(['admin', 'trainer']), workoutController.getExerciseRecommendations);

// --- Plan Routes ---

/**
 * @route GET /api/workout/plans
 * @desc Get all workout plans for the current user
 * @access Private
 */
router.get('/plans', protect, (req, res) => {
  // Placeholder for future implementation
  res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * @route GET /api/workout/plans/:planId
 * @desc Get a specific workout plan
 * @access Private
 */
router.get('/plans/:planId', protect, workoutController.getWorkoutPlanById);

/**
 * @route POST /api/workout/plans
 * @desc Create a new workout plan
 * @access Private (Admin/Trainer only)
 */
router.post('/plans', protect, authorize(['admin', 'trainer']), workoutController.createWorkoutPlan);

/**
 * @route PUT /api/workout/plans/:planId
 * @desc Update a workout plan
 * @access Private
 */
router.put('/plans/:planId', protect, workoutController.updateWorkoutPlan);

/**
 * @route DELETE /api/workout/plans/:planId
 * @desc Delete a workout plan
 * @access Private
 */
router.delete('/plans/:planId', protect, workoutController.deleteWorkoutPlan);

/**
 * @route POST /api/workout/plans/:planId/generate
 * @desc Generate workout sessions from a plan
 * @access Private
 */
router.post('/plans/:planId/generate', protect, workoutController.generateWorkoutSessions);

export default router;