// backend/routes/foodScannerRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import foodScannerService from '../services/foodScannerService.mjs';
import FoodIngredient from '../models/FoodIngredient.mjs';
import FoodProduct from '../models/FoodProduct.mjs';
import FoodScanHistory from '../models/FoodScanHistory.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   GET /api/food-scanner/scan/:barcode
 * @desc    Scan a product by barcode
 * @access  Public (enhanced with user history if authenticated)
 */
router.get('/scan/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const userId = req.user?.id || null; // Use user ID if authenticated
    
    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required'
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
      error: error.message
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
      error: error.message
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
      error: error.message
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
      error: error.message
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
      error: error.message
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
      error: error.message
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
      error: error.message
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
    
    const ingredient = await FoodIngredient.create(req.body);
    
    return res.status(201).json({
      success: true,
      ingredient
    });
  } catch (error) {
    logger.error(`Error in create ingredient route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating ingredient',
      error: error.message
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
    
    await ingredient.update(req.body);
    
    return res.status(200).json({
      success: true,
      ingredient
    });
  } catch (error) {
    logger.error(`Error in update ingredient route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating ingredient',
      error: error.message
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
    
    await product.update(req.body);
    
    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Error in update product route: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: error.message
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
      error: error.message
    });
  }
});

export default router;