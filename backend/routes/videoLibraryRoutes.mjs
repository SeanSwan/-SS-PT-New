/**
 * Video Library Routes
 *
 * Admin-only routes for managing exercise video library
 * All routes require admin authentication via requireAdmin middleware
 *
 * Base path: /api/admin/exercise-library
 *
 * Created: 2025-11-13
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
