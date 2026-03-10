// backend/routes/foodScannerRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import foodScannerService from '../services/foodScannerService.mjs';
import FoodIngredient from '../models/FoodIngredient.mjs';
import FoodProduct from '../models/FoodProduct.mjs';
import FoodScanHistory from '../models/FoodScanHistory.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Barcode validation: must be 8-14 digits (UPC-A, EAN-8, EAN-13, ITF-14)
const isValidBarcode = (barcode) => /^\d{8,14}$/.test(barcode);

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
 * @route   GET /api/food-scanner/analyze-ingredients
 * @desc    Analyze ingredients from a text string
 * @access  Public
 */
router.post('/analyze-ingredients', async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients list is required'
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
    
    const scanHistory = await foodScannerService.getUserScanHistory(userId, {
      limit,
      offset,
      favorites: favorites === 'true'
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
 * @desc    Update a scan history entry (e.g., mark as favorite)
 * @access  Private
 */
router.put('/history/:id', protect, async (req, res) => {
  try {
    const scanId = req.params.id;
    const userId = req.user.id;
    
    const updatedScan = await foodScannerService.updateScanHistory(scanId, userId, req.body);
    
    if (!updatedScan) {
      return res.status(404).json({
        success: false,
        message: 'Scan history record not found or not authorized'
      });
    }
    
    return res.status(200).json({
      success: true,
      scan: updatedScan
    });
  } catch (error) {
    logger.error(`Error in update history route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating scan history',
      error: 'Internal server error'
    });
  }
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
    
    const { name, brand, barcode, ingredients, nutritionFacts, healthScore, category, allergens } = req.body;
    await product.update({ name, brand, barcode, ingredients, nutritionFacts, healthScore, category, allergens });

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
    const { barcode, mealType, date } = req.body;

    if (!barcode || !isValidBarcode(barcode)) {
      return res.status(400).json({ success: false, message: 'Valid barcode is required (8-14 digits)' });
    }

    // Validate mealType if provided
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return res.status(400).json({ success: false, message: 'Invalid meal type' });
    }

    const product = await foodScannerService.getProductByBarcode(barcode, userId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this barcode' });
    }

    const nutri = product.nutritionalInfo || {};
    const sodium = parseFloat(nutri.sodium_100g || nutri.sodium || 0);
    const addedSugar = parseFloat(nutri.sugars_100g || nutri.sugars || 0);
    const cholesterol = parseFloat(nutri.cholesterol_100g || nutri.cholesterol || 0);
    const saturatedFat = parseFloat(nutri['saturated-fat_100g'] || nutri.saturatedFat || 0);
    const transFat = parseFloat(nutri['trans-fat_100g'] || nutri.transFat || 0);
    const novaGroup = nutri.nova_group || (product.ingredients?.some(i => i.isProcessed) ? 3 : null);

    const { processAIDataUpdates } = await import('../services/aiDataWriteService.mjs');
    const sequelizeInstance = (await import('../database.mjs')).default;

    const macroLogData = {
      date: date || new Date().toISOString().split('T')[0],
      mealType: mealType || 'snack',
      description: `${product.name}${product.brand ? ` (${product.brand})` : ''}`,
      calories: parseFloat(nutri.energy_kcal_100g || nutri['energy-kcal'] || nutri.calories || 0),
      protein: parseFloat(nutri.proteins_100g || nutri.proteins || nutri.protein || 0),
      carbs: parseFloat(nutri.carbohydrates_100g || nutri.carbohydrates || nutri.carbs || 0),
      fat: parseFloat(nutri.fat_100g || nutri.fat || 0),
      fiber: parseFloat(nutri.fiber_100g || nutri.fiber || 0),
      sugar: parseFloat(nutri.sugars_100g || nutri.sugars || nutri.sugar || 0),
      sodium,
      addedSugar,
      cholesterol,
      saturatedFat,
      transFat,
      novaGroup,
      brandName: product.brand || null,
      mealSource: 'packaged',
    };

    const result = await processAIDataUpdates(userId, [{ type: 'macro_log', data: macroLogData }], userId, sequelizeInstance);

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
      macroLog: macroLogData,
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
      if (parseFloat(nutri2.sodium_100g || nutri2.sodium || 0) > 800) analysis.flags.push('HIGH_SODIUM');
      if (parseFloat(nutri2.sugars_100g || nutri2.sugars || 0) > 12) analysis.flags.push('HIGH_SUGAR');
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
});

export default router;