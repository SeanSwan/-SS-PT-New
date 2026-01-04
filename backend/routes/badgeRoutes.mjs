/**
 * Badge Routes - API Route Definitions for Badge Management
 * ========================================================
 *
 * Purpose: Express route definitions for badge-related API endpoints
 * with authentication, validation, and rate limiting
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Routes:
 * - POST /api/badges - Create badge (admin)
 * - GET /api/badges - List badges with filtering
 * - GET /api/badges/:badgeId - Get badge details
 * - PUT /api/badges/:badgeId - Update badge (admin)
 * - DELETE /api/badges/:badgeId - Delete badge (admin)
 * - POST /api/badges/check-earning - Check badge earnings
 * - GET /api/badges/user/:userId - Get user's badges
 * - POST /api/badges/:badgeId/upload-image - Upload badge image
 *
 * Middleware:
 * - Authentication required for all routes
 * - Admin role validation for management routes
 * - Rate limiting (100 requests/15min)
 * - Input validation using express-validator
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

import express from 'express';
import badgeController from '../controllers/badgeController.mjs';
import { authenticateToken } from '../middleware/auth.mjs';
import { apiLimiter } from '../middleware/rateLimiter.mjs';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Badge creation validation
const badgeCreationValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Badge name must be 3-100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters'),
  body('category')
    .isIn(['strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'])
    .withMessage('Invalid category'),
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty'),
  body('criteriaType')
    .isIn(['exercise_completion', 'streak_achievement', 'challenge_completion', 'social_engagement', 'milestone_reached', 'custom_criteria'])
    .withMessage('Invalid criteria type'),
  body('criteria')
    .isObject()
    .withMessage('Criteria must be a valid object'),
  body('rewards')
    .optional()
    .isObject()
    .withMessage('Rewards must be a valid object'),
  body('collectionId')
    .optional()
    .isUUID()
    .withMessage('Invalid collection ID')
];

// Badge update validation (all fields optional)
const badgeUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Badge name must be 3-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters'),
  body('category')
    .optional()
    .isIn(['strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'])
    .withMessage('Invalid category'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty'),
  body('criteria')
    .optional()
    .isObject()
    .withMessage('Criteria must be a valid object'),
  body('rewards')
    .optional()
    .isObject()
    .withMessage('Rewards must be a valid object'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Badge earning check validation
const badgeEarningValidation = [
  body('activityType')
    .isIn(['exercise_completion', 'workout_completion', 'streak_update', 'challenge_completion', 'social_action'])
    .withMessage('Invalid activity type'),
  body('activityData')
    .isObject()
    .withMessage('Activity data must be a valid object')
];

// Query parameter validation
const badgeListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
  query('category')
    .optional()
    .isIn(['strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'])
    .withMessage('Invalid category'),
  query('collectionId')
    .optional()
    .isUUID()
    .withMessage('Invalid collection ID'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query too long')
];

// Route definitions

// Create badge (admin only)
router.post('/',
  authenticateToken,
  apiLimiter,
  badgeCreationValidation,
  handleValidationErrors,
  badgeController.createBadge.bind(badgeController)
);

// Get badges with filtering and pagination
router.get('/',
  authenticateToken,
  apiLimiter,
  badgeListValidation,
  handleValidationErrors,
  badgeController.getBadges.bind(badgeController)
);

// Get badge details
router.get('/:badgeId',
  authenticateToken,
  apiLimiter,
  param('badgeId').isUUID().withMessage('Invalid badge ID'),
  handleValidationErrors,
  badgeController.getBadge.bind(badgeController)
);

// Update badge (admin only)
router.put('/:badgeId',
  authenticateToken,
  apiLimiter,
  param('badgeId').isUUID().withMessage('Invalid badge ID'),
  badgeUpdateValidation,
  handleValidationErrors,
  badgeController.updateBadge.bind(badgeController)
);

// Delete badge (admin only)
router.delete('/:badgeId',
  authenticateToken,
  apiLimiter,
  param('badgeId').isUUID().withMessage('Invalid badge ID'),
  query('force').optional().isBoolean().withMessage('Force must be a boolean'),
  handleValidationErrors,
  badgeController.deleteBadge.bind(badgeController)
);

// Check badge earnings for activity
router.post('/check-earning',
  authenticateToken,
  apiLimiter,
  badgeEarningValidation,
  handleValidationErrors,
  badgeController.checkBadgeEarnings.bind(badgeController)
);

// Get user's earned badges
router.get('/user/:userId',
  authenticateToken,
  apiLimiter,
  param('userId').isUUID().withMessage('Invalid user ID'),
  query('category').optional().isIn(['strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general']),
  query('recent').optional().isBoolean().withMessage('Recent must be a boolean'),
  handleValidationErrors,
  badgeController.getUserBadges.bind(badgeController)
);

// Upload badge image (admin only)
router.post('/:badgeId/upload-image',
  authenticateToken,
  apiLimiter,
  param('badgeId').isUUID().withMessage('Invalid badge ID'),
  upload.single('image'),
  (req, res, next) => {
    // Handle multer errors
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        error: req.fileValidationError
      });
    }
    next();
  },
  badgeController.uploadBadgeImage.bind(badgeController)
);

export default router;