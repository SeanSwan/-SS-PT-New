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
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      logger.error('Error creating upload directory', { error: err.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to create upload directory'
      });
    }
    
    // Create a unique filename
    const filename = `user-${req.user.id}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, filename);
    
    // Move the file from temp to uploads folder
    try {
      await fs.writeFile(filePath, req.file.buffer);
    } catch (err) {
      logger.error('Error saving profile photo', { error: err.message, userId: req.user.id });
      return res.status(500).json({
        success: false,
        message: 'Failed to save file'
      });
    }
    
    // Update user's photo URL in database
    const photoUrl = `/uploads/profiles/${filename}`;
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error('User not found during profile photo upload', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If user already has a photo, delete the old one
    if (user.photo && !user.photo.startsWith('http')) {
      try {
        const oldPhotoPath = path.join(__dirname, '..', user.photo);
        await fs.access(oldPhotoPath);
        await fs.unlink(oldPhotoPath);
        logger.info('Deleted old profile photo', { userId: req.user.id, path: oldPhotoPath });
      } catch (err) {
        // It's okay if the file doesn't exist or can't be deleted
        logger.warn('Could not delete old profile photo', { 
          error: err.message, 
          userId: req.user.id
        });
      }
    }
    
    // Update user profile with new photo URL
    await user.update({ photo: photoUrl });
    logger.info('Profile photo updated successfully', { userId: req.user.id, photoUrl });
    
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
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });
    
    if (!user) {
      logger.error('User not found during profile fetch', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info('User profile retrieved successfully', { userId: user.id });
    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      user
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
      'firstName', 'lastName', 'phone', 'email', 'photo',
      'dateOfBirth', 'gender', 'weight', 'height',
      'fitnessGoal', 'trainingExperience', 'healthConcerns', 'emergencyContact',
      'emailNotifications', 'smsNotifications', 'preferences'
    ];
    
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
 * Get user statistics
 * 
 * @route   GET /api/profile/stats
 * @desc    Get current user stats (followers, following, posts, etc.)
 * @access  Private
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get post count
    const postCount = await SocialPost.count({
      where: { userId }
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
    
    // Check if requesting another user's posts
    let whereClause = { userId };
    
    if (userId !== req.user.id) {
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
    
    // Get user achievements
    const userAchievements = await UserAchievement.findAll({
      where: { userId },
      include: [
        {
          model: Achievement,
          as: 'achievement',
          attributes: ['id', 'name', 'description', 'iconUrl', 'rarity', 'category']
        }
      ],
      order: [['earnedAt', 'DESC']]
    });
    
    // Get user's complete gamification data
    const user = await User.findByPk(userId, {
      attributes: [
        'points', 'level', 'tier', 'streakDays', 'lastActivityDate',
        'totalWorkouts', 'totalExercises', 'exercisesCompleted'
      ]
    });
    
    // Calculate additional stats
    const totalAchievements = userAchievements.length;
    const achievementsByRarity = userAchievements.reduce((acc, ua) => {
      const rarity = ua.achievement.rarity || 'common';
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
        currentTier: user?.tier || 'bronze'
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
