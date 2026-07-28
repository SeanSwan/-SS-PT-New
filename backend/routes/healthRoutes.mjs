/**
 * Production Health Check with Store Status
 * =========================================
 * Enhanced health endpoint that checks store readiness
 */

import express from 'express';
import { deriveHealthStatus, readinessHttpStatus } from './healthStatus.mjs';

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
          // Hidden per-client specials (isSpecialOffer) are excluded from every
          // readiness count so a client's private deal never inflates the
          // public "active packages" signal (HR-007).
          const queryPromise = Promise.all([
            StorefrontItem.count({ where: { isSpecialOffer: false } }),
            StorefrontItem.count({ where: { isActive: true, isSpecialOffer: false } }),
            StorefrontItem.count({
              where: {
                isActive: true,
                isSpecialOffer: false,
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

        Object.assign(basicStatus, deriveHealthStatus({
          dbReachable: true,
          validPricedPackages
        }));

        } catch (dbQueryError) {
          // Query failed or timed out. Report it as degraded — this branch used to overwrite the
          // message with "Server healthy", so an operator curling /health during a database
          // outage was told nothing was wrong.
          Object.assign(basicStatus, deriveHealthStatus({
            dbReachable: false,
            validPricedPackages: null
          }));
          console.log('Health check: Database query failed:', dbQueryError.message);
        }
      } else {
        // Models are not loaded — the process is up but cannot serve data.
        Object.assign(basicStatus, deriveHealthStatus({
          dbReachable: false,
          validPricedPackages: null
        }));
      }
    } catch (dbError) {
      Object.assign(basicStatus, deriveHealthStatus({
        dbReachable: false,
        validPricedPackages: null
      }));
      console.log('Health check: Database not ready yet:', dbError.message);
    }

    // ALWAYS 200 for this endpoint — deliberately. Render treats /health as a LIVENESS probe, so
    // a 503 during a transient database blip would make it restart an application server that is
    // running fine, turning a database problem into an outage. The BODY now tells the truth
    // (status: 'degraded', ready: false) while the STATUS CODE keeps answering "the process is up".
    // For a probe that is allowed to fail, point monitoring at /health/ready below.
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
    // /api/storefront enforces via priceVisibilityService. Hidden per-client
    // specials (isSpecialOffer) are ALSO excluded — they must never appear in
    // any public response, not even name/session counts (HR-007).
    const queryPromise = StorefrontItem.findAll({
      where: { isActive: true, isSpecialOffer: false },
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

/**
 * GET /health/ready — READINESS probe (this one is allowed to fail).
 *
 * Separate from `/health` on purpose. Liveness answers "is the process up"; readiness answers
 * "can it actually serve". Point uptime monitoring and any deploy gate HERE — a 503 from this
 * endpoint means real requests are failing, without giving Render a reason to restart a process
 * that is running correctly.
 */
router.get('/ready', async (req, res) => {
  let status;
  try {
    const StorefrontItem = getStorefrontItem();
    if (!StorefrontItem || !Op) {
      status = deriveHealthStatus({ dbReachable: false, validPricedPackages: null });
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const count = await Promise.race([
          StorefrontItem.count({ where: { isActive: true, isSpecialOffer: false, price: { [Op.gt]: 0 } } }),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('Readiness query timeout')));
          })
        ]);
        status = deriveHealthStatus({ dbReachable: true, validPricedPackages: count });
      } finally {
        clearTimeout(timeoutId);
      }
    }
  } catch (error) {
    // Fail CLOSED: if readiness cannot be established, report NOT ready. Reporting ready on an
    // error is how a broken deploy gets marked healthy.
    status = deriveHealthStatus({ dbReachable: false, validPricedPackages: null });
  }

  res.status(readinessHttpStatus(status)).json({
    ...status,
    timestamp: new Date().toISOString()
  });
});

export default router;
