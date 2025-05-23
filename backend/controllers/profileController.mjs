/**
 * ProfileController.mjs
 * Handles user profile operations including photo upload and profile updates
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.mjs';
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
