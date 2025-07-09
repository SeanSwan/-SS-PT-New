/**
 * Production Health Check with Store Status
 * =========================================
 * Enhanced health endpoint that checks store readiness
 */

import express from 'express';

// Dynamic import to handle initialization timing
let getStorefrontItem;
try {
  const modelsModule = await import('../models/index.mjs');
  getStorefrontItem = modelsModule.getStorefrontItem;
} catch (importError) {
  console.log('Health routes: Models not yet available, using graceful degradation');
  getStorefrontItem = () => null;
}

const router = express.Router();

// Basic health check - RENDER OPTIMIZED (no database dependency)
router.get('/', async (req, res) => {
  try {
    // IMMEDIATE RESPONSE for health checks - no database required
    const basicStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      server: 'listening',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };

    // Try enhanced status with database (non-blocking)
    try {
      const StorefrontItem = getStorefrontItem();
      
      if (StorefrontItem) {
        // Quick timeout for database queries with proper error handling
        try {
          const queryPromise = Promise.all([
            StorefrontItem.count(),
            StorefrontItem.count({ where: { isActive: true } }),
            StorefrontItem.count({
              where: {
                isActive: true,
                price: { [StorefrontItem.sequelize.Op.gt]: 0 }
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

        // Add enhanced status if database is available
        basicStatus.database = 'connected';
        basicStatus.store = {
          totalPackages: packageCount,
          activePackages: activePackages,
          validPricedPackages: validPricedPackages,
          ready: validPricedPackages > 0
        };
        basicStatus.genesis = {
          paymentSystem: 'ready',
          checkoutFlow: 'active',
          stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLISHABLE_KEY)
        };

        // Determine overall health
        if (validPricedPackages === 0) {
          basicStatus.status = 'degraded';
          basicStatus.message = 'Store not ready: No training packages with valid pricing found';
        } else if (!basicStatus.genesis.stripeConfigured) {
          basicStatus.status = 'degraded';
          basicStatus.message = 'Payment system not configured: Missing Stripe keys';
        } else {
          basicStatus.message = 'Genesis Checkout System fully operational';
        }
        
        } catch (dbQueryError) {
          // Database query failed - fallback gracefully
          basicStatus.database = 'query_failed';
          basicStatus.message = 'Server healthy - database queries timing out';
          console.log('Health check: Database query failed:', dbQueryError.message);
        }
      }
    } catch (dbError) {
      // Database not ready yet - still return healthy for basic server operation
      basicStatus.database = 'initializing';
      basicStatus.message = 'Server healthy - database initializing in background';
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
      message: error.message
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
      error: error.message,
      message: 'Store data not yet available - initialization in progress'
    });
  }
});

export default router;
