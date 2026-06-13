// backend/routes/adminPackageRoutes.mjs
import express from 'express';
import multer from 'multer';
import { protect, rateLimiter } from '../middleware/authMiddleware.mjs';
import { uploadPhoto } from '../services/photoStorageService.mjs';
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const MAX_PAGE_LIMIT = 300;

// In-memory multipart for product images (reuses photoStorageService → R2/disk).
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, same as profile/banner photos
});
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseBoundedInteger = (value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

// NOTE: Get model inside route handlers, not at module level
// Module-level getModels() runs before cache initialization causing undefined model

// Middleware to ensure admin access
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
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
    if (!StorefrontItem) {
      logger.error('StorefrontItem model not available — model cache may not be initialized');
      return res.status(503).json({ success: false, message: 'Package data temporarily unavailable' });
    }
    const {
      sortBy = 'id',
      sortOrder = 'ASC',
      limit = 100,
      offset = 0,
      packageType,
      isActive
    } = req.query;
    const parsedLimit = parseBoundedInteger(limit, 100, { min: 1, max: MAX_PAGE_LIMIT });
    const parsedOffset = parseBoundedInteger(offset, 0, { min: 0, max: 10000 });

    if (parsedLimit === null || parsedOffset === null) {
      return res.status(400).json({
        success: false,
        message: `Limit and offset must be integers; limit cannot exceed ${MAX_PAGE_LIMIT}`
      });
    }

    // Build the where clause for filtering
    const whereClause = {};

    if (packageType) {
      whereClause.packageType = packageType;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Check if the sortBy field exists in the model
    const validColumns = Object.keys(StorefrontItem.rawAttributes || {});
    const validSortBy = validColumns.includes(sortBy) ? sortBy : 'id';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
    
    // Execute the query with all parameters
    const items = await StorefrontItem.findAll({
      where: whereClause,
      order: [[validSortBy, validSortOrder]],
      limit: parsedLimit,
      offset: parsedOffset
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
      // Commerce fields (physical products: drink / supplements / merch).
      // Training packages keep their defaults (training_package / not taxable / none).
      itemKind: item.itemKind,
      isTaxable: item.isTaxable,
      fulfillmentType: item.fulfillmentType,
      stockQuantity: item.stockQuantity,
      sku: item.sku,
      shippingWeightOz: item.shippingWeightOz,
      displayOrder: item.displayOrder,
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
      error: INTERNAL_ERROR
    });
  }
});

/**
 * Upload a product/package image (R2 with disk fallback).
 * POST /api/admin/packages/upload-image  (and /api/admin/storefront/upload-image)
 * Admin only. Returns { success, imageUrl }; the caller then persists imageUrl on
 * the item via POST/PUT. Reuses photoStorageService (same path as profile/banner).
 */
router.post(
  '/upload-image',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  productImageUpload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
      }
      const ext = `.${(req.file.originalname.split('.').pop() || '').toLowerCase()}`;
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext) || !ALLOWED_IMAGE_MIME.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image type. Allowed: JPG, PNG, WEBP.',
        });
      }
      const { url } = await uploadPhoto(req.file.buffer, {
        userId: req.user.id,
        category: 'products',
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      logger.info(`Admin uploaded product image: ${url}`);
      return res.status(201).json({ success: true, imageUrl: url });
    } catch (error) {
      logger.error('Error uploading product image:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while uploading product image',
        error: INTERNAL_ERROR,
      });
    }
  }
);

/**
 * Create a new package
 * POST /api/admin/packages (NEW) and /api/admin/storefront (LEGACY)
 * Admin only
 */
router.post('/', async (req, res) => {
  try {
    const { StorefrontItem } = getAllModels();
    // Validate required fields. Physical products price by a flat `price` and
    // legitimately have pricePerSession = 0, so only training packages require
    // a (non-zero) pricePerSession; products require a `price` instead.
    const { name, packageType, pricePerSession, price, itemKind } = req.body;
    const isProduct = itemKind === 'physical_product';

    const missingPackagePrice = !isProduct
      && (pricePerSession === undefined || pricePerSession === null || pricePerSession === '' || Number(pricePerSession) <= 0);
    const missingProductPrice = isProduct
      && (price === undefined || price === null || price === '' || Number(price) < 0);

    if (!name || !packageType || missingPackagePrice || missingProductPrice) {
      return res.status(400).json({
        success: false,
        message: isProduct
          ? 'Missing required fields: name, packageType, and a non-negative price'
          : 'Missing required fields: name, packageType, and pricePerSession'
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
      error: INTERNAL_ERROR
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
    const packageId = parsePositiveInteger(req.params.id);

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID must be a positive integer'
      });
    }

    const item = await StorefrontItem.findByPk(packageId);
    
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
      error: INTERNAL_ERROR
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
    const packageId = parsePositiveInteger(req.params.id);

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID must be a positive integer'
      });
    }

    const item = await StorefrontItem.findByPk(packageId);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Package not found' 
      });
    }
    
    // Store name for logging before deletion
    const itemName = item.name;
    
    await item.destroy();
    
    logger.info(`Admin deleted storefront item: ${itemName} (ID: ${packageId})`);
    
    res.json({ 
      success: true,
      message: 'Package deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting storefront item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting storefront item',
      error: INTERNAL_ERROR
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
    const packageId = parsePositiveInteger(req.params.id);

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID must be a positive integer'
      });
    }

    const item = await StorefrontItem.findByPk(packageId);
    
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
      error: INTERNAL_ERROR
    });
  }
});

export default router;
