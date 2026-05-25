/**
 * ProfileController.mjs
 * Handles user profile operations including photo upload and profile updates
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import User from '../models/User.mjs';
import { SocialPost, Friendship } from '../models/social/index.mjs';
import UserAchievement from '../models/UserAchievement.mjs';
import Achievement from '../models/Achievement.mjs';
import logger from '../utils/logger.mjs';
import { uploadPhoto, deletePhoto } from '../services/photoStorageService.mjs';
import { sanitizeImageUrl } from '../utils/imageUrl.mjs';

// Get directory name in ES modules context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload user profile photo
 * 
 * @route   POST /api/profile/upload-profile-photo
 * @desc    Upload and update user profile photo
 * @access  Private
 */
export const uploadProfilePhoto = async (req, res) => {
  try {
    // If no file was uploaded
    if (!req.file) {
      logger.warn('Profile photo upload failed: No file uploaded', { userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get the file extension
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Only allow certain file extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(fileExt)) {
      logger.warn('Profile photo upload failed: Invalid file type', {
        userId: req.user.id,
        fileType: fileExt
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, JPEG, PNG, GIF, and WEBP files are allowed.'
      });
    }

    // Upload via photoStorageService (R2 or local fallback)
    const { url: photoUrl, storageKey } = await uploadPhoto(req.file.buffer, {
      userId: req.user.id,
      category: 'profiles',
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error('User not found during profile photo upload', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old photo if exists (best-effort)
    if (user.photo) {
      await deletePhoto(user.photo);
    }

    // Update user profile with new photo URL
    await user.update({ photo: photoUrl });
    logger.info('Profile photo updated successfully', { userId: req.user.id, photoUrl, storageKey });
    
    // Get updated user data without sensitive fields
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: photoUrl,
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error uploading profile photo', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo: ' + error.message
    });
  }
};

/**
 * Get user profile
 * 
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.id;
    const user = await User.findByPk(targetUserId, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });

    if (!user) {
      logger.error('User not found during profile fetch', { userId: targetUserId });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('User profile retrieved successfully', { userId: user.id, requestedBy: req.user.id });
    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      user,
      data: user
    });
  } catch (error) {
    logger.error('Error getting user profile', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile: ' + error.message
    });
  }
};

const LEGACY_BANNER_OBJECT_POSITIONS = new Map([
  ['left top', '0% 0%'],
  ['center top', '50% 0%'],
  ['right top', '100% 0%'],
  ['left center', '0% 50%'],
  ['center center', '50% 50%'],
  ['right center', '100% 50%'],
  ['left bottom', '0% 100%'],
  ['center bottom', '50% 100%'],
  ['right bottom', '100% 100%'],
]);

const BANNER_POSITION_PATTERN = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;
const BANNER_OBJECT_FITS = new Set(['cover', 'contain', 'fill', 'tile', 'collage']);

const clampPercent = value => Math.min(100, Math.max(0, value));
const formatPercent = value => `${Number(value.toFixed(2))}%`;

const normalizeBannerObjectPosition = value => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (LEGACY_BANNER_OBJECT_POSITIONS.has(trimmed)) {
    return LEGACY_BANNER_OBJECT_POSITIONS.get(trimmed);
  }
  const match = trimmed.match(BANNER_POSITION_PATTERN);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return `${formatPercent(clampPercent(x))} ${formatPercent(clampPercent(y))}`;
};

const isValidBannerObjectPosition = value =>
  typeof normalizeBannerObjectPosition(value) === 'string';

const isValidBannerObjectFit = value =>
  typeof value === 'string' && BANNER_OBJECT_FITS.has(value);

const normalizeBannerImageScale = value => {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return null;
  return Number(Math.min(3, Math.max(0.5, next)).toFixed(2));
};

const normalizeBannerFrameHeight = value => {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.round(Math.min(640, Math.max(180, next)));
};

const normalizeBannerCollagePhotos = value => {
  if (!Array.isArray(value)) return null;
  const candidates = value.slice(0, 6);
  const safePhotos = candidates
    .map(url => sanitizeImageUrl(url))
    .filter(Boolean);
  return safePhotos.length === candidates.length ? safePhotos : null;
};

/**
 * Update user profile
 * 
 * @route   PUT /api/profile
 * @desc    Update current user profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Fields that are allowed to be updated by the user
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'email', 'photo', 'bio',
      'dateOfBirth', 'gender', 'weight', 'height',
      'fitnessGoal', 'trainingExperience', 'healthConcerns', 'emergencyContact',
      'emailNotifications', 'smsNotifications', 'preferences',
      'notificationPreferences',
      'profileVisibility', 'showBadges', 'showAchievements', 'showStats',
      'showWorkoutHistory', 'showLevel', 'chartVisibility',
      'bannerObjectPosition', 'bannerObjectFit', 'bannerImageScale',
      'bannerFrameHeight', 'bannerCollagePhotos'
    ];

    // Cover crop settings are persisted as a narrow CSS-safe contract:
    // percentage position, object-fit allowlist, and bounded zoom.
    if (updateData.bannerObjectPosition !== undefined) {
      if (!isValidBannerObjectPosition(updateData.bannerObjectPosition)) {
        return res.status(400).json({
          success: false,
          message: 'bannerObjectPosition must be percentage coordinates such as 50% 50%',
        });
      }
      updateData.bannerObjectPosition = normalizeBannerObjectPosition(updateData.bannerObjectPosition);
    }

    if (updateData.bannerObjectFit !== undefined && !isValidBannerObjectFit(updateData.bannerObjectFit)) {
      return res.status(400).json({
        success: false,
        message: 'bannerObjectFit must be cover, contain, fill, tile, or collage',
      });
    }

    if (updateData.bannerImageScale !== undefined) {
      const normalizedScale = normalizeBannerImageScale(updateData.bannerImageScale);
      if (normalizedScale === null) {
        return res.status(400).json({
          success: false,
          message: 'bannerImageScale must be a finite number',
        });
      }
      updateData.bannerImageScale = normalizedScale;
    }

    if (updateData.bannerFrameHeight !== undefined) {
      const normalizedHeight = normalizeBannerFrameHeight(updateData.bannerFrameHeight);
      if (normalizedHeight === null) {
        return res.status(400).json({
          success: false,
          message: 'bannerFrameHeight must be a finite number',
        });
      }
      updateData.bannerFrameHeight = normalizedHeight;
    }

    if (updateData.bannerCollagePhotos !== undefined) {
      const normalizedPhotos = normalizeBannerCollagePhotos(updateData.bannerCollagePhotos);
      if (normalizedPhotos === null) {
        return res.status(400).json({
          success: false,
          message: 'bannerCollagePhotos must contain safe uploaded image URLs',
        });
      }
      updateData.bannerCollagePhotos = normalizedPhotos;
    }

    if (updateData.notificationPreferences !== undefined) {
      const prefs = updateData.notificationPreferences;
      const isObject = typeof prefs === 'object' && prefs !== null && !Array.isArray(prefs);
      if (!isObject) {
        return res.status(400).json({
          success: false,
          message: 'notificationPreferences must be an object'
        });
      }
    }

    // 2026-05-11 SLICE 3: server-side photo URL allowlist. Companion to the
    // frontend imageUrl.ts sanitizer — both must reject the same inputs so a
    // URL that bypasses one cannot bypass the other. Accepts null/'' to clear.
    // Persist the sanitized (trimmed) return value, not the original input —
    // otherwise leading/trailing whitespace survives into the DB.
    if (updateData.photo !== undefined && updateData.photo !== null && updateData.photo !== '') {
      const sanitizedPhoto = sanitizeImageUrl(updateData.photo);
      if (sanitizedPhoto === null) {
        return res.status(400).json({
          success: false,
          message: 'photo must be a relative /uploads path or an https URL on the configured photo-origin allowlist'
        });
      }
      updateData.photo = sanitizedPhoto;
    }

    // Validate chartVisibility — only allow known keys with boolean values
    if (updateData.chartVisibility !== undefined) {
      const cv = updateData.chartVisibility;
      const validKeys = [
        'workoutFrequency', 'weightProgression', 'muscleRadar', 'macroSplit',
        'cardioEndurance', 'sessionFrequency', 'bodyFatTrend', 'muscleRecovery',
        'rpeByExercise', 'exerciseRolodex', 'workoutHeatmap', 'goalProgress'
      ];
      if (typeof cv !== 'object' || cv === null || Array.isArray(cv)) {
        return res.status(400).json({ success: false, message: 'chartVisibility must be an object' });
      }
      // Strip unknown keys and coerce values to boolean
      updateData.chartVisibility = Object.fromEntries(
        validKeys.map(k => [k, cv[k] === true])
      );
    }

    // Filter out fields that are not allowed to be updated
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    
    // If there's nothing to update
    if (Object.keys(filteredUpdateData).length === 0) {
      logger.warn('Profile update: No valid fields to update', { userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    // Find user and update
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error('User not found during profile update', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await user.update(filteredUpdateData);
    logger.info('Profile updated successfully', { 
      userId: user.id, 
      updatedFields: Object.keys(filteredUpdateData)
    });
    
    // Get updated user data without sensitive fields
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user profile', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile: ' + error.message
    });
  }
};

/**
 * Update client profile (PATCH method for partial updates)
 *
 * @route   PATCH /api/client/profile
 * @desc    Update current client profile with partial data
 * @access  Private (clients only)
 */
export const updateClientProfile = async (req, res) => {
  try {
    // Verify user is a client
    if (req.user.role !== 'client') {
      logger.warn('Non-client attempted client profile update', { userId: req.user.id, role: req.user.role });
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available to clients'
      });
    }

    const updateData = req.body;

    // Fields that clients are allowed to update (subset of full profile)
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'photo',
      'dateOfBirth', 'gender', 'weight', 'height',
      'fitnessGoal', 'trainingExperience', 'healthConcerns', 'emergencyContact',
      'emailNotifications', 'smsNotifications', 'preferences'
    ];

    // 2026-05-11 SLICE 3 sibling sweep: same photo allowlist as
    // updateUserProfile. Persist the sanitized (trimmed) return value.
    if (updateData.photo !== undefined && updateData.photo !== null && updateData.photo !== '') {
      const sanitizedPhoto = sanitizeImageUrl(updateData.photo);
      if (sanitizedPhoto === null) {
        return res.status(400).json({
          success: false,
          message: 'photo must be a relative /uploads path or an https URL on the configured photo-origin allowlist'
        });
      }
      updateData.photo = sanitizedPhoto;
    }

    // Filter out fields that are not allowed to be updated
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    // If there's nothing to update
    if (Object.keys(filteredUpdateData).length === 0) {
      logger.warn('Client profile update: No valid fields to update', { userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Find user and update
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error('User not found during client profile update', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update(filteredUpdateData);
    logger.info('Client profile updated successfully', {
      userId: user.id,
      updatedFields: Object.keys(filteredUpdateData)
    });

    // Get updated user data without sensitive fields
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });

    return res.status(200).json({
      success: true,
      message: 'Client profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error('Error updating client profile', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to update client profile: ' + error.message
    });
  }
};

/**
 * Get user statistics
 * 
 * @route   GET /api/profile/stats
 * @desc    Get current user stats (followers, following, posts, etc.)
 * @access  Private
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get post count (only count approved/unmoderated posts to match feed display)
    const postCount = await SocialPost.count({
      where: {
        userId,
        [Op.or]: [
          { moderationStatus: 'approved' },
          { moderationStatus: null }
        ]
      }
    });
    
    // Get followers count (where current user is the recipient)
    const followersCount = await Friendship.count({
      where: {
        recipientId: userId,
        status: 'accepted'
      }
    });
    
    // Get following count (where current user is the requester)
    const followingCount = await Friendship.count({
      where: {
        requesterId: userId,
        status: 'accepted'
      }
    });
    
    // Get user's gamification data
    const user = await User.findByPk(userId, {
      attributes: ['points', 'level', 'tier', 'streakDays', 'totalWorkouts', 'totalExercises']
    });
    
    const stats = {
      posts: postCount,
      followers: followersCount,
      following: followingCount,
      workouts: user?.totalWorkouts || 0,
      streak: user?.streakDays || 0,
      points: user?.points || 0,
      level: user?.level || 1,
      tier: user?.tier || 'bronze'
    };
    
    logger.info('User stats retrieved successfully', { userId, stats });
    return res.status(200).json({
      success: true,
      message: 'Stats retrieved successfully',
      stats
    });
  } catch (error) {
    logger.error('Error getting user stats', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get stats: ' + error.message
    });
  }
};

/**
 * Get user posts
 * 
 * @route   GET /api/profile/posts
 * @desc    Get current user posts
 * @access  Private
 */
export const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Check if requesting another user's posts (coerce to string for safe compare)
    const whereClause = { userId };

    if (String(userId) !== String(req.user.id)) {
      // Check friendship status to determine visibility
      const friendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { requesterId: req.user.id, recipientId: userId, status: 'accepted' },
            { requesterId: userId, recipientId: req.user.id, status: 'accepted' }
          ]
        }
      });
      
      if (!friendship) {
        // Not friends, only show public posts
        whereClause.visibility = 'public';
      } else {
        // Friends, show public and friends posts
        whereClause.visibility = { [Op.in]: ['public', 'friends'] };
      }
    }
    
    const posts = await SocialPost.findAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ]
    });
    
    const totalPosts = await SocialPost.count({ where: whereClause });
    
    logger.info('User posts retrieved successfully', { 
      requestingUserId: req.user.id,
      targetUserId: userId,
      postCount: posts.length 
    });
    
    return res.status(200).json({
      success: true,
      message: 'Posts retrieved successfully',
      posts,
      pagination: {
        limit,
        offset,
        total: totalPosts
      }
    });
  } catch (error) {
    logger.error('Error getting user posts', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get posts: ' + error.message
    });
  }
};

