/**
 * Health Check Routes
 * Basic health endpoint for production monitoring
 */

import express from 'express';

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SwanStudios Backend',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 10000
  });
});

/**
 * @route   GET /api/health
 * @desc    API health check endpoint
 * @access  Public
 */
router.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    api: 'available',
    timestamp: new Date().toISOString(),
    service: 'SwanStudios API',
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
