// backend/routes/recommendationRoutes.mjs
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import productRecommendationService from '../services/productRecommendationService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /api/recommendations/personalized
 * Get personalized product recommendations for the authenticated user
 */
router.get('/personalized', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 4;
    
    const recommendations = await productRecommendationService.getPersonalizedRecommendations(userId, limit);
    
    return res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error) {
    logger.error(`Error fetching personalized recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personalized recommendations'
    });
  }
});

/**
 * GET /api/recommendations/popular
 * Get popular products (accessible without authentication)
 */
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const popularItems = await productRecommendationService.getPopularItems(limit);
    
    return res.status(200).json({
      success: true,
      recommendations: popularItems
    });
  } catch (error) {
    logger.error(`Error fetching popular items: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch popular items'
    });
  }
});

/**
 * GET /api/recommendations/complementary/:itemId
 * Get complementary products for a specific item
 */
router.get('/complementary/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const limit = parseInt(req.query.limit) || 3;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID'
      });
    }
    
    const complementaryItems = await productRecommendationService.getComplementaryItems(itemId, limit);
    
    return res.status(200).json({
      success: true,
      recommendations: complementaryItems
    });
  } catch (error) {
    logger.error(`Error fetching complementary items: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch complementary items'
    });
  }
});

/**
 * GET /api/recommendations/cart
 * Get recommendations based on the user's current cart
 */
router.get('/cart', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const cartRecommendations = await productRecommendationService.getCartBasedRecommendations(userId, limit);
    
    return res.status(200).json({
      success: true,
      recommendations: cartRecommendations
    });
  } catch (error) {
    logger.error(`Error fetching cart-based recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cart-based recommendations'
    });
  }
});

/**
 * GET /api/recommendations/category/:category
 * Get recommendations for a specific category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const limit = parseInt(req.query.limit) || 6;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    const categoryRecommendations = await productRecommendationService.getCategoryRecommendations(category, limit);
    
    return res.status(200).json({
      success: true,
      recommendations: categoryRecommendations
    });
  } catch (error) {
    logger.error(`Error fetching category recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category recommendations'
    });
  }
});

export default router;