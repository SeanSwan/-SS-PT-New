/**
 * ProfileController.mjs
 * Handles user profile operations including photo upload and profile updates
 */
import fs from 'fs/promises';
import { directoryAttributes } from '../utils/memberDirectoryAccess.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import User from '../models/User.mjs';
import { SocialPost, Friendship } from '../models/social/index.mjs';
import UserAchievement from '../models/UserAchievement.mjs';
import Achievement from '../models/Achievement.mjs';
import logger from '../utils/logger.mjs';
import { uploadPhoto, deletePhoto } from '../services/photoStorageService.mjs';
import { checkClientAccess, CLIENT_ACCESS_DENIED_MESSAGE } from '../services/ai/contextEngine/clientAccess.mjs';
import { sanitizeImageUrl } from '../utils/imageUrl.mjs';
import { normalizeClientTimeZoneUpdate } from '../services/clientTrainingDateService.mjs';

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
/**
 * Upload/replace a CLIENT's profile photo (admin or assigned trainer only).
 * Authorization is FAIL-CLOSED via checkClientAccess BEFORE any upload work:
 *   admin → any client · trainer → assigned client only · others → denied.
 * This is defense-in-depth on top of the route's `protect` middleware, and the
 * authoritative gate behind the client-card "add photo" affordance.
 */
