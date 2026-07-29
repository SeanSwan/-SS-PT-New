// backend/routes/foodScannerRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import foodScannerService from '../services/foodScannerService.mjs';
import FoodIngredient from '../models/FoodIngredient.mjs';
import FoodProduct from '../models/FoodProduct.mjs';
import FoodScanHistory from '../models/FoodScanHistory.mjs';
import logger from '../utils/logger.mjs';
import {
  NUTRITION_FUTURE_DATE_ERROR,
  resolveNutritionWriteDate,
} from '../services/nutrition/displayDate.mjs';
import {
  hasProductNutritionValue,
  publicMacroLog,
  scaledNutritionValueOrRaw,
  strictNutritionNumber,
} from '../services/nutrition/productNutritionValidation.mjs';
import { parseServingSizeGrams } from '../services/nutrition/servingSizeValidation.mjs';

const router = express.Router();

// Barcode validation: must be 8-14 digits (UPC-A, EAN-8, EAN-13, ITF-14)
const isValidBarcode = (barcode) => /^\d{8,14}$/.test(barcode);
const FOOD_PRODUCT_UPDATE_FIELDS = [
  'name',
  'brand',
  'barcode',
  'description',
  'ingredientsList',
  'ingredients',
  'nutritionalInfo',
  'overallRating',
  'ratingReasons',
  'healthConcerns',
  'isOrganic',
  'isNonGMO',
  'category',
  'imageUrl',
  'healthierAlternatives',
  'dataSource',
  'lastVerified',
  'scanCount',
];

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const buildFoodProductUpdatePayload = (body = {}) => {
  const update = {};
  for (const field of FOOD_PRODUCT_UPDATE_FIELDS) {
    if (hasOwn(body, field)) update[field] = body[field];
  }

  if (!hasOwn(update, 'nutritionalInfo') && hasOwn(body, 'nutritionFacts')) {
    update.nutritionalInfo = body.nutritionFacts;
  }
  if (!hasOwn(update, 'overallRating') && hasOwn(body, 'healthScore')) {
    update.overallRating = body.healthScore;
  }
  if (!hasOwn(update, 'healthConcerns') && hasOwn(body, 'allergens')) {
    update.healthConcerns = body.allergens;
  }

  return update;
};

/**
 * @route   GET /api/food-scanner/scan/:barcode
 * @desc    Scan a product by barcode
 * @access  Public (enhanced with user history if authenticated)
 */
router.get('/scan/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const userId = req.user?.id || null; // Use user ID if authenticated

    if (!barcode || !isValidBarcode(barcode)) {
      return res.status(400).json({
        success: false,
        message: 'Valid barcode is required (8-14 digits)'
      });
    }
    
    const product = await foodScannerService.getProductByBarcode(barcode, userId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Error in scan route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while scanning product',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/food-scanner/analyze-ingredients
 * @desc    Analyze ingredients from a text string (AI-powered)
 * @access  Private (requires auth + rate limiting to prevent AI cost abuse)
 */
router.post('/analyze-ingredients', protect, aiRateLimiter, async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || typeof ingredients !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Ingredients list is required'
      });
    }

    if (ingredients.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Text input too large (max 10,000 characters)'
      });
    }
    
    const analysis = await foodScannerService.analyzeIngredients(ingredients);
    
    return res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error(`Error in analyze ingredients route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while analyzing ingredients',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/food-scanner/search
 * @desc    Search for products
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const {
      query,
      category,
      healthRating,
      organic,
      nonGMO,
      limit,
      offset
    } = req.query;
    
    const searchResults = await foodScannerService.searchProducts({
      query,
      category,
      healthRating,
      organic: organic === 'true',
      nonGMO: nonGMO === 'true',
      limit,
      offset
    });
    
    return res.status(200).json({
      success: true,
      ...searchResults
    });
  } catch (error) {
    logger.error(`Error in search route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while searching products',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/food-scanner/product/:id
 * @desc    Get product details by ID
 * @access  Public
 */
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await FoodProduct.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Error in get product route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/food-scanner/history
 * @desc    Get user's scan history
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset, favorites } = req.query;

    // The scan-history table has no favorite column (rule 58, verified 2026-07-29) — say so
    // instead of silently returning everything or pretending an empty favorites list is real.
    if (favorites === 'true') {
      return res.status(400).json({
        success: false,
        message: 'Favorites are not supported yet for scan history'
      });
    }

    const scanHistory = await foodScannerService.getUserScanHistory(userId, {
      limit,
      offset
    });
    
    return res.status(200).json({
      success: true,
      ...scanHistory
    });
  } catch (error) {
    logger.error(`Error in get history route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching scan history',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/food-scanner/history/:id
 * @desc    Scan history entries are immutable — every previously "editable" field
 *          (notes/userRating/isFavorite/wasConsumed) was a phantom column that does not exist
 *          in food_scan_history (rule 58, verified 2026-07-29). Editing needs an additive
 *          migration first (SWA-87); until then this endpoint tells the truth.
 * @access  Private
 */
router.put('/history/:id', protect, async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Editing scan history is not supported yet'
  });
});

/**
 * @route   GET /api/food-scanner/ingredient/:id
 * @desc    Get ingredient details by ID
 * @access  Public
 */
router.get('/ingredient/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ingredient = await FoodIngredient.findByPk(id);
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      ingredient
    });
  } catch (error) {
    logger.error(`Error in get ingredient route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching ingredient',
      error: 'Internal server error'
    });
  }
});

