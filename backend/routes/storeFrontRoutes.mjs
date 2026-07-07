import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { resolvePriceVisibility, stripItemPrices, isPriceGatedItem } from '../services/store/priceVisibilityService.mjs';
// 🚀 ENHANCED: Coordinated model imports with associations
import { getStorefrontItem, getAdminSpecial, getProductVariant } from '../models/index.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading model to prevent initialization race condition
// StorefrontItem model will be retrieved via getStorefrontItem() inside each route handler when needed
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';
const MAX_STOREFRONT_LIMIT = 100;
const MAX_STOREFRONT_OFFSET = 10000;
const PACKAGE_TYPES = new Set(['fixed', 'monthly']);
const PRODUCT_VARIANT_ATTRIBUTES = [
  'id',
  'storefrontItemId',
  'label',
  'sku',
  'price',
  'stockQuantity',
  'attributes',
  'displayOrder',
  'isActive'
];
let cachedVariantTableAvailable = null;
const EMPTY_MONEY_VALUES = new Set([null, undefined, '']);
const TRAINING_ITEM_TYPES = {
  fixed: 'TRAINING_PACKAGE_FIXED',
  monthly: 'TRAINING_PACKAGE_SUBSCRIPTION',
  custom: 'TRAINING_PACKAGE_SUBSCRIPTION'
};

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

function getSingleQueryValue(value) {
  return Array.isArray(value) ? null : value;
}