/**
 * Get user achievements
 * 
 * @route   GET /api/profile/achievements
 * @desc    Get current user achievements and gamification data
 * @access  Private
 */
export const getUserAchievements = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // UserAchievement: explicit attrs needed (migration-created table, model has extra cols)
    // Achievement: NO explicit attrs needed (model-created table, all model cols exist)
    const userAchievements = await UserAchievement.findAll({
      where: { userId },
      attributes: ['id', 'earnedAt', 'progress', 'isCompleted', 'pointsAwarded'],
      include: [
        {
          model: Achievement,
          as: 'achievement'
        }
      ],
      order: [['earnedAt', 'DESC']]
    });

    // Get user's complete gamification data
    const user = await User.findByPk(userId, {
      attributes: [
        'points', 'level', 'tier', 'streakDays', 'lastActivityDate',
        'totalWorkouts', 'totalExercises'
      ]
    });
    
    // Calculate additional stats
    const totalAchievements = userAchievements.length;
    const achievementsByRarity = userAchievements.reduce((acc, ua) => {
      const rarity = ua.achievement?.rarity || ua.achievement?.dataValues?.rarity || 'common';
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {});
    
    const gamificationData = {
      user: user,
      achievements: userAchievements,
      stats: {
        totalAchievements,
        achievementsByRarity,
        currentStreak: user?.streakDays || 0,
        totalPoints: user?.points || 0,
        currentLevel: user?.level || 1,
        currentTier: user?.tier || 'bronze_forge'
      }
    };
    
    logger.info('User achievements retrieved successfully', { 
      userId, 
      achievementCount: totalAchievements 
    });
    
    return res.status(200).json({
      success: true,
      message: 'Achievements retrieved successfully',
      data: gamificationData
    });
  } catch (error) {
    logger.error('Error getting user achievements', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get achievements: ' + error.message
    });
  }
};

