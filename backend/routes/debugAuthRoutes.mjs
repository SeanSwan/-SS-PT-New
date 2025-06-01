/**
 * ⚡ QUICK LOGIN DEBUG ENDPOINT ⚡
 * ================================
 * Temporary debugging endpoint to help diagnose login issues
 */

import express from 'express';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   POST /api/debug/login-test
 * @desc    Debug login process without actually logging in
 * @access  Public (temporary)
 */
router.post('/login-test', async (req, res) => {
  try {
    console.log('=== LOGIN DEBUG ENDPOINT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing username or password',
        debug: {
          hasUsername: !!username,
          hasPassword: !!password,
          usernameType: typeof username,
          passwordType: typeof password,
          usernameLength: username ? username.length : 0,
          passwordLength: password ? password.length : 0
        }
      });
    }
    
    console.log('Searching for user:', username);
    
    let user;
    try {
      user = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email: username }
          ]
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database connection error',
        debug: {
          dbError: dbError.message,
          dbCode: dbError.code,
          dbName: dbError.name
        }
      });
    }
    
    if (!user) {
      console.log('User not found');
      
      // Check if there are any users in the database
      const userCount = await User.count();
      
      return res.status(404).json({
        success: false,
        error: 'User not found',
        debug: {
          searchTerm: username,
          userFound: false,
          totalUsersInDb: userCount,
          searchedBy: ['username', 'email']
        }
      });
    }
    
    console.log('User found:', user.username, user.email, 'Role:', user.role);
    
    // Check password without actually logging in
    let isPasswordValid = false;
    try {
      isPasswordValid = await user.checkPassword(password);
      console.log('Password validation result:', isPasswordValid);
    } catch (passwordError) {
      console.error('Password check error:', passwordError);
      return res.status(500).json({
        success: false,
        error: 'Password validation error',
        debug: {
          passwordError: passwordError.message
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Login debug completed',
      debug: {
        userFound: true,
        userDetails: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isLocked: user.isLocked || false,
          failedAttempts: user.failedLoginAttempts || 0
        },
        passwordValid: isPasswordValid,
        canLogin: isPasswordValid && user.isActive && !user.isLocked
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    logger.error('Debug login error:', { error: error.message, stack: error.stack });
    
    return res.status(500).json({
      success: false,
      error: 'Debug endpoint error',
      debug: {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack.split('\n').slice(0, 5) // First 5 lines of stack trace
      }
    });
  }
});

/**
 * @route   GET /api/debug/server-status
 * @desc    Check basic server status
 * @access  Public (temporary)
 */
router.get('/server-status', async (req, res) => {
  try {
    const dbStatus = await User.count();
    
    return res.status(200).json({
      success: true,
      message: 'Server is running',
      debug: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        databaseConnected: true,
        userCount: dbStatus,
        jwtSecret: !!process.env.JWT_SECRET,
        hasAdminCode: !!process.env.ADMIN_ACCESS_CODE
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server status check failed',
      debug: {
        errorMessage: error.message,
        databaseConnected: false
      }
    });
  }
});

export default router;