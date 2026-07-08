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
    
    // Readiness diagnostics only — NO price fields. This endpoint is public
    // (mounted unauthenticated at /health and /api/health), so returning
    // price/totalCost here would bypass the invitation-only price gate that
    // /api/storefront enforces via priceVisibilityService.
    const queryPromise = StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
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

export default router;
