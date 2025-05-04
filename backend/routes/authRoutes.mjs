/**
 * authRoutes.mjs
 * Comprehensive routes for authentication and user management
 * Featuring secure token handling, rate limiting, and advanced user management
 */
import express from 'express';
import { 
  register, 
  login, 
  logout,
  validateToken, 
  refreshToken,
  getUserById
} from '../controllers/authController.mjs';
import { 
  protect, 
  adminOnly, 
  trainerOrAdminOnly, 
  rateLimiter 
} from '../middleware/authMiddleware.mjs';
import { validate } from '../middleware/validationMiddleware.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @limits  Rate limited to prevent abuse
 */
router.post(
  '/register', 
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 registrations per hour per IP
  validate('register'),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Log in and return JWT + refresh token
 * @access  Public
 * @limits  Rate limited to prevent brute force attacks
 */
router.post(
  '/login', 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 attempts per 15 minutes per IP
  validate('login'),
  login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Get new access token using refresh token
 * @access  Public
 * @limits  Rate limited
 */
router.post(
  '/refresh-token', 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 refreshes per 15 minutes
  validate('refreshToken'),
  refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate refresh token
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   GET /api/auth/validate-token
 * @desc    Validate a JWT token and return user data
 * @access  Public
 */
router.get('/validate-token', validateToken);

/**
 * NOTE: Profile routes have been moved to profileRoutes.mjs
 */

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  protect,
  validate('changePassword'),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Find user
      const user = await User.findByPk(req.user.id);
      
      // Verify current password
      const isMatch = await user.checkPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = newPassword; // Will be hashed by model hooks
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error('Password change error:', { error: error.message, userId: req.user.id });
      res.status(500).json({
        success: false,
        message: 'Server error changing password'
      });
    }
  }
);

/**
 * @route   GET /api/auth/users/trainers
 * @desc    Get all trainers with optional filtering
 * @access  Private
 */
router.get('/users/trainers', protect, async (req, res) => {
  try {
    const { specialties, availability, rating, sortBy, limit, page } = req.query;
    
    // Build filter criteria
    let whereClause = {
      role: 'trainer',
      isActive: true
    };
    
    // Filter by specialties if provided
    if (specialties) {
      const specialtiesArray = specialties.split(',');
      // This assumes specialties is stored as an array or JSONB in the database
      // Adjust according to your actual database structure
      whereClause.specialties = {
        [Op.overlap]: specialtiesArray
      };
    }
    
    // Add rating filter if provided
    if (rating) {
      whereClause.averageRating = {
        [Op.gte]: parseFloat(rating)
      };
    }
    
    // Pagination
    const limitValue = parseInt(limit) || 10;
    const pageValue = parseInt(page) || 1;
    const offset = (pageValue - 1) * limitValue;
    
    // Build sorting options
    let order = [];
    if (sortBy) {
      switch (sortBy) {
        case 'rating_high':
          order.push(['averageRating', 'DESC']);
          break;
        case 'rating_low':
          order.push(['averageRating', 'ASC']);
          break;
        case 'name_asc':
          order.push(['firstName', 'ASC']);
          break;
        case 'name_desc':
          order.push(['firstName', 'DESC']);
          break;
        case 'experience_high':
          order.push(['yearsOfExperience', 'DESC']);
          break;
        default:
          order.push(['firstName', 'ASC']);
      }
    } else {
      order.push(['firstName', 'ASC']);
    }
    
    // Find trainers
    const { count, rows: trainers } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
        'specialties', 'bio', 'certifications', 'averageRating', 
        'yearsOfExperience', 'totalSessions'
      ],
      order,
      limit: limitValue,
      offset
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limitValue);
    
    res.json({
      success: true,
      trainers,
      pagination: {
        total: count,
        pages: totalPages,
        page: pageValue,
        limit: limitValue
      }
    });
  } catch (error) {
    logger.error('Error fetching trainers:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching trainers' 
    });
  }
});