/**
 * Get user follow statistics
 * 
 * @route   GET /api/profile/follow-stats
 * @desc    Get detailed follow statistics for current user
 * @access  Private
 */
export const getUserFollowStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get detailed followers (users who follow current user)
    const followers = await Friendship.findAll({
      where: {
        recipientId: userId,
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Get detailed following (users current user follows)
    const following = await Friendship.findAll({
      where: {
        requesterId: userId,
        status: 'accepted'
      },
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Format the data
    const followersList = followers.map(f => ({
      ...f.requester.toJSON(),
      followedAt: f.createdAt,
      friendshipId: f.id
    }));
    
    const followingList = following.map(f => ({
      ...f.recipient.toJSON(),
      followedAt: f.createdAt,
      friendshipId: f.id
    }));
    
    const followStats = {
      followers: {
        count: followersList.length,
        list: followersList
      },
      following: {
        count: followingList.length,
        list: followingList
      },
      ratio: followingList.length > 0 ? (followersList.length / followingList.length).toFixed(2) : 0
    };
    
    logger.info('User follow stats retrieved successfully', { 
      userId, 
      followersCount: followersList.length,
      followingCount: followingList.length
    });
    
    return res.status(200).json({
      success: true,
      message: 'Follow stats retrieved successfully',
      data: followStats
    });
  } catch (error) {
    logger.error('Error getting user follow stats', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to get follow stats: ' + error.message
    });
  }
};
