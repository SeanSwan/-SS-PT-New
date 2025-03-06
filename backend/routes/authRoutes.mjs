/**
 * authRoutes.mjs
 * Routes for authentication and user management
 */
import express from 'express';
import { register, login, validateToken, getProfile } from '../controllers/authController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import User from '../models/User.mjs';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (client or admin)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Log in an existing user and return a JWT token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/validate-token
 * @desc    Validate a JWT token and return user data
 * @access  Public
 */
router.get('/validate-token', validateToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile (protected)
 * @access  Private
 */
router.get('/profile', protect, getProfile);

/**
 * @route   GET /api/auth/users/trainers
 * @desc    Get all trainers
 * @access  Private
 */
router.get('/users/trainers', protect, async (req, res) => {
  try {
    const trainers = await User.findAll({
      where: {
        role: 'trainer',
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties']
    });
    
    res.json(trainers);
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({ message: 'Server error fetching trainers' });
  }
});

/**
 * @route   GET /api/auth/users/clients
 * @desc    Get all clients
 * @access  Private (Admin Only)
 */
router.get('/users/clients', protect, adminOnly, async (req, res) => {
  try {
    const clients = await User.findAll({
      where: {
        role: 'client',
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
    });
    
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error fetching clients' });
  }
});

export default router;