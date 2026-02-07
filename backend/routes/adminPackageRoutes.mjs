// backend/routes/adminPackageRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// NOTE: Get model inside route handlers, not at module level
// Module-level getModels() runs before cache initialization causing undefined model

// Middleware to ensure admin access
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
  }
  next();
};

// Apply protection and admin requirement to all routes
router.use(protect);
router.use(requireAdmin);

/**
 * Get all packages for admin management
 * GET /api/admin/packages (NEW) and /api/admin/storefront (LEGACY)
 * Admin only
 */
router.get('/', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const {
      sortBy = 'id',
      sortOrder = 'ASC',
      limit = 100,
      offset = 0,
      packageType,
      isActive
    } = req.query;

    // Build the where clause for filtering
    const whereClause = {};

    if (packageType) {
      whereClause.packageType = packageType;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if the sortBy field exists in the model
    const validColumns = Object.keys(StorefrontItem.rawAttributes);
    const validSortBy = validColumns.includes(sortBy) ? sortBy : 'id';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
    
    // Execute the query with all parameters
    const items = await StorefrontItem.findAll({
      where: whereClause,
      order: [[validSortBy, validSortOrder]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    // Return full data for admin management
    const transformedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      packageType: item.packageType,
      pricePerSession: item.pricePerSession,
      sessions: item.sessions,
      months: item.months,
      sessionsPerWeek: item.sessionsPerWeek,
      totalSessions: item.totalSessions,
      totalCost: item.totalCost,
      price: item.price,
      displayPrice: item.price || item.totalCost,
      theme: item.theme,
      isActive: item.isActive,
      stripeProductId: item.stripeProductId,
      stripePriceId: item.stripePriceId,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    logger.info(`Admin retrieved ${items.length} storefront items`);

    res.json({
      success: true,
      items: transformedItems
    });
  } catch (error) {
    logger.error('Error fetching storefront items for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving storefront items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create a new package
 * POST /api/admin/packages (NEW) and /api/admin/storefront (LEGACY)
 * Admin only
 */
router.post('/', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    // Validate required fields
    const { name, packageType, pricePerSession } = req.body;

    if (!name || !packageType || !pricePerSession) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, packageType, and pricePerSession'
      });
    }

    // Create the item
    const item = await StorefrontItem.create(req.body);
    
    logger.info(`Admin created new storefront item: ${item.name} (ID: ${item.id})`);
    
    res.status(201).json({
      success: true,
      item: item,
      message: 'Package created successfully'
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
 * Update a package
 * PUT /api/admin/packages/:id (NEW) and /api/admin/storefront/:id (LEGACY)
 * Admin only
 */
router.put('/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    // Update the item
    await item.update(req.body);
    
    logger.info(`Admin updated storefront item: ${item.name} (ID: ${item.id})`);
    
    res.json({
      success: true,
      item: item,
      message: 'Package updated successfully'
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
 * Delete a package
 * DELETE /api/admin/packages/:id (NEW) and /api/admin/storefront/:id (LEGACY)
 * Admin only
 */
router.delete('/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    // Store name for logging before deletion
    const itemName = item.name;
    
    await item.destroy();
    
    logger.info(`Admin deleted storefront item: ${itemName} (ID: ${req.params.id})`);
    
    res.json({ 
      success: true,
      message: 'Package deleted successfully' 
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

/**
 * Get a single package for admin editing
 * GET /api/admin/packages/:id (NEW) and /api/admin/storefront/:id (LEGACY)
 * Admin only
 */
router.get('/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    logger.error('Error fetching storefront item for admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving storefront item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ PHASE 2C: Add alias routes that frontend expects
// Frontend expects: /api/admin/packages/* when this router is mounted at /api/admin

/**
 * ALIAS: Get all packages - Frontend compatibility
 * GET /api/admin/packages
 */
router.get('/packages', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const {
      sortBy = 'id',
      sortOrder = 'ASC',
      limit = 100,
      offset = 0,
      packageType,
      isActive
    } = req.query;

    // Build the where clause for filtering
    const whereClause = {};

    if (packageType) {
      whereClause.packageType = packageType;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if the sortBy field exists in the model
    const validColumns = Object.keys(StorefrontItem.rawAttributes);
    const validSortBy = validColumns.includes(sortBy) ? sortBy : 'id';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
    
    // Execute the query with all parameters
    const items = await StorefrontItem.findAll({
      where: whereClause,
      order: [[validSortBy, validSortOrder]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    // Return full data for admin management
    const transformedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      packageType: item.packageType,
      pricePerSession: item.pricePerSession,
      sessions: item.sessions,
      months: item.months,
      sessionsPerWeek: item.sessionsPerWeek,
      totalSessions: item.totalSessions,
      totalCost: item.totalCost,
      price: item.price,
      displayPrice: item.price || item.totalCost,
      theme: item.theme,
      isActive: item.isActive,
      stripeProductId: item.stripeProductId,
      stripePriceId: item.stripePriceId,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    logger.info(`Admin retrieved ${items.length} packages via alias endpoint`);

    res.json({
      success: true,
      items: transformedItems
    });
  } catch (error) {
    logger.error('Error fetching packages for admin:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving packages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ALIAS: Create a new package - Frontend compatibility
 * POST /api/admin/packages
 */
router.post('/packages', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    // Validate required fields
    const { name, packageType, pricePerSession } = req.body;

    if (!name || !packageType || !pricePerSession) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, packageType, and pricePerSession'
      });
    }

    // Create the item
    const item = await StorefrontItem.create(req.body);
    
    logger.info(`Admin created new package via alias: ${item.name} (ID: ${item.id})`);
    
    res.status(201).json({
      success: true,
      item: item,
      message: 'Package created successfully'
    });
  } catch (error) {
    logger.error('Error creating package:', error);
    
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
      message: 'Server error while creating package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ALIAS: Get package by ID - Frontend compatibility
 * GET /api/admin/packages/:id
 */
router.get('/packages/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      item: item
    });
  } catch (error) {
    logger.error('Error fetching package for admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ALIAS: Update package - Frontend compatibility  
 * PUT /api/admin/packages/:id
 */
router.put('/packages/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    // Update the item
    await item.update(req.body);
    
    logger.info(`Admin updated package via alias: ${item.name} (ID: ${item.id})`);
    
    res.json({
      success: true,
      item: item,
      message: 'Package updated successfully'
    });
  } catch (error) {
    logger.error('Error updating package:', error);
    
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
      message: 'Server error while updating package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * ALIAS: Delete package - Frontend compatibility
 * DELETE /api/admin/packages/:id
 */
router.delete('/packages/:id', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    const item = await StorefrontItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    // Store name for logging before deletion
    const itemName = item.name;
    
    await item.destroy();
    
    logger.info(`Admin deleted package via alias: ${itemName} (ID: ${req.params.id})`);
    
    res.json({ 
      success: true,
      message: 'Package deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting package:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
