/**
 * dev-routes.mjs
 * 
 * Development-only routes for testing and debugging.
 * These routes should be disabled in production.
 */

import express from 'express';

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
  return res.status(410).json({
    success: false,
    message: 'Dev account seeding is retired. Use backend seed scripts with explicit credentials.'
  });
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