export const uploadClientPhoto = async (req, res) => {
  const clientId = Number(req.params.clientId);
  try {
    if (!Number.isSafeInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid client id' });
    }

    // Authorization gate FIRST — never touch storage/DB for an unauthorized actor.
    const access = await checkClientAccess(req.user, clientId, User.sequelize);
    if (!access.allowed) {
      logger.warn('Client photo upload DENIED (fail-closed)', {
        actorId: req.user?.id, role: req.user?.role, clientId, reason: access.reason,
      });
      return res.status(403).json({ success: false, message: CLIENT_ACCESS_DENIED_MESSAGE });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, JPEG, PNG, GIF, and WEBP files are allowed.',
      });
    }

    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const { url: photoUrl, storageKey } = await uploadPhoto(req.file.buffer, {
      userId: clientId,
      category: 'profiles',
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    if (client.photo) {
      await deletePhoto(client.photo); // best-effort old-photo cleanup
    }
    await client.update({ photo: photoUrl });
    logger.info('Client photo updated', { actorId: req.user.id, via: access.via, clientId, photoUrl, storageKey });

    return res.status(200).json({ success: true, message: 'Client photo uploaded successfully', photoUrl });
  } catch (error) {
    logger.error('Error uploading client photo', { error: error.message, actorId: req.user?.id, clientId });
    return res.status(500).json({ success: false, message: 'Server error uploading client photo' });
  }
};

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
      message: 'Failed to upload profile photo'
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
    // Exclude ALL credential/security/billing fields — this endpoint is
    // reachable by an assigned trainer (not just self/admin), so the old
    // 2-field blocklist leaked reset-token hashes, Stripe ids, and login IPs
    // to trainers. (Follow-up: migrate to an explicit allowlist.)
    const user = await User.findByPk(targetUserId, {
      attributes: {
        exclude: [
          'password', 'refreshTokenHash',
          'resetPasswordToken', 'resetPasswordExpires', 'claimTokenHash',
          'stripeCustomerId', 'lastLoginIP', 'registrationIP',
          'failedLoginAttempts', 'isLocked',
        ],
      },
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
      message: 'Failed to get profile'
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
const BANNER_OBJECT_FITS = new Set(['smart', 'cover', 'contain', 'fill', 'tile', 'collage']);
const BANNER_COLLAGE_LAYOUTS = new Set([
  // Smart Carousel adapts selected media into a full-bleed stage with built-in
  // crystalline fill tiles for portrait or sparse uploads.
  'smart-carousel',
  'stream',
  'mosaic',
  'spotlight',
  // 2026-06-11 (M5b): cinematic crossfade hero — must stay in sync with
  // frontend BANNER_COLLAGE_LAYOUT_OPTIONS (profileBannerComposition.ts).
  'crossfade',
  // 2026-06-13 (Slice 2 — Feed Banner Studio): premium "Stage" layouts —
  // Atrium (3D coverflow) + Vitrine (hero + thumbnail rail). Standalone,
  // auto-advancing, full-bleed. Sync with frontend BANNER_COLLAGE_LAYOUT_OPTIONS.
  'atrium',
  'vitrine',
  'carousel-reel',
  'carousel-cinema',
  'carousel-coverflow',
  'carousel-stack',
  'carousel-ticker',
]);
const MIN_BANNER_FRAME_HEIGHT = 180;
const MAX_BANNER_FRAME_HEIGHT = 1000;
const MAX_BANNER_COLLAGE_PHOTOS = 12;
const MAX_BANNER_COLLAGE_VIDEOS = 3;
const MAX_BANNER_PRESETS = 12;
const BANNER_VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov)(?:[?#].*)?$/i;

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

const isValidBannerCollageLayout = value =>
  typeof value === 'string' && BANNER_COLLAGE_LAYOUTS.has(value);

const normalizeBannerImageScale = value => {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return null;
  return Number(Math.min(3, Math.max(0.5, next)).toFixed(2));
};

const normalizeBannerFrameHeight = value => {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return null;
  return Math.round(Math.min(MAX_BANNER_FRAME_HEIGHT, Math.max(MIN_BANNER_FRAME_HEIGHT, next)));
};

const isBannerCollageVideoUrl = value =>
  typeof value === 'string' && BANNER_VIDEO_EXTENSION_PATTERN.test(value);

const normalizeBannerCollagePhotos = value => {
  if (!Array.isArray(value)) return null;
  const safePhotos = [];
  let videoCount = 0;
  for (const candidate of value) {
    if (safePhotos.length >= MAX_BANNER_COLLAGE_PHOTOS) break;
    const safeUrl = sanitizeImageUrl(candidate);
    if (!safeUrl) return null;
    if (isBannerCollageVideoUrl(safeUrl)) {
      if (videoCount >= MAX_BANNER_COLLAGE_VIDEOS) continue;
      videoCount += 1;
    }
    safePhotos.push(safeUrl);
  }
  return safePhotos;
};

const normalizeBannerPresets = value => {
  if (!Array.isArray(value)) return null;
  const presets = [];
  for (const [index, preset] of value.slice(0, MAX_BANNER_PRESETS).entries()) {
    if (!preset || typeof preset !== 'object' || Array.isArray(preset)) return null;
    const bannerPhoto = preset.bannerPhoto ? sanitizeImageUrl(preset.bannerPhoto) : null;
    if (preset.bannerPhoto && !bannerPhoto) return null;
    const photos = normalizeBannerCollagePhotos(preset.bannerCollagePhotos || []);
    const position = normalizeBannerObjectPosition(preset.bannerObjectPosition);
    const scale = normalizeBannerImageScale(preset.bannerImageScale);
    const height = normalizeBannerFrameHeight(preset.bannerFrameHeight);
    if (
      photos === null
      || !position
      || !isValidBannerObjectFit(preset.bannerObjectFit)
      || scale === null
      || height === null
      || !isValidBannerCollageLayout(preset.bannerCollageLayout)
    ) {
      return null;
    }
    presets.push({
      id: typeof preset.id === 'string' && preset.id.trim()
        ? preset.id.trim().slice(0, 80)
        : `banner-preset-${index + 1}`,
      name: typeof preset.name === 'string' && preset.name.trim()
        ? preset.name.trim().slice(0, 72)
        : `Saved banner ${index + 1}`,
      ...(bannerPhoto ? { bannerPhoto } : {}),
      bannerObjectPosition: position,
      bannerObjectFit: preset.bannerObjectFit,
      bannerImageScale: scale,
      bannerFrameHeight: height,
      bannerCollagePhotos: photos,
      bannerCollageLayout: preset.bannerCollageLayout,
      bannerStickyCarousel: preset.bannerStickyCarousel === true,
      createdAt: typeof preset.createdAt === 'string' && preset.createdAt.trim()
        ? preset.createdAt
        : new Date(0).toISOString(),
    });
  }
  return presets;
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
      'firstName', 'lastName', 'phone', 'email', 'photo', 'bannerPhoto', 'bio',
      'dateOfBirth', 'gender', 'weight', 'height',
      'fitnessGoal', 'trainingExperience', 'healthConcerns', 'emergencyContact',
      'emailNotifications', 'smsNotifications', 'preferences', 'timeZone',
      'notificationPreferences',
      'profileVisibility', 'showBadges', 'showAchievements', 'showStats',
      'showWorkoutHistory', 'showLevel', 'chartVisibility',
      'bannerObjectPosition', 'bannerObjectFit', 'bannerImageScale',
      'bannerFrameHeight', 'bannerCollagePhotos', 'bannerCollageLayout',
      'bannerStickyCarousel', 'bannerPresets'
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
        message: 'bannerObjectFit must be smart, cover, contain, fill, tile, or collage',
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
          message: 'bannerCollagePhotos must contain safe uploaded media URLs',
        });
      }
      updateData.bannerCollagePhotos = normalizedPhotos;
    }

    if (updateData.bannerCollageLayout !== undefined && !isValidBannerCollageLayout(updateData.bannerCollageLayout)) {
      return res.status(400).json({
        success: false,
        message: 'bannerCollageLayout must be a supported grid or carousel layout',
      });
    }

    if (updateData.bannerStickyCarousel !== undefined) {
      updateData.bannerStickyCarousel = updateData.bannerStickyCarousel === true;
    }

    if (updateData.bannerPresets !== undefined) {
      const normalizedPresets = normalizeBannerPresets(updateData.bannerPresets);
      if (normalizedPresets === null) {
        return res.status(400).json({
          success: false,
          message: 'bannerPresets must contain safe banner preset objects',
        });
      }
      updateData.bannerPresets = normalizedPresets;
    }

    if (updateData.bannerPhoto !== undefined && updateData.bannerPhoto !== null && updateData.bannerPhoto !== '') {
      const sanitizedBannerPhoto = sanitizeImageUrl(updateData.bannerPhoto);
      if (sanitizedBannerPhoto === null) {
        return res.status(400).json({
          success: false,
          message: 'bannerPhoto must be a relative /uploads path or an https URL on the configured photo-origin allowlist',
        });
      }
      updateData.bannerPhoto = sanitizedBannerPhoto;
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

    if (updateData.timeZone !== undefined) {
      try {
        updateData.timeZone = normalizeClientTimeZoneUpdate(updateData.timeZone);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }

    // Filter out fields that are not allowed to be updated
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    if (updateData.timeZone !== undefined) {
      filteredUpdateData.timeZoneConfigured = true;
    }

    
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
      message: 'Failed to update profile'
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
      'emailNotifications', 'smsNotifications', 'preferences', 'timeZone'
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

    if (updateData.timeZone !== undefined) {
      try {
        updateData.timeZone = normalizeClientTimeZoneUpdate(updateData.timeZone);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }

    // Filter out fields that are not allowed to be updated
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    if (updateData.timeZone !== undefined) {
      filteredUpdateData.timeZoneConfigured = true;
    }

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
      message: 'Failed to update client profile'
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
      message: 'Failed to get stats'
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
      message: 'Failed to get posts'
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
      message: 'Failed to get achievements'
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
          // Surnames are staff-only; `role` is retained because the UI badges
          // trainers, and it is not PII.
          attributes: directoryAttributes(req.user, ['role'])
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
          attributes: directoryAttributes(req.user, ['role'])
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
      message: 'Failed to get follow stats'
    });
  }
};
