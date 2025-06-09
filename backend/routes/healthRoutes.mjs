/**
 * Health Check Routes - DEFINITIVE VERSION
 * Consolidated health endpoints for production monitoring
 * Fixes P0 issue: Multiple conflicting health endpoint definitions
 */

import express from 'express';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * Root health check endpoint - used by frontend health checks
 * @route   GET /health
 * @desc    Basic health check endpoint for frontend connection validation
 * @access  Public
 */
router.get('/', (req, res) => {
  const origin = req.headers.origin;
  logger.info(`🏥 ROOT Health check from origin: ${origin || 'no-origin'}`);
  
  // Set CORS headers explicitly for health endpoint
  res.header('Access-Control-Allow-Origin', origin || 'https://sswanstudios.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  const healthResponse = {
    success: true,
    status: 'healthy',
    message: 'SwanStudios Backend is operational',
    service: 'SwanStudios Backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    cors: {
      requestOrigin: origin || 'no-origin',
      allowedOrigin: origin || 'https://sswanstudios.com'
    }
  };
  
  res.status(200).json(healthResponse);
});

/**
 * API-specific health check endpoint
 * @route   GET /api/health
 * @desc    API health check endpoint for service monitoring
 * @access  Public
 */
router.get('/api', (req, res) => {
  const origin = req.headers.origin;
  logger.info(`🏥 API Health check from origin: ${origin || 'no-origin'}`);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', origin || 'https://sswanstudios.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.status(200).json({
    success: true,
    status: 'healthy',
    api: 'available',
    message: 'SwanStudios API is operational',
    service: 'SwanStudios API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: {
      requestOrigin: origin || 'no-origin',
      allowedOrigin: origin || 'https://sswanstudios.com'
    }
  });
});

export default router;