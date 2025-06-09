/**
 * Health Check Routes - SIMPLIFIED & BULLETPROOF VERSION
 * P0 FIX: Removes unnecessary complexity, adds comprehensive debugging
 * Eliminates potential routing conflicts that cause 404s
 */

import express from 'express';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * Root health check endpoint - SIMPLIFIED & BULLETPROOF
 * @route   GET /health (when mounted at /health)
 * @route   GET /api/health (when mounted at /api/health)
 * @desc    Universal health check endpoint with ultra-aggressive CORS
 * @access  Public
 */
router.get('/', (req, res) => {
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestPath = req.originalUrl || req.url;
  const method = req.method;
  
  // COMPREHENSIVE LOGGING for P0 debugging
  logger.info(`🚨 P0 DEBUG - Health endpoint hit:`);
  logger.info(`   Method: ${method}`);
  logger.info(`   Path: ${requestPath}`);
  logger.info(`   Origin: ${origin || 'no-origin'}`);
  logger.info(`   User-Agent: ${userAgent}`);
  logger.info(`   All Headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  // ULTRA-AGGRESSIVE CORS - Multiple fallback strategies
  const corsOrigin = origin || '*';
  
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Vary', 'Origin');
  
  // DEBUG HEADERS to track routing
  res.header('X-Health-Handler', 'ROOT-Simplified');
  res.header('X-Debug-Path', requestPath);
  res.header('X-Debug-Origin', origin || 'no-origin');
  res.header('X-Debug-Timestamp', new Date().toISOString());
  res.header('X-Server-Status', 'OPERATIONAL');
  
  const healthResponse = {
    success: true,
    status: 'healthy',
    message: 'SwanStudios Backend is operational',
    service: 'SwanStudios Backend API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    debug: {
      requestPath: requestPath,
      requestOrigin: origin || 'no-origin',
      corsOrigin: corsOrigin,
      handler: 'ROOT-Simplified',
      serverTime: new Date().toISOString()
    }
  };
  
  logger.info(`✅ P0 DEBUG - Health response sent successfully`);
  logger.info(`   Response: ${JSON.stringify(healthResponse, null, 2)}`);
  
  res.status(200).json(healthResponse);
});

// EXPLICIT OPTIONS HANDLER for health endpoint
router.options('/', (req, res) => {
  const origin = req.headers.origin;
  logger.info(`🎯 P0 DEBUG - OPTIONS request to health endpoint from origin: ${origin || 'no-origin'}`);
  
  const corsOrigin = origin || '*';
  res.header('Access-Control-Allow-Origin', corsOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.header('X-Debug-CORS-Handler', 'Health-OPTIONS-Explicit');
  
  res.status(204).end();
});

export default router;