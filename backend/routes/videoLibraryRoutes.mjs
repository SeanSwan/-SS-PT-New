/**
 * Video Library Routes (Admin Exercise Management)
 * =================================================
 *
 * Purpose: REST API routes for NASM exercise video library management
 *
 * Blueprint Reference: docs/ai-workflow/API-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Base Path: /api/admin/exercise-library
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Client   │─────▶│  Express Routes  │─────▶│   Controller    │
 * │   (Frontend)    │      │  (this file)     │      │   Functions     │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (middleware)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  adminAuth.mjs   │
 *                          │  - requireAdmin  │
 *                          │  - optionalAuth  │
 *                          └──────────────────┘
 *
 * Middleware Flow:
 *
 *   Incoming Request
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Express Router  │
 *   └─────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌──────────────┐
 *   │ requireAdmin    │──────▶│ Verify JWT   │
 *   │ (middleware)    │       │ Check role   │
 *   └─────────────────┘       └──────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Controller      │
 *   │ Function        │
 *   └─────────────────┘
 *
 * API Endpoints (7 total):
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT                                AUTH          PURPOSE     │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ POST   /                                requireAdmin  Create      │
 * │ GET    /                                requireAdmin  List        │
 * │ GET    /:exerciseId/videos              requireAdmin  Get videos │
 * │ PATCH  /videos/:videoId                 requireAdmin  Update     │
 * │ DELETE /videos/:videoId                 requireAdmin  Soft delete│
 * │ POST   /videos/:videoId/restore         requireAdmin  Restore    │
 * │ POST   /videos/:videoId/track-view      optionalAuth  Analytics  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Request/Response Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant C as Admin Client
 *     participant R as Express Router
 *     participant A as requireAdmin Middleware
 *     participant V as VideoLibraryController
 *     participant D as PostgreSQL
 *
 *     C->>R: POST /api/admin/exercise-library
 *     R->>A: Authenticate request
 *     A->>A: Verify JWT token
 *     A->>A: Check req.user.role === 'admin'
 *
 *     alt Not admin
 *         A-->>C: 403 Forbidden
 *     else Is admin
 *         A->>V: createExerciseVideo(req, res)
 *         V->>V: Validate with Joi schema
 *         V->>D: BEGIN TRANSACTION
 *         V->>D: INSERT exercise_library
 *         V->>D: INSERT exercise_videos
 *         D->>D: TRIGGER: update video_count
 *         V->>D: COMMIT TRANSACTION
 *         V-->>C: 201 Created
 *     end
 * ```
 *
 * Authentication Strategy:
 *
 * requireAdmin (6 endpoints):
 * - Extracts JWT from Authorization: Bearer <token>
 * - Verifies token signature + expiration
 * - Checks req.user.role === 'admin'
 * - Returns 401 if token invalid/missing
 * - Returns 403 if user not admin
 * - Attaches req.user to request context
 *
 * optionalAuth (1 endpoint - track-view):
 * - Same as requireAdmin but allows anonymous requests
 * - If JWT present: attaches req.user
 * - If JWT missing: req.user = null (anonymous tracking)
 * - Used for video analytics (clients can be logged out)
 *
 * Error Responses:
 *
 * 400 Bad Request - Validation error (Joi schema)
 * {
 *   error: "Validation error",
 *   details: { field: "description of issue" }
 * }
 *
 * 401 Unauthorized - Missing/invalid JWT
 * {
 *   error: "Unauthorized",
 *   message: "Authentication token required"
 * }
 *
 * 403 Forbidden - Not admin
 * {
 *   error: "Forbidden",
 *   message: "Admin access required"
 * }
 *
 * 404 Not Found - Exercise/video not found
 * {
 *   error: "Not found",
 *   message: "Exercise/video not found"
 * }
 *
 * 500 Internal Server Error - Database/server error
 * {
 *   error: "Internal server error",
 *   message: "Description of error"
 * }
 *
 * Security Model:
 * - ALL routes require admin authentication (except track-view)
 * - JWT verification enforced via middleware (not in controller)
 * - Role-based access control (RBAC): req.user.role === 'admin'
 * - SQL injection prevention: Parameterized queries in controller
 * - Soft deletes: Videos never hard-deleted (preserves audit trail)
 *
 * Route Registration:
 * - Imported in backend/server.mjs as: app.use('/api/admin/exercise-library', videoLibraryRoutes)
 * - Full URLs: https://api.example.com/api/admin/exercise-library/...
 *
 * Testing:
 * - Unit tests: backend/tests/videoLibraryRoutes.test.mjs
 * - Integration tests: Supertest + Vitest
 * - Auth tests: Verify 401/403 responses for missing/invalid tokens
 * - RBAC tests: Verify non-admin users get 403
 *
 * Performance Considerations:
 * - Middleware overhead: JWT verification adds ~5ms per request
 * - Route ordering: Most specific routes first (/videos/:id before /:id)
 * - Query params: Validated in controller (not middleware) to avoid overhead
 *
 * Created: 2025-11-13
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

import express from 'express';
import { requireAdmin, optionalAuth } from '../middleware/adminAuth.mjs';
import {
  createExerciseVideo,
  listExerciseVideos,
  getExerciseVideos,
  updateVideo,
  deleteVideo,
  restoreVideo,
  trackVideoView,
} from '../controllers/videoLibraryController.mjs';

const router = express.Router();

// ==================== ADMIN ROUTES (Auth Required) ====================

/**
 * POST /api/admin/exercise-library
 * Create new exercise with video demonstration
 *
 * Request body: {
 *   name, description, primary_muscle, secondary_muscles, equipment, difficulty,
 *   movement_patterns, nasm_phases, contraindications, acute_variables,
 *   video: { type, video_id, title, description, duration_seconds, chapters, tags, is_public }
 * }
 *
 * Response: 201 Created
 * {
 *   message: "Exercise and video created successfully",
 *   exercise: { ...exercise with videos array }
 * }
 */
