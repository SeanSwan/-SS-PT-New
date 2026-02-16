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
 * @route   POST /api/profile/upload-banner-photo
 * @desc    Upload user profile banner/cover photo
 * @access  Private
 */
router.post(
  '/upload-banner-photo',
  protect,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  upload.single('bannerPhoto'),
  async (req, res) => {
    try {
      const { default: path } = await import('path');
      const { default: fs } = await import('fs/promises');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowedExtensions.includes(fileExt)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.'
        });
      }

      const uploadDir = path.join(__dirname, '../uploads/banners');
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `banner-${req.user.id}-${Date.now()}${fileExt}`;
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, req.file.buffer);

      const bannerUrl = `/uploads/banners/${filename}`;

      // Import User model lazily
      const { getUser } = await import('../models/index.mjs');
      const User = getUser();
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Delete old banner if exists
      if (user.bannerPhoto && !user.bannerPhoto.startsWith('http')) {
        try {
          const oldPath = path.join(__dirname, '..', user.bannerPhoto);
          await fs.access(oldPath);
          await fs.unlink(oldPath);
        } catch { /* old file may not exist */ }
      }

      await user.update({ bannerPhoto: bannerUrl });

      logger.info('Banner photo uploaded', { userId: req.user.id, bannerUrl });

      return res.status(200).json({
        success: true,
        message: 'Banner photo uploaded successfully',
        data: { bannerPhoto: bannerUrl }
      });
    } catch (error) {
      logger.error('Banner photo upload error:', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ success: false, message: 'Server error uploading banner' });
    }
  }
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
 * @route   GET /api/profile/:userId/posts
 * @desc    Get specific user's posts (visibility-scoped)
 * @access  Private
 */
router.get('/:userId/posts', protect, getUserPosts);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get specific user profile (public view)
 * @access  Private
 */
router.get('/:userId', protect, getUserProfile);

export default router;