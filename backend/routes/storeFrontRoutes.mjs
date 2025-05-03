import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
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
    const whereClause = {};
    
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
      // Handle price fields appropriately
      totalCost: item.totalCost || item.price,
      displayPrice: item.price || item.totalCost,
      pricePerSession: item.pricePerSession,
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
      includedFeatures: null, // Add if you have this field
      packageType: item.packageType,
      isActive: item.isActive
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
 * Get a single storefront item
 * GET /api/storefront/:id
 * Public
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }
    
    // Transform to meet frontend expectations
    const transformedItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      totalCost: item.totalCost || item.price,
      displayPrice: item.price || item.totalCost,
      pricePerSession: item.pricePerSession,
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
      packageType: item.packageType,
      isActive: item.isActive
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
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to create storefront items' 
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