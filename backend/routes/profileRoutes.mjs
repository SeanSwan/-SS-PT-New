/**
 * profileRoutes.mjs
 * Enhanced routes for comprehensive user profile management including social features
 */
import express from 'express';
import multer from 'multer';
import { uploadPhoto, deletePhoto } from '../services/photoStorageService.mjs';
import {
  uploadProfilePhoto,
  uploadClientPhoto,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  getUserPosts,
  getUserAchievements,
  getUserFollowStats
} from '../controllers/profileController.mjs';
import { protect, authorizeResourceAccess } from '../middleware/authMiddleware.mjs';
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
const bannerMediaUpload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // short banner videos
  }
});
const bannerCollageMediaExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov'];
const bannerCollageMediaMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

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
 * @route   POST /api/profile/clients/:clientId/photo
 * @desc    Upload/replace a CLIENT's profile photo (admin or assigned trainer)
 * @access  Private — fail-closed via checkClientAccess inside the controller
 * @limits  Rate limited to prevent abuse
 */
router.post(
  '/clients/:clientId/photo',
  protect,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 uploads per 15 minutes
  upload.single('profilePhoto'),
  uploadClientPhoto
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

      // Upload via photoStorageService (R2 or local fallback)
      const { url: bannerUrl } = await uploadPhoto(req.file.buffer, {
        userId: req.user.id,
        category: 'banners',
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // Import User model lazily
      const { getUser } = await import('../models/index.mjs');
      const User = getUser();
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Delete old banner (best-effort)
      if (user.bannerPhoto) {
        await deletePhoto(user.bannerPhoto);
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
 * @route   POST /api/profile/upload-body-map-photo
 * @desc    Upload the user's DEDICATED body-map head photo (Pain-Chart
 *          Slice 2, A4). Separate from the profile photo on purpose — the
 *          profile photo may be a logo/pet/brand image. Self-service only;
 *          images only. Same storage governance as profile media.
 * @access  Private
 */
router.post(
  '/upload-body-map-photo',
  protect,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  upload.single('bodyMapPhoto'),
  async (req, res) => {
    try {
      const { default: path } = await import('path');

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

      const { url: bodyMapHeadPhotoUrl } = await uploadPhoto(req.file.buffer, {
        userId: req.user.id,
        category: 'body-map-heads',
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const { getUser } = await import('../models/index.mjs');
      const User = getUser();
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Delete the previous dedicated photo (best-effort). NEVER touches the
      // main profile photo — that is a separate asset.
      if (user.bodyMapHeadPhoto) {
        await deletePhoto(user.bodyMapHeadPhoto);
      }

      await user.update({ bodyMapHeadPhoto: bodyMapHeadPhotoUrl });

      logger.info('Body-map head photo uploaded', { userId: req.user.id });

      return res.status(200).json({
        success: true,
        message: 'Body map photo uploaded successfully',
        data: { bodyMapHeadPhoto: bodyMapHeadPhotoUrl }
      });
    } catch (error) {
      logger.error('Body-map photo upload error:', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ success: false, message: 'Server error uploading body map photo' });
    }
  }
);

/**
 * @route   DELETE /api/profile/body-map-photo
 * @desc    Remove the dedicated body-map head photo (figure falls back to
 *          the profile photo, then to the initial glyph).
 * @access  Private
 */
router.delete(
  '/body-map-photo',
  protect,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      const { getUser } = await import('../models/index.mjs');
      const User = getUser();
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.bodyMapHeadPhoto) {
        await deletePhoto(user.bodyMapHeadPhoto);
        await user.update({ bodyMapHeadPhoto: null });
      }

      return res.status(200).json({
        success: true,
        message: 'Body map photo removed',
        data: { bodyMapHeadPhoto: null }
      });
    } catch (error) {
      logger.error('Body-map photo delete error:', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ success: false, message: 'Server error removing body map photo' });
    }
  }
);

router.post(
  '/upload-banner-collage-photo',
  protect,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  bannerMediaUpload.single('bannerPhoto'),
  async (req, res) => {
    try {
      const { default: path } = await import('path');

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (
        !bannerCollageMediaExtensions.includes(fileExt)
        || !bannerCollageMediaMimeTypes.includes(req.file.mimetype)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPG, JPEG, PNG, WEBP, MP4, WEBM, and MOV files are allowed.'
        });
      }

      const { url: bannerUrl } = await uploadPhoto(req.file.buffer, {
        userId: req.user.id,
        category: 'banner-collage',
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      logger.info('Banner collage photo uploaded', { userId: req.user.id, bannerUrl });

      return res.status(200).json({
        success: true,
        message: 'Banner collage photo uploaded successfully',
        data: { bannerPhoto: bannerUrl }
      });
    } catch (error) {
      logger.error('Banner collage photo upload error:', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ success: false, message: 'Server error uploading banner collage photo' });
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
router.get('/:userId/posts', protect, authorizeResourceAccess('userId'), getUserPosts);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get specific user profile (public view, scoped by relationship)
 * @access  Private — own data, assigned trainers, or admins
 */
router.get('/:userId', protect, authorizeResourceAccess('userId'), getUserProfile);

export default router;