/**
 * @route   GET /api/auth/users/clients
 * @desc    Get all clients with filtering and pagination (admin only)
 * @access  Private (Admin Only)
 */
router.get('/users/clients', protect, adminOnly, async (req, res) => {
  try {
    const { search, status, sortBy, limit, page } = req.query;
    
    // Build filter criteria
    let whereClause = {
      role: 'client'
    };
    
    // Add status filter if provided
    if (status) {
      whereClause.isActive = status === 'active';
    }
    
    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Pagination
    const limitValue = parseInt(limit) || 10;
    const pageValue = parseInt(page) || 1;
    const offset = (pageValue - 1) * limitValue;
    
    // Build sorting options
    let order = [];
    if (sortBy) {
      switch (sortBy) {
        case 'name_asc':
          order.push(['firstName', 'ASC']);
          break;
        case 'name_desc':
          order.push(['firstName', 'DESC']);
          break;
        case 'date_joined_asc':
          order.push(['createdAt', 'ASC']);
          break;
        case 'date_joined_desc':
          order.push(['createdAt', 'DESC']);
          break;
        case 'last_active_desc':
          order.push(['lastActive', 'DESC']);
          break;
        default:
          order.push(['firstName', 'ASC']);
      }
    } else {
      order.push(['firstName', 'ASC']);
    }
    
    // Find clients
    const { count, rows: clients } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
        'isActive', 'createdAt', 'lastActive', 'fitnessGoal', 
        'trainingExperience'
      ],
      order,
      limit: limitValue,
      offset
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limitValue);
    
    res.json({
      success: true,
      clients,
      pagination: {
        total: count,
        pages: totalPages,
        page: pageValue,
        limit: limitValue
      }
    });
  } catch (error) {
    logger.error('Error fetching clients:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching clients' 
    });
  }
});

/**
 * @route   GET /api/auth/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or same user or trainer of the user)
 */
router.get('/users/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isSameUser = req.user.id === parseInt(userId);
    
    // If not admin or same user, check if trainer relationship exists
    let hasTrainerAccess = false;
    if (!isAdmin && !isSameUser && req.user.role === 'trainer') {
      // This query would check if the requesting trainer has a relationship with this client
      // Adjust based on your database model structure
      const trainerClientRelation = await TrainerClient.findOne({
        where: {
          trainerId: req.user.id,
          clientId: userId
        }
      });
      
      hasTrainerAccess = !!trainerClientRelation;
    }
    
    if (!isAdmin && !isSameUser && !hasTrainerAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this user'
      });
    }
    
    // Fetch user with appropriate attributes based on requester
    const attributesToExclude = ['password', 'refreshTokenHash'];
    
    // If not admin, exclude additional sensitive fields
    if (!isAdmin) {
      attributesToExclude.push('failedLoginAttempts', 'isLocked', 'registrationIP', 'lastLoginIP');
    }
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: attributesToExclude }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error fetching user by ID:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update user by ID (admin only)
 * @access  Private (Admin Only)
 */
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Fields that can be updated by admin
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      isActive,
      specialties,
      certifications,
      bio,
      yearsOfExperience,
      fitnessGoal,
      trainingExperience
    } = req.body;
    
    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (specialties) user.specialties = specialties;
    if (certifications) user.certifications = certifications;
    if (bio) user.bio = bio;
    if (yearsOfExperience) user.yearsOfExperience = yearsOfExperience;
    if (fitnessGoal) user.fitnessGoal = fitnessGoal;
    if (trainingExperience) user.trainingExperience = trainingExperience;
    
    // Save changes
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logger.error('Error updating user:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin Only)
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // Get user counts by role
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const trainerCount = await User.count({ where: { role: 'trainer' } });
    const clientCount = await User.count({ where: { role: 'client' } });
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegistrations = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        trainerCount,
        clientCount,
        adminCount,
        recentRegistrations
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
});

export default router;