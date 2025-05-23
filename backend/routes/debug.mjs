// backend/routes/debug.mjs
import express from 'express';
import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * Authentication check endpoint
 * GET /api/debug/auth-check
 * Public - Used to verify API routes are accessible
 */
router.get('/auth-check', (req, res) => {
  logger.info(`Auth check endpoint called from ${req.ip}`);
  res.status(200).json({
    success: true,
    message: 'Auth routes are accessible',
    timestamp: new Date().toISOString()
  });
});

/**
 * Password verification endpoint (DEV ONLY)
 * POST /api/debug/verify-password
 * Public - Used to directly test password verification
 */
router.post('/verify-password', express.json(), async (req, res) => {
  try {
    const { username, password } = req.body;
    logger.info(`Password verification attempt for user: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'password', 'email', 'role'] 
    });
    
    if (!user) {
      logger.info(`User not found: ${username}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    logger.info(`Comparing passwords for user: ${username}`);
    const isMatch = await user.checkPassword(password);
    
    if (!isMatch) {
      logger.info(`Password verification failed for user: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password',
        // Include debug info (REMOVE IN PRODUCTION)
        debug: {
          userExists: true,
          passwordChecked: true,
          passwordMatch: false
        }
      });
    }
    
    logger.info(`Password verified successfully for user: ${username}`);
    res.status(200).json({
      success: true,
      message: 'Password verification successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Password verification error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false, 
      message: 'Server error during password verification', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * User check endpoint
 * POST /api/debug/check-user
 * Public - Used to check if a user exists
 */
router.post('/check-user', express.json(), async (req, res) => {
  try {
    const { username } = req.body;
    logger.info(`User check for username: ${username}`);
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required' 
      });
    }
    
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'email', 'role', 'createdAt'] 
    });
    
    if (!user) {
      logger.info(`User not found: ${username}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    logger.info(`User found: ${username}`);
    res.status(200).json({ 
      success: true, 
      message: 'User found', 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error(`User check error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ 
      success: false, 
      message: 'Server error checking user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

export default router;