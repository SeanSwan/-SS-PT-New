/**
 * profileRoutes.mjs
 * Enhanced routes for comprehensive user profile management including social features
 */
import express from 'express';
import multer from 'multer';
import { 
  uploadProfilePhoto,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  getUserPosts,
  getUserAchievements,
  getUserFollowStats
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

/**
 * @route   GET /api/profile/stats
 * @desc    Get current user stats (followers, following, posts, etc.)
 * @access  Private
 */
router.get('/stats', protect, getUserStats);

/**
 * @route   GET /api/profile/posts
 * @desc    Get current user posts
 * @access  Private
 */
router.get('/posts', protect, getUserPosts);

/**
 * @route   GET /api/profile/achievements
 * @desc    Get current user achievements and gamification data
 * @access  Private
 */
router.get('/achievements', protect, getUserAchievements);

/**
 * @route   GET /api/profile/follow-stats
 * @desc    Get current user follow statistics
 * @access  Private
 */
router.get('/follow-stats', protect, getUserFollowStats);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get specific user profile (public view)
 * @access  Private
 */
router.get('/:userId', protect, getUserProfile);

export default router;