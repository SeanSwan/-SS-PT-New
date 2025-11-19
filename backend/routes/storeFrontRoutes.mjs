import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
// 🚀 ENHANCED: Coordinated model imports with associations
import { getStorefrontItem } from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading model to prevent initialization race condition
// StorefrontItem model will be retrieved via getStorefrontItem() inside each route handler when needed
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * Get all storefront items
 * GET /api/storefront
 * Public
 * 
 * Query parameters:
 * - sortBy: Field to sort by (e.g., 'id', 'name', 'price')
 * - sortOrder: 'ASC' or 'DESC'
 * - limit: Number of items to return
 * - offset: Number of items to skip
 * - packageType: Filter by package type ('fixed', 'monthly')
 * - isActive: Filter by active status (true/false)
 */
router.get('/', async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const StorefrontItem = getStorefrontItem();
    
    const { 
      sortBy = 'id', 
      sortOrder = 'ASC',
      limit = 100,
      offset = 0,
      packageType,
      isActive
    } = req.query;

    // Validate sortOrder
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
    
    // Build the where clause for filtering
    const whereClause = {
      // We're removing the price filter to ensure all packages can be accessed
    };
    
    // Add packageType filter if provided
    if (packageType) {
      whereClause.packageType = packageType;
    }
    
    // Add isActive filter if provided (convert string to boolean)
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    
    // Check if the sortBy field exists in the model
    // FIXED: Checking if the requested sort field exists, falling back to 'id' if not
    const validColumns = Object.keys(StorefrontItem.rawAttributes);
    const validSortBy = validColumns.includes(sortBy) ? sortBy : 'id';
    
    // Execute the query with all parameters
    const items = await StorefrontItem.findAll({
      where: whereClause,
      order: [[validSortBy, validSortOrder]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    // Transform data to meet frontend expectations
    const transformedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      // Handle price fields appropriately - convert DECIMAL to numbers
      totalCost: parseFloat(item.totalCost) || parseFloat(item.price) || 0,
      displayPrice: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      pricePerSession: parseFloat(item.pricePerSession) || 0,
      // Also add price for frontend compatibility
      price: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      priceDetails: item.packageType === 'monthly' ? 
        `${item.months} months, ${item.sessionsPerWeek} sessions/week` : 
        null,
      // Handle other fields
      imageUrl: item.imageUrl,
      theme: item.theme || 'cosmic',
      sessions: item.sessions,
      months: item.months,
      sessionsPerWeek: item.sessionsPerWeek,
      totalSessions: item.totalSessions,
      category: null, // Add if you have this field
      itemType: item.packageType === 'fixed' ? 'TRAINING_PACKAGE_FIXED' : 'TRAINING_PACKAGE_SUBSCRIPTION',
      includedFeatures: item.includedFeatures || null, // Include the actual features (null if not available)
      packageType: item.packageType,
      isActive: item.isActive,
      displayOrder: item.displayOrder || 0
    }));

    logger.info(`Retrieved ${items.length} storefront items`);

    // Return success response with data structure frontend expects
    res.json({
      success: true,
      items: transformedItems
    });
  } catch (error) {
    logger.error('Error fetching storefront items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving storefront items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Calculate custom package pricing in real-time
 * GET /api/storefront/calculate-price
 * Public (no auth required - for wizard interactivity)
 *
 * Query Parameters:
 * - sessions: Number of sessions (10-100) [REQUIRED]
 * - pricePerSession: Base price per session (optional, default: 175)
 *
 * Business Rules (Kilo's Requirements):
 * - Minimum: 10 sessions (profitability threshold)
 * - Maximum: 100 sessions (capacity planning)
 * - Volume Discount Tiers:
 *   - 10-19 sessions: $10 off per session → $165/session
 *   - 20-39 sessions: $13 off per session → $162/session
 *   - 40-100 sessions: $15 off per session → $160/session
 *
 * Response Example:
 * {
 *   success: true,
 *   pricing: {
 *     sessions: 35,
 *     pricePerSession: 162,
 *     volumeDiscount: 13,
 *     discountPercentage: 7.4,
 *     subtotal: 6125,
 *     totalDiscount: 455,
 *     finalTotal: 5670,
 *     savingsMessage: "You save $455 vs. buying single sessions!"
 *   }
 * }
 *
 * Enhancement requested by: Gemini (Frontend Specialist)
 * Enables real-time pricing updates in CustomPackageBuilder wizard
 *
 * IMPORTANT: This route MUST come BEFORE /:id route to avoid route collision
 */
router.get('/calculate-price', async (req, res) => {
  try {
    const sessions = parseInt(req.query.sessions, 10);
    const basePricePerSession = parseFloat(req.query.pricePerSession) || 175; // Default: single session price

    // Validate sessions input
    if (isNaN(sessions)) {
      return res.status(400).json({
        success: false,
        message: 'Sessions parameter is required and must be a number'
      });
    }

    if (sessions < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum 10 sessions required for custom packages',
        businessRule: 'Profitability threshold - custom packages must be at least 10 sessions'
      });
    }

    if (sessions > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 sessions allowed for custom packages',
        businessRule: 'Capacity planning - contact us for larger packages'
      });
    }

    // Volume discount tiers (Kilo's business logic)
    let discountPerSession = 0;
    let tier = '';

    if (sessions >= 10 && sessions <= 19) {
      discountPerSession = 10; // $165/session
      tier = 'bronze';
    } else if (sessions >= 20 && sessions <= 39) {
      discountPerSession = 13; // $162/session
      tier = 'silver';
    } else if (sessions >= 40) {
      discountPerSession = 15; // $160/session
      tier = 'gold';
    }

    // Calculate pricing breakdown
    const pricePerSession = basePricePerSession - discountPerSession;
    const subtotal = sessions * basePricePerSession;
    const totalDiscount = sessions * discountPerSession;
    const finalTotal = sessions * pricePerSession;
    const discountPercentage = ((totalDiscount / subtotal) * 100).toFixed(1);

    // Build savings message
    let savingsMessage = `You save $${totalDiscount} vs. buying single sessions!`;
    if (tier === 'silver') {
      savingsMessage += ' 🥈 Silver tier discount unlocked!';
    } else if (tier === 'gold') {
      savingsMessage += ' 🥇 Gold tier discount - best value!';
    }

    logger.info(`Calculated custom package pricing: ${sessions} sessions @ $${pricePerSession}/session = $${finalTotal} (${tier} tier)`);

    res.json({
      success: true,
      pricing: {
        sessions,
        pricePerSession,
        volumeDiscount: discountPerSession,
        discountPercentage: parseFloat(discountPercentage),
        discountTier: tier,
        subtotal,
        totalDiscount,
        finalTotal,
        savingsMessage,
        // Additional metadata for frontend
        metadata: {
          nextTierSessions: tier === 'bronze' ? 20 : (tier === 'silver' ? 40 : null),
          nextTierDiscount: tier === 'bronze' ? 13 : (tier === 'silver' ? 15 : null),
          nextTierMessage: tier === 'bronze' ? 'Add 1 more session to unlock Silver tier!' :
                          (tier === 'silver' ? 'Add 1 more session to unlock Gold tier!' :
                           'You\'ve unlocked the best pricing!')
        }
      }
    });

  } catch (error) {
    logger.error('Error calculating custom package price:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating custom package price',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get a single storefront item
 * GET /api/storefront/:id
 * Public
 */
router.get('/:id', async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const StorefrontItem = getStorefrontItem();
    
    const item = await StorefrontItem.findOne({
      where: {
        id: req.params.id
        // Removed pricing constraint to ensure all packages are visible
      }
    });
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found or does not meet pricing requirements' 
      });
    }
    
    // Transform to meet frontend expectations
    const transformedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      totalCost: parseFloat(item.totalCost) || parseFloat(item.price) || 0,
      displayPrice: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      pricePerSession: parseFloat(item.pricePerSession) || 0,
      // Also add price for frontend compatibility
      price: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      priceDetails: item.packageType === 'monthly' ? 
        `${item.months} months, ${item.sessionsPerWeek} sessions/week` : 
        null,
      imageUrl: item.imageUrl,
      theme: item.theme || 'cosmic',
      sessions: item.sessions,
      months: item.months,
      sessionsPerWeek: item.sessionsPerWeek,
      totalSessions: item.totalSessions,
      itemType: item.packageType === 'fixed' ? 'TRAINING_PACKAGE_FIXED' : 'TRAINING_PACKAGE_SUBSCRIPTION',
      includedFeatures: item.includedFeatures || null, // Include the actual features (null if not available)
      packageType: item.packageType,
      isActive: item.isActive,
      displayOrder: item.displayOrder || 0
    };

    res.json({
      success: true,
      item: transformedItem
    });
  } catch (error) {
    logger.error('Error fetching storefront item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving storefront item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new storefront item
 * POST /api/storefront
 * Private/Admin
 */
router.post('/', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const StorefrontItem = getStorefrontItem();
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to create storefront items' 
      });
    }
    
    // Validate that pricePerSession is at least $140
    if (req.body.pricePerSession && parseFloat(req.body.pricePerSession) < 140) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be at least $140'
      });
    }
    
    const item = await StorefrontItem.create(req.body);
    
    logger.info(`Admin created new storefront item: ${item.name}`);
    
    res.status(201).json({
      success: true,
      item: item
    });
  } catch (error) {
    logger.error('Error creating storefront item:', error);
    
    // Handle validation errors specifically
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating storefront item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update a storefront item
 * PUT /api/storefront/:id
 * Private/Admin
 */
router.put('/:id', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const StorefrontItem = getStorefrontItem();
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update storefront items' 
      });
    }
    
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }
    
    // Validate that pricePerSession is at least $140 if being updated
    if (req.body.pricePerSession && parseFloat(req.body.pricePerSession) < 140) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be at least $140'
      });
    }
    
    await item.update(req.body);
    
    logger.info(`Admin updated storefront item: ${item.name}`);
    
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    logger.error('Error updating storefront item:', error);
    
    // Handle validation errors specifically
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating storefront item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a storefront item
 * DELETE /api/storefront/:id
 * Private/Admin
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    // 🎯 ENHANCED P0 FIX: Lazy load model to prevent race condition
    const StorefrontItem = getStorefrontItem();
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete storefront items' 
      });
    }
    
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }
    
    await item.destroy();
    
    logger.info(`Admin deleted storefront item: ${item.name}`);
    
    res.json({ 
      success: true,
      message: 'Item removed successfully' 
    });
  } catch (error) {
    logger.error('Error deleting storefront item:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting storefront item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;