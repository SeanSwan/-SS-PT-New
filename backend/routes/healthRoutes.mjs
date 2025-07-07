/**
 * Production Health Check with Store Status
 * =========================================
 * Enhanced health endpoint that checks store readiness
 */

import express from 'express';
import { getStorefrontItem } from '../models/index.mjs';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    // Check database connection by counting packages
    const packageCount = await StorefrontItem.count();
    const activePackages = await StorefrontItem.count({ where: { isActive: true } });
    
    // Check if we have packages with valid pricing
    const validPricedPackages = await StorefrontItem.count({
      where: {
        isActive: true,
        price: { [StorefrontItem.sequelize.Op.gt]: 0 }
      }
    });

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      store: {
        totalPackages: packageCount,
        activePackages: activePackages,
        validPricedPackages: validPricedPackages,
        ready: validPricedPackages > 0
      },
      genesis: {
        paymentSystem: 'ready',
        checkoutFlow: 'active',
        stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY)
      }
    };

    // Determine overall health
    if (validPricedPackages === 0) {
      status.status = 'degraded';
      status.message = 'Store not ready: No training packages with valid pricing found';
    } else if (!status.genesis.stripeConfigured) {
      status.status = 'degraded';
      status.message = 'Payment system not configured: Missing Stripe keys';
    } else {
      status.message = 'Genesis Checkout System fully operational';
    }

    const httpStatus = status.status === 'healthy' ? 200 : 503;
    res.status(httpStatus).json(status);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Store readiness check
router.get('/store', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    const packages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'price', 'totalCost', 'sessions', 'totalSessions', 'packageType']
    });

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
    res.status(500).json({
      success: false,
      ready: false,
      error: error.message
    });
  }
});

export default router;
