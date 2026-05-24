// backend/routes/debug.mjs
import express from 'express';
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

export default router;
