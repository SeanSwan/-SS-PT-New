/**
 * dev-routes.mjs
 * 
 * Development-only routes for testing and debugging.
 * These routes should be disabled in production.
 */

import express from 'express';
import seedTestAccounts from '../scripts/seed-test-accounts.mjs';

const router = express.Router();

/**
 * Middleware to ensure these routes are only accessible in development
 */
const developmentOnlyMiddleware = (req, res, next) => {
  // Check if we're in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ 
      success: false, 
      message: 'This endpoint is not available in production' 
    });
  }
  next();
};

// Apply development-only middleware to all routes in this file
router.use(developmentOnlyMiddleware);

/**
 * @route   GET /api/dev/seed-test-accounts
 * @desc    Create or reset test accounts (admin, trainer, client)
 * @access  Development only
 */
router.get('/seed-test-accounts', async (req, res) => {
  try {
    const result = await seedTestAccounts();
    return res.json(result);
  } catch (error) {
    console.error('Error in seed-test-accounts route:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while seeding test accounts',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dev/health-check
 * @desc    Simple health check for development API
 * @access  Development only
 */
router.get('/health-check', (req, res) => {
  return res.json({
    success: true,
    message: 'Development API is functioning',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router;