router.post('/', requireAdmin, createExerciseVideo);

/**
 * GET /api/admin/exercise-library
 * List exercises with video library filtering
 *
 * Query params:
 * - page (default 1)
 * - limit (default 20, max 100)
 * - search (exercise name search)
 * - muscle_group (chest, back, shoulders, etc.)
 * - equipment (barbell, dumbbell, bodyweight, etc.)
 * - difficulty (beginner, intermediate, advanced)
 * - nasm_phase (1-5)
 * - video_type (youtube, upload, all)
 * - approved_only (default true)
 * - sort_by (created_at, name, views, video_count)
 * - sort_order (asc, desc)
 *
 * Response: 200 OK
 * {
 *   exercises: [...],
 *   pagination: { page, limit, total, total_pages }
 * }
 */
router.get('/', requireAdmin, listExerciseVideos);

/**
 * GET /api/admin/exercise-library/:exerciseId/videos
 * Get all videos for a specific exercise
 *
 * Params:
 * - exerciseId (UUID)
 *
 * Response: 200 OK
 * {
 *   exercise: { ...exercise details },
 *   videos: [ ...videos for this exercise ]
 * }
 */
router.get('/:exerciseId/videos', requireAdmin, getExerciseVideos);

/**
 * PATCH /api/admin/exercise-library/videos/:videoId
 * Update video metadata
 *
 * Params:
 * - videoId (UUID)
 *
 * Request body: {
 *   title?, description?, chapters?, tags?, is_public?, approved?
 * }
 *
 * Response: 200 OK
 * {
 *   message: "Video updated successfully",
 *   video: { ...updated video }
 * }
 */
router.patch('/videos/:videoId', requireAdmin, updateVideo);

/**
 * DELETE /api/admin/exercise-library/videos/:videoId
 * Soft delete a video (sets deletedAt timestamp)
 *
 * Params:
 * - videoId (UUID)
 *
 * Response: 200 OK
 * {
 *   message: "Video soft deleted successfully",
 *   video_id: "...",
 *   note: "Video is hidden but preserved in database. Use restore endpoint to recover."
 * }
 */
router.delete('/videos/:videoId', requireAdmin, deleteVideo);

/**
 * POST /api/admin/exercise-library/videos/:videoId/restore
 * Restore a soft-deleted video
 *
 * Params:
 * - videoId (UUID)
 *
 * Response: 200 OK
 * {
 *   message: "Video restored successfully",
 *   video: { ...restored video }
 * }
 */
router.post('/videos/:videoId/restore', requireAdmin, restoreVideo);

/**
 * POST /api/admin/exercise-library/videos/:videoId/track-view
 * Track video view analytics
 *
 * Params:
 * - videoId (UUID)
 *
 * Request body: {
 *   watch_duration_seconds, completion_percentage, chapters_viewed,
 *   device_type, view_context, workout_id
 * }
 *
 * Response: 201 Created
 * {
 *   message: "Video view tracked successfully"
 * }
 *
 * Note: This endpoint uses optionalAuth to support both authenticated
 * and anonymous view tracking
 */
router.post('/videos/:videoId/track-view', optionalAuth, trackVideoView);

export default router;
