/**
 * Role Management Routes
 * API endpoints for managing user roles
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { upgradeToClient, hasAccessToDashboard, getAccessibleDashboards } from '../services/roleService.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   POST /api/roles/upgrade-to-client/:userId
 * @desc    Upgrade a user to client role
 * @access  Private (Admin only)
 */
router.post('/upgrade-to-client/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const success = await upgradeToClient(userId);
    
    if (success) {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });
      
      res.status(200).json({
        success: true,
        message: 'User upgraded to client role successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade user to client role'
      });
    }
  } catch (error) {
    logger.error('Error upgrading user to client:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({
      success: false,
      message: 'Server error upgrading user role'
    });
  }
});

/**
 * @route   GET /api/roles/check-access/:dashboard
 * @desc    Check if current user has access to a specific dashboard
 * @access  Private
 */
router.get('/check-access/:dashboard', protect, async (req, res) => {
  try {
    const { dashboard } = req.params;
    const user = req.user;
    
    const hasAccess = hasAccessToDashboard(user, dashboard);
    
    res.status(200).json({
      success: true,
      hasAccess,
      user: {
        id: user.id,
        role: user.role
      },
      dashboard
    });
  } catch (error) {
    logger.error('Error checking dashboard access:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      dashboard: req.params.dashboard
    });
    res.status(500).json({
      success: false,
      message: 'Server error checking dashboard access'
    });
  }
});

/**
 * @route   GET /api/roles/accessible-dashboards
 * @desc    Get list of dashboards accessible to current user
 * @access  Private
 */
router.get('/accessible-dashboards', protect, async (req, res) => {
  try {
    const user = req.user;
    const accessibleDashboards = getAccessibleDashboards(user);
    
    res.status(200).json({
      success: true,
      dashboards: accessibleDashboards,
      user: {
        id: user.id,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error getting accessible dashboards:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error getting accessible dashboards'
    });
  }
});

/**
 * @route   POST /api/roles/test-upgrade
 * @desc    Test endpoint to simulate user purchasing training packages
 * @access  Private (Development only)
 */
router.post('/test-upgrade', protect, async (req, res) => {
  try {
    // Only allow this in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test endpoints not available in production'
      });
    }
    
    const userId = req.user.id;
    const success = await upgradeToClient(userId);
    
    if (success) {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });
      
      res.status(200).json({
        success: true,
        message: 'User role upgraded successfully for testing',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade user role'
      });
    }
  } catch (error) {
    logger.error('Error in test upgrade:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error in test upgrade'
    });
  }
});

export default router;