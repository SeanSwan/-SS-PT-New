/**
 * Production Store Management Routes
 * =================================
 * Safe admin routes for managing store data in production
 */

import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { getStorefrontItem } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

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
        needsSeeding: totalPackages === 0
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
      error: error.message
    });
  }
});

/**
 * POST /api/admin/store/seed
 * Safely seed training packages (only if none exist)
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

    // Create essential packages
    const essentialPackages = [
      {
        name: 'Starter Swan Package',
        description: 'Perfect introduction to SwanStudios methodology with 4 personalized training sessions.',
        packageType: 'fixed',
        sessions: 4,
        pricePerSession: 140.00,
        totalCost: 560.00,
        price: 560.00,
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'Silver Swan Elite',
        description: 'Comprehensive 8-session package with advanced fitness protocols.',
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 145.00,
        totalCost: 1160.00,
        price: 1160.00,
        isActive: true,
        displayOrder: 2
      },
      {
        name: 'Gold Swan Mastery',
        description: 'Premium 12-session program with elite training methodologies.',
        packageType: 'fixed',
        sessions: 12,
        pricePerSession: 150.00,
        totalCost: 1800.00,
        price: 1800.00,
        isActive: true,
        displayOrder: 3
      },
      {
        name: 'Platinum Swan Transformation',
        description: 'Intensive 20-session complete lifestyle transformation.',
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 155.00,
        totalCost: 3100.00,
        price: 3100.00,
        isActive: true,
        displayOrder: 4
      }
    ];

    const createdPackages = [];
    let successCount = 0;

    for (const packageData of essentialPackages) {
      try {
        const item = await StorefrontItem.create(packageData);
        createdPackages.push({
          id: item.id,
          name: item.name,
          price: item.price
        });
        successCount++;
      } catch (error) {
        logger.error(`Failed to create package ${packageData.name}:`, error);
      }
    }

    logger.info(`Admin ${req.user.email} seeded ${successCount} training packages`);

    res.json({
      success: true,
      message: `Successfully created ${successCount} training packages`,
      action: 'seeded',
      packages: createdPackages,
      totalValue: createdPackages.reduce((sum, pkg) => sum + pkg.price, 0)
    });

  } catch (error) {
    logger.error('Error seeding store:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
      const sessions = item.sessions || item.totalSessions || 4;
      const baseRate = 150;
      const newPrice = sessions * baseRate;

      await item.update({
        price: newPrice,
        totalCost: newPrice,
        pricePerSession: baseRate
      });

      fixedPackages.push({
        name: item.name,
        oldPrice: item.price,
        newPrice: newPrice
      });
    }

    logger.info(`Admin ${req.user.email} fixed pricing for ${fixedPackages.length} packages`);

    res.json({
      success: true,
      message: `Fixed pricing for ${fixedPackages.length} packages`,
      action: 'fixed',
      packages: fixedPackages
    });

  } catch (error) {
    logger.error('Error fixing store pricing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