function parseStrictInteger(value) {
  const singleValue = getSingleQueryValue(value);
  if (singleValue === undefined || singleValue === null || singleValue === '') {
    return null;
  }

  const normalized = String(singleValue).trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseOptionalInteger(value, fallback) {
  const singleValue = getSingleQueryValue(value);
  if (singleValue === undefined || singleValue === null || singleValue === '') {
    return fallback;
  }

  return parseStrictInteger(singleValue);
}

function parseOptionalPrice(value, fallback = null) {
  const singleValue = getSingleQueryValue(value);
  if (singleValue === undefined || singleValue === null || singleValue === '') {
    return fallback;
  }

  const normalized = String(singleValue).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalBoolean(value, fallback) {
  const singleValue = getSingleQueryValue(value);
  if (singleValue === undefined || singleValue === null || singleValue === '') {
    return fallback;
  }

  if (singleValue === true || singleValue === 'true') return true;
  if (singleValue === false || singleValue === 'false') return false;
  return null;
}

const sanitizeStorefrontDescription = (value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const sanitizeStorefrontPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const sanitized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(sanitized, 'description')) {
    sanitized.description = sanitizeStorefrontDescription(sanitized.description);
  }

  return sanitized;
};

const parseMoney = (value) => {
  if (EMPTY_MONEY_VALUES.has(value)) return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const firstMoney = (...values) => {
  for (const value of values) {
    const parsed = parseMoney(value);
    if (parsed !== null) return parsed;
  }

  return 0;
};

const mapProductVariant = ({
  id,
  storefrontItemId,
  label,
  sku = null,
  price,
  stockQuantity = null,
  attributes = null,
  displayOrder = 0,
  isActive = true
}) => ({
  id,
  storefrontItemId,
  label,
  sku,
  price: parseMoney(price),
  stockQuantity,
  attributes,
  displayOrder,
  isActive: isActive !== false
});

const getMappedProductVariants = (item) => {
  if (!Array.isArray(item.variants)) return [];

  return item.variants
    .map(mapProductVariant)
    .sort((left, right) => (left.displayOrder - right.displayOrder) || (left.id - right.id));
};

const resolveProductVariantInclude = async () => {
  if (cachedVariantTableAvailable === false) return [];

  try {
    const ProductVariant = getProductVariant();

    if (cachedVariantTableAvailable === null) {
      const queryInterface = ProductVariant.sequelize.getQueryInterface();
      await queryInterface.describeTable(ProductVariant.getTableName());
      cachedVariantTableAvailable = true;
    }

    return [{
      model: ProductVariant,
      as: 'variants',
      attributes: PRODUCT_VARIANT_ATTRIBUTES,
      required: false,
      where: { isActive: true }
    }];
  } catch (error) {
    cachedVariantTableAvailable = false;
    logger.warn('Product variants unavailable for storefront payload.', {
      code: 'storefront_variants_unavailable'
    });
    return [];
  }
};

const resolveStorefrontItemType = (itemKind, packageType) => {
  if (itemKind === 'physical_product') return 'PHYSICAL_PRODUCT';
  return TRAINING_ITEM_TYPES[packageType] || TRAINING_ITEM_TYPES.monthly;
};

const valueOrFallback = (value, fallback) => value || fallback;

const nullishOrFallback = (value, fallback) => value ?? fallback;

const getStorefrontItemKind = (item) => valueOrFallback(item.itemKind, 'training_package');

const getStorefrontPriceDetails = (item) => (
  item.packageType === 'monthly'
    ? `${item.months} months, ${item.sessionsPerWeek} sessions/week`
    : null
);

const mapStorefrontItem = (item) => {
  const itemKind = getStorefrontItemKind(item);
  const itemType = resolveStorefrontItemType(itemKind, item.packageType);

  return {
    id: item.id,
    name: item.name,
    description: sanitizeStorefrontDescription(item.description),
    totalCost: firstMoney(item.totalCost, item.price),
    displayPrice: firstMoney(item.price, item.totalCost),
    pricePerSession: firstMoney(item.pricePerSession),
    price: firstMoney(item.price, item.totalCost),
    priceDetails: getStorefrontPriceDetails(item),
    imageUrl: item.imageUrl,
    theme: valueOrFallback(item.theme, 'cosmic'),
    sessions: item.sessions,
    months: item.months,
    sessionsPerWeek: item.sessionsPerWeek,
    totalSessions: item.totalSessions,
    category: null,
    itemType,
    includedFeatures: valueOrFallback(item.includedFeatures, null),
    packageType: item.packageType,
    isActive: item.isActive,
    displayOrder: nullishOrFallback(item.displayOrder, 0),
    // Phase 0 commerce fields - let the storefront distinguish training packages
    // from physical products (supplements/merch) and render the right card + tax note.
    itemKind,
    isTaxable: item.isTaxable === true,
    fulfillmentType: valueOrFallback(item.fulfillmentType, 'none'),
    stockQuantity: nullishOrFallback(item.stockQuantity, null),
    variants: getMappedProductVariants(item)
  };
};

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
    const AdminSpecial = getAdminSpecial();
    // Launch P1-1: prices are invitation-only — resolve per-request visibility
    const pricesVisible = await resolvePriceVisibility(req);

    const {
      // Default to displayOrder so storefront renders in curated order.
      // Fallback to id occurs automatically if displayOrder isn't a column.
      sortBy = 'displayOrder', 
      sortOrder = 'ASC',
      limit = 100,
      offset = 0,
      packageType,
      // Default to active-only items for public storefront.
      isActive = 'true'
    } = req.query;

    const requestedLimit = parseOptionalInteger(limit, 100);
    const requestedOffset = parseOptionalInteger(offset, 0);
    const requestedIsActive = parseOptionalBoolean(isActive, true);
    const requestedPackageType = typeof packageType === 'string' ? packageType.trim() : packageType;

    if (requestedLimit === null || requestedOffset === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
      });
    }

    if (requestedIsActive === null) {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false',
      });
    }

    if (requestedPackageType && !PACKAGE_TYPES.has(requestedPackageType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid packageType',
      });
    }

    const safeLimit = Math.min(Math.max(requestedLimit, 1), MAX_STOREFRONT_LIMIT);
    const safeOffset = Math.min(Math.max(requestedOffset, 0), MAX_STOREFRONT_OFFSET);

    // Validate sortOrder
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'ASC';
    const variantInclude = await resolveProductVariantInclude();
    
    // Build the where clause for filtering
    const whereClause = {
      // We're removing the price filter to ensure all packages can be accessed
    };
    
    // Add packageType filter if provided
    if (requestedPackageType) {
      whereClause.packageType = requestedPackageType;
    }
    
    // Add isActive filter if provided (convert string to boolean)
    whereClause.isActive = requestedIsActive;
    
    // Check if the sortBy field exists in the model
    // FIXED: Checking if the requested sort field exists, falling back to 'id' if not
    const validColumns = Object.keys(StorefrontItem.rawAttributes);
    const validSortBy = validColumns.includes(sortBy) ? sortBy : 'id';
    
    // Execute the query with all parameters
    const items = await StorefrontItem.findAll({
      where: whereClause,
      order: [[validSortBy, validSortOrder]],
      limit: safeLimit,
      offset: safeOffset,
      include: variantInclude
    });

    // Transform data to meet frontend expectations
    // Gracefully handle missing admin_specials table (may not exist in all environments)
    let activeSpecials = [];
    try {
      activeSpecials = await AdminSpecial.getActiveSpecials();
    } catch (specialsErr) {
      logger.warn('Could not fetch active specials (table may not exist):', specialsErr.message);
    }

    const transformedItems = items.map((item) => {
      const mapped = mapStorefrontItem(item);
      return pricesVisible || !isPriceGatedItem(mapped) ? mapped : stripItemPrices(mapped);
    });

    if (items.length === 0) {
      // Check if ANY packages exist (including inactive) before attempting seed
      const totalCount = await StorefrontItem.count();
      if (totalCount === 0) {
        // Table truly empty — auto-seed
        try {
          const seedPackages = (await import('../seeders/20260407-seed-storefront-packages.mjs')).default;
          await seedPackages();
          const seededItems = await StorefrontItem.findAll({
            where: whereClause,
            order: [[validSortBy, validSortOrder]],
            limit: safeLimit,
            offset: safeOffset,
            include: variantInclude
          });
          const seededTransformed = seededItems.map((seeded) => {
            const mapped = mapStorefrontItem(seeded);
            return pricesVisible || !isPriceGatedItem(mapped) ? mapped : stripItemPrices(mapped);
          });
          return res.json({ success: true, pricesVisible, items: seededTransformed, data: { packages: seededTransformed, activeSpecials: [] } });
        } catch (seedErr) {
          logger.error('Auto-seed storefront failed:', seedErr.message);
        }
      } else {
        // Packages exist but are all inactive — this is an admin configuration
        // state, not a bug. Log it and let the frontend show its fallback.
        // Recovery (re-activation) must be done via the admin panel, not a
        // public GET, to avoid anonymous traffic overriding intentional deactivation.
        logger.warn(`Storefront has ${totalCount} package(s) but all are inactive — admin action required to re-activate.`);
      }
      logger.warn('Storefront has 0 active items — frontend will show fallback data.');
    } else {
      logger.info(`Retrieved ${items.length} storefront items`);
    }

    const packagesWithSpecials = transformedItems.map((pkg) => {
      const applicableSpecial = activeSpecials.find(
        (special) =>
          !special.applicablePackageIds?.length ||
          special.applicablePackageIds.includes(pkg.id)
      );

      if (applicableSpecial) {
        return {
          ...pkg,
          activeSpecial: {
            id: applicableSpecial.id,
            name: applicableSpecial.name,
            bonusSessions: applicableSpecial.bonusSessions,
            bonusDuration: applicableSpecial.bonusDuration,
            endsAt: applicableSpecial.endDate
          }
        };
      }

      return pkg;
    });

    // Return success response with data structure frontend expects
    res.json({
      success: true,
      pricesVisible,
      items: packagesWithSpecials,
      data: {
        packages: packagesWithSpecials,
        activeSpecials: activeSpecials.map((special) => ({
          id: special.id,
          name: special.name,
          bonusSessions: special.bonusSessions,
          applicablePackageIds: special.applicablePackageIds,
          endsAt: special.endDate
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching storefront items:', error);
    return sendInternalError(res, 'Server error while retrieving storefront items');
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
    // Launch P1-1: price math is gated the same as prices themselves
    const calculatorVisible = await resolvePriceVisibility(req);
    if (!calculatorVisible) {
      return res.status(403).json({
        success: false,
        message: 'Pricing is by invitation. Contact SwanStudios for access.',
        code: 'PRICE_ACCESS_REQUIRED'
      });
    }

    const sessions = parseStrictInteger(req.query.sessions);
    const basePricePerSession = parseOptionalPrice(req.query.pricePerSession, 175); // Default: single session price

    // Validate sessions input
    if (sessions === null) {
      return res.status(400).json({
        success: false,
        message: 'Sessions parameter is required and must be a whole number'
      });
    }

    if (basePricePerSession === null) {
      return res.status(400).json({
        success: false,
        message: 'pricePerSession must be a valid currency amount'
      });
    }

    if (basePricePerSession < 140 || basePricePerSession > 1000) {
      return res.status(400).json({
        success: false,
        message: 'pricePerSession must be between 140 and 1000'
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
    return sendInternalError(res, 'Error calculating custom package price');
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
    const itemId = parseStrictInteger(req.params.id);

    if (!itemId || itemId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid storefront item id',
      });
    }

    const item = await StorefrontItem.findOne({
      where: {
        id: itemId
        // Removed pricing constraint to ensure all packages are visible
      },
      include: await resolveProductVariantInclude()
    });
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found or does not meet pricing requirements' 
      });
    }
    
    // Transform to meet frontend expectations
    const pricesVisible = await resolvePriceVisibility(req);
    const mappedItem = mapStorefrontItem(item);
    const transformedItem = pricesVisible || !isPriceGatedItem(mappedItem)
      ? mappedItem
      : stripItemPrices(mappedItem);

    res.json({
      success: true,
      pricesVisible,
      item: transformedItem
    });
  } catch (error) {
    logger.error('Error fetching storefront item:', error);
    return sendInternalError(res, 'Server error while retrieving storefront item');
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
    
    const sanitizedPayload = sanitizeStorefrontPayload(req.body);
    const hasPricePerSession = Object.prototype.hasOwnProperty.call(sanitizedPayload, 'pricePerSession');
    const pricePerSession = parseOptionalPrice(sanitizedPayload.pricePerSession);

    // Validate that pricePerSession is at least $140
    if (hasPricePerSession && pricePerSession === null) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be a valid currency amount'
      });
    }

    if (pricePerSession !== null && pricePerSession < 140) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be at least $140'
      });
    }
    
    const item = await StorefrontItem.create(sanitizedPayload);
    
    logger.info(`Admin created new storefront item: ${item.name}`);
    
    res.status(201).json({
      success: true,
      item: mapStorefrontItem(item)
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
    
    return sendInternalError(res, 'Server error while creating storefront item');
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
    const itemId = parseStrictInteger(req.params.id);

    if (!itemId || itemId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid storefront item id',
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update storefront items' 
      });
    }
    
    const sanitizedPayload = sanitizeStorefrontPayload(req.body);
    const hasPricePerSession = Object.prototype.hasOwnProperty.call(sanitizedPayload, 'pricePerSession');
    const pricePerSession = parseOptionalPrice(sanitizedPayload.pricePerSession);
    const item = await StorefrontItem.findByPk(itemId);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }
    
    // Validate that pricePerSession is at least $140 if being updated
    if (hasPricePerSession && pricePerSession === null) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be a valid currency amount'
      });
    }

    if (pricePerSession !== null && pricePerSession < 140) {
      return res.status(400).json({
        success: false,
        message: 'Price per session must be at least $140'
      });
    }
    
    await item.update(sanitizedPayload);
    
    logger.info(`Admin updated storefront item: ${item.name}`);
    
    res.json({
      success: true,
      item: mapStorefrontItem(item)
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
    
    return sendInternalError(res, 'Server error while updating storefront item');
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
    const itemId = parseStrictInteger(req.params.id);

    if (!itemId || itemId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid storefront item id',
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete storefront items' 
      });
    }
    
    const item = await StorefrontItem.findByPk(itemId);
    
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
    return sendInternalError(res, 'Server error while deleting storefront item');
  }
});

export default router;
