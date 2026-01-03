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
import multer from 'multer';
import path from 'path';
import {
  createExerciseVideo,
  listExerciseVideos,
  getExercise,
  updateExercise,
  deleteExercise,
  getExerciseVideos,
  updateVideo,
  deleteVideo,
  restoreVideo,
  trackVideoView
} from '../controllers/videoLibraryController.mjs';
import { protect, adminOnly } from '../middleware/auth.mjs';

const router = Router();

// ==================== MULTER CONFIGURATION ====================

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'videos');
    // Ensure directory exists
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${extension}`);
  }
});

// File filter for video files
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// Configure multer upload middleware
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  }
});

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
  uploadVideo.single('video_file'), // Handle video file upload
  [
    body('name').trim().isLength({ min: 3 }).escape(),
    body('description').trim().optional().escape(),
    body('primary_muscle').isIn(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors', 'adductors', 'abductors']),
    body('equipment').isIn(['barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable', 'bodyweight',
      'medicine_ball', 'stability_ball', 'trx', 'bosu', 'foam_roller', 'bench', 'machine', 'other']),
    body('difficulty').isIn(['beginner', 'intermediate', 'advanced']),
    body('movement_patterns').isArray({ min: 1 }),
    body('nasm_phases').isArray({ min: 1 }),
    body('video.type').isIn(['youtube', 'upload']),
    // Conditional validation: video_id required for YouTube, optional for upload
    body('video.video_id').if(body('video.type').equals('youtube')).trim().notEmpty()
      .withMessage('Video ID is required for YouTube videos'),
    body('video.title').trim().optional().escape(),
    body('video.description').trim().optional().escape(),
    body('video.duration_seconds').optional().isInt({ min: 1 }),
    body('video.thumbnail_url').optional().isURL(),
    body('video.chapters').optional().isArray(),
    body('video.tags').optional().isArray(),
    body('video.is_public').optional().isBoolean()
  ],
  createExerciseVideo
);

// Get exercise details
router.get(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isInt({ min: 1 })
  ],
  getExercise
);

// Update exercise
router.put(
  '/:id',
  protect,
  adminOnly,
  [
    param('id').isInt({ min: 1 }),
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
    param('id').isInt({ min: 1 })
  ],
  deleteExercise
);

// Get all videos for specific exercise
router.get(
  '/:id/videos',
  protect,
  adminOnly,
  [
    param('id').isInt({ min: 1 })
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
    param('id').isInt({ min: 1 }),
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
    param('id').isInt({ min: 1 })
  ],
  deleteVideo
);

// Restore soft-deleted video
router.post(
  '/videos/:id/restore',
  protect,
  adminOnly,
  [
    param('id').isInt({ min: 1 })
  ],
  restoreVideo
);

// Track video view analytics (allow authenticated users, not just admins)
router.post(
  '/videos/:id/track-view',
  protect, // Allow any authenticated user (clients/trainers)
  [
    param('id').isInt({ min: 1 }),
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
