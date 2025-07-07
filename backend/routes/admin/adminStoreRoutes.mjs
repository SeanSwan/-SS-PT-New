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
      error: error.message
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

    // Create your EXACT luxury SwanStudios collection
    const luxurySwanPackages = [
      {
        name: 'Silver Swan Wing',
        description: 'Your elegant introduction to premium personal training with Sean Swan',
        packageType: 'fixed',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'Golden Swan Flight',
        description: 'Begin your transformation journey with 8 sessions of expert guidance',
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 170.00,
        totalCost: 1360.00,
        price: 1360.00,
        isActive: true,
        displayOrder: 2
      },
      {
        name: 'Sapphire Swan Soar',
        description: 'Elevate your fitness with 20 sessions of premium training excellence',
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 165.00,
        totalCost: 3300.00,
        price: 3300.00,
        isActive: true,
        displayOrder: 3
      },
      {
        name: 'Platinum Swan Grace',
        description: 'Master your potential with 50 sessions of elite personal training',
        packageType: 'fixed',
        sessions: 50,
        pricePerSession: 160.00,
        totalCost: 8000.00,
        price: 8000.00,
        isActive: true,
        displayOrder: 4
      },
      {
        name: 'Emerald Swan Evolution',
        description: 'Transform your life with 3 months of dedicated training (4x per week)',
        packageType: 'monthly',
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 52,
        pricePerSession: 155.00,
        totalCost: 8060.00,
        price: 8060.00,
        isActive: true,
        displayOrder: 5
      },
      {
        name: 'Diamond Swan Dynasty',
        description: 'Build lasting strength with 6 months of premium training mastery',
        packageType: 'monthly',
        months: 6,
        sessionsPerWeek: 4,
        totalSessions: 104,
        pricePerSession: 150.00,
        totalCost: 15600.00,
        price: 15600.00,
        isActive: true,
        displayOrder: 6
      },
      {
        name: 'Ruby Swan Reign',
        description: 'Command your fitness destiny with 9 months of elite transformation',
        packageType: 'monthly',
        months: 9,
        sessionsPerWeek: 4,
        totalSessions: 156,
        pricePerSession: 145.00,
        totalCost: 22620.00,
        price: 22620.00,
        isActive: true,
        displayOrder: 7
      },
      {
        name: 'Rhodium Swan Royalty',
        description: 'The ultimate year-long journey to peak performance and royal fitness',
        packageType: 'monthly',
        months: 12,
        sessionsPerWeek: 4,
        totalSessions: 208,
        pricePerSession: 140.00,
        totalCost: 29120.00,
        price: 29120.00,
        isActive: true,
        displayOrder: 8
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
      // Use luxury pricing based on sessions
      const sessions = item.sessions || item.totalSessions || 1;
      let baseRate = 175; // Start with highest rate
      
      // Determine rate based on package tier
      if (sessions >= 200) baseRate = 140; // Rhodium
      else if (sessions >= 150) baseRate = 145; // Ruby
      else if (sessions >= 100) baseRate = 150; // Diamond
      else if (sessions >= 50) baseRate = 155; // Emerald
      else if (sessions >= 40) baseRate = 160; // Platinum
      else if (sessions >= 15) baseRate = 165; // Sapphire
      else if (sessions >= 5) baseRate = 170; // Golden
      else baseRate = 175; // Silver
      
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
      error: error.message
    });
  }
});

export default router;
