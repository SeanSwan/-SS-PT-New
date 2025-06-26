/**
 * Health Check Routes - SIMPLIFIED & BULLETPROOF VERSION
 * P0 FIX: Removes unnecessary complexity, adds comprehensive debugging
 * Eliminates potential routing conflicts that cause 404s
 */

import express from 'express';
import logger from '../utils/logger.mjs';
import { getHealthReport } from '../utils/stripeConfig.mjs';
import { isStripeEnabled, isSendGridEnabled, isTwilioEnabled } from '../utils/apiKeyChecker.mjs';

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
    services: {
      stripe: {
        enabled: isStripeEnabled(),
        configured: getHealthReport().stripe.configured,
        environment: getHealthReport().stripe.environment,
        status: isStripeEnabled() ? 'operational' : 'disabled'
      },
      sendgrid: {
        enabled: isSendGridEnabled(),
        status: isSendGridEnabled() ? 'operational' : 'disabled'
      },
      twilio: {
        enabled: isTwilioEnabled(),
        status: isTwilioEnabled() ? 'operational' : 'disabled'
      }
    },
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

/**
 * Detailed system health check with payment service status
 * @route   GET /health/detailed
 * @desc    Comprehensive health check including all service statuses
 * @access  Public
 */
router.get('/detailed', (req, res) => {
  const origin = req.headers.origin;
  
  // Apply CORS headers
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Health-Handler', 'DETAILED');
  
  try {
    const stripeHealth = getHealthReport();
    
    const detailedHealth = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: {
          status: 'operational',
          uptime: Math.floor(process.uptime()),
          memoryUsage: process.memoryUsage()
        },
        database: {
          status: 'unknown', // Could be enhanced with actual DB health check
          type: process.env.NODE_ENV === 'production' ? 'postgresql' : 'postgresql+mongodb'
        },
        payment: {
          stripe: stripeHealth.stripe,
          status: stripeHealth.stripe.configured ? 'operational' : 'misconfigured',
          issues: stripeHealth.stripe.errors
        },
        email: {
          sendgrid: {
            enabled: isSendGridEnabled(),
            status: isSendGridEnabled() ? 'operational' : 'disabled'
          }
        },
        sms: {
          twilio: {
            enabled: isTwilioEnabled(),
            status: isTwilioEnabled() ? 'operational' : 'disabled'
          }
        }
      },
      configuration: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || '5000',
        frontendUrl: process.env.FRONTEND_URL,
        hasDatabase: !!process.env.DATABASE_URL || !!process.env.PG_HOST,
        hasRedis: !!process.env.REDIS_URL
      }
    };
    
    // Set status based on critical services
    if (!stripeHealth.stripe.configured && process.env.NODE_ENV === 'production') {
      detailedHealth.status = 'degraded';
      detailedHealth.message = 'Payment processing unavailable';
    }
    
    logger.info(`Health check detailed - Status: ${detailedHealth.status}`);
    
    res.status(200).json(detailedHealth);
    
  } catch (error) {
    logger.error(`Health check detailed failed: ${error.message}`);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

/**
 * Payment system specific health check
 * @route   GET /health/payments
 * @desc    Detailed payment system status for debugging 503 errors
 * @access  Public
 */
router.get('/payments', (req, res) => {
  const origin = req.headers.origin;
  
  // Apply CORS headers
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Health-Handler', 'PAYMENTS');
  
  try {
    const stripeHealth = getHealthReport();
    
    const paymentHealth = {
      success: true,
      service: 'Payment System',
      timestamp: new Date().toISOString(),
      stripe: {
        ...stripeHealth.stripe,
        endpoint: '/api/payments/create-payment-intent',
        supportedMethods: ['card', 'digital_wallets'],
        testMode: stripeHealth.stripe.environment !== 'production'
      },
      status: stripeHealth.stripe.configured ? 'operational' : 'misconfigured',
      troubleshooting: {
        commonIssues: [
          'Missing STRIPE_SECRET_KEY in environment variables',
          'Missing VITE_STRIPE_PUBLISHABLE_KEY in frontend build',
          'Key format validation failed',
          'Environment mismatch between test/live keys'
        ],
        setupInstructions: [
          '1. Set STRIPE_SECRET_KEY=sk_test_... in .env',
          '2. Set VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... in .env', 
          '3. Restart application',
          '4. Check /health/payments endpoint'
        ]
      }
    };
    
    const httpStatus = stripeHealth.stripe.configured ? 200 : 503;
    
    logger.info(`Payment health check - Stripe configured: ${stripeHealth.stripe.configured}`);
    
    res.status(httpStatus).json(paymentHealth);
    
  } catch (error) {
    logger.error(`Payment health check failed: ${error.message}`);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Payment health check failed',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

export default router;