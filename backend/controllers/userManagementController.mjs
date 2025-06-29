// backend/controllers/userManagementController.mjs
// 🎯 ENHANCED P0 FIX: Coordinated model imports to prevent initialization race condition
import { getUser } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * User Management Controller
 * 
 * Handles admin functions for user management including:
 * - Fetching all users
 * - Promoting users to different roles
 * - Updating user information
 */

// Admin access code from environment variables
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/auth/users
 * @access  Private (Admin Only)
 */
export const getAllUsers = async (req, res) => {
  try {
    // Include specific attributes, exclude sensitive info
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const users = await User.findAll({
      attributes: { 
        exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] 
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Error fetching all users:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Promote user to client role
 * @route   POST /api/auth/promote-client
 * @access  Private (Admin Only)
 */
export const promoteToClient = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, availableSessions = 0 } = req.body;
    
    if (!userId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Find the user
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(userId, { transaction });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user role to client and set available sessions
    await user.update({
      role: 'client',
      availableSessions: parseInt(availableSessions),
      // Reset these fields if they were previously set as a different role
      fitnessGoal: user.fitnessGoal || null,
      trainingExperience: user.trainingExperience || null,
    }, { transaction });
    
    await transaction.commit();
    
    logger.info(`User ${userId} promoted to client role by admin ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User successfully promoted to client',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        availableSessions: user.availableSessions
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error promoting user to client:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error promoting user to client',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Promote user to admin role with access code verification
 * @route   POST /api/auth/promote-admin
 * @access  Private (Admin Only)
 */
export const promoteToAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, adminCode } = req.body;
    
    if (!userId || !adminCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User ID and admin code are required'
      });
    }
    
    // Verify admin code
    if (adminCode !== ADMIN_ACCESS_CODE) {
      logger.warn(`Invalid admin code attempt by user ${req.user.id}`);
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'Invalid admin code'
      });
    }
    
    // Find the user
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(userId, { transaction });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user role to admin
    await user.update({
      role: 'admin'
    }, { transaction });
    
    await transaction.commit();
    
    logger.info(`User ${userId} promoted to admin role by admin ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User successfully promoted to admin',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error promoting user to admin:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error promoting user to admin',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user details (admin only)
 * @route   PUT /api/auth/users/:id
 * @access  Private (Admin Only)
 */
export const updateUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.params.id;
    const {
      firstName,
      lastName,
      email,
      role,
      isActive,
      fitnessGoal,
      trainingExperience,
      availableSessions,
      specialties,
      certifications
    } = req.body;
    
    // Find the user
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(userId, { transaction });
    
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Add role-specific fields based on the new role
    if (role === 'client' || user.role === 'client') {
      if (fitnessGoal !== undefined) updateData.fitnessGoal = fitnessGoal;
      if (trainingExperience !== undefined) updateData.trainingExperience = trainingExperience;
      if (availableSessions !== undefined) updateData.availableSessions = parseInt(availableSessions);
    }
    
    if (role === 'trainer' || user.role === 'trainer') {
      if (specialties !== undefined) updateData.specialties = specialties;
      if (certifications !== undefined) updateData.certifications = certifications;
    }
    
    // Update user
    await user.update(updateData, { transaction });
    
    await transaction.commit();
    
    logger.info(`User ${userId} updated by admin ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        // Include role-specific fields based on the user's role
        ...(user.role === 'client' ? {
          fitnessGoal: user.fitnessGoal,
          trainingExperience: user.trainingExperience,
          availableSessions: user.availableSessions
        } : {}),
        ...(user.role === 'trainer' ? {
          specialties: user.specialties,
          certifications: user.certifications
        } : {})
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating user:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getAllUsers,
  promoteToClient,
  promoteToAdmin,
  updateUser
};