/**
 * Video Library Routes
 * ====================
 * 
 * Purpose: Define API endpoints for exercise video management
 * 
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 * 
 * Middleware Flow:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Request        │─────▶│  Auth Middleware  │─────▶│   Validation    │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *         │                                                  │
 *         ▼                                                  ▼
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Rate Limiter   │─────▶│  RBAC Check      │─────▶│   Controller     │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 * 
 * Validation Rules:
 * - All endpoints require admin role
 * - Input sanitization for all fields
 * - YouTube URL validation (when applicable)
 * 
 * Rate Limiting:
 * - Public endpoints: 60 requests/minute
 * - Admin endpoints: 120 requests/minute
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createExercise,
  getExercise,
  updateExercise,
  deleteExercise,
  listExercises,
  getExerciseVideos,
  updateVideo,
  deleteVideo,
  restoreVideo,
  trackVideoView
} from '../controllers/videoLibraryController.mjs';
import { protect, adminOnly } from '../middleware/auth.mjs';

const router = Router();

// ==================== EXERCISE ENDPOINTS ====================

// List exercises (with pagination & filtering)
router.get(
  '/',
  protect,
  adminOnly,
  listExercises
);

// Create exercise with video
router.post(
  '/',
  protect,
  adminOnly,
  [
    body('title').trim().isLength({ min: 3 }).escape(),
    body('description').trim().optional().escape(),
    body('video_url').trim().optional(),
    body('video_type').isIn(['youtube', 'upload']).optional()
  ],
  createExercise
);

// Get exercise details
router.get(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isUUID()
  ],
  getExercise
);

// Update exercise
router.put(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isUUID(),
    body('title').trim().isLength({ min: 3 }).escape(),
    body('description').trim().optional().escape()
  ],
  updateExercise
);

// Delete exercise (soft delete)
router.delete(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isUUID()
  ],
  deleteExercise
);

// Get all videos for specific exercise
router.get(
  '/:id/videos',
  protect,
  adminOnly,
  [
    param('id').isUUID()
  ],
  getExerciseVideos
);

// ==================== VIDEO ENDPOINTS ====================

// Update video metadata
router.patch(
  '/videos/:id',
  protect,
  adminOnly,
  [
    param('id').isUUID(),
    body('title').trim().optional().escape(),
    body('description').trim().optional().escape(),
    body('tags').optional().isArray(),
    body('chapters').optional().isArray(),
    body('approved').optional().isBoolean(),
    body('is_public').optional().isBoolean()
  ],
  updateVideo
);

// Delete video (soft delete)
router.delete(
  '/videos/:id',
  protect,
  adminOnly,
  [
    param('id').isUUID()
  ],
  deleteVideo
);

// Restore soft-deleted video
router.post(
  '/videos/:id/restore',
  protect,
  adminOnly,
  [
    param('id').isUUID()
  ],
  restoreVideo
);

// Track video view analytics
router.post(
  '/videos/:id/track-view',
  protect,
  adminOnly,
  [
    param('id').isUUID(),
    body('watch_duration_seconds').optional().isInt(),
    body('completion_percentage').optional().isFloat({ min: 0, max: 100 }),
    body('completed').optional().isBoolean(),
    body('chapters_viewed').optional().isArray(),
    body('replay_count').optional().isInt(),
    body('pause_count').optional().isInt()
  ],
  trackVideoView
);

export default router;