// Admin routes for managing ingredients and products

/**
 * @route   POST /api/food-scanner/admin/ingredient
 * @desc    Create a new ingredient
 * @access  Admin only
 */
router.post('/admin/ingredient', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }
    
    const { name, category, healthRating, description, commonNames, allergens, dietaryFlags } = req.body;
    const ingredient = await FoodIngredient.create({ name, category, healthRating, description, commonNames, allergens, dietaryFlags });
    
    return res.status(201).json({
      success: true,
      ingredient
    });
  } catch (error) {
    logger.error(`Error in create ingredient route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating ingredient',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/food-scanner/admin/ingredient/:id
 * @desc    Update an ingredient
 * @access  Admin only
 */
router.put('/admin/ingredient/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }
    
    const { id } = req.params;
    const ingredient = await FoodIngredient.findByPk(id);
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }
    
    const { name, category, healthRating, description, commonNames, allergens, dietaryFlags } = req.body;
    await ingredient.update({ name, category, healthRating, description, commonNames, allergens, dietaryFlags });

    return res.status(200).json({
      success: true,
      ingredient
    });
  } catch (error) {
    logger.error(`Error in update ingredient route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating ingredient',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/food-scanner/admin/product/:id
 * @desc    Update a product
 * @access  Admin only
 */
router.put('/admin/product/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }
    
    const { id } = req.params;
    const product = await FoodProduct.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    const productUpdate = buildFoodProductUpdatePayload(req.body);
    if (productUpdate.overallRating !== undefined && !['good', 'bad', 'okay'].includes(productUpdate.overallRating)) {
      return res.status(400).json({
        success: false,
        message: 'overallRating must be one of good, bad, or okay'
      });
    }

    await product.update(productUpdate);

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Error in update product route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/food-scanner/stats
 * @desc    Get food scanner statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const productCount = await FoodProduct.count();
    const ingredientCount = await FoodIngredient.count();
    const scanCount = await FoodScanHistory.count();
    
    // Get counts by health rating
    const goodProducts = await FoodProduct.count({ where: { overallRating: 'good' } });
    const badProducts = await FoodProduct.count({ where: { overallRating: 'bad' } });
    const okayProducts = await FoodProduct.count({ where: { overallRating: 'okay' } });
    
    // Get most scanned products
    const popularProducts = await FoodProduct.findAll({
      order: [['scanCount', 'DESC']],
      limit: 5
    });
    
    return res.status(200).json({
      success: true,
      stats: {
        productCount,
        ingredientCount,
        scanCount,
        healthRatings: {
          good: goodProducts,
          bad: badProducts,
          okay: okayProducts
        },
        popularProducts
      }
    });
  } catch (error) {
    logger.error(`Error in stats route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/food-scanner/log-scan
 * @desc    Scan a barcode and auto-log the food to daily macro logs
 * @access  Private
 */
router.post('/log-scan', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { barcode, mealType, date, servingSizeGrams = 100 } = req.body;

    if (!barcode || !isValidBarcode(barcode)) {
      return res.status(400).json({ success: false, message: 'Valid barcode is required (8-14 digits)' });
    }

    const safeServingSizeGrams = parseServingSizeGrams(servingSizeGrams);
    if (safeServingSizeGrams === null || safeServingSizeGrams < 1 || safeServingSizeGrams > 10000) {
      return res.status(400).json({ success: false, message: 'Serving size must be between 1g and 10,000g' });
    }

    // Validate mealType if provided
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return res.status(400).json({ success: false, message: 'Invalid meal type' });
    }

    let safeDate;
    try {
      safeDate = resolveNutritionWriteDate(date);
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError.message === NUTRITION_FUTURE_DATE_ERROR
          ? 'Date cannot be in the future'
          : 'Date must be a real YYYY-MM-DD calendar date',
      });
    }

    const product = await foodScannerService.getProductByBarcode(barcode, userId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this barcode' });
    }

    const nutri = product.nutritionalInfo || {};
    const processedIngredientNova = product.ingredients?.some(i => i.isProcessed) ? 3 : null;
    const novaGroup = hasProductNutritionValue(nutri.nova_group) ? nutri.nova_group : processedIngredientNova;

    const { processAIDataUpdates } = await import('../services/aiDataWriteService.mjs');
    const sequelizeInstance = (await import('../database.mjs')).default;

    // Scale from per-100g values to actual serving size
    const multiplier = safeServingSizeGrams / 100;

    const macroLogData = {
      date: safeDate,
      mealType: mealType || 'snack',
      description: `${product.name}${product.brand ? ` (${product.brand})` : ''} (${safeServingSizeGrams}g)`,
      calories: scaledNutritionValueOrRaw(multiplier, nutri.energy_kcal_100g, nutri['energy-kcal'], nutri.calories),
      protein: scaledNutritionValueOrRaw(multiplier, nutri.proteins_100g, nutri.proteins, nutri.protein),
      carbs: scaledNutritionValueOrRaw(multiplier, nutri.carbohydrates_100g, nutri.carbohydrates, nutri.carbs),
      fat: scaledNutritionValueOrRaw(multiplier, nutri.fat_100g, nutri.fat),
      fiber: scaledNutritionValueOrRaw(multiplier, nutri.fiber_100g, nutri.fiber),
      sugar: scaledNutritionValueOrRaw(multiplier, nutri.sugars_100g, nutri.sugars, nutri.sugar),
      sodium: scaledNutritionValueOrRaw(multiplier, nutri.sodium_100g, nutri.sodium),
      addedSugar: scaledNutritionValueOrRaw(multiplier, nutri.sugars_100g, nutri.sugars),
      cholesterol: scaledNutritionValueOrRaw(multiplier, nutri.cholesterol_100g, nutri.cholesterol),
      saturatedFat: scaledNutritionValueOrRaw(multiplier, nutri['saturated-fat_100g'], nutri.saturatedFat),
      transFat: scaledNutritionValueOrRaw(multiplier, nutri['trans-fat_100g'], nutri.transFat),
      novaGroup,
      brandName: product.brand || null,
      source: 'barcode',
      mealSource: 'packaged',
    };

    const result = await processAIDataUpdates(
      userId,
      [{ type: 'macro_log', data: macroLogData }],
      userId,
      sequelizeInstance,
      { macroSource: 'barcode' },
    );
    if (!result || Number(result.successful || 0) < 1) {
      logger.warn('[FoodScannerRoutes] log-scan macro write failed', {
        userId,
        barcode,
        errorCount: Array.isArray(result?.errors) ? result.errors.length : 0,
      });
      return res.status(500).json({
        success: false,
        message: 'Could not log scanned product. No diary entry was saved.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Logged ${product.name} to your food diary`,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        overallRating: product.overallRating,
        isOrganic: product.isOrganic,
        isNonGMO: product.isNonGMO,
        healthConcerns: product.healthConcerns,
        ingredients: product.ingredients,
      },
      macroLog: publicMacroLog(macroLogData),
      logResult: result,
    });
  } catch (error) {
    logger.error(`Error in log-scan route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while logging scanned product',
      error: 'Internal server error',
    });
  }
});

/**
 * @route   POST /api/food-scanner/ai-analyze
 * @desc    Get AI-enhanced food safety analysis for a barcode scan
 * @access  Private
 */
router.post('/ai-analyze', protect, aiRateLimiter, async (req, res) => {
  try {
    const { barcode, productName } = req.body;

    if (!barcode && !productName) {
      return res.status(400).json({ success: false, message: 'Barcode or product name required' });
    }

    if (barcode && !isValidBarcode(barcode)) {
      return res.status(400).json({ success: false, message: 'Valid barcode is required (8-14 digits)' });
    }

    // Sanitize productName to prevent injection
    const sanitizedName = productName ? String(productName).slice(0, 200).trim() : null;

    let product = null;
    if (barcode) {
      product = await foodScannerService.getProductByBarcode(barcode, req.user.id);
    }

    const analysis = {
      product: product ? {
        name: product.name,
        brand: product.brand,
        overallRating: product.overallRating,
        isOrganic: product.isOrganic,
        isNonGMO: product.isNonGMO,
        ingredientsList: product.ingredientsList,
        ingredients: product.ingredients,
        healthConcerns: product.healthConcerns,
        nutritionalInfo: product.nutritionalInfo,
        healthierAlternatives: product.healthierAlternatives,
      } : null,
      productName: sanitizedName || product?.name,
      flags: [],
    };

    if (product) {
      if (!product.isNonGMO) analysis.flags.push('MAY_CONTAIN_GMO');
      if (!product.isOrganic) analysis.flags.push('NOT_ORGANIC');
      if (product.overallRating === 'bad') analysis.flags.push('POOR_HEALTH_RATING');
      if (product.ingredients?.some(i => i.isProcessed)) analysis.flags.push('CONTAINS_PROCESSED_INGREDIENTS');
      if (product.healthConcerns?.length > 0) analysis.flags.push('HEALTH_CONCERNS_IDENTIFIED');

      const nutri2 = product.nutritionalInfo || {};
      const sodiumForFlag = strictNutritionNumber(nutri2.sodium_100g, nutri2.sodium);
      const sugarForFlag = strictNutritionNumber(nutri2.sugars_100g, nutri2.sugars);
      if (sodiumForFlag !== null && sodiumForFlag > 800) analysis.flags.push('HIGH_SODIUM');
      if (sugarForFlag !== null && sugarForFlag > 12) analysis.flags.push('HIGH_SUGAR');
    }

    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    logger.error(`Error in ai-analyze route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error during AI analysis',
      error: 'Internal server error',
    });
  }
  // Lock auto-released by aiRateLimiter middleware on res finish/close
});

export default router;
