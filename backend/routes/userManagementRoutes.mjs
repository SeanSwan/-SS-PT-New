// backend/routes/userManagementRoutes.mjs
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   GET /api/auth/users
 * @desc    Admin: Get all users (for admin user management)
 * @access  Private (Admin Only)
 */
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'username',
        'role',
        'photo',
        'createdAt',
        'lastLogin'
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      users: users
    });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching users'
    });
  }
});

/**
 * @route   GET /api/auth/clients
 * @desc    Admin: Get all clients with session data
 * @access  Private (Admin Only)
 */
router.get('/clients', protect, adminOnly, async (req, res) => {
  try {
    const clients = await User.findAll({
      where: { role: 'client' },
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'phone', 
        'photo', 
        'availableSessions',
        'createdAt',
        'lastLogin'
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json(clients);
  } catch (error) {
    logger.error(`Error fetching clients: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching clients'
    });
  }
});

/**
 * @route   GET /api/auth/trainers
 * @desc    Admin: Get all trainers
 * @access  Private (Admin Only)
 */
router.get('/trainers', protect, adminOnly, async (req, res) => {
  try {
    const trainers = await User.findAll({
      where: { role: 'trainer' },
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'phone', 
        'photo', 
        'specialties',
        'certifications',
        'bio',
        'hourlyRate',
        'createdAt',
        'lastLogin'
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json(trainers);
  } catch (error) {
    logger.error(`Error fetching trainers: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching trainers'
    });
  }
});

/**
 * @route   POST /api/auth/user
 * @desc    Admin: Create a new user
 * @access  Private (Admin Only)
 */
router.post('/user', protect, adminOnly, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      username, 
      password, 
      role, 
      phone,
      availableSessions,
      specialties,
      certifications,
      bio,
      hourlyRate
    } = req.body;
    
    // Check if email or username exists
    const userExists = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { email },
          { username }
        ]
      }
    });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    // Validate required fields
    if (!firstName || !lastName || !email || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, lastName, email, username, password, role'
      });
    }
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the user
    const user = await User.create({
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role,
      phone,
      availableSessions: availableSessions || 0,
      specialties: role === 'trainer' ? specialties : null,
      certifications: role === 'trainer' ? certifications : null,
      bio: role === 'trainer' ? bio : null,
      hourlyRate: role === 'trainer' ? hourlyRate : null
    });
    
    // Return user without password
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      availableSessions: user.availableSessions,
      createdAt: user.createdAt
    };
    
    if (role === 'trainer') {
      userData.specialties = user.specialties;
      userData.certifications = user.certifications;
      userData.bio = user.bio;
      userData.hourlyRate = user.hourlyRate;
    }
    
    logger.info(`Admin ${req.user.id} created new user: ${user.id} (${user.role})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
});

/**
 * @route   PUT /api/auth/user/:id
 * @desc    Admin: Update a user
 * @access  Private (Admin Only)
 */
router.put('/user/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      role,
      availableSessions,
      specialties,
      certifications,
      bio,
      hourlyRate,
      password
    } = req.body;
    
    // Find the user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    
    // Handle numeric fields
    if (availableSessions !== undefined) user.availableSessions = availableSessions;
    if (hourlyRate !== undefined && role === 'trainer') user.hourlyRate = hourlyRate;
    
    // Handle trainer-specific fields
    if (role === 'trainer') {
      if (specialties !== undefined) user.specialties = specialties;
      if (certifications !== undefined) user.certifications = certifications;
      if (bio !== undefined) user.bio = bio;
    }
    
    // Handle password update if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    
    // Return updated user without password
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      availableSessions: user.availableSessions,
      updatedAt: user.updatedAt
    };
    
    if (user.role === 'trainer') {
      userData.specialties = user.specialties;
      userData.certifications = user.certifications;
      userData.bio = user.bio;
      userData.hourlyRate = user.hourlyRate;
    }
    
    logger.info(`Admin ${req.user.id} updated user: ${user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userData
    });
  } catch (error) {
    logger.error(`Error updating user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

/**
 * @route   POST /api/auth/promote-admin
 * @desc    Admin: Promote user to admin role
 * @access  Private (Admin Only)
 */
router.post('/promote-admin', protect, adminOnly, async (req, res) => {
  try {
    const { userId, adminCode } = req.body;
    
    // Validate admin code
    const expectedAdminCode = process.env.ADMIN_PROMOTION_CODE || 'admin123'; // Default code if not set in .env
    
    if (adminCode !== expectedAdminCode) {
      logger.warn(`Invalid admin code attempt by ${req.user.id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin code'
      });
    }
    
    // Find the user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update role to admin
    user.role = 'admin';
    await user.save();
    
    logger.info(`User ${userId} promoted to admin by ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User promoted to admin successfully'
    });
    
  } catch (error) {
    logger.error(`Error promoting user to admin: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error promoting user to admin'
    });
  }
});

/**
 * @route   POST /api/auth/promote-client
 * @desc    Admin: Promote user to client role
 * @access  Private (Admin Only)
 */
router.post('/promote-client', protect, adminOnly, async (req, res) => {
  try {
    const { userId, availableSessions } = req.body;
    
    // Find the user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update role to client and set available sessions
    user.role = 'client';
    user.availableSessions = availableSessions || 0;
    await user.save();
    
    logger.info(`User ${userId} promoted to client by ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User promoted to client successfully'
    });
    
  } catch (error) {
    logger.error(`Error promoting user to client: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error promoting user to client'
    });
  }
});

/**
 * @route   DELETE /api/auth/user/:id
 * @desc    Admin: Deactivate a user (soft delete)
 * @access  Private (Admin Only)
 */
router.delete('/user/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    // Soft delete the user (paranoid option in model)
    await user.destroy();
    
    logger.info(`Admin ${req.user.id} deactivated user: ${user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error(`Error deactivating user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
});

export default router;