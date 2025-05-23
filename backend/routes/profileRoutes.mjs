/**
 * profileRoutes.mjs
 * Handles routes for user profile management including photo uploads
 */
import express from 'express';
import multer from 'multer';
import { 
  uploadProfilePhoto,
  getUserProfile,
  updateUserProfile
} from '../controllers/profileController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import { rateLimiter } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

/**
 * @route   POST /api/profile/upload-profile-photo
 * @desc    Upload user profile photo
 * @access  Private
 * @limits  Rate limited to prevent abuse
 */
router.post(
  '/upload-profile-photo', 
  protect, 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 uploads per 15 minutes
  upload.single('profilePhoto'),
  (req, res, next) => {
    logger.info('Profile photo upload request received', { 
      userId: req.user?.id,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype 
    });
    next();
  },
  uploadProfilePhoto
);

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', protect, getUserProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/', protect, updateUserProfile);

export default router;