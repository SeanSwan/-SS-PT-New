/**
 * Production Store Management Routes - LUXURY SWANSTUDIOS COLLECTION
 * ==================================================================
 * Safe admin routes for managing your EXACT luxury SwanStudios packages
 */

import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { getStorefrontItem } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

// Apply authentication and admin role to all routes
router.use(protect);
router.use(authorize(['admin']));

/**
 * GET /api/admin/store/status
 * Check current store status
 */
router.get('/status', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    const totalPackages = await StorefrontItem.count();
    const activePackages = await StorefrontItem.count({ where: { isActive: true } });
    const validPricedPackages = await StorefrontItem.count({
      where: {
        isActive: true,
        price: { [StorefrontItem.sequelize.Op.gt]: 0 }
      }
    });

    const packages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'name', 'price', 'totalCost', 'sessions', 'totalSessions', 'packageType', 'displayOrder']
    });

    res.json({
      success: true,
      status: {
        ready: validPricedPackages > 0,
        totalPackages,
        activePackages,
        validPricedPackages,
        needsSeeding: totalPackages === 0,
        hasLuxuryCollection: packages.some(pkg => 
          pkg.name.includes('Swan Wing') || 
          pkg.name.includes('Swan Flight') || 
          pkg.name.includes('Swan Soar')
        )
      },
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price || pkg.totalCost || 0,
        sessions: pkg.sessions || pkg.totalSessions || 0,
        type: pkg.packageType,
        displayOrder: pkg.displayOrder
      }))
    });

  } catch (error) {
    logger.error('Error checking store status:', error);
    res.status(500).json({
      success: false,
      error: INTERNAL_ERROR
    });
  }
});

/**
 * POST /api/admin/store/seed
 * Safely seed your EXACT luxury SwanStudios packages (only if none exist)
 */
router.post('/seed', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    // Check if packages already exist
    const existingCount = await StorefrontItem.count();
    
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Store already has packages',
        action: 'none',
        packageCount: existingCount
      });
    }

    // Current packages: $175/session (1-hour), no volume discounts
    const luxurySwanPackages = [
      {
        name: 'Single Session',
        description: 'One premium 1-hour personal training session with Sean Swan',
        packageType: 'fixed',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        isActive: true,
        displayOrder: 1
      },
      {
        name: '10-Session Pack',
        description: 'Ten 1-hour personal training sessions',
        packageType: 'fixed',
        sessions: 10,
        pricePerSession: 175.00,
        totalCost: 1750.00,
        price: 1750.00,
        isActive: true,
        displayOrder: 2
      },
      {
        name: '24-Session Pack',
        description: 'Twenty-four 1-hour personal training sessions',
        packageType: 'fixed',
        sessions: 24,
        pricePerSession: 175.00,
        totalCost: 4200.00,
        price: 4200.00,
        isActive: true,
        displayOrder: 3
      },
      {
        name: '3-Month Program',
        description: 'Consistent training over 3 months at $175 per session',
        packageType: 'monthly',
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 48,
        pricePerSession: 175.00,
        totalCost: 8400.00,
        price: 8400.00,
        isActive: true,
        displayOrder: 4
      },
      {
        name: '6-Month Program',
        description: 'Build lasting habits with 6 months of dedicated training',
        packageType: 'monthly',
        months: 6,
        sessionsPerWeek: 4,
        totalSessions: 96,
        pricePerSession: 175.00,
        totalCost: 16800.00,
        price: 16800.00,
        isActive: true,
        displayOrder: 5
      },
      {
        name: '12-Month Program',
        description: 'Full year commitment for maximum transformation',
        packageType: 'monthly',
        months: 12,
        sessionsPerWeek: 4,
        totalSessions: 192,
        pricePerSession: 175.00,
        totalCost: 33600.00,
        price: 33600.00,
        isActive: true,
        displayOrder: 6
      },
      {
        name: '30-Minute Sessions (10-Pack)',
        description: 'Ten focused 30-minute personal training sessions',
        packageType: 'fixed',
        sessions: 10,
        pricePerSession: 110.00,
        totalCost: 1100.00,
        price: 1100.00,
        isActive: true,
        displayOrder: 7
      }
    ];

    const createdPackages = [];
    let successCount = 0;
    let totalValue = 0;

    for (const packageData of luxurySwanPackages) {
      try {
        const item = await StorefrontItem.create(packageData);
        createdPackages.push({
          id: item.id,
          name: item.name,
          price: item.price,
          sessions: item.sessions || item.totalSessions
        });
        successCount++;
        totalValue += parseFloat(item.price);
      } catch (error) {
        logger.error(`Failed to create luxury package ${packageData.name}:`, error);
      }
    }

    logger.info(`Admin ${req.user.email} seeded ${successCount} luxury SwanStudios packages (value: $${totalValue})`);

    res.json({
      success: true,
      message: `Successfully created ${successCount} luxury SwanStudios packages`,
      action: 'seeded',
      packages: createdPackages,
      totalValue: totalValue,
      collection: 'Luxury SwanStudios Collection',
      revenueProtential: totalValue
    });

  } catch (error) {
    logger.error('Error seeding luxury store:', error);
    res.status(500).json({
      success: false,
      error: INTERNAL_ERROR
    });
  }
});

/**
 * POST /api/admin/store/fix-pricing
 * Fix packages with invalid pricing
 */
router.post('/fix-pricing', async (req, res) => {
  try {
    const StorefrontItem = getStorefrontItem();
    
    const brokenItems = await StorefrontItem.findAll({
      where: {
        [StorefrontItem.sequelize.Op.or]: [
          { price: 0 },
          { price: null },
          { totalCost: 0 },
          { totalCost: null }
        ]
      }
    });

    if (brokenItems.length === 0) {
      return res.json({
        success: true,
        message: 'All packages have valid pricing',
        action: 'none',
        fixedCount: 0
      });
    }

    const fixedPackages = [];

    for (const item of brokenItems) {
      // Flat rate: $175/session (1-hour), $110 (30-min) — no volume discounts
      const sessions = item.sessions || item.totalSessions || 1;
      const is30Min = (item.name || '').toLowerCase().includes('30-minute') || (item.name || '').toLowerCase().includes('30 min');
      const baseRate = is30Min ? 110 : 175;
      
      const newPrice = sessions * baseRate;

      await item.update({
        price: newPrice,
        totalCost: newPrice,
        pricePerSession: baseRate
      });

      fixedPackages.push({
        name: item.name,
        oldPrice: item.price,
        newPrice: newPrice,
        rate: baseRate
      });
    }

    logger.info(`Admin ${req.user.email} fixed luxury pricing for ${fixedPackages.length} packages`);

    res.json({
      success: true,
      message: `Fixed luxury pricing for ${fixedPackages.length} packages`,
      action: 'fixed',
      packages: fixedPackages
    });

  } catch (error) {
    logger.error('Error fixing luxury store pricing:', error);
    res.status(500).json({
      success: false,
      error: INTERNAL_ERROR
    });
  }
});

export default router;
