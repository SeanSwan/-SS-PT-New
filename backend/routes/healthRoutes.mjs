/**
 * Production Health Check with Store Status
 * =========================================
 * Enhanced health endpoint that checks store readiness
 */

import express from 'express';

// Dynamic import to handle initialization timing
let getStorefrontItem, Op;
try {
  const modelsModule = await import('../models/index.mjs');
  getStorefrontItem = modelsModule.getStorefrontItem;
  Op = modelsModule.Op;
} catch (importError) {
  console.log('Health routes: Models not yet available, using graceful degradation');
  getStorefrontItem = () => null;
  Op = null;
}

const router = express.Router();

// Basic health check - RENDER OPTIMIZED (no database dependency)
router.get('/', async (req, res) => {
  try {
    // IMMEDIATE RESPONSE for health checks - no database required
    const basicStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'listening'
    };

    // Try enhanced status with database (non-blocking)
    try {
      const StorefrontItem = getStorefrontItem();
      
      if (StorefrontItem && Op) {
        // Quick timeout for database queries with proper error handling
        try {
          const queryPromise = Promise.all([
            StorefrontItem.count(),
            StorefrontItem.count({ where: { isActive: true } }),
            StorefrontItem.count({
              where: {
                isActive: true,
                price: { [Op.gt]: 0 }
              }
            })
          ]);
          
          // Use AbortController for clean timeout handling
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), 2000);
          
          const [packageCount, activePackages, validPricedPackages] = await Promise.race([
            queryPromise,
            new Promise((_, reject) => {
              timeoutController.signal.addEventListener('abort', () => {
                reject(new Error('Database query timeout'));
              });
            })
          ]);
          
          clearTimeout(timeoutId);

        basicStatus.checks = {
          store: validPricedPackages > 0 ? 'ready' : 'degraded'
        };

        if (validPricedPackages === 0) {
          basicStatus.status = 'degraded';
          basicStatus.message = 'Store readiness degraded';
        } else {
          basicStatus.message = 'API operational';
        }
        
        } catch (dbQueryError) {
          // Database query failed - fallback gracefully
          basicStatus.checks = { store: 'unknown' };
          basicStatus.message = 'Server healthy';
          console.log('Health check: Database query failed:', dbQueryError.message);
        }
      }
    } catch (dbError) {
      // Database not ready yet - still return healthy for basic server operation
      basicStatus.checks = { store: 'unknown' };
      basicStatus.message = 'Server healthy';
      console.log('Health check: Database not ready yet:', dbError.message);
    }

    // Always return 200 OK for basic server health
    res.status(200).json(basicStatus);

  } catch (error) {
    // Only fail health check for server-level issues
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Server error',
      message: 'Health check failed'
    });
  }
});

// Store readiness check - ENHANCED WITH GRACEFUL DEGRADATION
router.get('/store', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    if (!StorefrontItem) {
      return res.json({
        success: false,
        ready: false,
        status: 'initializing',
        message: 'Database models not yet initialized'
      });
    }

    // Add timeout for store queries with proper error handling
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 3000);
    
    const queryPromise = StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'price', 'totalCost', 'sessions', 'totalSessions', 'packageType']
    });

    const packages = await Promise.race([
      queryPromise,
      new Promise((_, reject) => {
        timeoutController.signal.addEventListener('abort', () => {
          reject(new Error('Store query timeout'));
        });
      })
    ]);
    
    clearTimeout(timeoutId);

    res.json({
      success: true,
      ready: packages.length > 0,
      packageCount: packages.length,
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price || pkg.totalCost,
        sessions: pkg.sessions || pkg.totalSessions,
        type: pkg.packageType
      }))
    });

  } catch (error) {
    // Graceful degradation for store check
    res.status(200).json({
      success: false,
      ready: false,
      status: 'initializing',
      message: 'Store data not yet available - initialization in progress'
    });
  }
});

// ── U-07: readiness probe (distinct from liveness) ─────────────────────────
// /health above is a LIVENESS probe: it answers 200 the instant the process is
// listening, deliberately without touching Postgres. That is correct for
// liveness but wrong for traffic routing — Render sees 200 and starts sending
// requests to an instance whose models cache is still cold, which surfaces as a
// burst of 500s on every deploy.
//
// /ready is the readiness probe: 503 until the things a request actually needs
// are answering. Point Render's health check at this one.
router.get('/ready', async (req, res) => {
  const checks = {};

  const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);

  // Postgres — gates readiness
  try {
    const { default: sequelize } = await import('../database.mjs');
    await withTimeout(sequelize.authenticate(), 3000, 'database');
    checks.database = 'ok';
  } catch (err) {
    checks.database = `fail: ${err.message}`;
  }

  // Redis — gates readiness only when sessions are actually configured on it
  if (process.env.USE_REDIS_SESSIONS === 'true' || process.env.REDIS_URL) {
    const redisClient = req.app?.locals?.redisClient;
    if (redisClient && typeof redisClient.ping === 'function') {
      try {
        await withTimeout(redisClient.ping(), 2000, 'redis');
        checks.redis = 'ok';
      } catch (err) {
        checks.redis = `fail: ${err.message}`;
      }
    } else {
      checks.redis = 'not-initialized';
    }
  } else {
    checks.redis = 'not-configured';
  }

  // Stripe — reported but deliberately NOT gating readiness: a third-party
  // blip must not mark every instance unready and take the whole site down.
  checks.stripe = process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured';

  const failures = Object.entries(checks)
    .filter(([, value]) => typeof value === 'string' && value.startsWith('fail:'))
    .map(([name]) => name);

  const ready = failures.length === 0;
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    timestamp: new Date().toISOString(),
    failing: failures,
    checks,
  });
});

export default router;
