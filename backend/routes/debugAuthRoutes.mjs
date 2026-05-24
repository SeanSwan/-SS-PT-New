/**
 * Minimal public debug endpoint for non-production route health checks.
 */

import express from 'express';

const router = express.Router();

/**
 * @route   GET /api/debug/server-status
 * @desc    Check basic server status without database or secret disclosure
 * @access  Public (temporary)
 */
router.get('/server-status', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
